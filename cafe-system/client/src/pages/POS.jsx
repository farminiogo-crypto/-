import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Receipt from '../components/Receipt.jsx';

const TAX_RATE = 0.14;
const PAYMENTS = [
  { key: 'cash', label: 'كاش', icon: '💵' },
  { key: 'card', label: 'فيزا', icon: '💳' },
  { key: 'wallet', label: 'محفظة', icon: '📱' },
];

export default function POS() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [cart, setCart] = useState([]); // {id, name, price, emoji, qty}
  const [payment, setPayment] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [lastOrder, setLastOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.categories(), api.products()])
      .then(([cats, prods]) => {
        setCategories(cats);
        setProducts(prods);
      })
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(
    () => (activeCat === 'all' ? products : products.filter((p) => p.category_id === activeCat)),
    [products, activeCat]
  );

  function addToCart(p) {
    setCart((c) => {
      const found = c.find((i) => i.id === p.id);
      if (found) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: p.id, name: p.name, price: p.price, emoji: p.emoji, qty: 1 }];
    });
  }

  function changeQty(id, delta) {
    setCart((c) =>
      c
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeItem(id) {
    setCart((c) => c.filter((i) => i.id !== id));
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const disc = Math.min(Number(discount) || 0, subtotal);
  const tax = +((subtotal - disc) * TAX_RATE).toFixed(2);
  const total = +(subtotal - disc + tax).toFixed(2);

  async function checkout() {
    if (cart.length === 0) return;
    setError('');
    try {
      const order = await api.createOrder({
        items: cart.map((i) => ({ id: i.id, qty: i.qty })),
        payment_method: payment,
        discount: disc,
      });
      order.items = cart.map((i) => ({ name: i.name, price: i.price, qty: i.qty }));
      setLastOrder(order);
      setCart([]);
      setDiscount(0);
    } catch (e) {
      setError(e.message);
    }
  }

  const fmt = (n) => Number(n).toFixed(2);

  return (
    <div className="pos">
      {/* المنيو */}
      <section className="pos-menu">
        <header className="pos-head">
          <h2>المنيو</h2>
          {error && <span className="alert-error inline">{error}</span>}
        </header>

        <div className="cat-tabs">
          <button className={activeCat === 'all' ? 'active' : ''} onClick={() => setActiveCat('all')}>
            الكل
          </button>
          {categories.map((c) => (
            <button key={c.id} className={activeCat === c.id ? 'active' : ''} onClick={() => setActiveCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {shown.map((p) => (
            <button key={p.id} className="product-card" onClick={() => addToCart(p)}>
              <span className="product-emoji">{p.emoji}</span>
              <span className="product-name">{p.name}</span>
              <span className="product-price">{fmt(p.price)} ج</span>
            </button>
          ))}
          {shown.length === 0 && <p className="muted">لا توجد منتجات في هذا القسم</p>}
        </div>
      </section>

      {/* السلة */}
      <aside className="pos-cart">
        <h2>🛒 الطلب الحالي</h2>

        <div className="cart-items">
          {cart.length === 0 && <p className="muted center">اضغط على منتج لإضافته</p>}
          {cart.map((i) => (
            <div key={i.id} className="cart-row">
              <div className="cart-info">
                <span className="cart-name">
                  {i.emoji} {i.name}
                </span>
                <span className="cart-line-price">{fmt(i.price * i.qty)} ج</span>
              </div>
              <div className="qty-ctrl">
                <button onClick={() => changeQty(i.id, -1)}>−</button>
                <span>{i.qty}</span>
                <button onClick={() => changeQty(i.id, 1)}>+</button>
                <button className="remove" onClick={() => removeItem(i.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="sum-row">
            <span>المجموع</span>
            <span>{fmt(subtotal)} ج</span>
          </div>
          <div className="sum-row discount-row">
            <span>خصم</span>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="discount-input"
            />
          </div>
          <div className="sum-row">
            <span>ضريبة (14%)</span>
            <span>{fmt(tax)} ج</span>
          </div>
          <div className="sum-row total">
            <span>الإجمالي</span>
            <span>{fmt(total)} ج</span>
          </div>
        </div>

        <div className="pay-methods">
          {PAYMENTS.map((m) => (
            <button
              key={m.key}
              className={'pay-btn ' + (payment === m.key ? 'active' : '')}
              onClick={() => setPayment(m.key)}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        <button className="btn-checkout" disabled={cart.length === 0} onClick={checkout}>
          تأكيد الدفع • {fmt(total)} ج
        </button>
      </aside>

      {lastOrder && <Receipt order={lastOrder} onClose={() => setLastOrder(null)} />}
    </div>
  );
}
