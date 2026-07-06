import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.summary(), api.paidOrders({ limit: 8 })])
      .then(([s, o]) => {
        setData(s);
        setOrders(o.rows);
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

      {/* تنبيهات المخزون — اطلب قبل ما يخلص */}
      {data.lowStock.length > 0 && (
        <div className="panel stock-panel">
          <div className="panel-head">
            <h3>📦 نواقص المخزون — اطلب قبل النفاد</h3>
            <Link to="/inventory" className="btn-ghost small-btn">إدارة المخزون ←</Link>
          </div>
          <div className="stock-list">
            {data.lowStock.map((it) => (
              <div key={it.id} className={'stock-item ' + it.level}>
                <span className="stock-name">{it.name}</span>
                <span className="stock-qty">
                  باقي <b>{it.quantity} {it.unit}</b> (التنبيه عند {it.min_quantity})
                </span>
                <span className={'chip ' + (it.level === 'low' ? 'chip-low' : 'chip-warn')}>
                  {it.level === 'low' ? '🔴 اطلب فوراً' : '⚠️ قرب يخلص'}
                </span>
              </div>
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
        <div className="panel-head">
          <h3>🧾 آخر الفواتير</h3>
          <Link to="/invoices" className="btn-ghost small-btn">كل الفواتير ←</Link>
        </div>
        <div className="table-scroll">
          <table className="orders-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th><th>الترابيزة</th><th>الزبون</th><th>الإجمالي</th><th>الوقت</th>
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
                  <td>{o.customer_name || '—'}</td>
                  <td className="strong">{fmt(o.total)} ج</td>
                  <td className="muted">{(o.paid_at || '').slice(11, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
