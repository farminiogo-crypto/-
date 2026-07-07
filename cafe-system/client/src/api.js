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
  createCategory: (name) => request('/categories', { method: 'POST', body: { name } }),
  updateCategory: (id, patch) => request('/categories/' + id, { method: 'PUT', body: patch }),
  deleteCategory: (id) => request('/categories/' + id, { method: 'DELETE' }),
  products: (all = false) => request('/products' + (all ? '?all=1' : '')),
  createProduct: (p) => request('/products', { method: 'POST', body: p }),
  updateProduct: (id, p) => request('/products/' + id, { method: 'PUT', body: p }),
  deleteProduct: (id) => request('/products/' + id, { method: 'DELETE' }),

  // الترابيزات
  tables: () => request('/tables'),
  addTable: (name) => request('/tables', { method: 'POST', body: { name } }),
  renameTable: (id, name) => request('/tables/' + id, { method: 'PUT', body: { name } }),
  deleteTable: (id) => request('/tables/' + id, { method: 'DELETE' }),

  // الوصفات
  ingredients: (productId) => request(`/products/${productId}/ingredients`),
  saveIngredients: (productId, items) =>
    request(`/products/${productId}/ingredients`, { method: 'PUT', body: { items } }),

  // الفواتير
  openTab: (table_id, customer_name = '') =>
    request('/orders/open', { method: 'POST', body: { table_id, customer_name } }),
  order: (id) => request('/orders/' + id),
  addItem: (id, product_id, qty = 1) =>
    request(`/orders/${id}/items`, { method: 'POST', body: { product_id, qty } }),
  changeItem: (id, itemId, delta) =>
    request(`/orders/${id}/items/${itemId}`, { method: 'PATCH', body: { delta } }),
  removeItem: (id, itemId) => request(`/orders/${id}/items/${itemId}`, { method: 'DELETE' }),
  payOrder: (id) => request(`/orders/${id}/pay`, { method: 'POST' }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  voidOrder: (id) => request(`/orders/${id}/void`, { method: 'POST' }),
  setCustomer: (id, customer_name) =>
    request(`/orders/${id}`, { method: 'PATCH', body: { customer_name } }),
  // سجل الفواتير المدفوعة: { rows, count, total } مع فلاتر اختيارية
  paidOrders: ({ date = '', q = '', limit = 100 } = {}) => {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (q) params.set('q', q);
    if (limit) params.set('limit', limit);
    return request('/orders?' + params.toString());
  },

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
  inventoryMoves: (limit = 50) => request('/inventory/moves?limit=' + limit),
  addInventory: (item) => request('/inventory', { method: 'POST', body: item }),
  updateInventory: (id, item) => request('/inventory/' + id, { method: 'PUT', body: item }),
  restockInventory: (id, qty, packages = null) =>
    request(`/inventory/${id}/restock`, { method: 'POST', body: packages ? { packages } : { qty } }),
  adjustInventory: (id, delta) =>
    request(`/inventory/${id}/adjust`, { method: 'POST', body: { delta } }),
  consumePackage: (id) => request(`/inventory/${id}/consume-package`, { method: 'POST' }),
  deleteInventory: (id) => request('/inventory/' + id, { method: 'DELETE' }),

  // إعدادات + باسورد المدير
  verifyPin: (pin) => request('/settings/verify-pin', { method: 'POST', body: { pin } }),
  changePin: (current, next) => request('/settings/change-pin', { method: 'POST', body: { current, next } }),
  getPrinter: () => request('/settings/printer'),
  setPrinter: (name) => request('/settings/printer', { method: 'POST', body: { name } }),
  resetData: () => request('/settings/reset-data', { method: 'POST' }),

  // التقارير
  summary: () => request('/reports/summary'),

  // تنزيل التقرير الشهري Excel (month بصيغة YYYY-MM)
  async downloadMonthlyReport(month) {
    const res = await fetch(`/api/reports/monthly.xlsx?month=${month}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'فشل تنزيل التقرير');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafe-report-${month}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
