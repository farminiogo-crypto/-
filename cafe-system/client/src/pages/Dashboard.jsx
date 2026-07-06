import { useEffect, useState } from 'react';
import { api } from '../api.js';

const PAY_LABELS = { cash: '💵 كاش', card: '💳 فيزا', wallet: '📱 محفظة' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.summary(), api.orders(10)])
      .then(([s, o]) => {
        setData(s);
        setOrders(o);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert-error">{error}</div>;
  if (!data) return <div className="loading">جاري التحميل...</div>;

  const fmt = (n) => Number(n).toFixed(2);
  const maxDaily = Math.max(1, ...data.daily.map((d) => d.revenue));

  return (
    <div className="dashboard">
      <header className="page-head">
        <h1>📊 لوحة التحكم</h1>
        <p className="muted">نظرة عامة على أداء الكافيه</p>
      </header>

      {/* بطاقات الإحصائيات */}
      <div className="stat-cards">
        <div className="stat-card accent-green">
          <span className="stat-label">مبيعات اليوم</span>
          <span className="stat-value">{fmt(data.today.revenue)} ج</span>
        </div>
        <div className="stat-card accent-blue">
          <span className="stat-label">طلبات اليوم</span>
          <span className="stat-value">{data.today.orders}</span>
        </div>
        <div className="stat-card accent-purple">
          <span className="stat-label">متوسط الفاتورة</span>
          <span className="stat-value">{fmt(data.today.avg)} ج</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-label">إجمالي المبيعات</span>
          <span className="stat-value">{fmt(data.all.revenue)} ج</span>
        </div>
      </div>

      <div className="dash-grid">
        {/* مبيعات آخر 7 أيام */}
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

        {/* الأكثر مبيعاً */}
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

      {/* آخر الطلبات */}
      <div className="panel">
        <h3>🧾 آخر الطلبات</h3>
        <table className="orders-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>الكاشير</th>
              <th>الدفع</th>
              <th>الإجمالي</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" className="muted center">
                  لا توجد طلبات بعد
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.cashier_name}</td>
                <td>{PAY_LABELS[o.payment_method] || o.payment_method}</td>
                <td className="strong">{fmt(o.total)} ج</td>
                <td className="muted">{o.created_at?.slice(11, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
