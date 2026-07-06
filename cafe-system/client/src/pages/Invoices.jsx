import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Receipt from '../components/Receipt.jsx';

// صفحة الفواتير السابقة: فلتر تاريخ + بحث + تفاصيل كل فاتورة + إعادة طباعة
export default function Invoices() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [q, setQ] = useState('');
  const [data, setData] = useState({ rows: [], count: 0, total: 0 });
  const [selected, setSelected] = useState(null); // الفاتورة المعروضة بالتفاصيل
  const [reprint, setReprint] = useState(null);
  const [error, setError] = useState('');

  const fmt = (n) => Number(n || 0).toFixed(2);

  function load(params = {}) {
    api
      .paidOrders({ date, q, ...params })
      .then(setData)
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
  }, [date]);

  function search(e) {
    e.preventDefault();
    load();
  }

  async function showDetails(o) {
    try {
      setSelected(await api.order(o.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="invoices-page">
      <header className="page-head">
        <h1>🧾 الفواتير السابقة</h1>
        <p className="muted">راجع أي فاتورة، شوف تفاصيلها، أو اطبعها تاني</p>
      </header>
      {error && <div className="alert-error">{error}</div>}

      {/* الفلاتر */}
      <form className="filters-bar panel" onSubmit={search}>
        <div className="field">
          <label>اليوم</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field grow">
          <label>بحث (رقم فاتورة / ترابيزة / اسم زبون)</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: ORD-123 أو أستاذ محمد" />
        </div>
        <button className="btn-primary">بحث</button>
        {date && (
          <button type="button" className="btn-ghost" onClick={() => { setDate(''); setQ(''); }}>
            عرض الكل
          </button>
        )}
      </form>

      {/* ملخص النتائج */}
      <div className="results-summary">
        <span><b>{data.count}</b> فاتورة</span>
        <span>إجمالي: <b>{fmt(data.total)} ج</b></span>
      </div>

      <div className="panel">
        <div className="table-scroll">
          <table className="orders-table clickable">
            <thead>
              <tr>
                <th>رقم الفاتورة</th><th>الترابيزة</th><th>الزبون</th><th>الكاشير</th><th>الإجمالي</th><th>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr><td colSpan="6" className="muted center">لا توجد فواتير مطابقة</td></tr>
              )}
              {data.rows.map((o) => (
                <tr key={o.id} onClick={() => showDetails(o)}>
                  <td className="strong">{o.order_no}</td>
                  <td>{o.table_name}</td>
                  <td>{o.customer_name || '—'}</td>
                  <td>{o.cashier_name}</td>
                  <td className="strong">{fmt(o.total)} ج</td>
                  <td className="muted">{(o.paid_at || '').replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* تفاصيل الفاتورة */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="dialog invoice-details" onClick={(e) => e.stopPropagation()}>
            <div className="inv-head">
              <h3>{selected.order_no}</h3>
              <span className="muted">{(selected.paid_at || '').replace('T', ' ')}</span>
            </div>
            <div className="inv-meta">
              <span>🍽️ {selected.table_name}</span>
              {selected.customer_name && <span>👤 {selected.customer_name}</span>}
              <span>💼 {selected.cashier_name}</span>
            </div>
            <table className="orders-table">
              <thead>
                <tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
              </thead>
              <tbody>
                {selected.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.name}</td>
                    <td>{it.qty}</td>
                    <td>{fmt(it.price)}</td>
                    <td className="strong">{fmt(it.price * it.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="inv-total">
              <span>الإجمالي المدفوع (كاش)</span>
              <span>{fmt(selected.total)} ج</span>
            </div>
            <div className="dialog-actions">
              <button className="btn-primary" onClick={() => { setReprint(selected); setSelected(null); }}>
                🖨️ إعادة طباعة
              </button>
              <button className="btn-ghost" onClick={() => setSelected(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {reprint && <Receipt order={reprint} onClose={() => setReprint(null)} />}
    </div>
  );
}
