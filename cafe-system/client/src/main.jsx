import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './api.js';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MenuManager from './pages/MenuManager.jsx';
import Layout from './components/Layout.jsx';
import './styles.css';

// حماية المسارات
function Protected({ children, adminOnly }) {
  if (!auth.token) return <Navigate to="/login" replace />;
  if (adminOnly && auth.user?.role !== 'admin') return <Navigate to="/pos" replace />;
  return children;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/pos" element={<POS />} />
          <Route
            path="/dashboard"
            element={
              <Protected adminOnly>
                <Dashboard />
              </Protected>
            }
          />
          <Route
            path="/menu"
            element={
              <Protected adminOnly>
                <MenuManager />
              </Protected>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
