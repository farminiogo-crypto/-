import { useEffect, useState } from 'react';
import { auth, api } from '../api.js';
import NumPad from '../components/NumPad.jsx';

export default function ShiftPage() {
  const isAdmin = auth.user?.role === 'admin';
  const [shift, setShift] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  // نموذج الفتح
  const [name, setName] = useState('');
  const [openingCash, setOpeningCash] = useState('');
  // نموذج القفل
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [closedResult, setClosedResult] = useState(null);

  const fmt = (n) => Number(n || 0).toFixed(2);

  function refreshShift() {
    return api.currentShift().then(setShift).catch(() => setShift(null));
  }

  useEffect(() => {
    refreshShift();
    if (isAdmin) api.shifts().then(setHistory).catch(() => {});
  }, []);

  function notifyChange() {
    window.dispatchEvent(new Event('shift-changed'));
  }

  async function openShift(e) {
    e.preventDefault();
    setError('');
    try {
      await api.openShift(name.trim(), Number(openingCash) || 0);
      setName('');
      setOpeningCash('');
      setClosedResult(null);
      await refreshShift();
      notifyChange();
    } catch (e) {
      setError(e.message);
    }
  }

  async function closeShift(e) {
    e.preventDefault();
    setError('');
    try {
      const result = await api.closeShift(Number(closingCash) || 0, notes);
      setClosedResult(result);
      setClosingCash('');
      setNotes('');
      await refreshShift();
      if (isAdmin) api.shifts().then(setHistory).catch(() => {});
      notifyChange();
    } catch (e) {
      setError(e.message);
    }
  }

  if (shift === undefined) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="shift-page">
      <header className="page-head">
        <h1>🕐 إدارة الشيفت</h1>
        <p className="muted">افتح الشيفت برصيد بداية الدرج، واقفله بجرد النقدية</p>
      </header>
      {error && <div className="alert-error">{error}</div>}

      {/* نتيجة آخر قفل */}
      {closedResult && (
        <div className="panel closed-summary">
          <h3>✅ تم قفل الشيفت: {closedResult.name}</h3>
          <div className="recon-grid">
            <Recon label="رصيد البداية" value={closedResult.opening_cash} />
            <Recon label="مبيعات كاش" value={closedResult.sales_total} plus />
            <Recon label="مصروفات" value={closedResult.expenses_total} minus />
            <Recon label="المتوقع في الدرج" value={closedResult.expected_cash} strong />
            <Recon label="المعدود فعلياً" value={closedResult.closing_cash} />
            <Recon
              label="الفرق"
              value={closedResult.difference}
              tone={closedResult.difference === 0 ? 'ok' : closedResult.difference > 0 ? 'warn' : 'bad'}
            />
          </div>
        </div>
      )}

      {shift ? (
        /* شيفت مفتوح → عرض ونموذج قفل */
        <div className="shift-open-grid">
          <div className="panel">
            <h3>الشيفت الحالي — <span className="shift-live">{shift.name}</span></h3>
            <div className="recon-grid">
              <Recon label="رصيد البداية" value={shift.opening_cash} />
              <Recon label="مبيعات كاش" value={shift.sales_total} plus />
              <Recon label="عدد الفواتير" value={shift.sales_count} raw />
              <Recon label="مصروفات" value={shift.expenses_total} minus />
              <Recon label="المتوقع في الدرج" value={shift.expected_cash} strong />
            </div>
            <p className="muted small">بدأ: {(shift.opened_at || '').replace('T', ' ')} • بواسطة {shift.user_name}</p>
          </div>

          <form className="panel" onSubmit={closeShift}>
            <h3>🔒 قفل الشيفت</h3>
            <label>النقدية المعدودة في الدرج</label>
            <NumPad value={closingCash} onChange={setClosingCash} />
            <label>ملاحظات (اختياري)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي ملاحظات على الشيفت" />
            <button className="btn-danger-solid">قفل الشيفت وتسليم الدرج</button>
            <p className="muted small">⚠️ لازم كل الفواتير المفتوحة تتقفل قبل قفل الشيفت.</p>
          </form>
        </div>
      ) : (
        /* لا يوجد شيفت → نموذج فتح */
        <form className="panel open-form" onSubmit={openShift}>
          <h3>▶️ فتح شيفت جديد</h3>
          <label>اسم الكاشير المسؤول عن الشيفت *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اكتب اسمك" required />
          <label>رصيد بداية الدرج (كاش)</label>
          <NumPad value={openingCash} onChange={setOpeningCash} />
          <button className="btn-primary">فتح الشيفت</button>
        </form>
      )}

      {/* سجل الشيفتات للمدير */}
      {isAdmin && history.length > 0 && (
        <div className="panel">
          <h3>📁 سجل الشيفتات</h3>
          <table className="orders-table">
            <thead>
              <tr>
                <th>الشيفت</th><th>الكاشير</th><th>مبيعات</th><th>مصروفات</th><th>متوقع</th><th>فعلي</th><th>الفرق</th><th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => (
                <tr key={s.id}>
                  <td className="strong">{s.name}</td>
                  <td>{s.user_name}</td>
                  <td>{fmt(s.sales_total)}</td>
                  <td>{fmt(s.expenses_total)}</td>
                  <td>{fmt(s.expected_cash)}</td>
                  <td>{s.closing_cash != null ? fmt(s.closing_cash) : '—'}</td>
                  <td className={s.difference == null ? '' : s.difference === 0 ? 'diff-ok' : 'diff-bad'}>
                    {s.difference == null ? '—' : fmt(s.difference)}
                  </td>
                  <td>
                    <span className={'chip ' + (s.status === 'open' ? 'chip-on' : 'chip-off')}>
                      {s.status === 'open' ? 'مفتوح' : 'مقفول'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Recon({ label, value, plus, minus, strong, raw, tone }) {
  const fmt = (n) => Number(n || 0).toFixed(2);
  return (
    <div className={'recon-cell' + (strong ? ' strong' : '') + (tone ? ' tone-' + tone : '')}>
      <span className="recon-label">{label}</span>
      <span className="recon-value">
        {plus ? '+' : minus ? '−' : ''}
        {raw ? value : fmt(value)} {raw ? '' : 'ج'}
      </span>
    </div>
  );
}
