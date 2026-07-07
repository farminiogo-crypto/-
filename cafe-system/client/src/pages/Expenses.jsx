import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ExpenseReceipt from '../components/ExpenseReceipt.jsx';
import NumPad from '../components/NumPad.jsx';

export default function Expenses() {
  const [shift, setShift] = useState(undefined);
  const [items, setItems] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(null); // مصروف/ملخص للطباعة

  const fmt = (n) => Number(n || 0).toFixed(2);
  const total = items.reduce((s, e) => s + e.amount, 0);

  function load() {
    api.currentShift().then(setShift).catch(() => setShift(null));
    api.expenses().then(setItems).catch(() => {});
  }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    try {
      await api.addExpense(description.trim(), Number(amount));
      setDescription('');
      setAmount('');
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    if (!confirm('حذف هذا المصروف؟')) return;
    await api.deleteExpense(id).catch((e) => setError(e.message));
    load();
  }

  if (shift === null) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🕐</div>
        <h2>لا يوجد شيفت مفتوح</h2>
        <p className="muted">المصروفات تُسجّل على الشيفت المفتوح.</p>
        <Link to="/shift" className="btn-primary">افتح شيفت</Link>
      </div>
    );
  }

  return (
    <div className="expenses-page">
      <header className="page-head">
        <h1>💸 مصروفات الشيفت</h1>
        <p className="muted">أي فلوس تخرج من الدرج (مشتريات، سحب...) — بتتخصم من حساب الشيفت</p>
      </header>
      {error && <div className="alert-error">{error}</div>}

      <div className="expenses-grid">
        <form className="panel" onSubmit={add}>
          <h3>➕ تسجيل مصروف</h3>
          <label>البيان</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="مثال: شراء حليب" required />
          <label>المبلغ (ج)</label>
          <NumPad value={amount} onChange={setAmount} />
          <button className="btn-primary" disabled={!(Number(amount) > 0) || !description.trim()}>تسجيل المصروف</button>
        </form>

        <div className="panel">
          <div className="exp-total-head">
            <h3>مصروفات الشيفت</h3>
            <span className="exp-total">{fmt(total)} ج</span>
          </div>
          {items.length > 0 && (
            <button className="btn-ghost print-all-exp" onClick={() => setPrinting({ items, total })}>
              🖨️ طباعة كل المصروفات
            </button>
          )}
          <div className="exp-list">
            {items.length === 0 && <p className="muted center">لا توجد مصروفات بعد</p>}
            {items.map((e) => (
              <div key={e.id} className="exp-row">
                <div>
                  <div className="exp-desc">{e.description}</div>
                  <div className="muted small">{e.user_name} • {(e.created_at || '').slice(11, 16)}</div>
                </div>
                <div className="exp-right">
                  <span className="exp-amount">−{fmt(e.amount)} ج</span>
                  <button className="icon-btn" title="طباعة إيصال" onClick={() => setPrinting(e)}>🖨️</button>
                  <button className="icon-btn danger" onClick={() => remove(e.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {printing && <ExpenseReceipt expense={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
