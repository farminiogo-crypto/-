import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

// مكتبة الأيقونات المتاحة للمنتجات — كل أيقونة تُستخدم مرة واحدة فقط
const ICON_SET = [
  '☕', '🍵', '🫖', '🥛', '🧋', '🧃', '🥤', '🍹', '🧉', '🍫',
  '🍬', '🍮', '🍯', '🍰', '🎂', '🧁', '🥧', '🍪', '🍩', '🍨',
  '🍧', '🍦', '🥐', '🥯', '🍞', '🥖', '🥨', '🧇', '🥞', '🍳',
  '🥪', '🌭', '🍔', '🍟', '🍕', '🌮', '🌯', '🥗', '🍝', '🍜',
  '🥫', '🍋', '🍊', '🍎', '🍉', '🍇', '🍓', '🫐', '🥭', '🍍',
  '🥥', '🥝', '🍒', '🍑', '🥑', '🌿', '🧊', '🍿', '🧀', '🥜',
];

const empty = { category_id: '', name: '', price: '', emoji: '' };

export default function MenuManager() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iconFilter, setIconFilter] = useState('available'); // 'available' | 'all'

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

  // الأيقونات المستخدمة حالياً (مع استثناء المنتج قيد التعديل)
  const usedIcons = useMemo(() => {
    const set = new Set(products.filter((p) => p.id !== editing).map((p) => p.emoji));
    return set;
  }, [products, editing]);

  const availableCount = ICON_SET.filter((i) => !usedIcons.has(i)).length;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!form.emoji) return setError('اختر أيقونة للمنتج من المكتبة');
    try {
      const payload = {
        category_id: Number(form.category_id),
        name: form.name.trim(),
        price: Number(form.price),
        emoji: form.emoji,
      };
      if (editing) await api.updateProduct(editing, payload);
      else await api.createProduct(payload);
      setForm({ ...empty, category_id: categories[0]?.id || '' });
      setEditing(null);
      setPickerOpen(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(p) {
    setEditing(p.id);
    setForm({ category_id: p.category_id, name: p.name, price: p.price, emoji: p.emoji });
    setPickerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ ...empty, category_id: categories[0]?.id || '' });
    setPickerOpen(false);
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

  const shownIcons = iconFilter === 'available' ? ICON_SET.filter((i) => !usedIcons.has(i)) : ICON_SET;

  return (
    <div className="menu-manager">
      <header className="page-head">
        <h1>🍰 إدارة المنيو</h1>
        <p className="muted">أضف، عدّل، أو أخفِ المنتجات — كل أيقونة تُستخدم لمنتج واحد فقط</p>
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
          <div className="field small">
            <label>الأيقونة</label>
            <button
              type="button"
              className={'icon-select ' + (form.emoji ? '' : 'placeholder')}
              onClick={() => setPickerOpen(!pickerOpen)}
              title="اختر أيقونة"
            >
              {form.emoji || '❓ اختر'}
            </button>
          </div>
        </div>

        {/* مكتبة الأيقونات */}
        {pickerOpen && (
          <div className="icon-picker">
            <div className="picker-head">
              <div className="picker-tabs">
                <button type="button" className={iconFilter === 'available' ? 'active' : ''} onClick={() => setIconFilter('available')}>
                  المتاحة ({availableCount})
                </button>
                <button type="button" className={iconFilter === 'all' ? 'active' : ''} onClick={() => setIconFilter('all')}>
                  الكل ({ICON_SET.length})
                </button>
              </div>
              <span className="muted small">الأيقونات الباهتة مستخدمة بالفعل</span>
            </div>
            <div className="icon-grid">
              {shownIcons.map((icon) => {
                const used = usedIcons.has(icon);
                return (
                  <button
                    key={icon}
                    type="button"
                    className={'icon-cell' + (used ? ' used' : '') + (form.emoji === icon ? ' selected' : '')}
                    disabled={used}
                    title={used ? 'مستخدمة بالفعل' : ''}
                    onClick={() => { setForm({ ...form, emoji: icon }); setPickerOpen(false); }}
                  >
                    {icon}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button className="btn-primary">{editing ? 'حفظ التعديل' : 'إضافة'}</button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={cancelEdit}>إلغاء</button>
          )}
        </div>
      </form>

      {/* جدول المنتجات */}
      <div className="panel">
        <div className="table-scroll">
          <table className="products-table">
            <thead>
              <tr>
                <th></th><th>الاسم</th><th>القسم</th><th>السعر</th><th>الحالة</th><th>إجراءات</th>
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
                    <button className="icon-btn" onClick={() => startEdit(p)}>✏️</button>
                    <button className="icon-btn danger" onClick={() => remove(p)}>🗑️</button>
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
