@echo off
chcp 65001 >nul
cd /d "%~dp0"
title كابانا كافيه

echo ☕ جاري فتح كابانا (نسخة الديسك توب)...

REM التأكد من Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js غير مثبّت. نزّله من https://nodejs.org ثم أعد المحاولة.
  pause
  exit /b 1
)

REM تثبيت مكتبات الخادم (أول مرة)
if not exist "server\node_modules" ( echo 📦 تثبيت مكتبات الخادم... & cd server & call npm install & cd .. )

REM تثبيت Electron (أول مرة)
if not exist "node_modules\electron" ( echo 📦 تثبيت تطبيق الديسك توب... & call npm install )

REM بناء الواجهة لو مش موجودة (على ويندوز 10 الحديث)
if not exist "client\dist\index.html" ( echo 🔨 بناء الواجهة... & cd client & call npm install & call npm run build & cd .. )

REM تعبئة البيانات أول مرة
if not exist "server\data\cafe.db" ( echo 🌱 تجهيز قاعدة البيانات... & cd server & call npm run seed & cd .. )

REM تشغيل التطبيق فُل سكرين
call npm run desktop
