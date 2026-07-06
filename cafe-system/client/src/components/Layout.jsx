import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, api } from '../api.js';

export default function Layout() {
  const navigate = useNavigate();
  const user = auth.user;
  const isAdmin = user?.role === 'admin';
  const [shift, setShift] = useState(undefined);
  const [lowCount, setLowCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      api.currentShift().then(setShift).catch(() => setShift(null));
      api.inventory().then((items) => setLowCount(items.filter((i) => i.level !== 'ok').length)).catch(() => {});
    };
    refresh();
    window.addEventListener('shift-changed', refresh);
    return () => window.removeEventListener('shift-changed', refresh);
  }, [isAdmin]);

  function logout() {
    auth.clear();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">☕ كابانا</div>

        <nav className="side-nav">
          <NavLink to="/pos" className="nav-item"><span>🍽️</span> <em>الترابيزات</em></NavLink>
          <NavLink to="/shift" className="nav-item"><span>🕐</span> <em>الشيفت</em></NavLink>
          <NavLink to="/expenses" className="nav-item"><span>💸</span> <em>المصروفات</em></NavLink>
          <NavLink to="/inventory" className="nav-item">
            <span>📦</span> <em>المخزون</em>
            {lowCount > 0 && <b className="nav-badge">{lowCount}</b>}
          </NavLink>
          {isAdmin && (
            <>
              <div className="nav-divider">الإدارة</div>
              <NavLink to="/dashboard" className="nav-item"><span>📊</span> <em>لوحة التحكم</em></NavLink>
              <NavLink to="/invoices" className="nav-item"><span>🧾</span> <em>الفواتير</em></NavLink>
              <NavLink to="/menu" className="nav-item"><span>🍹</span> <em>إدارة المنيو</em></NavLink>
              <NavLink to="/tables-admin" className="nav-item"><span>🪑</span> <em>إدارة الترابيزات</em></NavLink>
            </>
          )}
        </nav>

        <div className="shift-badge">
          {shift === undefined ? null : shift ? (
            <>
              <span className="dot on" /> شيفت مفتوح
              <small>{shift.name}</small>
            </>
          ) : (
            <>
              <span className="dot off" /> لا يوجد شيفت
            </>
          )}
        </div>

        <div className="side-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.[0] || '؟'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{isAdmin ? 'مدير' : 'كاشير'}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            <span>🚪</span> <em>خروج</em>
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
