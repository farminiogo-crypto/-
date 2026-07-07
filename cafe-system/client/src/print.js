// طباعة الإيصال — صامتة مباشرة على ماكينة الفواتير في تطبيق الديسك توب،
// ومربع طباعة المتصفح العادي كبديل في نسخة الويب.
export async function printReceipt() {
  // انتظر لحظة ليكتمل رسم الإيصال قبل الطباعة
  await new Promise((r) => setTimeout(r, 60));
  if (window.kabana && typeof window.kabana.printSilent === 'function') {
    try {
      const res = await window.kabana.printSilent();
      if (res && res.success) return true;
    } catch (e) {
      /* fall through to browser print */
    }
  }
  window.print();
  return true;
}

export const isDesktop = () => !!(window.kabana && window.kabana.desktop);
