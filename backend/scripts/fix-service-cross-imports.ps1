$ErrorActionPreference = 'Stop'
$serviceRoot = 'c:\Users\hp\Desktop\LianYu-PC\backend\lianyu-service\src\main\java\com\lianyu\service'
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

$domainPkgs = @('ai','auth','character','conversation','memory','moments','notification','square','storage','support')
Get-ChildItem -Path $serviceRoot -Recurse -Filter '*.java' | Where-Object {
    $rel = $_.FullName.Substring($serviceRoot.Length + 1)
    foreach ($p in $domainPkgs) {
        if ($rel -like "$p\*") { return $true }
    }
    return $false
} | ForEach-Object {
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.AddRange([System.IO.File]::ReadAllLines($_.FullName))

    $pkgIdx = -1
    $currentPkg = ''
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^package com\.lianyu\.service\.(.+);') {
            $pkgIdx = $i
            $currentPkg = $Matches[1]
            if ($currentPkg -eq 'auth.impl') { $currentPkg = 'auth' }
            break
        }
    }
    if ($pkgIdx -lt 0) { return }

    $bodyStart = $pkgIdx + 1
    while ($bodyStart -lt $lines.Count -and [string]::IsNullOrWhiteSpace($lines[$bodyStart])) { $bodyStart++ }

    $endImports = $bodyStart
    while ($endImports -lt $lines.Count -and $lines[$endImports] -match '^import ') { $endImports++ }

    $body = ($lines[$bodyStart..($lines.Count - 1)] | Where-Object { $_ -notmatch '^import ' }) -join "`n"
    $otherImports = @()
    for ($i = $bodyStart; $i -lt $endImports; $i++) {
        $line = $lines[$i].Trim()
        if ($line -match '^import ' -and $line -notmatch '^import com\.lianyu\.service\.(ai|auth|character|conversation|memory|moments|notification|square|storage|support)\.') {
            $otherImports += $line
        }
    }

    $needed = New-Object System.Collections.Generic.HashSet[string]
    foreach ($entry in $mapping.GetEnumerator()) {
        $class = $entry.Key
        $pkg = $entry.Value
        if ($pkg -eq $currentPkg) { continue }
        if ($body -match "(?<![.\w])$class(?![.\w])") {
            [void]$needed.Add("import com.lianyu.service.$pkg.$class;")
        }
    }

    $allImports = ($otherImports + $needed) | Sort-Object -Unique
    $out = [System.Collections.Generic.List[string]]::new()
    $out.Add($lines[$pkgIdx])
    $out.Add('')
    foreach ($imp in $allImports) { $out.Add($imp) }
    if ($allImports.Count -gt 0) { $out.Add('') }
    for ($i = $endImports; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^import ') { continue }
        $out.Add($lines[$i])
    }

    [System.IO.File]::WriteAllLines($_.FullName, $out, $utf8NoBom)
}

Write-Host 'Cross-imports fixed'
