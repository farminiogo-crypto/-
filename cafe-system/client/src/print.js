// طباعة الإيصال — صامتة مباشرة على ماكينة الفواتير في تطبيق الديسك توب،
// ومربع طباعة المتصفح العادي كبديل في نسخة الويب.

// CSS مستقل للإيصال (نفس شكل @media print في styles.css) — يُستخدم في صفحة
// الطباعة المنفصلة عشان الطباعة الصامتة تطبع الإيصال نفسه مش صفحة البرنامج
const RECEIPT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 80mm auto; margin: 0; }
  html, body { width: 72mm; background: #fff; }
  body {
    margin: 0 auto; padding: 2mm 2mm 6mm; color: #000;
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    font-size: 13px; line-height: 1.6; font-weight: 600; text-align: center;
  }
  .receipt-logo { font-size: 26px; }
  h3 { font-size: 18px; font-weight: 900; margin: 2px 0; }
  .receipt-no { font-size: 14px; font-weight: 800; }
  .receipt-meta { font-size: 12px; }
  .receipt-sep { border-top: 1px dashed #000; margin: 8px 0; }
  .receipt-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .receipt-table th { border-bottom: 1px solid #000; font-size: 12px; padding-bottom: 3px; text-align: right; }
  .receipt-table td { padding: 2px 0; text-align: right; }
  .receipt-table th.c, .receipt-table td.c { text-align: center; }
  .receipt-table th.l, .receipt-table td.l { text-align: left; }
  .rc-note { font-size: 11px; font-weight: 700; }
  .rc-row { display: flex; justify-content: space-between; font-size: 13px; margin-top: 2px; }
  .rc-row.total { font-size: 17px; font-weight: 900; border-top: 1px dashed #000; margin-top: 6px; padding-top: 4px; }
  .receipt-thanks { font-size: 12px; margin-top: 8px; }
`;

// يبني صفحة HTML كاملة مستقلة فيها الإيصال فقط (بخط القاهرة من السيرفر المحلي)
function buildReceiptPage() {
  const receipt = document.getElementById('receipt-print');
  if (!receipt) return null;
  const origin = window.location.origin;
  return (
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    `<link rel="stylesheet" href="${origin}/fonts/cairo.css">` +
    `<style>${RECEIPT_CSS}</style></head><body>` +
    receipt.innerHTML +
    '</body></html>'
  );
}

export async function printReceipt() {
  // انتظر لحظة ليكتمل رسم الإيصال قبل الطباعة
  await new Promise((r) => setTimeout(r, 60));
  if (window.kabana && typeof window.kabana.printSilent === 'function') {
    try {
      const deviceName = localStorage.getItem('kabana_printer') || '';
      const html = buildReceiptPage();
      const res = await window.kabana.printSilent({
        ...(deviceName ? { deviceName } : {}),
        ...(html ? { html } : {}),
      });
      if (res && res.success) return true;
    } catch (e) {
      /* fall through to browser print */
    }
  }
  window.print();
  return true;
}

// قائمة الطابعات المتاحة (في تطبيق الديسك توب فقط)
export async function listPrinters() {
  if (window.kabana && typeof window.kabana.listPrinters === 'function') {
    try {
      return await window.kabana.listPrinters();
    } catch {
      return [];
    }
  }
  return [];
}

export const isDesktop = () => !!(window.kabana && window.kabana.desktop);
