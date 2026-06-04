param([string]$Root = 'c:\Users\hp\Desktop\LianYu-PC\backend')
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
Get-ChildItem -Path $Root -Recurse -Filter '*.java' | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $text = $utf8NoBom.GetString($bytes, 3, $bytes.Length - 3)
        [System.IO.File]::WriteAllText($_.FullName, $text, $utf8NoBom)
        Write-Host "BOM removed: $($_.FullName)"
    }
}
