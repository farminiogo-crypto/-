import { useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { category_id: '', name: '', price: '', emoji: '☕' };

export default function MenuManager() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null); // id being edited
  const [error, setError] = useState('');

  async function load() {
    try {
      const [cats, prods] = await Promise.all([api.categories(), api.products(true)]);
      setCategories(cats);
      setProducts(prods);
      if (!form.category_id && cats[0]) setForm((f) => ({ ...f, category_id: cats[0].id }));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        category_id: Number(form.category_id),
        name: form.name.trim(),
        price: Number(form.price),
        emoji: form.emoji || '☕',
      };
      if (editing) await api.updateProduct(editing, payload);
      else await api.createProduct(payload);
      setForm({ ...empty, category_id: categories[0]?.id || '' });
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ category_id: p.category_id, name: p.name, price: p.price, emoji: p.emoji });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...empty, category_id: categories[0]?.id || '' });
  }

  async function toggleActive(p) {
    await api.updateProduct(p.id, { active: p.active ? 0 : 1 });
    load();
  }

  async function remove(p) {
    if (!confirm(`حذف "${p.name}"؟`)) return;
    await api.deleteProduct(p.id);
    load();
  }

  return (
    <div className="menu-manager">
      <header className="page-head">
        <h1>🍰 إدارة المنيو</h1>
        <p className="muted">أضف، عدّل، أو أخفِ المنتجات</p>
      </header>

      {error && <div className="alert-error">{error}</div>}

      {/* نموذج الإضافة / التعديل */}
      <form className="product-form panel" onSubmit={submit}>
        <h3>{editing ? '✏️ تعديل منتج' : '➕ إضافة منتج'}</h3>
        <div className="form-row">
          <div className="field">
            <label>القسم</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field grow">
            <label>الاسم</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field small">
            <label>السعر</label>
            <input type="number" min="0" step="0.5" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </div>
          <div className="field small">
            <label>أيقونة</label>
            <input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength="2" />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary">{editing ? 'حفظ التعديل' : 'إضافة'}</button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>
              إلغاء
            </button>
          )}
        </div>
      </form>

      {/* جدول المنتجات */}
      <div className="panel">
        <table className="products-table">
          <thead>
            <tr>
              <th></th>
              <th>الاسم</th>
              <th>القسم</th>
              <th>السعر</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'row-inactive'}>
                <td className="emoji-cell">{p.emoji}</td>
                <td className="strong">{p.name}</td>
                <td>{catName(p.category_id)}</td>
                <td>{Number(p.price).toFixed(2)} ج</td>
                <td>
                  <button className={'chip ' + (p.active ? 'chip-on' : 'chip-off')} onClick={() => toggleActive(p)}>
                    {p.active ? 'نشط' : 'مخفي'}
                  </button>
                </td>
                <td className="actions-cell">
                  <button className="icon-btn" onClick={() => startEdit(p)}>
                    ✏️
                  </button>
                  <button className="icon-btn danger" onClick={() => remove(p)}>
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
