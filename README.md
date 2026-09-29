# بابل أكاديمي — Babel Academic

موقع «بابل أكاديمي» للدعم الأكاديمي لطلاب الماجستير والدكتوراه. موقع ثابت مبني بـ [Astro](https://astro.build) مع GSAP وLenis للحركة.

- المرجع الكامل للمشروع: [`BABEL_BRIEF.md`](BABEL_BRIEF.md)
- قرارات التنفيذ: [`DECISIONS.md`](DECISIONS.md)
- التسليم وما ينتظر محمود: [`HANDOFF.md`](HANDOFF.md)

## التشغيل

```bash
npm install
npm run dev        # خادم التطوير على http://localhost:4321
npm run build      # يبني الموقع إلى dist/
npm run preview    # يعرض نسخة البناء
npm run check      # فحص الأنواع
```

يتطلب Node 22.12 أو أحدث.

## أين أعدّل؟

| ما تريد تغييره | الملف |
|---|---|
| رقم واتساب، البريد، النطاق، الحسابات الاجتماعية، الأرقام، الشهادات، الفريق، بنود السياسات | `src/config/site.ts` |
| نصوص الخدمات | `src/content/services/*.md` |
| المجالات الأكاديمية | `src/content/fields/*.md` |
| معرض الأعمال (ومنها `published` و`image`) | `src/content/portfolio/*.md` |
| مقالات المدونة | `src/content/blog/*.md` |
| نصوص الرئيسية المشتركة (الطبقات، الالتزامات، الخطوات، الأسئلة) | `src/data/home.ts` |
| الألوان والخطوط والمسافات | `src/styles/tokens.css` |

أي قيمة `null` في `site.ts` يختفي العنصر المرتبط بها من الموقع تلقائيًا.

## أدوات مساعدة

```bash
npm run fonts   # يعيد بناء ملفات الخطوط من @fontsource (يحتاج: pip install fonttools brotli)
npm run og      # يعيد توليد صور المشاركة 1200×630 وأيقونات الشعار (يحتاج Playwright وخادم الموقع على 4321)
```
