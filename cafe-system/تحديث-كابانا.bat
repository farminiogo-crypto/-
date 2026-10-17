@echo off
title Cabana Update
cd /d "%~dp0"

set BRANCH=claude/cafe-system-design-gpp6c1

echo Downloading latest version...
git fetch origin %BRANCH%
if errorlevel 1 ( echo FAILED: check internet connection & pause & exit /b 1 )

echo Applying update...
git checkout %BRANCH% >nul 2>&1
git reset --hard origin/%BRANCH%
if errorlevel 1 ( echo FAILED to apply update & pause & exit /b 1 )

echo Updating server packages...
cd server & call npm install & cd ..

echo Stopping old server...
taskkill /f /im node.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul

echo.
echo ==========================================
echo  Update done!
echo  Open the program again from:
echo  tashghil-cabana-desktop.bat
echo ==========================================
pause
