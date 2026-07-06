# نظام الكافيه — دليل للمساعد (CLAUDE.md)

نظام إدارة كافيه بنظام **الترابيزات والشيفتات**، دفع **كاش فقط** وبدون ضرائب.

## التقنيات
- **Backend:** Node.js + Express + SQLite (better-sqlite3) + JWT/bcrypt — مجلد `server/`
- **Frontend:** React 18 + Vite + React Router (عربي RTL) — مجلد `client/`

## أوامر التشغيل (من مجلد `cafe-system/`)
```bash
npm run setup     # تثبيت الكل + بيانات أولية + بناء الواجهة
npm start         # الخادم يخدم الواجهة على http://localhost:4000
npm run dev:server && npm run dev:client   # وضع التطوير (4000 + 5173)
npm run seed      # إعادة تعبئة قاعدة البيانات من الصفر
```
> ملف قاعدة البيانات في `server/data/cafe.db` (متجاهَل في git). لو غيّرت المخطط في `server/src/db.js` شغّل `npm run seed`.

## حسابات الدخول
- مدير: `admin` / `admin123`
- كاشير: `cashier` / `cashier123`

## الهيكل
```
server/src/
  db.js            # المخطط (SCHEMA) + initSchema
  seed.js          # بيانات أولية (drop + recreate + insert)
  auth.js          # signToken / requireAuth / requireAdmin
  routes/          # auth · menu · tables · orders · shifts · expenses · inventory · reports
client/src/
  api.js           # كل نداءات الـ API + إدارة التوكن (localStorage)
  main.jsx         # المسارات + حماية الصفحات
  pages/           # Login · POS · ShiftPage · Expenses · Inventory · Dashboard · MenuManager
  components/      # Layout (القائمة الجانبية) · Receipt (إيصال 80مم)
  styles.css       # كل التنسيقات (متغيرات ألوان في :root)
```

## قواعد ومنطق مهم
- **الفواتير:** `orders.status` = `open | paid | cancelled`. الإجمالي يُحسب في الخادم من `order_items` (لا يُعتمد على العميل).
- **الشيفت:** واحد مفتوح فقط في نفس الوقت. المتوقع في الدرج = `رصيد البداية + مبيعات كاش − مصروفات`. لازم تُقفل كل الفواتير المفتوحة قبل قفل الشيفت.
- **المصروفات** مربوطة بالشيفت المفتوح (`shift_id`).
- **الأدوار:** المدير يشوف لوحة التحكم/المخزون/إدارة المنيو؛ الكاشير يشوف الترابيزات/الشيفت/المصروفات فقط.
- **الطباعة:** الإيصال مقاس 80مم عبر `@page` + `window.print()`.

## أعراف الكود
- الواجهة كلها عربي RTL — أي نص جديد بالعربي.
- الألوان من متغيرات CSS في `:root` بملف `styles.css` (مثل `--brand`, `--accent`).
- بعد أي تعديل على `client/` لازم `npm run build` عشان الخادم يخدم النسخة الجديدة.

## الحالة الحالية
النظام مكتمل وشغّال: POS بالترابيزات (+إضافة ترابيزة وفتح حساب باسم الزبون)، شيفتات بجرد الدرج (اسم الكاشير إجباري)، مصروفات، مخزون بمستويي تنبيه (قرب يخلص/اطلب فوراً) ووحدات من قائمة، صفحة فواتير سابقة بفلتر وبحث وتفاصيل وإعادة طباعة، إدارة منيو بمكتبة أيقونات (بدون تكرار)، خط Cairo مدمج محلياً، تصميم متجاوب (موبايل: شريط تنقل سفلي ≤640px، تابلت: شريط أيقونات ≤900px).

### ملاحظات تقنية
- `db.js` فيه ترقيات تلقائية (migrations) — أي عمود جديد يُضاف بـ `ALTER TABLE` داخل `initSchema` بدون فقدان بيانات.
- `GET /api/orders` يرجع `{rows, count, total}` مع فلاتر `?date=&q=`.
- مكتبة الأيقونات `ICON_SET` في `MenuManager.jsx`، ووحدات المخزون `UNITS` في `Inventory.jsx`.
- الخط في `client/public/fonts/` (يُنسخ لـ dist تلقائياً).

### أفكار مفتوحة للتوسعة
- ربط المخزون بالمنتجات (خصم تلقائي حسب المكونات)
- شاشة مطبخ (KDS) · منيو QR للعملاء · تصدير تقارير PDF
