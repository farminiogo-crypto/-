import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { nextTableName } from './POS.jsx';

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

  // إضافة ترابيزة بالترتيب تلقائياً (ترابيزة 13، 14...)
  async function addNext() {
    setError('');
    try {
      await api.addTable(nextTableName(tables));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  // إضافة باسم مخصص (اختياري — لو حبوا يسموا ركنة معينة)
  async function addCustom(e) {
    e.preventDefault();
    if (!name.trim()) return;
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

      <div className="panel add-table-form">
        <h3>➕ إضافة ترابيزة</h3>
        <div className="add-table-actions">
          <button className="btn-primary big" onClick={addNext}>
            ➕ إضافة {nextTableName(tables)}
          </button>
          <form className="custom-name-form" onSubmit={addCustom}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="أو اسم مخصص: ركنة البلكونة" />
            <button className="btn-ghost">إضافة بالاسم</button>
          </form>
        </div>
      </div>

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
