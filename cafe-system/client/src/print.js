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

// طباعة في المتصفح: نحمّل صفحة الإيصال المستقلة في إطار مخفي ونطبع الإطار نفسه —
// فمعاينة الطباعة تعرض الإيصال فقط (طباعة صفحة البرنامج كانت بتطلع معاينة فاضية)
function printViaFrame(html) {
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:80mm;height:400px;border:0;';
    let done = false; // onload ممكن يتنادى أكتر من مرة (about:blank ثم srcdoc) — نطبع مرة واحدة
    frame.onload = () => {
      const w = frame.contentWindow;
      // تجاهل تحميل الصفحة الفاضية الأولية — نطبع بس لما الإيصال يكون موجود فعلاً
      if (!w || !w.document.body || w.document.body.children.length === 0) return;
      const doPrint = () => {
        if (done) return;
        done = true;
        try {
          w.focus();
          w.print();
        } catch {
          window.print(); // احتياطي أخير
        }
        // شيل الإطار بعد ما حوار الطباعة يقفل
        setTimeout(() => frame.remove(), 60000);
        resolve(true);
      };
      // استنى تحميل خط القاهرة عشان المعاينة تطلع بالخط الصح
      if (w.document.fonts && w.document.fonts.ready) {
        w.document.fonts.ready.then(doPrint, doPrint);
        setTimeout(doPrint, 1500); // حد أقصى للانتظار
      } else {
        setTimeout(doPrint, 300);
      }
    };
    frame.srcdoc = html; // قبل الإضافة للصفحة — عشان مايحصلش تحميل صفحة فاضية الأول
    document.body.appendChild(frame);
  });
}

export async function printReceipt() {
  // انتظر لحظة ليكتمل رسم الإيصال قبل الطباعة
  await new Promise((r) => setTimeout(r, 60));

  // تطبيق الديسك توب: طباعة صامتة على ماكينة الفواتير.
  // بنستنسخ الإيصال في #print-host على مستوى body، ونطبع نافذة البرنامج نفسها
  // (نفس المسار اللي أثبت إنه بيوصل للطابعة) — وCSS الطباعة بيخفي التطبيق
  // ويظهر الإيصال المستنسخ بارتفاع صحيح فالطباعة تطلع كاملة مش فاضية.
  if (window.kabana && typeof window.kabana.printSilent === 'function') {
    const receipt = document.getElementById('receipt-print');
    let host = null;
    if (receipt) {
      document.getElementById('print-host')?.remove();
      host = document.createElement('div');
      host.id = 'print-host';
      host.innerHTML = receipt.innerHTML;
      document.body.appendChild(host);
      await new Promise((r) => setTimeout(r, 80)); // مهلة صغيرة لضمان تجهيز التخطيط
    }
    try {
      const deviceName = localStorage.getItem('kabana_printer') || '';
      const res = await window.kabana.printSilent(deviceName ? { deviceName } : {});
      if (res && res.success) return true;
      alert(
        '⚠️ الطباعة المباشرة على ماكينة الفواتير فشلت:\n\n' +
          (res && res.reason ? res.reason : 'سبب غير معروف') +
          '\n\nهنفتح نافذة الطباعة العادية دلوقتي.'
      );
    } catch (e) {
      alert('⚠️ الطباعة المباشرة فشلت: ' + (e && e.message ? e.message : e) + '\nهنفتح نافذة الطباعة العادية.');
    } finally {
      if (host) setTimeout(() => { try { host.remove(); } catch {} }, 2000);
    }
  }

  // المتصفح: اطبع صفحة الإيصال المستقلة (مش صفحة البرنامج)
  const html = buildReceiptPage();
  if (html) return printViaFrame(html);
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
