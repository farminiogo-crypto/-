// عزل المقاطع اللاتينية داخل نص عربي قصير (عناوين وأوصاف من ملفات المحتوى) بـ <bdi dir="ltr">،
// فلا تنقلب الأقواس ولا يتبعثر ترتيب الكلمات، مثل «خطاب دافع (Statement of Purpose)».
// يعيد HTML آمنًا (يهرّب المحارف الخاصة أولًا) ليُستخدم مع set:html.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const LATIN_RUN = /[A-Za-z][A-Za-z0-9.+#&;'’\-]*(?:[ \t]+[A-Za-z0-9][A-Za-z0-9.+#&;'’\-]*)*/g;

export const bidi = (text: string) => esc(text).replace(LATIN_RUN, (m) => `<bdi dir="ltr">${m}</bdi>`);
