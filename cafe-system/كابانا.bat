@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"
title كابانا كافيه

REM ===== التأكد من Node.js =====
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js غير مثبّت. نزّل نسخة 20 من nodejs.org ثم أعد المحاولة.
  pause
  exit /b 1
)

REM ===== تثبيت مكتبات الخادم أول مرة =====
if not exist "server\node_modules" (
  echo 📦 تثبيت المكتبات لأول مرة... (استنى شوية)
  cd server & call npm install & cd ..
)

REM ===== تجهيز قاعدة البيانات أول مرة =====
if not exist "server\data\cafe.db" (
  echo 🌱 تجهيز قاعدة البيانات...
  cd server & call npm run seed & cd ..
)

REM ===== تشغيل الخادم في الخلفية (نافذة مصغّرة) =====
echo ☕ جاري تشغيل كابانا...
start "كابانا-الخادم" /min cmd /c "cd /d "%~dp0server" && node src\index.js"

REM ===== انتظار حتى يعمل الخادم =====
set /a tries=0
:waitloop
timeout /t 1 >nul
powershell -NoProfile -Command "try{(New-Object Net.Sockets.TcpClient).Connect('127.0.0.1',4000);exit 0}catch{exit 1}" >nul 2>&1
if not errorlevel 1 goto ready
set /a tries+=1
if !tries! lss 40 goto waitloop
echo [!] تعذّر تشغيل الخادم. افتح المتصفح يدوياً على http://localhost:4000
pause
exit /b 1

:ready
REM ===== فتح النظام فُل سكرين (وضع التطبيق) =====
set "CH1=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CH2=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "ED1=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "ED2=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist "%CH1%" ( start "" "%CH1%" --app=http://localhost:4000 --start-fullscreen & goto done )
if exist "%CH2%" ( start "" "%CH2%" --app=http://localhost:4000 --start-fullscreen & goto done )
if exist "%ED1%" ( start "" "%ED1%" --app=http://localhost:4000 --start-fullscreen & goto done )
if exist "%ED2%" ( start "" "%ED2%" --app=http://localhost:4000 --start-fullscreen & goto done )
start "" http://localhost:4000

:done
exit
