# Restore java.* / third-party imports stripped by fix-service-cross-imports.ps1
$ErrorActionPreference = 'Stop'
$repo = 'c:\Users\hp\Desktop\LianYu-PC'
$serviceRoot = Join-Path $repo 'backend\lianyu-service\src\main\java\com\lianyu\service'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$mapping = @{
    'AiChatService' = 'ai'; 'AiChatQuotaService' = 'ai'; 'ApiKeyVaultService' = 'ai'
    'EmbeddingService' = 'ai'; 'RerankerService' = 'ai'; 'CharacterPromptBuilder' = 'ai'
    'AssistantReplySplitter' = 'ai'; 'AuthService' = 'auth'; 'AuthRateLimiter' = 'auth'
    'CaptchaService' = 'auth'; 'CharacterService' = 'character'; 'CharacterChatBehavior' = 'character'
    'CharacterChatBehaviorResolver' = 'character'; 'CharacterStateService' = 'character'
    'CharacterDiaryService' = 'character'; 'EmotionDecayScheduler' = 'character'
    'CharacterSquareService' = 'square'; 'CharacterSquareAvatarSync' = 'square'
    'CharacterSquareCatalog' = 'square'; 'CharacterSquareCatalogDal' = 'square'
    'CharacterSquareCatalogGenshin' = 'square'; 'CharacterSquareTags' = 'square'
    'ConversationService' = 'conversation'; 'ConversationAccessService' = 'conversation'
    'GroupChatService' = 'conversation'; 'SingleChatOpeningScheduler' = 'conversation'
    'ProactiveChatScheduler' = 'conversation'; 'MemoryRetriever' = 'memory'
    'MemoryWriter' = 'memory'; 'MemoryConsumer' = 'memory'
    'MomentsService' = 'moments'; 'MomentsCommentService' = 'moments'
    'MomentsCommentOrchestrator' = 'moments'; 'MomentsScheduler' = 'moments'
    'NotificationService' = 'notification'; 'NotificationPushConsumer' = 'notification'
    'WebPushService' = 'notification'; 'FileStorageService' = 'storage'
    'OutputLanguageService' = 'support'
}

function Get-ImportLines([string]$text) {
    $text -split "`n" | Where-Object { $_ -match '^\s*import\s+' } | ForEach-Object { $_.Trim() }
}

function Rewrite-Imports([string]$filePath, [string[]]$imports) {
    $lines = [System.IO.File]::ReadAllLines($filePath)
    $pkgIdx = 0
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^package ') { $pkgIdx = $i; break }
    }
    $bodyIdx = $pkgIdx + 1
    while ($bodyIdx -lt $lines.Count -and [string]::IsNullOrWhiteSpace($lines[$bodyIdx])) { $bodyIdx++ }
    while ($bodyIdx -lt $lines.Count -and $lines[$bodyIdx] -match '^import ') { $bodyIdx++ }
    while ($bodyIdx -lt $lines.Count -and [string]::IsNullOrWhiteSpace($lines[$bodyIdx])) { $bodyIdx++ }

    $sorted = $imports | Sort-Object -Unique
    $out = [System.Collections.Generic.List[string]]::new()
    $out.Add($lines[$pkgIdx])
    $out.Add('')
    foreach ($imp in $sorted) { $out.Add($imp) }
    if ($sorted.Count -gt 0) { $out.Add('') }
    for ($i = $bodyIdx; $i -lt $lines.Count; $i++) { $out.Add($lines[$i]) }
    [System.IO.File]::WriteAllLines($filePath, $out, $utf8NoBom)
}

Push-Location $repo
foreach ($entry in $mapping.GetEnumerator()) {
    $class = $entry.Key
    $pkg = $entry.Value
    $dest = Join-Path $serviceRoot "$pkg\$class.java"
    if (-not (Test-Path $dest)) { Write-Warning "Missing $dest"; continue }

    $gitPath = "backend/lianyu-service/src/main/java/com/lianyu/service/$class.java"
    $gitOut = $null
    try {
        $gitOut = & git -C $repo show "HEAD:$gitPath" 2>&1
    } catch {
        Write-Warning "No git HEAD for $class"
        continue
    }
    if ($null -eq $gitOut -or ($gitOut | Out-String) -match 'fatal:') { Write-Warning "No git HEAD for $class"; continue }
    $gitText = ($gitOut | Out-String)

    $currentImports = Get-ImportLines ([System.IO.File]::ReadAllText($dest))
    $gitImports = Get-ImportLines $gitText

    $merged = New-Object System.Collections.Generic.HashSet[string]
    foreach ($imp in $currentImports) { [void]$merged.Add($imp) }
    foreach ($imp in $gitImports) {
        if ($imp -match '^import com\.lianyu\.service\.([A-Za-z]+);$' -and $mapping.ContainsKey($Matches[1])) {
            $sub = $mapping[$Matches[1]]
            [void]$merged.Add("import com.lianyu.service.$sub.$($Matches[1]);")
        } elseif ($imp -match '^import com\.lianyu\.service\.impl\.') {
            $imp = $imp -replace '\.service\.impl\.', '.service.auth.impl.'
            [void]$merged.Add($imp)
        } else {
            [void]$merged.Add($imp)
        }
    }
    Rewrite-Imports $dest @($merged)
    Write-Host "Restored imports: $class"
}

# dto + rules + tools + config (fix-service-cross-imports touched these too)
Get-ChildItem -Path (Join-Path $serviceRoot 'dto') -Filter '*.java' | ForEach-Object {
    $rel = 'dto\' + $_.Name
    $dest = $_.FullName
    $gitPath = "backend/lianyu-service/src/main/java/com/lianyu/service/dto/$($_.Name)"
    $gitOut = $null
    try { $gitOut = & git -C $repo show "HEAD:$gitPath" 2>&1 } catch { return }
    if ($null -eq $gitOut -or ($gitOut | Out-String) -match 'fatal:') { return }
    $gitText = ($gitOut | Out-String)
    $currentImports = Get-ImportLines ([System.IO.File]::ReadAllText($dest))
    $gitImports = Get-ImportLines $gitText
    $merged = [System.Collections.Generic.HashSet[string]]::new()
    foreach ($imp in ($currentImports + $gitImports)) { [void]$merged.Add($imp) }
    Rewrite-Imports $dest @($merged)
    Write-Host "Restored imports: $rel"
}

foreach ($sub in @('rules', 'tools', 'config')) {
    $dir = Join-Path $serviceRoot $sub
    if (-not (Test-Path $dir)) { continue }
    Get-ChildItem -Path $dir -Recurse -Filter '*.java' | ForEach-Object {
        $relFromService = $_.FullName.Substring($serviceRoot.Length + 1) -replace '\\', '/'
        $gitPath = "backend/lianyu-service/src/main/java/com/lianyu/service/$relFromService"
        $gitOut = $null
        try { $gitOut = & git -C $repo show "HEAD:$gitPath" 2>&1 } catch { return }
        if ($null -eq $gitOut -or ($gitOut | Out-String) -match 'fatal:') { return }
        $gitText = ($gitOut | Out-String)
        $currentImports = Get-ImportLines ([System.IO.File]::ReadAllText($_.FullName))
        $gitImports = Get-ImportLines $gitText
        $merged = [System.Collections.Generic.HashSet[string]]::new()
        foreach ($imp in ($currentImports + $gitImports)) {
            if ($imp -match '^import com\.lianyu\.service\.([A-Za-z]+);$' -and $mapping.ContainsKey($Matches[1])) {
                $n = $Matches[1]
                [void]$merged.Add("import com.lianyu.service.$($mapping[$n]).$n;")
            } else {
                [void]$merged.Add($imp)
            }
        }
        Rewrite-Imports $_.FullName @($merged)
        Write-Host "Restored imports: $relFromService"
    }
}

# AuthServiceImpl
$implDest = Join-Path $serviceRoot 'auth\impl\AuthServiceImpl.java'
if (Test-Path $implDest) {
    $gitText = git show 'HEAD:backend/lianyu-service/src/main/java/com/lianyu/service/impl/AuthServiceImpl.java' 2>$null
    if ($gitText) {
        $currentImports = Get-ImportLines ([System.IO.File]::ReadAllText($implDest))
        $gitImports = @()
        foreach ($imp in (Get-ImportLines $gitText)) {
            if ($imp -match '^import com\.lianyu\.service\.([A-Za-z]+);$' -and $mapping.ContainsKey($Matches[1])) {
                $gitImports += "import com.lianyu.service.$($mapping[$Matches[1]]).$($Matches[1]);"
            } elseif ($imp -match '^import com\.lianyu\.service\.impl\.') {
                $gitImports += ($imp -replace '\.service\.impl\.', '.service.auth.impl.')
            } else {
                $gitImports += $imp
            }
        }
        $merged = [System.Collections.Generic.HashSet[string]]::new()
        foreach ($imp in ($currentImports + $gitImports)) { [void]$merged.Add($imp) }
        Rewrite-Imports $implDest @($merged)
        Write-Host 'Restored imports: AuthServiceImpl'
    }
}

Pop-Location
Write-Host 'Done'
