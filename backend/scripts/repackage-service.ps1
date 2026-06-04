# One-time: move root com.lianyu.service.* classes into domain subpackages
$ErrorActionPreference = 'Stop'
$root = 'c:\Users\hp\Desktop\LianYu-PC\backend\lianyu-service\src\main\java\com\lianyu\service'
$backend = 'c:\Users\hp\Desktop\LianYu-PC\backend'

$mapping = @{
    'AiChatService' = 'ai'
    'AiChatQuotaService' = 'ai'
    'ApiKeyVaultService' = 'ai'
    'EmbeddingService' = 'ai'
    'RerankerService' = 'ai'
    'CharacterPromptBuilder' = 'ai'
    'AssistantReplySplitter' = 'ai'
    'AuthService' = 'auth'
    'AuthRateLimiter' = 'auth'
    'CaptchaService' = 'auth'
    'CharacterService' = 'character'
    'CharacterChatBehavior' = 'character'
    'CharacterChatBehaviorResolver' = 'character'
    'CharacterStateService' = 'character'
    'CharacterDiaryService' = 'character'
    'EmotionDecayScheduler' = 'character'
    'CharacterSquareService' = 'square'
    'CharacterSquareAvatarSync' = 'square'
    'CharacterSquareCatalog' = 'square'
    'CharacterSquareCatalogDal' = 'square'
    'CharacterSquareCatalogGenshin' = 'square'
    'CharacterSquareTags' = 'square'
    'ConversationService' = 'conversation'
    'ConversationAccessService' = 'conversation'
    'GroupChatService' = 'conversation'
    'SingleChatOpeningScheduler' = 'conversation'
    'ProactiveChatScheduler' = 'conversation'
    'MemoryRetriever' = 'memory'
    'MemoryWriter' = 'memory'
    'MemoryConsumer' = 'memory'
    'MomentsService' = 'moments'
    'MomentsCommentService' = 'moments'
    'MomentsCommentOrchestrator' = 'moments'
    'MomentsScheduler' = 'moments'
    'NotificationService' = 'notification'
    'NotificationPushConsumer' = 'notification'
    'WebPushService' = 'notification'
    'FileStorageService' = 'storage'
    'OutputLanguageService' = 'support'
}

foreach ($pkg in $mapping.Values | Select-Object -Unique) {
    $dir = Join-Path $root $pkg
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

foreach ($entry in $mapping.GetEnumerator()) {
    $class = $entry.Key
    $pkg = $entry.Value
    $src = Join-Path $root "$class.java"
    if (-not (Test-Path $src)) { Write-Warning "Skip missing: $class"; continue }
    $destDir = Join-Path $root $pkg
    $dest = Join-Path $destDir "$class.java"
    $content = Get-Content $src -Raw -Encoding UTF8
    $content = $content -replace 'package com\.lianyu\.service;', "package com.lianyu.service.$pkg;"
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($dest, $content, $utf8NoBom)
    Remove-Item $src -Force
    Write-Host "Moved $class -> $pkg"
}

# AuthServiceImpl -> auth.impl
$implSrc = Join-Path $root 'impl\AuthServiceImpl.java'
$implDestDir = Join-Path $root 'auth\impl'
if (-not (Test-Path $implDestDir)) { New-Item -ItemType Directory -Path $implDestDir -Force | Out-Null }
if (Test-Path $implSrc) {
    $content = Get-Content $implSrc -Raw -Encoding UTF8
    $content = $content -replace 'package com\.lianyu\.service\.impl;', 'package com.lianyu.service.auth.impl;'
    Set-Content -Path (Join-Path $implDestDir 'AuthServiceImpl.java') -Value $content -Encoding UTF8 -NoNewline
    Remove-Item $implSrc -Force
    if ((Get-ChildItem (Join-Path $root 'impl') -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) {
        Remove-Item (Join-Path $root 'impl') -Force -ErrorAction SilentlyContinue
    }
    Write-Host 'Moved AuthServiceImpl -> auth.impl'
}

# Update imports across backend Java sources
$javaFiles = Get-ChildItem -Path $backend -Recurse -Filter '*.java' | Where-Object { $_.FullName -notmatch '\\target\\' }
foreach ($file in $javaFiles) {
    $text = Get-Content $file.FullName -Raw -Encoding UTF8
    $orig = $text
    foreach ($entry in $mapping.GetEnumerator()) {
        $class = $entry.Key
        $pkg = $entry.Value
        $text = $text.Replace("import com.lianyu.service.$class;", "import com.lianyu.service.$pkg.$class;")
    }
    $text = $text.Replace('import com.lianyu.service.impl.AuthServiceImpl;', 'import com.lianyu.service.auth.impl.AuthServiceImpl;')
    $text = $text.Replace('import com.lianyu.service.AuthService;', 'import com.lianyu.service.auth.AuthService;')
    if ($text -ne $orig) {
        Set-Content -Path $file.FullName -Value $text -Encoding UTF8 -NoNewline
        Write-Host "Updated imports: $($file.Name)"
    }
}

Write-Host 'Done. Run: mvn -pl lianyu-service -am compile -DskipTests'
