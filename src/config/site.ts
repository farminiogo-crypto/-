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
  domain: null as string | null, // TODO محمود: النطاق الجديد (بدون https://)، مثال: 'babelacademic.sa'
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
  team: [
    // { name: 'د. محمد ماجد', role: 'مستشار رسائل الماجستير والدكتوراه', photo: null } ← بعد موافقته
  ] as TeamMember[],
};

// كل روابط واتساب تُبنى من هنا فقط
export const waBase = `https://wa.me/${site.whatsapp}`; // لنماذج GET التي تعمل بدون JS (الحقل text يضاف تلقائيًا)
export const wa = (msg: string) => `${waBase}?text=${encodeURIComponent(msg)}`;

// رسائل واتساب المعدة مسبقًا
export const waMessages = {
  general: 'مرحبًا بابل أكاديمي 👋 أود الاستفسار عن خدماتكم.',
  file: 'مرحبًا بابل أكاديمي 👋 أرغب في إرسال ملفي لمراجعته ومعرفة الخطوة التالية وتكلفتها.',
  service: (name: string) => `مرحبًا بابل أكاديمي 👋 أرغب في خدمة «${name}» وأود معرفة التفاصيل.`,
  field: (name: string) => `مرحبًا بابل أكاديمي 👋 أعمل على بحث في مجال ${name} وأحتاج إلى دعم.`,
  work: (title: string) => `مرحبًا بابل أكاديمي 👋 لدي عمل مشابه لـ «${title}» وأود معرفة التفاصيل.`,
};

export const siteUrl = site.domain ? `https://${site.domain}` : null;
