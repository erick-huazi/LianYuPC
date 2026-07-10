[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $repoRoot '.env.example'
$envPath = Join-Path $repoRoot '.env'

if ((Test-Path -LiteralPath $envPath) -and -not $Force) {
    Write-Host '.env already exists. Use -Force to replace it.'
    exit 0
}

function New-RandomBase64([int]$byteCount = 32) {
    $bytes = New-Object byte[] $byteCount
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $rng.GetBytes($bytes)
    } finally {
        $rng.Dispose()
    }
    return [Convert]::ToBase64String($bytes)
}

$content = Get-Content -Raw -Encoding UTF8 -LiteralPath $templatePath
$content = $content.Replace('change-me-root', (New-RandomBase64 24))
$content = $content.Replace('change-me-mysql', (New-RandomBase64 24))
$content = $content.Replace('change-me-redis', (New-RandomBase64 24))
$content = $content.Replace('change-me-rabbit', (New-RandomBase64 24))
$content = $content.Replace('change-me-minio-secret', (New-RandomBase64 24))
$content = $content.Replace('change-me-minio', ('lianyu-' + (New-RandomBase64 12).Replace('/', '').Replace('+', '').Replace('=', '')))
$content = $content -replace '(?m)^LIANYU_MASTER_KEY=.*$', ('LIANYU_MASTER_KEY=v1=' + (New-RandomBase64 32) + ',current=v1')

[System.IO.File]::WriteAllText($envPath, $content, (New-Object System.Text.UTF8Encoding($false)))
Write-Host 'Created .env with random local-only credentials.'
Write-Host 'Start lite mode with:'
Write-Host '  docker compose -f docker-compose.yml -f docker-compose.lite.yml up -d --build'
