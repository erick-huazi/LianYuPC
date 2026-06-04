$serviceRoot = 'c:\Users\hp\Desktop\LianYu-PC\backend\lianyu-service\src\main\java\com\lianyu\service'
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

Get-ChildItem -Path $serviceRoot -Recurse -Filter '*.java' | ForEach-Object {
    $lines = [System.Collections.Generic.List[string]]::new()
    $lines.AddRange([System.IO.File]::ReadAllLines($_.FullName))
    $seen = New-Object System.Collections.Generic.HashSet[string]
    $out = [System.Collections.Generic.List[string]]::new()
    $changed = $false

    foreach ($line in $lines) {
        if ($line -match 'import\s+[^;]+;') {
            $imports = [regex]::Matches($line, 'import\s+[^;]+;') | ForEach-Object { $_.Value.Trim() }
            if ($imports.Count -gt 1) { $changed = $true }
            foreach ($imp in $imports) {
                if ($seen.Add($imp)) { $out.Add($imp) } else { $changed = $true }
            }
        } else {
            $out.Add($line)
        }
    }

    if ($changed) {
        [System.IO.File]::WriteAllLines($_.FullName, $out, $utf8NoBom)
        Write-Host "Deduped: $($_.FullName.Substring($serviceRoot.Length + 1))"
    }
}
