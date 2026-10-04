@echo off
setlocal EnableDelayedExpansion
rem Run from the folder this file is in, or from the project folder when the
rem file has been copied elsewhere (e.g. the Windows Startup folder)
set "PROJECT_DIR=C:\Users\Migue\Documents\GitHub\supabase-login-tanstack-router"
if exist "%~dp0package.json" set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%" || (
    echo Project folder not found: %PROJECT_DIR%
    pause
    exit /b 1
)

rem First local port to try; moves up until a free one is found
set PORT=3000
rem Fixed HTTPS port on the Tailscale side - the phone URL never changes
set SERVE_PORT=4443

rem Let Vite accept requests addressed to Tailscale MagicDNS names (*.ts.net)
set __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.ts.net

:findport
netstat -ano -p tcp | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Port %PORT% is in use, trying next...
    set /a PORT+=1
    goto findport
)
netstat -ano -p tcpv6 | findstr /r /c:":%PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo Port %PORT% is in use, trying next...
    set /a PORT+=1
    goto findport
)

where tailscale >nul 2>nul
if errorlevel 1 (
    echo Tailscale CLI not found in PATH - phone URL will not be set up.
    goto run
)

rem Point the fixed Tailscale URL at whichever local port we got
tailscale serve --bg --https=%SERVE_PORT% http://127.0.0.1:%PORT% >nul
if errorlevel 1 echo Failed to set up tailscale serve on port %SERVE_PORT%.

for /f "tokens=2 delims=:, " %%h in ('tailscale status --json 2^>nul ^| findstr /c:"\"DNSName\""') do (
    if not defined TS_DNS set "TS_DNS=%%~h"
)
if defined TS_DNS set "TS_DNS=!TS_DNS:~0,-1!"

echo.
echo ==== Open this on your phone (same URL every time) ====
if defined TS_DNS (
    echo   https://!TS_DNS!:%SERVE_PORT%
) else (
    echo   https://^<this-pc^>.ts.net:%SERVE_PORT%
)
echo ========================================================
echo   Local: http://localhost:%PORT%
echo.

:run
call npm run dev -- --host 0.0.0.0 --port %PORT% --strictPort

endlocal
pause
