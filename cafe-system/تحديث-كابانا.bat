@echo off
chcp 65001 >nul
title تحديث كافيه كابانا
cd /d "%~dp0"

echo جاري تنزيل اخر تحديث...
git pull
if errorlevel 1 ( echo فشل التنزيل - اتاكد من النت & pause & exit /b 1 )

echo تحديث المكتبات...
cd server & call npm install & cd ..
cd client & call npm install & cd ..

echo بناء الواجهة...
cd client & call npm run build & cd ..

echo اعادة تشغيل الخادم...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul
cd server
start "Cabana Server" /min cmd /c "node src\index.js > data\server.log 2>&1"
cd ..
timeout /t 3 /nobreak >nul

start http://localhost:4000
echo التحديث خلص!
pause
