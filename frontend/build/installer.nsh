; NSIS hooks for Amiweave. Keep the legacy process cleanup for RC upgrades.
!macro customInit
  nsExec::ExecToStack 'taskkill /F /IM "Amiweave.exe" /T'
  Pop $0
  Pop $1
  nsExec::ExecToStack 'taskkill /F /IM "LianYu.exe" /T'
  Pop $0
  Pop $1
  Sleep 800
  ; In-place upgrades to the same folder may refresh app.asar but leave an older electron shell.
  nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "foreach ($$k in Get-ChildItem ''HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall'') { $$p = Get-ItemProperty $$k.PSPath -ErrorAction SilentlyContinue; if ($$null -eq $$p -or ($$p.DisplayName -notlike ''Amiweave*'' -and $$p.DisplayName -notlike ''LianYu*'')) { continue }; foreach ($$name in @(''Amiweave.exe'', ''LianYu.exe'')) { if ($$p.UninstallString -match ''\"(.+)\\Uninstall .+\.exe\"'') { $$exe = Join-Path $$matches[1] $$name; if (Test-Path -LiteralPath $$exe) { Remove-Item -LiteralPath $$exe -Force -ErrorAction SilentlyContinue } } } }"'
  Pop $0
  Pop $1
!macroend
