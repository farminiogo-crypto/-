import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './api.js';
import Login from './pages/Login.jsx';
import POS from './pages/POS.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MenuManager from './pages/MenuManager.jsx';
import ShiftPage from './pages/ShiftPage.jsx';
import Expenses from './pages/Expenses.jsx';
import Inventory from './pages/Inventory.jsx';
import TablesManager from './pages/TablesManager.jsx';
import Invoices from './pages/Invoices.jsx';
import Layout from './components/Layout.jsx';
import './styles.css';

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
          <Route path="/shift" element={<ShiftPage />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/dashboard" element={<Protected adminOnly><Dashboard /></Protected>} />
          <Route path="/invoices" element={<Protected adminOnly><Invoices /></Protected>} />
          <Route path="/menu" element={<Protected adminOnly><MenuManager /></Protected>} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/tables-admin" element={<Protected adminOnly><TablesManager /></Protected>} />
        </Route>
        <Route path="*" element={<Navigate to="/pos" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
