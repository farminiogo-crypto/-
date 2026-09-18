#!/usr/bin/env bash
# 🔄 تحديث نظام كابانا بأمر واحد — يُشغَّل على جهاز الكافيه
# ينزّل آخر نسخة من GitHub، يبني الواجهة، ويعيد تشغيل الخادم
# ⚠️ لا يمسح البيانات أبداً — قاعدة البيانات والنسخ الاحتياطية بتفضل زي ما هي
set -e
cd "$(dirname "$0")"

echo "🔄 جاري تنزيل آخر تحديث..."
git pull

echo "📦 تحديث المكتبات (لو فيه جديد)..."
(cd server && npm install --omit=dev 2>/dev/null || npm install)
(cd client && npm install)

echo "🔨 بناء الواجهة..."
(cd client && npm run build)

echo "♻️  إعادة تشغيل الخادم..."
PORT="${PORT:-4000}"
lsof -ti "tcp:$PORT" | xargs kill 2>/dev/null || true
sleep 1

echo ""
echo "✅ التحديث خلص! جاري التشغيل..."
./start.sh
