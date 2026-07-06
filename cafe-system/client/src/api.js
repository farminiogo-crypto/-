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
  categories: () => request('/categories'),
  products: (all = false) => request('/products' + (all ? '?all=1' : '')),
  createProduct: (p) => request('/products', { method: 'POST', body: p }),
  updateProduct: (id, p) => request('/products/' + id, { method: 'PUT', body: p }),
  deleteProduct: (id) => request('/products/' + id, { method: 'DELETE' }),
  createOrder: (o) => request('/orders', { method: 'POST', body: o }),
  orders: (limit = 50) => request('/orders?limit=' + limit),
  summary: () => request('/reports/summary'),
};
