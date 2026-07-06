#!/bin/bash
# ☕ تشغيل كافيه كابانا — دوس مرتين وخلاص
# لو البرنامج شغّال أصلاً: يفتح المتصفح على طول
# لو مش شغّال: يشغّله الأول (وأول مرة بس بيجهّز نفسه) وبعدين يفتح المتصفح
cd "$(dirname "$0")"

PORT=4000

# البرنامج شغّال؟ افتح المتصفح وخلاص
if curl -s --max-time 2 "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
  open "http://localhost:$PORT"
  exit 0
fi

echo "☕ جاري تشغيل كابانا... (أول مرة ممكن ياخد دقايق)"

# تجهيز أول مرة فقط
[ -d server/node_modules ] || (cd server && npm install)
[ -d client/node_modules ] || (cd client && npm install)
[ -d client/dist ]         || (cd client && npm run build)
[ -f server/data/cafe.db ] || (cd server && npm run seed)

# تشغيل الخادم في الخلفية (يفضل شغّال حتى لو قفلت النافذة دي)
(cd server && nohup node src/index.js > data/server.log 2>&1 &)

# استنى لحد ما يقوم وافتح المتصفح
for i in 1 2 3 4 5 6 7 8 9 10; do
  sleep 1
  if curl -s --max-time 2 "http://localhost:$PORT/api/health" >/dev/null 2>&1; then
    open "http://localhost:$PORT"
    echo "✅ كابانا شغّال! ممكن تقفل النافذة دي."
    exit 0
  fi
done

echo "❌ في مشكلة في التشغيل — كلم الدعم (محمود) وابعتله الملف: server/data/server.log"
read -p "اضغط Enter للإغلاق..."
