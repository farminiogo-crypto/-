import { useState } from 'react';
import { api } from '../api.js';

// بوابة تطلب باسورد المدير قبل فتح الصفحة (التقارير والحسابات)
// بلوحة أرقام كبيرة مناسبة لشاشة التاتش. يفضل مفتوحاً بقية الجلسة.
export default function ManagerGate({ title = 'صفحة محمية', children }) {
  const unlockedKey = 'kabana_mgr_unlocked';
  const [unlocked, setUnlocked] = useState(sessionStorage.getItem(unlockedKey) === '1');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (unlocked) return children;

  function press(d) {
    setError('');
    setPin((p) => (p.length >= 8 ? p : p + d));
  }
  function back() { setPin((p) => p.slice(0, -1)); }

  async function submit() {
    if (!pin) return;
    setBusy(true);
    setError('');
    try {
      const { ok } = await api.verifyPin(pin);
      if (ok) {
        sessionStorage.setItem(unlockedKey, '1');
        setUnlocked(true);
      } else {
        setError('باسورد غير صحيح');
        setPin('');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-lock">🔒</div>
        <h2>{title}</h2>
        <p className="muted">اكتب باسورد المدير للدخول</p>

        <div className="pin-dots">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={'pin-dot' + (i < pin.length ? ' on' : '')} />
          ))}
        </div>
        {error && <div className="gate-error">{error}</div>}

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} className="key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <button className="key key-sm" onClick={back}>⌫</button>
          <button className="key" onClick={() => press('0')}>0</button>
          <button className="key key-ok" onClick={submit} disabled={busy}>{busy ? '…' : '✓'}</button>
        </div>
      </div>
    </div>
  );
}
