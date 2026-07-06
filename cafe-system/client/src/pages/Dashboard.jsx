import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.summary(), api.paidOrders(10)])
      .then(([s, o]) => {
        setData(s);
        setOrders(o);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="loading">جاري التحميل...</div>;

  const fmt = (n) => Number(n || 0).toFixed(2);
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.revenue));

  return (
    <div className="dashboard">
      <header className="page-head">
        <h1>📊 لوحة التحكم</h1>
        <p className="muted">نظرة عامة على أداء الكافيه</p>
      </header>

      <div className="stat-cards">
        <div className="stat-card accent-green">
          <span className="stat-label">مبيعات اليوم</span>
          <span className="stat-value">{fmt(data.today.revenue)} ج</span>
        </div>
        <div className="stat-card accent-red">
          <span className="stat-label">مصروفات اليوم</span>
          <span className="stat-value">{fmt(data.today.expenses)} ج</span>
        </div>
        <div className="stat-card accent-blue">
          <span className="stat-label">صافي اليوم</span>
          <span className="stat-value">{fmt(data.today.net)} ج</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-label">فواتير مفتوحة الآن</span>
          <span className="stat-value">{data.openTabs.c} <small>({fmt(data.openTabs.total)} ج)</small></span>
        </div>
      </div>

      {data.lowStock?.length > 0 && (
        <div className="panel low-panel">
          <h3>⚠️ نواقص المخزون — محتاجة شراء</h3>
          <div className="low-chips">
            {data.lowStock.map((l) => (
              <span key={l.id} className="low-chip">
                {l.name}: باقي {l.quantity} {l.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="dash-grid">
        <div className="panel">
          <h3>مبيعات آخر 7 أيام</h3>
          <div className="bar-chart">
            {data.daily.length === 0 && <p className="muted">لا توجد بيانات بعد</p>}
            {data.daily.map((d) => (
              <div key={d.day} className="bar-col">
                <div className="bar-value">{fmt(d.revenue)}</div>
                <div className="bar" style={{ height: `${(d.revenue / maxDaily) * 100}%` }} />
                <div className="bar-label">{d.day.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>🔥 الأكثر مبيعاً</h3>
          <ul className="top-list">
            {data.topProducts.length === 0 && <li className="muted">لا توجد مبيعات بعد</li>}
            {data.topProducts.map((p, i) => (
              <li key={p.name}>
                <span className="rank">{i + 1}</span>
                <span className="top-name">{p.name}</span>
                <span className="top-qty">{p.qty} قطعة</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <h3>🧾 آخر الفواتير المدفوعة</h3>
        <table className="orders-table">
          <thead>
            <tr>
              <th>رقم الفاتورة</th><th>الترابيزة</th><th>الكاشير</th><th>الإجمالي</th><th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr><td colSpan="5" className="muted center">لا توجد فواتير بعد</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.table_name}</td>
                <td>{o.cashier_name}</td>
                <td className="strong">{fmt(o.total)} ج</td>
                <td className="muted">{(o.paid_at || '').slice(11, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
