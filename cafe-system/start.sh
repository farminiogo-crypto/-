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

# 4) اختيار بورت فاضي (يبدأ من 4000، ويزيد لو مشغول)
PORT="${PORT:-4000}"
while lsof -ti "tcp:$PORT" >/dev/null 2>&1; do
  echo "⚠️  البورت $PORT مشغول، بجرّب اللي بعده..."
  PORT=$((PORT + 1))
done

echo ""
echo "✅ جاهز! افتح المتصفح على:  http://localhost:$PORT"
echo "   👤 مدير:  admin / admin123"
echo "   👤 كاشير: cashier / cashier123"
echo "   (اضغط Ctrl+C لإيقاف الخادم)"
echo ""

# 5) تشغيل الخادم على البورت المختار
cd server && PORT="$PORT" npm start
