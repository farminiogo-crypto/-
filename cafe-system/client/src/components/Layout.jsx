import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { auth } from '../api.js';

export default function Layout() {
  const navigate = useNavigate();
  const user = auth.user;
  const isAdmin = user?.role === 'admin';

  function logout() {
    auth.clear();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">☕ كافيه</div>

        <nav className="side-nav">
          <NavLink to="/pos" className="nav-item">
            <span>🛒</span> الكاشير
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/dashboard" className="nav-item">
                <span>📊</span> لوحة التحكم
              </NavLink>
              <NavLink to="/menu" className="nav-item">
                <span>🍰</span> إدارة المنيو
              </NavLink>
            </>
          )}
        </nav>

        <div className="side-footer">
          <div className="user-chip">
            <div className="avatar">{user?.name?.[0] || '؟'}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{isAdmin ? 'مدير' : 'كاشير'}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
