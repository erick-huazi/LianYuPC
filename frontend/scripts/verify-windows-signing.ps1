[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ReleaseTag,

    [string]$ReleaseDirectory
)

$ErrorActionPreference = 'Stop'

$version = $ReleaseTag.TrimStart('v')
if (-not $ReleaseDirectory) {
    $ReleaseDirectory = Join-Path $PSScriptRoot "..\release\v$version"
}
$ReleaseDirectory = [System.IO.Path]::GetFullPath($ReleaseDirectory)

if (-not (Test-Path -LiteralPath $ReleaseDirectory -PathType Container)) {
    throw "Release directory not found: $ReleaseDirectory"
}

$installers = @(Get-ChildItem -LiteralPath $ReleaseDirectory -File -Filter 'Amiweave-*-win-x64.exe')
if ($installers.Count -ne 1) {
    throw "Expected exactly one Windows installer in $ReleaseDirectory, found $($installers.Count)"
}

$applicationPath = Join-Path $ReleaseDirectory 'win-unpacked\Amiweave.exe'
if (-not (Test-Path -LiteralPath $applicationPath -PathType Leaf)) {
    throw "Packaged application executable not found: $applicationPath"
}

$targets = @(
    @{ Kind = 'installer'; File = $installers[0] },
    @{ Kind = 'application'; File = Get-Item -LiteralPath $applicationPath }
)

$results = foreach ($target in $targets) {
    $signature = Get-AuthenticodeSignature -LiteralPath $target.File.FullName
    [pscustomobject]@{
        kind       = $target.Kind
        file       = $target.File.Name
        status     = $signature.Status.ToString()
        signer     = if ($signature.SignerCertificate) { $signature.SignerCertificate.Subject } else { $null }
        thumbprint = if ($signature.SignerCertificate) { $signature.SignerCertificate.Thumbprint } else { $null }
    }
}

$isPrerelease = $ReleaseTag.Contains('-')
$report = [ordered]@{
    schemaVersion = 1
    releaseTag    = $ReleaseTag
    prerelease    = $isPrerelease
    generatedAt   = [DateTime]::UtcNow.ToString('o')
    artifacts     = @($results)
}
$reportPath = Join-Path $ReleaseDirectory 'WINDOWS_SIGNING_STATUS.json'
$report | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $reportPath -Encoding utf8

$summary = @(
    '## Windows signing status',
    '',
    '| Artifact | Status | Signer |',
    '| --- | --- | --- |'
)
foreach ($result in $results) {
    $signer = if ($result.signer) { $result.signer.Replace('|', '\|') } else { 'Unsigned' }
    $summary += "| $($result.kind): ``$($result.file)`` | $($result.status) | $signer |"
}
if ($env:GITHUB_STEP_SUMMARY) {
    $summary | Add-Content -LiteralPath $env:GITHUB_STEP_SUMMARY -Encoding utf8
}

$invalid = @($results | Where-Object status -ne 'Valid')
if (-not $isPrerelease -and $invalid.Count -gt 0) {
    throw 'Stable Windows releases require valid signatures on both the installer and packaged application.'
}
if ($invalid.Count -gt 0) {
    Write-Warning 'Unsigned Windows artifacts are allowed only because this tag is a prerelease.'
}

$results | Format-Table kind, file, status, signer -AutoSize
Write-Output "Signing status report: $reportPath"
