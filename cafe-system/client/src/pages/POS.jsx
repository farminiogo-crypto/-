import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Receipt from '../components/Receipt.jsx';

// نغمة تنبيه قصيرة للطلب الجديد — مولّدة بالكود (بدون ملف صوت)
let _audioCtx = null;
function playNewOrderChime() {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    [880, 1174.7].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    });
  } catch {
    /* المتصفح منع الصوت قبل أول لمسة — يتجاهل بهدوء */
  }
}

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
  const [prodSearch, setProdSearch] = useState('');
  const [order, setOrder] = useState(null); // الفاتورة المفتوحة حالياً
  const [receipt, setReceipt] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState('');

  // تعديل اسم الزبون داخل الفاتورة
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // دفع جزئي (زبون يحاسب على أصنافه بس) — كمية كل صنف المطلوب دفعها
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitQty, setSplitQty] = useState({}); // { [itemId]: qty }

  // ملاحظة صنف داخل الفاتورة
  const [noteFor, setNoteFor] = useState(null); // id السطر اللي بنكتب ملاحظته
  const [noteDraft, setNoteDraft] = useState('');

  // تنبيه الطلب الجديد (من الموبايل)
  const [newOrderToast, setNewOrderToast] = useState(false);
  const prevSigRef = useRef(null); // بصمة الترابيزات المشغولة للمقارنة بين التحديثات

  const fmt = (n) => Number(n || 0).toFixed(2);

  // بصمة تلخّص المشغول + إجماليّاته — لو زادت يبقى نزل طلب جديد
  function tablesSig(list) {
    const occ = list.filter((t) => t.status === 'occupied');
    return { count: occ.length, total: occ.reduce((s, t) => s + Number(t.order_total || 0), 0) };
  }

  async function loadTables() {
    try {
      const list = await api.tables();
      prevSigRef.current = tablesSig(list); // خط الأساس — من غير تنبيه عند أول تحميل
      setTables(list);
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

  // تحديث تلقائي لشاشة الترابيزات — عشان الطلبات اللي بتتسجل من الموبايل
  // تظهر على الجهاز الرئيسي فوراً (ومفيش تحديث وإحنا جوه فاتورة عشان السرعة)
  useEffect(() => {
    if (order) return;
    // تحديث صامت: أي تقطيع نت لحظي أثناء التحديث الدوري ما يطلّعش بانر خطأ.
    // ولو زاد عدد المشغول أو الإجماليات → طلب جديد نزل من الموبايل → صوت + تنبيه
    const silentRefresh = () => {
      if (document.hidden) return; // ما نشتغلش والبرنامج مخفي/مصغّر (يخفف الحِمل)
      api.tables().then((list) => {
        const sig = tablesSig(list);
        const prev = prevSigRef.current;
        if (prev && (sig.count > prev.count || sig.total > prev.total + 0.001)) {
          playNewOrderChime();
          setNewOrderToast(true);
          setTimeout(() => setNewOrderToast(false), 5000);
        }
        prevSigRef.current = sig;
        setTables(list);
      }).catch(() => {});
    };
    const t = setInterval(silentRefresh, 8000);
    const onFocus = silentRefresh;
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [order]);

  const shown = useMemo(() => {
    const q = prodSearch.trim();
    let list = q ? products : (activeCat === 'all' ? products : products.filter((p) => p.category_id === activeCat));
    if (q) list = list.filter((p) => p.name.includes(q));
    return list;
  }, [products, activeCat, prodSearch]);

  // الضغط على أي ترابيزة يفتح فاتورتها مباشرة — اسم الزبون يتضاف في أي وقت بعدين
  function clickTable(t) {
    setError('');
    setEditingCustomer(false);
    setProdSearch('');   // ابدأ كل فاتورة ببحث نظيف
    setActiveCat('all');
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

  function openNote(item) {
    setNoteFor(item.id);
    setNoteDraft(item.note || '');
  }
  async function saveNote(itemId) {
    try {
      setOrder(await api.setItemNote(order.id, itemId, noteDraft));
      setNoteFor(null);
      setNoteDraft('');
    } catch (e) {
      setError(e.message);
    }
  }

  function back() {
    setOrder(null);
    setEditingCustomer(false);
    setProdSearch('');   // صفّي البحث عند الرجوع للترابيزات
    setActiveCat('all');
    loadTables();
  }

  async function pay() {
    try {
      const paid = await api.payOrder(order.id);
      setReceipt(paid);
      setLowStock(paid.low_stock || []);
      setOrder(null);
      setProdSearch('');
      setActiveCat('all');
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

  // ===== دفع جزئي =====
  function openSplit() {
    setSplitQty({}); // يبدأ الكل صفر
    setSplitOpen(true);
  }
  function setSplit(itemId, max, delta) {
    setSplitQty((s) => {
      const cur = s[itemId] || 0;
      const next = Math.max(0, Math.min(max, cur + delta));
      return { ...s, [itemId]: next };
    });
  }
  const splitTotal = useMemo(
    () => (order?.items || []).reduce((sum, i) => sum + (splitQty[i.id] || 0) * i.price, 0),
    [order, splitQty]
  );
  const splitCount = Object.values(splitQty).reduce((a, b) => a + b, 0);

  async function paySplit() {
    const items = Object.entries(splitQty)
      .filter(([, q]) => q > 0)
      .map(([item_id, qty]) => ({ item_id: Number(item_id), qty }));
    if (items.length === 0) return;
    try {
      const { paid, order: rest } = await api.splitPay(order.id, items);
      setSplitOpen(false);
      setReceipt(paid);
      setLowStock(paid.low_stock || []);
      if (rest) {
        setOrder(rest); // الترابيزة لسه فيها أصناف
      } else {
        setOrder(null); // الترابيزة اتفضت
        setProdSearch('');
        setActiveCat('all');
        loadTables();
      }
    } catch (e) {
      setError(e.message);
    }
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
            <input className="pos-search" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="🔍 دوّر على مشروب..." />
            {error && <span className="alert-error inline">{error}</span>}
          </header>
          <div className="cat-tabs">
            <button className={activeCat === 'all' && !prodSearch ? 'active' : ''} onClick={() => { setActiveCat('all'); setProdSearch(''); }}>الكل</button>
            {categories.map((c) => (
              <button key={c.id} className={activeCat === c.id && !prodSearch ? 'active' : ''} onClick={() => { setActiveCat(c.id); setProdSearch(''); }}>
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
                {i.note && noteFor !== i.id && (
                  <div className="cart-note">📝 {i.note}</div>
                )}
                {noteFor === i.id ? (
                  <div className="cart-note-edit">
                    <input
                      autoFocus
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveNote(i.id); } }}
                      placeholder="مثال: سكر زيادة / بدون نعناع"
                    />
                    <button className="icon-btn" onClick={() => saveNote(i.id)}>✅</button>
                    <button className="icon-btn" onClick={() => setNoteFor(null)}>✖</button>
                  </div>
                ) : null}
                <div className="qty-ctrl">
                  <button onClick={() => changeItem(i.id, -1)}>−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => changeItem(i.id, 1)}>+</button>
                  <button className="note-btn" onClick={() => openNote(i)} title="ملاحظة">
                    {i.note ? '📝' : '➕📝'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="sum-row total">
              <span>الإجمالي</span>
              {/* key=total → العنصر يتبني من جديد مع كل تغيير فيعمل نبضة الأنيميشن */}
              <span className="total-bump" key={order.total}>{fmt(order.total)} ج</span>
            </div>
          </div>

          <button className="btn-checkout" disabled={order.items.length === 0} onClick={pay}>
            💵 دفع الكل • {fmt(order.total)} ج
          </button>
          <button className="btn-split" disabled={order.items.length === 0} onClick={openSplit}>
            🧾 دفع جزئي (زبون يحاسب لوحده)
          </button>
          <button className="btn-cancel" onClick={cancel}>إلغاء الفاتورة</button>
        </aside>

        {/* نافذة الدفع الجزئي */}
        {splitOpen && (
          <div className="modal-overlay" onClick={() => setSplitOpen(false)}>
            <div className="dialog split-modal" onClick={(e) => e.stopPropagation()}>
              <h3>🧾 حساب زبون لوحده</h3>
              <p className="muted small">اختار كام واحد من كل صنف الزبون هيحاسب عليه — الباقي يفضل على الترابيزة.</p>
              <div className="split-list">
                {order.items.map((i) => (
                  <div key={i.id} className="split-row">
                    <div className="split-info">
                      <span className="cart-name">{i.name}</span>
                      <span className="muted small">{fmt(i.price)} ج × {i.qty} متاح</span>
                    </div>
                    <div className="qty-ctrl">
                      <button onClick={() => setSplit(i.id, i.qty, -1)}>−</button>
                      <span>{splitQty[i.id] || 0}</span>
                      <button onClick={() => setSplit(i.id, i.qty, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="sum-row total split-total">
                <span>إجمالي الزبون</span>
                <span>{fmt(splitTotal)} ج</span>
              </div>
              <div className="dialog-actions">
                <button className="btn-primary" disabled={splitCount === 0} onClick={paySplit}>
                  💵 دفع {fmt(splitTotal)} ج
                </button>
                <button className="btn-ghost" onClick={() => setSplitOpen(false)}>إلغاء</button>
              </div>
            </div>
          </div>
        )}

        {/* شريط دفع ثابت تحت — يظهر على الموبايل فقط عشان الجرسون يدفع من غير سكرول */}
        {order.items.length > 0 && (
          <div className="mobile-paybar">
            <span className="mp-total" key={order.total}>{fmt(order.total)} ج</span>
            <button className="mp-pay" onClick={pay}>💵 دفع كاش</button>
          </div>
        )}

        {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
      </div>
    );
  }

  // ===== شبكة الترابيزات =====
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;

  return (
    <div className="tables-page">
      {newOrderToast && (
        <div className="new-order-toast" onClick={() => setNewOrderToast(false)}>
          🔔 طلب جديد نزل من الموبايل!
        </div>
      )}
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
