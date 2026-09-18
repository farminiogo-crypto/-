@echo off
chcp 65001 >nul
title إيقاف كابانا
echo جاري إيقاف كابانا...
REM إغلاق خادم النظام (كل عمليات node على الجهاز)
taskkill /f /im node.exe >nul 2>&1
echo ✅ تم إيقاف النظام. تقدر تقفل النافذة.
timeout /t 2 >nul
exit
