import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function TablesManager() {
  const [tables, setTables] = useState([]);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(null); // id
  const [renameVal, setRenameVal] = useState('');
  const [error, setError] = useState('');

  function load() {
    api.tables().then(setTables).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addTable(name.trim());
      setName('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function saveRename(id) {
    setError('');
    try {
      await api.renameTable(id, renameVal.trim());
      setRenaming(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(t) {
    if (!confirm(`حذف "${t.name}" نهائياً؟`)) return;
    setError('');
    try {
      await api.deleteTable(t.id);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="tables-manager">
      <header className="page-head">
        <h1>🪑 إدارة الترابيزات</h1>
        <p className="muted">أضف، أعد تسمية، أو احذف الترابيزات — الترابيزة اللي عليها فاتورة مفتوحة مش هتتحذف</p>
      </header>
      {error && <div className="alert-error">{error}</div>}

      <form className="panel add-table-form" onSubmit={add}>
        <h3>➕ إضافة ترابيزة</h3>
        <div className="form-row">
          <div className="field grow">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: ترابيزة 11 أو ركنة البلكونة" required />
          </div>
          <button className="btn-primary">إضافة</button>
        </div>
      </form>

      <div className="panel">
        <table className="products-table">
          <thead>
            <tr><th>الاسم</th><th>الحالة</th><th>فاتورة مفتوحة</th><th>إجراءات</th></tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.id}>
                <td className="strong">
                  {renaming === t.id ? (
                    <span className="rename-inline">
                      <input value={renameVal} onChange={(e) => setRenameVal(e.target.value)} autoFocus />
                      <button className="icon-btn" onClick={() => saveRename(t.id)}>✅</button>
                      <button className="icon-btn" onClick={() => setRenaming(null)}>✖</button>
                    </span>
                  ) : (
                    t.name
                  )}
                </td>
                <td>
                  <span className={'chip ' + (t.status === 'occupied' ? 'chip-low' : 'chip-on')}>
                    {t.status === 'occupied' ? 'مشغولة' : 'متاحة'}
                  </span>
                </td>
                <td>{t.order_id ? `${Number(t.order_total).toFixed(2)} ج` : '—'}</td>
                <td className="actions-cell">
                  <button className="icon-btn" title="إعادة تسمية" onClick={() => { setRenaming(t.id); setRenameVal(t.name); }}>✏️</button>
                  <button className="icon-btn danger" title="حذف" onClick={() => remove(t)} disabled={t.status === 'occupied'}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
