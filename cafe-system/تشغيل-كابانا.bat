@echo off
title Cabana Cafe
cd /d "%~dp0"

rem --- already running? just open the browser ---
node -e "require('http').get('http://127.0.0.1:4000/api/health',function(r){process.exit(0)}).on('error',function(){process.exit(1)})" >nul 2>&1
if %errorlevel%==0 goto openbrowser

echo Starting Cabana... (first time may take a few minutes)

rem --- first-time setup only (server packages + database) ---
if not exist "server\node_modules" ( cd server & call npm install & cd .. )
if not exist "server\data\cafe.db" ( cd server & call npm run seed & cd .. )

rem --- start server minimized in background ---
cd server
start "Cabana Server" /min cmd /c "node src\index.js > data\server.log 2>&1"
cd ..

rem --- wait until it responds ---
set /a tries=0
:waitloop
ping -n 2 127.0.0.1 >nul
node -e "require('http').get('http://127.0.0.1:4000/api/health',function(r){process.exit(0)}).on('error',function(){process.exit(1)})" >nul 2>&1
if %errorlevel%==0 goto openbrowser
set /a tries+=1
if %tries% lss 20 goto waitloop

echo.
echo ERROR: server did not start. Call Mahmoud and send file: server\data\server.log
pause
exit /b 1

:openbrowser
start http://127.0.0.1:4000
exit /b 0
