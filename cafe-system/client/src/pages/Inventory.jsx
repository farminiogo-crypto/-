import { useEffect, useState } from 'react';
import { api } from '../api.js';

// وحدات القياس المتاحة — بالوزن، بالحجم، أو بالعدد (للكانز والزجاجات وغيرها)
const UNITS = ['كجم', 'جرام', 'لتر', 'مل', 'حبة', 'علبة', 'زجاجة', 'كيس', 'كرتونة', 'باقة'];

const empty = { name: '', unit: 'كجم', quantity: '', min_quantity: '' };

const LEVELS = {
  low: { label: '🔴 اطلب فوراً', cls: 'chip-low' },
  warn: { label: '⚠️ قرب يخلص', cls: 'chip-warn' },
  ok: { label: '✅ متوفر', cls: 'chip-on' },
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const fmt = (n) => (Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(1));

  function load() {
    api.inventory().then(setItems).catch((e) => setError(e.message));
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
        unit: form.unit,
        quantity: Number(form.quantity) || 0,
        min_quantity: Number(form.min_quantity) || 0,
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
    setForm({ name: it.name, unit: it.unit, quantity: it.quantity, min_quantity: it.min_quantity });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function adjust(it, delta) {
    await api.adjustInventory(it.id, delta).catch((e) => setError(e.message));
    load();
  }

  async function remove(it) {
    if (!confirm(`حذف "${it.name}"؟`)) return;
    await api.deleteInventory(it.id);
    load();
  }

  return (
    <div className="inventory-page">
      <header className="page-head row">
        <div>
          <h1>📦 مخزون الكافيه</h1>
          <p className="muted">تابع الكميات — النظام ينبهك قبل ما أي صنف يخلص</p>
        </div>
        <div className="stock-alerts">
          {lowCount > 0 && <span className="low-alert">🔴 {lowCount} لازم يتطلب فوراً</span>}
          {warnCount > 0 && <span className="warn-alert">⚠️ {warnCount} قرب يخلص</span>}
        </div>
      </header>
      {error && <div className="alert-error">{error}</div>}

      <form className="panel product-form" onSubmit={submit}>
        <h3>{editing ? '✏️ تعديل صنف' : '➕ إضافة صنف مخزون'}</h3>
        <div className="form-row">
          <div className="field grow">
            <label>الاسم</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: بيبسي كانز" required />
          </div>
          <div className="field small">
            <label>الوحدة</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="field small">
            <label>الكمية</label>
            <input type="number" min="0" step="0.5" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          </div>
          <div className="field small">
            <label>حد التنبيه</label>
            <input type="number" min="0" step="0.5" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} placeholder="اطلب عنده" />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary">{editing ? 'حفظ' : 'إضافة'}</button>
          {editing && <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm(empty); }}>إلغاء</button>}
        </div>
      </form>

      <div className="panel">
        <div className="table-scroll">
          <table className="products-table">
            <thead>
              <tr>
                <th>الصنف</th><th>الكمية الحالية</th><th>حد التنبيه</th><th>الحالة</th><th>تعديل سريع</th><th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className={it.level === 'low' ? 'row-low' : it.level === 'warn' ? 'row-warn' : ''}>
                  <td className="strong">{it.name}</td>
                  <td>{fmt(it.quantity)} {it.unit}</td>
                  <td className="muted">{fmt(it.min_quantity)} {it.unit}</td>
                  <td>
                    <span className={'chip ' + LEVELS[it.level].cls}>{LEVELS[it.level].label}</span>
                  </td>
                  <td>
                    <div className="qty-ctrl inline">
                      <button onClick={() => adjust(it, -1)}>−</button>
                      <button onClick={() => adjust(it, 1)}>+</button>
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button className="icon-btn" onClick={() => startEdit(it)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => remove(it)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
