import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, auth } from '../api.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.login(username, password);
      auth.save(token, user);
      navigate(user.role === 'admin' ? '/dashboard' : '/pos');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function quickFill(u, p) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">☕</div>
        <h1>كافيه كابانا</h1>
        <p className="login-sub">سجّل دخولك للمتابعة</p>

        {error && <div className="alert-error">{error}</div>}

        <label>اسم المستخدم</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoFocus />

        <label>كلمة المرور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />

        <button className="btn-primary" disabled={loading}>
          {loading ? 'جاري الدخول...' : 'دخول'}
        </button>

        <div className="login-hints">
          <button type="button" onClick={() => quickFill('admin', 'admin123')}>
            👑 مدير
          </button>
          <button type="button" onClick={() => quickFill('cashier', 'cashier123')}>
            🧑‍💼 كاشير
          </button>
        </div>
      </form>
    </div>
  );
}
