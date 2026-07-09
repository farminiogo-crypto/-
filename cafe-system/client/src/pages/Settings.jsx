import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { listPrinters, isDesktop } from '../print.js';
import Receipt from '../components/Receipt.jsx';

// فاتورة تجريبية لاختبار الطابعة (بدون ما تعمل أوردر حقيقي)
const SAMPLE_RECEIPT = {
  order_no: 'TEST-001',
  table_name: 'اختبار الطباعة',
  customer_name: '',
  cashier_name: 'المدير',
  paid_at: '',
  total: 45,
  items: [
    { name: 'قهوة تركي', qty: 1, price: 25, note: 'سكر زيادة' },
    { name: 'شاي', qty: 1, price: 20, note: null },
  ],
};

export default function Settings() {
  const [printers, setPrinters] = useState([]);
  const [printer, setPrinter] = useState(localStorage.getItem('kabana_printer') || '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [lan, setLan] = useState(null);
  const [testReceipt, setTestReceipt] = useState(null);

  useEffect(() => {
    listPrinters().then(setPrinters);
    api.getPrinter().then((r) => {
      if (r.printer_name) { setPrinter(r.printer_name); localStorage.setItem('kabana_printer', r.printer_name); }
    }).catch(() => {});
    api.lanInfo().then(setLan).catch(() => {});
  }, []);

  function flash(m) { setMsg(m); setError(''); setTimeout(() => setMsg(''), 3000); }

  async function savePrinter(name) {
    setPrinter(name);
    localStorage.setItem('kabana_printer', name);
    try { await api.setPrinter(name); flash('✅ اتحفظت ماكينة الطباعة'); }
    catch (e) { setError(e.message); }
  }

  async function changePin(e) {
    e.preventDefault();
    setError('');
    try {
      await api.changePin(current, next);
      setCurrent(''); setNext('');
      flash('✅ اتغيّر باسورد المدير');
    } catch (e) { setError(e.message); }
  }

  async function resetData() {
    if (!confirm('هيتمسح كل الفواتير والشيفتات والمصروفات التجريبية، ويتصفّر المخزون. متأكد؟')) return;
    if (!confirm('تأكيد أخير: مفيش رجوع بعد كده. نكمّل؟')) return;
    try {
      await api.resetData();
      flash('✅ اتنظّفت بيانات التجربة، والمخزون اتصفّر — جاهزين للافتتاح');
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="settings-page">
      <header className="page-head">
        <h1>⚙️ الإعدادات</h1>
        <p className="muted">إعداد الطابعة، باسورد المدير، وتنظيف بيانات التجربة</p>
      </header>
      {msg && <div className="alert-ok">{msg}</div>}
      {error && <div className="alert-error">{error}</div>}

      {/* ماكينة الطباعة */}
      <div className="panel">
        <h3>🖨️ ماكينة الفواتير</h3>
        {isDesktop() ? (
          <>
            <p className="muted small">اختار ماكينة الفواتير عشان الطباعة تطلع عليها مباشرة بدون أي نافذة.</p>
            <div className="field">
              <label>الطابعة المختارة</label>
              <select value={printer} onChange={(e) => savePrinter(e.target.value)}>
                <option value="">(الطابعة الافتراضية للجهاز)</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>{p.displayName || p.name}{p.isDefault ? ' — افتراضية' : ''}</option>
                ))}
              </select>
            </div>
            <button className="btn-ghost" onClick={() => listPrinters().then(setPrinters)}>🔄 تحديث قائمة الطابعات</button>
          </>
        ) : (
          <p className="muted">اختيار الطابعة متاح في تطبيق الديسك توب فقط. في المتصفح بتظهر شاشة الطباعة العادية.</p>
        )}
        <hr className="soft-sep" />
        <p className="muted small">جرّب الطابعة بفاتورة تجريبية قبل الافتتاح — لو طلعت طلاسم يبقى إعداد درايفر الطابعة محتاج يتظبط (شوف الملاحظة تحت).</p>
        <button className="btn-primary" onClick={() => setTestReceipt(SAMPLE_RECEIPT)}>🖨️ طباعة تجريبية</button>
        <p className="muted small tip-box">
          💡 لو الطابعة بتطبع رموز/طلاسم: تأكد إنك مثبّت <b>درايفر الطابعة الأصلي</b> (مش «Generic / Text Only»)،
          وإنه متظبط على وضع <b>الجرافيك/الصورة</b> ومقاس ورق <b>80مم</b>، واختار نفس الطابعة من القايمة فوق.
        </p>
      </div>

      {/* الطلب من الموبايل */}
      <div className="panel">
        <h3>📱 الطلب من الموبايل</h3>
        <p className="muted small">
          الكاشير أو الجرسون يقدر يفتح السيستم من موبايله ويسجّل الطلبات، وبتنزل على الجهاز الرئيسي أول بأول.
          الشرط الوحيد: الموبايل يكون على <b>نفس شبكة الواي فاي</b> بتاعة جهاز الكافيه.
        </p>
        {lan && lan.ips.length > 0 ? (
          <>
            <p className="muted small">افتح المتصفح في الموبايل واكتب العنوان ده:</p>
            <div className="lan-urls">
              {lan.ips.map((ip) => (
                <div key={ip} className="lan-url" dir="ltr">http://{ip}:{lan.port}</div>
              ))}
            </div>
            <p className="muted small">
              وسجّل دخول بنفس الحساب. أول مرة بس: لو ويندوز سأل عن الجدار الناري (Firewall) وافق على "Allow".
            </p>
          </>
        ) : (
          <p className="muted">الجهاز مش متوصل بشبكة دلوقتي — وصّله بالواي فاي أو الراوتر وافتح الصفحة دي تاني.</p>
        )}
      </div>

      {/* باسورد المدير */}
      <form className="panel" onSubmit={changePin}>
        <h3>🔒 تغيير باسورد المدير</h3>
        <p className="muted small">الباسورد ده بيفتح صفحات التقارير والإعدادات.</p>
        <div className="field">
          <label>الباسورد الحالي</label>
          <input type="password" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="1234" required />
        </div>
        <div className="field">
          <label>الباسورد الجديد (3 أرقام على الأقل)</label>
          <input type="password" inputMode="numeric" value={next} onChange={(e) => setNext(e.target.value)} required />
        </div>
        <button className="btn-primary">حفظ الباسورد الجديد</button>
      </form>

      {/* تنظيف البيانات */}
      <div className="panel danger-panel">
        <h3>🧹 تنظيف بيانات التجربة (قبل الافتتاح)</h3>
        <p className="muted small">
          بيمسح كل الفواتير والشيفتات والمصروفات وحركات المخزون التجريبية، ويصفّر أرصدة المخزون.
          المنيو والأصناف والوصفات والمستخدمين والباسورد يفضلوا زي ما هم.
        </p>
        <button className="btn-danger-solid" onClick={resetData}>🗑️ تنظيف البيانات وتجهيز الافتتاح</button>
      </div>

      {testReceipt && <Receipt order={testReceipt} onClose={() => setTestReceipt(null)} />}
    </div>
  );
}
