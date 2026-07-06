#!/usr/bin/env bash
# ☕ تشغيل نظام الكافيه بأمر واحد
# الاستخدام:  ./start.sh
set -e

cd "$(dirname "$0")"
echo "☕ جاري تجهيز نظام الكافيه..."

# 1) تثبيت مكتبات الخادم (أول مرة فقط)
if [ ! -d "server/node_modules" ]; then
  echo "📦 تثبيت مكتبات الخادم..."
  (cd server && npm install)
fi

# 2) تثبيت مكتبات الواجهة + بناؤها (أول مرة فقط)
if [ ! -d "client/node_modules" ]; then
  echo "📦 تثبيت مكتبات الواجهة..."
  (cd client && npm install)
fi
if [ ! -d "client/dist" ]; then
  echo "🔨 بناء الواجهة..."
  (cd client && npm run build)
fi

# 3) تعبئة قاعدة البيانات (أول مرة فقط — احذف server/data/cafe.db لإعادة التعبئة)
if [ ! -f "server/data/cafe.db" ]; then
  echo "🌱 تعبئة قاعدة البيانات ببيانات أولية..."
  (cd server && npm run seed)
fi

echo ""
echo "✅ جاهز! افتح المتصفح على:  http://localhost:4000"
echo "   👤 مدير:  admin / admin123"
echo "   👤 كاشير: cashier / cashier123"
echo "   (اضغط Ctrl+C لإيقاف الخادم)"
echo ""

# 4) تشغيل الخادم
cd server && npm start
