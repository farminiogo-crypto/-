import { useEffect, useState } from 'react';
import { auth, api } from '../api.js';

// وحدات القياس المتاحة — الأساسية (جرام/مل/قطعة) هي المستخدمة في الوصفات
const UNITS = ['جرام', 'مل', 'قطعة', 'كوب', 'فتلة', 'حبة', 'زجاجة', 'باقة', 'علبة'];

const empty = { name: '', unit: 'جرام', quantity: '', min_quantity: '', package_label: '', package_size: '', auto_deduct: false };

const LEVELS = {
  low: { label: '🔴 اطلب فوراً', cls: 'chip-low' },
  warn: { label: '⚠️ قرب يخلص', cls: 'chip-warn' },
  ok: { label: '✅ متوفر', cls: 'chip-on' },
};

// عرض الكمية بشكل مقروء: 5000 جرام → 5 كجم
function fmtQty(qty, unit) {
  if (unit === 'جرام' && qty >= 1000) return `${+(qty / 1000).toFixed(2)} كجم`;
  if (unit === 'مل' && qty >= 1000) return `${+(qty / 1000).toFixed(2)} لتر`;
  return `${Number.isInteger(qty) ? qty : qty.toFixed(1)} ${unit}`;
}

export default function Inventory() {
  const isAdmin = auth.user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [moves, setMoves] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [restockFor, setRestockFor] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [adjustFor, setAdjustFor] = useState(null); // خصم يدوي للأصناف اليدوية
  const [adjustQty, setAdjustQty] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.inventory().then(setItems).catch((e) => setError(e.message));
    api.inventoryMoves(30).then(setMoves).catch(() => {});
    window.dispatchEvent(new Event('shift-changed')); // يحدّث عدّاد النواقص في القائمة الجانبية
  }
  useEffect(load, []);

  const lowCount = items.filter((i) => i.level === 'low').length;
  const warnCount = items.filter((i) => i.level === 'warn').length;

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        unit: form.unit.trim() || 'وحدة',
        quantity: Number(form.quantity) || 0,
        min_quantity: Number(form.min_quantity) || 0,
        package_label: form.package_label.trim() || null,
        package_size: Number(form.package_size) || null,
        auto_deduct: form.auto_deduct ? 1 : 0,
      };
      if (editing) await api.updateInventory(editing, payload);
      else await api.addInventory(payload);
      setForm(empty);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(it) {
    setEditing(it.id);
    setForm({
      name: it.name, unit: it.unit, quantity: it.quantity, min_quantity: it.min_quantity,
      package_label: it.package_label || '', package_size: it.package_size || '', auto_deduct: !!it.auto,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function consumePackage(it) {
    if (!confirm(`تأكيد: خلّصت ${it.package_label || 'عبوة'} ${it.name}؟ هيتخصم ${fmtQty(it.package_size, it.unit)}`)) return;
    try {
      await api.consumePackage(it.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function doRestock(e) {
    e.preventDefault();
    try {
      await api.restockInventory(restockFor.id, Number(restockQty));
      setRestockFor(null);
      setRestockQty('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function doAdjust(e, sign) {
    e.preventDefault();
    try {
      await api.adjustInventory(adjustFor.id, sign * Math.abs(Number(adjustQty)));
      setAdjustFor(null);
      setAdjustQty('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(it) {
    if (!confirm(`حذف "${it.name}"؟ هيتشال من كل الوصفات المرتبطة بيه.`)) return;
    await api.deleteInventory(it.id);
    load();
  }

  return (
    <div className="inventory-page">
      <header className="page-head row">
        <div>
          <h1>📦 مخزون الكافيه</h1>
          <p className="muted">⚡ التلقائي (بن/شاي) بينقص لوحده مع البيع • ✋ اليدوي (لبن/سكر/نعناع) تخصمه بإيدك</p>
        </div>
        <div className="stock-alerts">
          {lowCount > 0 && <span className="low-alert">🔴 {lowCount} لازم يتطلب فوراً</span>}
          {warnCount > 0 && <span className="warn-alert">⚠️ {warnCount} قرب يخلص</span>}
        </div>
      </header>
      {error && <div className="alert-error">{error}</div>}

      {isAdmin && (
        <form className="panel product-form" onSubmit={submit}>
          <h3>{editing ? '✏️ تعديل صنف' : '➕ إضافة صنف مخزون'}</h3>
          <div className="form-row">
            <div className="field grow">
              <label>الاسم</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: بن" required />
            </div>
            <div className="field small">
              <label>وحدة القياس</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div className="field small">
              <label>الكمية</label>
              <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
            </div>
            <div className="field small">
              <label>حد التنبيه</label>
              <input type="number" min="0" step="any" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} placeholder="اطلب عنده" />
            </div>
            <div className="field small">
              <label>اسم العبوة</label>
              <input value={form.package_label} onChange={(e) => setForm({ ...form, package_label: e.target.value })} placeholder="كيس / كرتونة" />
            </div>
            <div className="field small">
              <label>حجم العبوة</label>
              <input type="number" min="0" step="any" value={form.package_size} onChange={(e) => setForm({ ...form, package_size: e.target.value })} placeholder="1000" />
            </div>
          </div>
          <div className="deduct-toggle">
            <span className="dt-label">طريقة الخصم من المخزون:</span>
            <button type="button" className={'dt-btn ' + (!form.auto_deduct ? 'on' : '')} onClick={() => setForm({ ...form, auto_deduct: false })}>
              ✋ يدوي <em>(لبن/سكر/نعناع)</em>
            </button>
            <button type="button" className={'dt-btn ' + (form.auto_deduct ? 'on' : '')} onClick={() => setForm({ ...form, auto_deduct: true })}>
              ⚡ تلقائي <em>(بن/شاي — بالوصفة)</em>
            </button>
          </div>
          <div className="form-actions">
            <button className="btn-primary">{editing ? 'حفظ' : 'إضافة'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); }}>إلغاء</button>}
          </div>
        </form>
      )}

      <div className="panel">
        <div className="table-scroll">
          <table className="products-table">
            <thead>
              <tr>
                <th>الصنف</th><th>الرصيد</th><th>يكفي تقريباً لـ</th><th>الحالة</th><th>خصم سريع</th>{isAdmin && <th>إجراءات</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={it.level === 'low' ? 'row-low' : it.level === 'warn' ? 'row-warn' : ''}>
                  <td className="strong">
                    {it.name}
                    <div>
                      <span className={'mode-tag ' + (it.auto ? 'auto' : 'manual')}>
                        {it.auto ? '⚡ تلقائي' : '✋ يدوي'}
                      </span>
                    </div>
                  </td>
                  <td>
                    {fmtQty(it.quantity, it.unit)}
                    <div className="muted small">التنبيه عند {fmtQty(it.min_quantity, it.unit)}</div>
                  </td>
                  <td>
                    {it.auto ? (
                      it.usages.length === 0 ? (
                        <span className="muted">غير مرتبط بوصفة</span>
                      ) : (
                        <>
                          {it.usages.slice(0, 2).map((u) => (
                            <div key={u.product} className="usage-line">
                              <span className="usage-count">≈{u.servings_left}</span> {u.product}
                            </div>
                          ))}
                          {it.usages.length > 2 && <span className="muted small">+{it.usages.length - 2} أخرى</span>}
                        </>
                      )
                    ) : (
                      <span className="muted small">يُخصم بإيدك</span>
                    )}
                  </td>
                  <td>
                    <span className={'chip ' + LEVELS[it.level].cls}>{LEVELS[it.level].label}</span>
                  </td>
                  <td className="stock-actions-cell">
                    {!it.auto && (
                      <button className="btn-manual" onClick={() => { setAdjustFor(it); setAdjustQty(''); }}>
                        ➖ خصم استخدام
                      </button>
                    )}
                    {it.package_size ? (
                      <button className="btn-package" onClick={() => consumePackage(it)}>
                        🗑️ خلّصت {it.package_label}
                      </button>
                    ) : (!it.auto ? null : <span className="muted small">—</span>)}
                  </td>
                  {isAdmin && (
                    <td className="actions-cell">
                      <button className="icon-btn" title="توريد/إضافة كمية" onClick={() => { setRestockFor(it); setRestockQty(''); }}>📥</button>
                      <button className="icon-btn" title="تعديل" onClick={() => startEdit(it)}>✏️</button>
                      <button className="icon-btn danger" title="حذف" onClick={() => remove(it)}>🗑️</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* سجل الحركة */}
      <div className="panel">
        <h3>📜 آخر حركات المخزون</h3>
        <div className="table-scroll">
          <table className="orders-table">
            <thead>
              <tr><th>الصنف</th><th>الحركة</th><th>السبب</th><th>بواسطة</th><th>الوقت</th></tr>
            </thead>
            <tbody>
              {moves.length === 0 && <tr><td colSpan="5" className="muted center">لا توجد حركات بعد</td></tr>}
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="strong">{m.item_name}</td>
                  <td className={m.delta < 0 ? 'diff-bad' : 'diff-ok'}>
                    {m.delta > 0 ? '+' : '−'} {fmtQty(Math.abs(m.delta), m.unit)}
                  </td>
                  <td>{m.reason}</td>
                  <td className="muted">{m.user_name}</td>
                  <td className="muted">{(m.created_at || '').slice(5, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة الخصم اليدوي */}
      {adjustFor && (
        <div className="modal-overlay" onClick={() => setAdjustFor(null)}>
          <form className="mini-modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => doAdjust(e, -1)}>
            <h3>➖ خصم استخدام: {adjustFor.name}</h3>
            <label>الكمية اللي اتستخدمت ({adjustFor.unit})</label>
            <input type="number" min="0.1" step="any" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} autoFocus required />
            <div className="form-actions">
              <button className="btn-primary">خصم من الرصيد</button>
              <button type="button" className="btn-ghost" onClick={(e) => doAdjust(e, 1)}>➕ إضافة بدل الخصم</button>
              <button type="button" className="btn-ghost" onClick={() => setAdjustFor(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة التوريد */}
      {restockFor && (
        <div className="modal-overlay" onClick={() => setRestockFor(null)}>
          <form className="mini-modal" onClick={(e) => e.stopPropagation()} onSubmit={doRestock}>
            <h3>📥 توريد: {restockFor.name}</h3>
            <label>الكمية المضافة ({restockFor.unit})</label>
            <input type="number" min="0.1" step="any" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} autoFocus required />
            <div className="form-actions">
              <button className="btn-primary">إضافة للرصيد</button>
              <button type="button" className="btn-ghost" onClick={() => setRestockFor(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
