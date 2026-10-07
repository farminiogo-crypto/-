// كل ما يخص العلامة والتواصل والأرقام يأتي من هنا فقط.
// أي قيمة غير مؤكدة تبقى null ويختفي العنصر المرتبط بها من الواجهة تلقائيًا.

export type Stat = { label: string; value: number; suffix?: string };
export type Testimonial = { quote: string; role: string; field?: string };
export type TeamMember = { name: string; role: string; photo: string | null };
export type SocialKey = 'instagram' | 'x' | 'snapchat' | 'tiktok' | 'facebook' | 'linkedin';

export const site = {
  nameAr: 'بابل أكاديمي',
  nameEn: 'Babel Academic',
  tagline: 'نرافقك من الفكرة إلى المناقشة — بدقة، وسرية، وفي الموعد.',
  description:
    'بابل أكاديمي: دعم أكاديمي لطلاب الماجستير والدكتوراه في المملكة. استشارة منهجية، تصميم الاستبانات وتحكيمها، تحليل إحصائي مشروح، تحرير وتنسيق وتحقق من المراجع، وتحضير للمناقشة.',
  // النطاق الحالي على Vercel. TODO محمود: استبدله بالنطاق النهائي (بدون https://) عند شرائه، مثال: 'babelacademic.sa'
  domain: 'snowy-beta-36.vercel.app' as string | null,
  whatsapp: '966582744514', // TODO محمود: تأكيد رقم واتساب بيزنس الخاص ببابل أكاديمي
  email: null as string | null, // TODO محمود
  city: 'الرياض',
  legalEntity: null as string | null, // TODO محمود: «علامة تابعة لشركة بابل الحديثة (ذ.م.م)» + رقم السجل بعد التأكيد
  social: {
    instagram: null,
    x: null,
    snapchat: null,
    tiktok: null,
    facebook: null,
    linkedin: null,
  } as Record<SocialKey, string | null>,
  stats: null as null | Stat[], // يظهر شريط الأرقام فقط إن لم يكن null
  testimonials: [] as Testimonial[], // بإذن العميل فقط وبدون أسماء
  // بنود السياسات الرقمية — تبقى null حتى يعتمدها محمود، وتُصاغ النصوص بدونها تلقائيًا
  policy: {
    revisionRounds: null as number | null, // عدد جولات التعديل المشمولة افتراضيًا
    revisionWindowDays: null as number | null, // مدة طلب التعديلات بعد التسليم
    firstPaymentPercent: null as number | null, // نسبة الدفعة الأولى
    refundBeforeStartPercent: null as number | null, // نسبة الاسترداد إن أُلغي الطلب قبل البدء
    lastUpdated: '2026-09-29',
  },
  // true = لا يظهر في المعرض إلا عمل عليه consent: true (موافقة كتابية مسجلة). TODO محمود: فعّله بعد تسجيل الموافقات
  portfolioRequiresConsent: false,
  // عناصر ثقة إضافية — تظهر فقط عند تعبئتها
  hours: null as string | null, // TODO محمود: مثال «نرد من الأحد إلى الخميس، من 9 صباحًا إلى 11 مساءً»
  responseTime: null as string | null, // TODO محمود: مثال «عادة خلال ساعة في أوقات العمل»
  paymentMethods: [] as string[], // TODO محمود: مثال ['مدى', 'Apple Pay', 'تحويل بنكي', 'STC Pay']
  // أدوات التحليلات والبكسلات — تُحمَّل بعد أول تفاعل فقط، ولا يُحمَّل منها إلا ما له معرّف
  analytics: {
    ga4: null as string | null, // مثال 'G-XXXXXXX'
    plausible: null as string | null, // النطاق المسجل في Plausible
    metaPixel: null as string | null,
    snapPixel: null as string | null,
    tiktokPixel: null as string | null,
  },
  team: [
    // { name: 'د. محمد ماجد', role: 'مستشار رسائل الماجستير والدكتوراه', photo: null } ← بعد موافقته
  ] as TeamMember[],
};

// كل روابط واتساب تُبنى من هنا فقط.
// نستخدم api.whatsapp.com/send مباشرة لأن تحويل wa.me يكسر المحارف رباعية البايت (مثل الإيموجي) إلى «�».
// ونحذف أي محرف خارج النطاق الأساسي احتياطًا.
const stripAstral = (s: string) => s.replace(/[\u{10000}-\u{10FFFF}\uFE0F\u200D]/gu, '').replace(/[ \t]{2,}/g, ' ');
export const waBase = 'https://api.whatsapp.com/send'; // لنماذج GET التي تعمل بدون JS (مع حقلي phone وtext)
export const wa = (msg: string) => `${waBase}?phone=${site.whatsapp}&text=${encodeURIComponent(stripAstral(msg).trim())}`;

// رسائل واتساب المعدة مسبقًا
export const waMessages = {
  general: 'مرحبًا بابل أكاديمي، أود الاستفسار عن خدماتكم.',
  file: 'مرحبًا بابل أكاديمي، أرغب في إرسال ملفي لمراجعته ومعرفة الخطوة التالية وتكلفتها.',
  // الكلمة المفتاحية في سطر مستقل حتى يُعرف نوع الطلب من أول نظرة (ويمكن ربطها بالردود السريعة في واتساب بيزنس)
  service: (name: string, keyword?: string) =>
    `مرحبًا بابل أكاديمي، أرغب في خدمة «${name}» وأود معرفة التفاصيل.${keyword ? `\nنوع الخدمة: ${keyword}` : ''}`,
  field: (name: string) => `مرحبًا بابل أكاديمي، أعمل على بحث في مجال ${name} وأحتاج إلى دعم.`,
  work: (title: string) => `مرحبًا بابل أكاديمي، لدي عمل مشابه لـ «${title}» وأود معرفة التفاصيل.`,
};

export const siteUrl = site.domain ? `https://${site.domain}` : null;
