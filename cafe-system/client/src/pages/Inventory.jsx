import { useEffect, useState } from 'react';
import { auth, api } from '../api.js';

// وحدات القياس
const UNITS = ['جرام', 'مل', 'قطعة', 'كوب', 'فتلة', 'حبة', 'زجاجة', 'باقة', 'علبة'];

const emptyForm = {
  mode: 'auto',            // auto = خصم تلقائي بالكوباية، manual = يدوي
  name: '',
  // وضع تلقائي: العبوة هي الأساس
  package_label: 'كيس',
  package_size: '',        // وزن/حجم العبوة
  unit: 'جرام',
  cups_per_package: '',    // العبوة تعمل كام كوباية
  packages_count: '',      // عندك كام عبوة
  min_packages: '1',       // التنبيه عند كام عبوة
  // وضع يدوي: كمية مباشرة
  quantity: '',
  min_quantity: '',
};

const LEVELS = {
  low: { label: '🔴 اطلب فوراً', cls: 'chip-low' },
  warn: { label: '⚠️ قرب يخلص', cls: 'chip-warn' },
  ok: { label: '✅ متوفر', cls: 'chip-on' },
};

// عرض الكمية بشكل مقروء: 5000 جرام → 5 كجم
function fmtQty(qty, unit) {
  if (unit === 'جرام' && qty >= 1000) return `${+(qty / 1000).toFixed(2)} كجم`;
  if (unit === 'مل' && qty >= 1000) return `${+(qty / 1000).toFixed(2)} لتر`;
  return `${Number.isInteger(qty) ? qty : +qty.toFixed(1)} ${unit}`;
}

export default function Inventory() {
  const isAdmin = auth.user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [moves, setMoves] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [restockFor, setRestockFor] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [adjustFor, setAdjustFor] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.inventory().then(setItems).catch((e) => setError(e.message));
    api.inventoryMoves(30).then(setMoves).catch(() => {});
    window.dispatchEvent(new Event('shift-changed'));
  }
  useEffect(load, []);

  const lowCount = items.filter((i) => i.level === 'low').length;
  const warnCount = items.filter((i) => i.level === 'warn').length;

  // معاينة حية أثناء الإدخال: 5 أكياس × 250جم ÷ 80 كوباية
  const previewCups =
    form.mode === 'auto' && Number(form.cups_per_package) > 0 && Number(form.packages_count) > 0
      ? Math.floor(Number(form.packages_count) * Number(form.cups_per_package))
      : null;

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      let payload;
      if (form.mode === 'auto') {
        const size = Number(form.package_size);
        const packs = Number(form.packages_count) || 0;
        const minPacks = Number(form.min_packages) || 0;
        if (!(size > 0)) return setError('اكتب وزن/حجم العبوة (مثال: 250)');
        if (!(Number(form.cups_per_package) > 0)) return setError('اكتب العبوة تعمل كام كوباية (مثال: 80)');
        payload = {
          name: form.name.trim(),
          unit: form.unit,
          quantity: packs * size,
          min_quantity: minPacks * size,
          package_label: form.package_label.trim() || 'عبوة',
          package_size: size,
          cups_per_package: Number(form.cups_per_package),
          auto_deduct: 1,
        };
      } else {
        payload = {
          name: form.name.trim(),
          unit: form.unit,
          quantity: Number(form.quantity) || 0,
          min_quantity: Number(form.min_quantity) || 0,
          package_label: form.package_label.trim() || null,
          package_size: Number(form.package_size) || null,
          cups_per_package: null,
          auto_deduct: 0,
        };
      }
      if (editing) await api.updateInventory(editing, payload);
      else await api.addInventory(payload);
      setForm(emptyForm);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(it) {
    setEditing(it.id);
    if (it.auto && it.cups_per_package && it.package_size) {
      setForm({
        mode: 'auto',
        name: it.name,
        package_label: it.package_label || 'كيس',
        package_size: it.package_size,
        unit: it.unit,
        cups_per_package: it.cups_per_package,
        packages_count: +(it.quantity / it.package_size).toFixed(1),
        min_packages: +(it.min_quantity / it.package_size).toFixed(1),
        quantity: '', min_quantity: '',
      });
    } else {
      setForm({
        mode: it.auto ? 'auto' : 'manual',
        name: it.name, unit: it.unit,
        quantity: it.quantity, min_quantity: it.min_quantity,
        package_label: it.package_label || '', package_size: it.package_size || '',
        cups_per_package: it.cups_per_package || '', packages_count: '', min_packages: '1',
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function consumePackage(it) {
    if (!confirm(`تأكيد: خلّصت ${it.package_label || 'عبوة'} ${it.name}؟`)) return;
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
      if (restockFor.package_size) {
        await api.restockInventory(restockFor.id, null, Number(restockQty));
      } else {
        await api.restockInventory(restockFor.id, Number(restockQty));
      }
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
          <p className="muted">سجّل الكيس واكتب بيعمل كام كوباية — والنظام ينقص لوحده مع كل بيع ⚡ • اللبن والسكر تنقصهم بإيدك ✋</p>
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

          <div className="deduct-toggle">
            <button type="button" className={'dt-btn ' + (form.mode === 'auto' ? 'on' : '')} onClick={() => setForm({ ...form, mode: 'auto' })}>
              ⚡ بينقص لوحده مع البيع <em>(بن / شاي / أعشاب)</em>
            </button>
            <button type="button" className={'dt-btn ' + (form.mode === 'manual' ? 'on' : '')} onClick={() => setForm({ ...form, mode: 'manual' })}>
              ✋ بنقصه بإيدي <em>(لبن / سكر / نعناع / أكواب)</em>
            </button>
          </div>

          {form.mode === 'auto' ? (
            <>
              <div className="form-row">
                <div className="field grow">
                  <label>اسم الصنف</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: بن" required />
                </div>
                <div className="field">
                  <label>اسم العبوة</label>
                  <input value={form.package_label} onChange={(e) => setForm({ ...form, package_label: e.target.value })} placeholder="كيس ربع كيلو" />
                </div>
                <div className="field small">
                  <label>وزن العبوة</label>
                  <input type="number" min="0" step="any" value={form.package_size} onChange={(e) => setForm({ ...form, package_size: e.target.value })} placeholder="250" required />
                </div>
                <div className="field small">
                  <label>الوحدة</label>
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="field yield-field">
                  <label>⭐ العبوة تعمل كام كوباية؟</label>
                  <input type="number" min="1" step="any" value={form.cups_per_package} onChange={(e) => setForm({ ...form, cups_per_package: e.target.value })} placeholder="80" required />
                </div>
                <div className="field small">
                  <label>عندك كام عبوة؟</label>
                  <input type="number" min="0" step="any" value={form.packages_count} onChange={(e) => setForm({ ...form, packages_count: e.target.value })} placeholder="5" required />
                </div>
                <div className="field small">
                  <label>نبّهني لما يفضل</label>
                  <input type="number" min="0" step="any" value={form.min_packages} onChange={(e) => setForm({ ...form, min_packages: e.target.value })} placeholder="1" />
                </div>
              </div>
              {previewCups != null && (
                <div className="yield-preview">
                  ☕ يعني عندك دلوقتي تقريباً <b>{previewCups} كوباية</b>
                  {Number(form.min_packages) > 0 && <> — وهننبهك لما يفضل حوالي <b>{Math.floor(Number(form.min_packages) * Number(form.cups_per_package))} كوباية</b></>}
                </div>
              )}
            </>
          ) : (
            <div className="form-row">
              <div className="field grow">
                <label>اسم الصنف</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: حليب" required />
              </div>
              <div className="field small">
                <label>الوحدة</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="field small">
                <label>الكمية</label>
                <input type="number" min="0" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
              <div className="field small">
                <label>نبّهني عند</label>
                <input type="number" min="0" step="any" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
              </div>
              <div className="field small">
                <label>اسم العبوة (اختياري)</label>
                <input value={form.package_label} onChange={(e) => setForm({ ...form, package_label: e.target.value })} placeholder="كيس / كرتونة" />
              </div>
              <div className="field small">
                <label>حجم العبوة</label>
                <input type="number" min="0" step="any" value={form.package_size} onChange={(e) => setForm({ ...form, package_size: e.target.value })} placeholder="1000" />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary">{editing ? 'حفظ' : 'إضافة'}</button>
            {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(emptyForm); }}>إلغاء</button>}
          </div>
        </form>
      )}

      <div className="panel">
        <div className="table-scroll">
          <table className="products-table">
            <thead>
              <tr>
                <th>الصنف</th><th>الباقي</th><th>يكفي</th><th>الحالة</th><th>خصم سريع</th>{isAdmin && <th>إجراءات</th>}
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
                      {it.cups_per_package ? (
                        <span className="yield-tag">{it.package_label || 'العبوة'} = {it.cups_per_package} كوباية</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {it.packages_left != null ? (
                      <>
                        <span className="pkg-count">{it.packages_left}</span> {it.package_label || 'عبوة'}
                        <div className="muted small">({fmtQty(it.quantity, it.unit)})</div>
                      </>
                    ) : (
                      fmtQty(it.quantity, it.unit)
                    )}
                    <div className="muted small">التنبيه عند {fmtQty(it.min_quantity, it.unit)}</div>
                  </td>
                  <td>
                    {it.cups_left != null ? (
                      <div className="cups-big">☕ ≈{it.cups_left} <span>كوباية</span></div>
                    ) : it.auto && it.usages.length > 0 ? (
                      <>
                        {it.usages.slice(0, 2).map((u) => (
                          <div key={u.product} className="usage-line">
                            <span className="usage-count">≈{u.servings_left}</span> {u.product}
                          </div>
                        ))}
                      </>
                    ) : (
                      <span className="muted small">{it.auto ? 'غير مرتبط بوصفة' : 'يُخصم بإيدك'}</span>
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
                        🗑️ خلّصت {it.package_label || 'عبوة'}
                      </button>
                    ) : null}
                  </td>
                  {isAdmin && (
                    <td className="actions-cell">
                      <button className="icon-btn" title="جالك بضاعة جديدة" onClick={() => { setRestockFor(it); setRestockQty(''); }}>📥</button>
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

      {/* نافذة التوريد — بالعبوات لو الصنف ليه عبوة */}
      {restockFor && (
        <div className="modal-overlay" onClick={() => setRestockFor(null)}>
          <form className="mini-modal" onClick={(e) => e.stopPropagation()} onSubmit={doRestock}>
            <h3>📥 وصلك: {restockFor.name}</h3>
            <label>
              {restockFor.package_size
                ? `جالك كام ${restockFor.package_label || 'عبوة'}؟`
                : `الكمية المضافة (${restockFor.unit})`}
            </label>
            <input type="number" min="0.1" step="any" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} autoFocus required />
            {restockFor.package_size && restockFor.cups_per_package && Number(restockQty) > 0 && (
              <p className="muted small">☕ يعني هيزيد ≈{Math.floor(Number(restockQty) * restockFor.cups_per_package)} كوباية</p>
            )}
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
