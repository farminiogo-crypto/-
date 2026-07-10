#!/bin/bash
# 🔄 تحديث كافيه كابانا — للمالك/الدعم فقط (الموظفين مش محتاجين يلمسوه)
# بينزّل آخر نسخة ويعيد التشغيل — البيانات والفواتير بتفضل زي ما هي 100%
cd "$(dirname "$0")"

echo "🔄 جاري تنزيل آخر تحديث..."
git pull || { echo "❌ فشل التنزيل — اتأكد من النت"; read -p "اضغط Enter..."; exit 1; }

echo "📦 تحديث المكتبات..."
(cd server && npm install)
(cd client && npm install)

echo "🔨 بناء الواجهة..."
(cd client && npm run build)

echo "♻️ إعادة تشغيل الخادم..."
lsof -ti tcp:4000 | xargs kill 2>/dev/null || true
sleep 1
(cd server && nohup node src/index.js > data/server.log 2>&1 &)
sleep 3

if curl -s --max-time 2 "http://localhost:4000/api/health" >/dev/null 2>&1; then
  echo "✅ التحديث خلص وكابانا شغّال!"
  open "http://localhost:4000"
else
  echo "❌ الخادم مش بيرد — شوف server/data/server.log"
fi
read -p "اضغط Enter للإغلاق..."
