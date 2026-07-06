import { useEffect, useState } from 'react';
import { api } from '../api.js';

const empty = { category_id: '', name: '', price: '', emoji: '☕' };

// أيقونات المشروبات والإضافات المشهورة
const EMOJIS = [
  '☕', '🍵', '🫖', '🥛', '🧋', '🧊', '🥤', '🧃',
  '🍹', '🍫', '🍯', '🍋', '🍊', '🍓', '🥭', '🍑',
  '🍎', '🍌', '🫐', '🍉', '🍍', '🥥', '🌿', '❄️',
  '🍰', '🧁', '🍪', '🥐', '🧇', '💧', '✨', '🔥',
];

export default function MenuManager() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [recipeFor, setRecipeFor] = useState(null); // المنتج المفتوح وصفته
  const [recipe, setRecipe] = useState([]); // [{inventory_id, qty_per_unit}]
  const [error, setError] = useState('');

  async function load() {
    try {
      const [cats, prods, inv] = await Promise.all([api.categories(), api.products(true), api.inventory()]);
      setCategories(cats);
      setProducts(prods);
      setInventory(inv);
      if (!form.category_id && cats[0]) setForm((f) => ({ ...f, category_id: cats[0].id }));
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const catName = (id) => categories.find((c) => c.id === id)?.name || '—';
  const invName = (id) => inventory.find((i) => i.id === Number(id));

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

  async function toggleActive(p) {
    await api.updateProduct(p.id, { active: p.active ? 0 : 1 });
    load();
  }

  async function remove(p) {
    if (!confirm(`حذف "${p.name}"؟`)) return;
    await api.deleteProduct(p.id);
    load();
  }

  // ===== الوصفات =====
  async function openRecipe(p) {
    setError('');
    try {
      const rows = await api.ingredients(p.id);
      setRecipe(rows.map((r) => ({ inventory_id: r.inventory_id, qty_per_unit: r.qty_per_unit })));
      setRecipeFor(p);
    } catch (e) {
      setError(e.message);
    }
  }

  function setRecipeRow(idx, patch) {
    setRecipe((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function saveRecipe(e) {
    e.preventDefault();
    setError('');
    try {
      const items = recipe.filter((r) => r.inventory_id && Number(r.qty_per_unit) > 0);
      await api.saveIngredients(recipeFor.id, items);
      setRecipeFor(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const hasRecipe = (p) => p.id; // كل المنتجات قابلة — العدد يظهر في الجدول عبر inventory usages

  return (
    <div className="menu-manager">
      <header className="page-head">
        <h1>🍹 إدارة المنيو</h1>
        <p className="muted">أضف المشروبات وحدّد وصفة كل مشروب عشان المخزون يتخصم تلقائياً</p>
      </header>

      {error && <div className="alert-error">{error}</div>}

      <form className="product-form panel" onSubmit={submit}>
        <h3>{editing ? '✏️ تعديل مشروب' : '➕ إضافة مشروب'}</h3>
        <div className="form-row">
          <div className="field">
            <label>القسم</label>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
        </div>
        <div className="field">
          <label>الأيقونة — المختارة: <span className="picked-emoji">{form.emoji}</span></label>
          <div className="emoji-grid">
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                className={'emoji-btn ' + (form.emoji === em ? 'selected' : '')}
                onClick={() => setForm({ ...form, emoji: em })}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-primary">{editing ? 'حفظ التعديل' : 'إضافة'}</button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setForm({ ...empty, category_id: categories[0]?.id || '' }); }}>
              إلغاء
            </button>
          )}
        </div>
      </form>

      <div className="panel">
        <table className="products-table">
          <thead>
            <tr>
              <th></th><th>الاسم</th><th>القسم</th><th>السعر</th><th>الحالة</th><th>الوصفة</th><th>إجراءات</th>
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
                <td>
                  <button className="btn-recipe" onClick={() => openRecipe(p)}>🧪 المكونات</button>
                </td>
                <td className="actions-cell">
                  <button className="icon-btn" onClick={() => startEdit(p)}>✏️</button>
                  <button className="icon-btn danger" onClick={() => remove(p)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* محرر الوصفة */}
      {recipeFor && (
        <div className="modal-overlay" onClick={() => setRecipeFor(null)}>
          <form className="recipe-modal" onClick={(e) => e.stopPropagation()} onSubmit={saveRecipe}>
            <h3>🧪 وصفة: {recipeFor.emoji} {recipeFor.name}</h3>
            <p className="muted small">الكميات دي بتتخصم من المخزون تلقائياً مع كل كوباية تتباع.</p>

            {recipe.map((row, idx) => {
              const inv = invName(row.inventory_id);
              return (
                <div key={idx} className="recipe-row">
                  <select
                    value={row.inventory_id}
                    onChange={(e) => setRecipeRow(idx, { inventory_id: Number(e.target.value) })}
                    required
                  >
                    <option value="">اختر مكوّن...</option>
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0.01" step="any"
                    value={row.qty_per_unit}
                    onChange={(e) => setRecipeRow(idx, { qty_per_unit: e.target.value })}
                    placeholder="الكمية"
                    required
                  />
                  <span className="recipe-unit">{inv?.unit || ''}</span>
                  <button type="button" className="icon-btn danger" onClick={() => setRecipe((r) => r.filter((_, i) => i !== idx))}>✖</button>
                </div>
              );
            })}

            <button type="button" className="btn-ghost add-ing" onClick={() => setRecipe((r) => [...r, { inventory_id: '', qty_per_unit: '' }])}>
              ➕ إضافة مكوّن
            </button>

            <div className="form-actions">
              <button className="btn-primary">حفظ الوصفة</button>
              <button type="button" className="btn-ghost" onClick={() => setRecipeFor(null)}>إلغاء</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
