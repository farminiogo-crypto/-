@echo off
title Cabana Update
cd /d "%~dp0"

echo Downloading latest version...
git pull
if errorlevel 1 ( echo FAILED: check internet connection & pause & exit /b 1 )

echo Updating server packages...
cd server & call npm install & cd ..

echo Restarting server...
taskkill /f /im node.exe >nul 2>&1
ping -n 2 127.0.0.1 >nul
cd server
start "Cabana Server" /min cmd /c "node src\index.js > data\server.log 2>&1"
cd ..
ping -n 4 127.0.0.1 >nul

start http://127.0.0.1:4000
echo Update done!
pause
