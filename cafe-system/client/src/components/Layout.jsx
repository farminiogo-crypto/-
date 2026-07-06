import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth, api } from '../api.js';

export default function Layout() {
  const navigate = useNavigate();
  const user = auth.user;
  const isAdmin = user?.role === 'admin';
  const [shift, setShift] = useState(undefined);

  useEffect(() => {
    api.currentShift().then(setShift).catch(() => setShift(null));
    const onChange = () => api.currentShift().then(setShift).catch(() => setShift(null));
    window.addEventListener('shift-changed', onChange);
    return () => window.removeEventListener('shift-changed', onChange);
  }, []);

  function logout() {
    auth.clear();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">☕ كافيه</div>

        <nav className="side-nav">
          <NavLink to="/pos" className="nav-item"><span>🍽️</span> الترابيزات</NavLink>
          <NavLink to="/shift" className="nav-item"><span>🕐</span> الشيفت</NavLink>
          <NavLink to="/expenses" className="nav-item"><span>💸</span> المصروفات</NavLink>
          {isAdmin && (
            <>
              <div className="nav-divider">الإدارة</div>
              <NavLink to="/dashboard" className="nav-item"><span>📊</span> لوحة التحكم</NavLink>
              <NavLink to="/inventory" className="nav-item"><span>📦</span> المخزون</NavLink>
              <NavLink to="/menu" className="nav-item"><span>🍰</span> إدارة المنيو</NavLink>
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
          <button className="btn-logout" onClick={logout}>تسجيل الخروج</button>
        </div>
      </aside>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
