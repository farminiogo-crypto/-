@echo off
chcp 65001 >nul
title تشغيل كافيه كابانا
cd /d "%~dp0"

rem البرنامج شغال؟ افتح المتصفح وخلاص
powershell -command "try{Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health -TimeoutSec 2|Out-Null;exit 0}catch{exit 1}" >nul 2>&1
if %errorlevel%==0 goto openbrowser

echo جاري تشغيل كابانا... (اول مرة ممكن ياخد دقايق)

rem تجهيز اول مرة فقط
if not exist "server\node_modules" ( cd server & call npm install & cd .. )
if not exist "client\node_modules" ( cd client & call npm install & cd .. )
if not exist "client\dist"         ( cd client & call npm run build & cd .. )
if not exist "server\data\cafe.db" ( cd server & call npm run seed & cd .. )

rem تشغيل الخادم في نافذة مصغرة في الخلفية
cd server
start "Cabana Server" /min cmd /c "node src\index.js > data\server.log 2>&1"
cd ..

rem استنى لحد ما يقوم
set /a tries=0
:waitloop
timeout /t 1 /nobreak >nul
powershell -command "try{Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/health -TimeoutSec 2|Out-Null;exit 0}catch{exit 1}" >nul 2>&1
if %errorlevel%==0 goto openbrowser
set /a tries+=1
if %tries% lss 15 goto waitloop
echo في مشكلة في التشغيل - كلم الدعم (محمود) وابعتله الملف server\data\server.log
pause
exit /b 1

:openbrowser
start http://localhost:4000
exit /b 0
