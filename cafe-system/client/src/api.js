// طبقة الاتصال بالخادم + إدارة الجلسة
const TOKEN_KEY = 'cafe_token';
const USER_KEY = 'cafe_user';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get user() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (res.status === 401) {
    auth.clear();
    window.location.hash = '#/login';
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ ما');
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: { username, password } }),

  // المنيو
  categories: () => request('/categories'),
  products: (all = false) => request('/products' + (all ? '?all=1' : '')),
  createProduct: (p) => request('/products', { method: 'POST', body: p }),
  updateProduct: (id, p) => request('/products/' + id, { method: 'PUT', body: p }),
  deleteProduct: (id) => request('/products/' + id, { method: 'DELETE' }),

  // الترابيزات
  tables: () => request('/tables'),
  addTable: (name) => request('/tables', { method: 'POST', body: { name } }),
  deleteTable: (id) => request('/tables/' + id, { method: 'DELETE' }),

  // الفواتير
  openTab: (table_id) => request('/orders/open', { method: 'POST', body: { table_id } }),
  order: (id) => request('/orders/' + id),
  addItem: (id, product_id, qty = 1) =>
    request(`/orders/${id}/items`, { method: 'POST', body: { product_id, qty } }),
  changeItem: (id, itemId, delta) =>
    request(`/orders/${id}/items/${itemId}`, { method: 'PATCH', body: { delta } }),
  removeItem: (id, itemId) => request(`/orders/${id}/items/${itemId}`, { method: 'DELETE' }),
  payOrder: (id) => request(`/orders/${id}/pay`, { method: 'POST' }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  paidOrders: (limit = 50) => request('/orders?limit=' + limit),

  // الشيفتات
  currentShift: () => request('/shifts/current'),
  openShift: (name, opening_cash) =>
    request('/shifts/open', { method: 'POST', body: { name, opening_cash } }),
  closeShift: (closing_cash, notes) =>
    request('/shifts/close', { method: 'POST', body: { closing_cash, notes } }),
  shifts: () => request('/shifts'),

  // المصروفات
  expenses: (all = false) => request('/expenses' + (all ? '?all=1' : '')),
  addExpense: (description, amount) =>
    request('/expenses', { method: 'POST', body: { description, amount } }),
  deleteExpense: (id) => request('/expenses/' + id, { method: 'DELETE' }),

  // المخزون
  inventory: () => request('/inventory'),
  addInventory: (item) => request('/inventory', { method: 'POST', body: item }),
  updateInventory: (id, item) => request('/inventory/' + id, { method: 'PUT', body: item }),
  adjustInventory: (id, delta) =>
    request(`/inventory/${id}/adjust`, { method: 'POST', body: { delta } }),
  deleteInventory: (id) => request('/inventory/' + id, { method: 'DELETE' }),

  // التقارير
  summary: () => request('/reports/summary'),
};
