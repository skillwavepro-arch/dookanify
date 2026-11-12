@echo off
setlocal EnableDelayedExpansion
title Dookanify - আব্দুল্লাহ ফ্যাশন (Smart POS Desktop Launcher)

:: ============================================================================
:: Dookanify - আব্দুল্লাহ ফ্যাশন (One-Click Windows Desktop App Launcher)
:: Automatically creates Desktop Shortcut on first run and opens a 1280x820
:: standalone GUI Desktop Window (--app mode) via Edge / Chrome / Local Server.
:: ============================================================================

set "APP_NAME=Dookanify"
set "APP_URL=https://management-apkexe.web.app"
set "LOCAL_URL=http://localhost:3000"
set "APP_DIR=%LOCALAPPDATA%\Dookanify"
if not exist "%APP_DIR%" mkdir "%APP_DIR%" >nul 2>&1

:: Copy icon.ico to %LOCALAPPDATA%\Dookanify\icon.ico if available next to script
if exist "%~dp0icon.ico" (
    copy /Y "%~dp0icon.ico" "%APP_DIR%\icon.ico" >nul 2>&1
) else if exist "%~dp0public\icon.ico" (
    copy /Y "%~dp0public\icon.ico" "%APP_DIR%\icon.ico" >nul 2>&1
)

:: Copy launcher script to %LOCALAPPDATA%\Dookanify\Run-Dookanify-PC.bat for Desktop Shortcut
copy /Y "%~f0" "%APP_DIR%\Run-Dookanify-PC.bat" >nul 2>&1

:: Auto-create "Dookanify" Desktop Shortcut on First Run
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ^
  "$desk = [Environment]::GetFolderPath('Desktop'); " ^
  "$lnkPath = Join-Path $desk 'Dookanify.lnk'; " ^
  "if (-not (Test-Path $lnkPath)) { " ^
  "  $wsh = New-Object -ComObject WScript.Shell; " ^
  "  $sc = $wsh.CreateShortcut($lnkPath); " ^
  "  $edge = (Get-Command msedge.exe -ErrorAction SilentlyContinue).Source; " ^
  "  if (-not $edge) { $edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' }; " ^
  "  if (Test-Path $edge) { " ^
  "    $sc.TargetPath = $edge; " ^
  "    $sc.Arguments = '--app=https://management-apkexe.web.app --window-size=1280,820'; " ^
  "  } else { " ^
  "    $sc.TargetPath = '%APP_DIR%\Run-Dookanify-PC.bat'; " ^
  "  } " ^
  "  if (Test-Path '%APP_DIR%\icon.ico') { $sc.IconLocation = '%APP_DIR%\icon.ico,0' }; " ^
  "  $sc.Description = 'Dookanify - আব্দুল্লাহ ফ্যাশন (Smart POS)'; " ^
  "  $sc.Save(); " ^
  "}" >nul 2>&1

:: Check if local dev/prod server is listening on port 3000
set "TARGET_URL=%APP_URL%"
powershell -NoProfile -WindowStyle Hidden -Command ^
  "try { $c = New-Object Net.Sockets.TcpClient('127.0.0.1', 3000); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    set "TARGET_URL=%LOCAL_URL%"
)

:: 1. Try Microsoft Edge in Standalone Desktop GUI Window Mode (1280x820)
where msedge >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    start "" msedge --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)

:: 2. Try Google Chrome in Standalone Desktop GUI Window Mode (1280x820)
where chrome >nul 2>&1
if "%ERRORLEVEL%"=="0" (
    start "" chrome --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app="%TARGET_URL%" --window-size=1280,820
    exit /b 0
)

:: 3. Fallback: Open in default system browser
start "" "%TARGET_URL%"
exit /b 0
