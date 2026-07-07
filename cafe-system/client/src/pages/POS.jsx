import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Receipt from '../components/Receipt.jsx';

// يحسب اسم الترابيزة التالية بالترتيب: "ترابيزة 14" وهكذا
export function nextTableName(tables) {
  let max = 0;
  for (const t of tables) {
    const m = t.name.match(/^ترابيزة (\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1]));
  }
  return 'ترابيزة ' + (max + 1);
}

export default function POS() {
  const [shift, setShift] = useState(undefined);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [order, setOrder] = useState(null); // الفاتورة المفتوحة حالياً
  const [receipt, setReceipt] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');

  // تعديل اسم الزبون داخل الفاتورة
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const fmt = (n) => Number(n || 0).toFixed(2);

  async function loadTables() {
    try {
      setTables(await api.tables());
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    api.currentShift().then(setShift).catch(() => setShift(null));
    loadTables();
    Promise.all([api.categories(), api.products()])
      .then(([c, p]) => {
        setCategories(c);
        setProducts(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(
    () => (activeCat === 'all' ? products : products.filter((p) => p.category_id === activeCat)),
    [products, activeCat]
  );

  // الضغط على أي ترابيزة يفتح فاتورتها مباشرة — اسم الزبون يتضاف في أي وقت بعدين
  function clickTable(t) {
    setError('');
    setEditingCustomer(false);
    api.openTab(t.id).then(setOrder).catch((e) => setError(e.message));
  }

  // إضافة ترابيزة جديدة بالترتيب بضغطة واحدة
  async function addNextTable() {
    setError('');
    try {
      await api.addTable(nextTableName(tables));
      loadTables();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveCustomer(e) {
    e?.preventDefault();
    try {
      setOrder(await api.setCustomer(order.id, customerName));
      setEditingCustomer(false);
      loadTables();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addItem(p) {
    try {
      setOrder(await api.addItem(order.id, p.id));
    } catch (e) {
      setError(e.message);
    }
  }
  async function changeItem(itemId, delta) {
    setOrder(await api.changeItem(order.id, itemId, delta));
  }

  function back() {
    setOrder(null);
    setEditingCustomer(false);
    loadTables();
  }

  async function pay() {
    try {
      const paid = await api.payOrder(order.id);
      setReceipt(paid);
      setLowStock(paid.low_stock || []);
      setOrder(null);
      loadTables();
    } catch (e) {
      setError(e.message);
    }
  }

  async function cancel() {
    if (!confirm('إلغاء الفاتورة نهائياً؟')) return;
    await api.cancelOrder(order.id);
    back();
  }

  // بوابة الشيفت
  if (shift === null) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🕐</div>
        <h2>لا يوجد شيفت مفتوح</h2>
        <p className="muted">لازم تفتح شيفت الأول قبل ما تستقبل الطلبات.</p>
        <Link to="/shift" className="btn-primary">افتح شيفت</Link>
      </div>
    );
  }

  // ===== عرض فاتورة ترابيزة =====
  if (order) {
    return (
      <div className="pos">
        <section className="pos-menu">
          <header className="pos-head">
            <button className="btn-back" onClick={back}>→ رجوع للترابيزات</button>
            {error && <span className="alert-error inline">{error}</span>}
          </header>
          <div className="cat-tabs">
            <button className={activeCat === 'all' ? 'active' : ''} onClick={() => setActiveCat('all')}>الكل</button>
            {categories.map((c) => (
              <button key={c.id} className={activeCat === c.id ? 'active' : ''} onClick={() => setActiveCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {shown.map((p) => (
              <button key={p.id} className="product-card" onClick={() => addItem(p)}>
                <span className="product-name">{p.name}</span>
                <span className="product-price">{fmt(p.price)} <em>ج</em></span>
              </button>
            ))}
          </div>
        </section>

        <aside className="pos-cart">
          <div className="cart-title">
            <h2>🧾 {order.table_name}</h2>
            <span className="order-no">{order.order_no}</span>
          </div>

          {/* اسم الزبون — يتضاف أو يتعدل في أي وقت قبل الدفع */}
          {editingCustomer ? (
            <form className="customer-edit" onSubmit={saveCustomer}>
              <input
                autoFocus
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="اسم الزبون"
              />
              <button type="submit" className="icon-btn">✅</button>
              <button type="button" className="icon-btn" onClick={() => setEditingCustomer(false)}>✖</button>
            </form>
          ) : (
            <button
              className="customer-tag clickable"
              onClick={() => { setCustomerName(order.customer_name || ''); setEditingCustomer(true); }}
              title="اضغط لتعديل اسم الزبون"
            >
              👤 {order.customer_name || 'إضافة اسم الزبون'} ✏️
            </button>
          )}

          <div className="cart-items">
            {order.items.length === 0 && <p className="muted center">اضغط على منتج لإضافته للفاتورة</p>}
            {order.items.map((i) => (
              <div key={i.id} className="cart-row">
                <div className="cart-info">
                  <span className="cart-name">{i.name}</span>
                  <span className="cart-line-price">{fmt(i.price * i.qty)} ج</span>
                </div>
                <div className="qty-ctrl">
                  <button onClick={() => changeItem(i.id, -1)}>−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => changeItem(i.id, 1)}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="sum-row total">
              <span>الإجمالي</span>
              <span>{fmt(order.total)} ج</span>
            </div>
          </div>

          <button className="btn-checkout" disabled={order.items.length === 0} onClick={pay}>
            💵 دفع كاش • {fmt(order.total)} ج
          </button>
          <button className="btn-cancel" onClick={cancel}>إلغاء الفاتورة</button>
        </aside>

        {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
      </div>
    );
  }

  // ===== شبكة الترابيزات =====
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="tables-page">
      <header className="page-head row">
        <div>
          <h1>🍽️ الترابيزات</h1>
          <p className="muted">
            {tables.length} ترابيزة • {occupiedCount} مشغولة • {tables.length - occupiedCount} متاحة
          </p>
        </div>
        <button className="btn-primary" onClick={addNextTable}>
          ➕ إضافة ترابيزة
        </button>
      </header>
      {error && <div className="alert-error">{error}</div>}
      {lowStock.length > 0 && (
        <div className="alert-warn">
          ⚠️ مخزون قرب يخلص: {lowStock.map((l) => l.name).join('، ')}
          <button className="dismiss" onClick={() => setLowStock([])}>✖</button>
        </div>
      )}

      <div className="tables-grid">
        {tables.map((t) => (
          <button
            key={t.id}
            className={'table-card ' + (t.status === 'occupied' ? 'occupied' : 'free')}
            onClick={() => clickTable(t)}
          >
            <span className="table-icon">{t.status === 'occupied' ? '🔴' : '🟢'}</span>
            <span className="table-name">{t.name}</span>
            {t.status === 'occupied' ? (
              <>
                {t.customer_name && <span className="table-customer">👤 {t.customer_name}</span>}
                <span className="table-total">{fmt(t.order_total)} ج</span>
              </>
            ) : (
              <span className="table-free">متاحة</span>
            )}
          </button>
        ))}
      </div>

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
