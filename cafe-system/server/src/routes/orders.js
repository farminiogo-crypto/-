import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

const TAX_RATE = 0.14; // ضريبة القيمة المضافة 14%

// إنشاء أوردر جديد
router.post('/', requireAuth, (req, res) => {
  const { items, payment_method = 'cash', discount = 0 } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: 'السلة فارغة' });

  // احسب الإجماليات من أسعار قاعدة البيانات (مش من العميل) لأمان أكبر
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');
  let subtotal = 0;
  const lines = [];
  for (const it of items) {
    const p = getProduct.get(it.id);
    if (!p) return res.status(400).json({ error: `منتج غير موجود: ${it.id}` });
    const qty = Math.max(1, parseInt(it.qty) || 1);
    subtotal += p.price * qty;
    lines.push({ product_id: p.id, name: p.name, price: p.price, qty });
  }

  const disc = Math.min(Number(discount) || 0, subtotal);
  const taxable = subtotal - disc;
  const tax = +(taxable * TAX_RATE).toFixed(2);
  const total = +(taxable + tax).toFixed(2);
  const orderNo = 'ORD-' + Date.now().toString().slice(-6);

  const tx = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (order_no, subtotal, tax, discount, total, payment_method, cashier_id, cashier_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(orderNo, subtotal, tax, disc, total, payment_method, req.user.id, req.user.name);

    const insItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)'
    );
    for (const l of lines) insItem.run(info.lastInsertRowid, l.product_id, l.name, l.price, l.qty);
    return info.lastInsertRowid;
  });

  const id = tx();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  res.status(201).json(order);
});

// قائمة الأوردرات (أحدث أولاً)
router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT ?').all(limit);
  res.json(orders);
});

// تفاصيل أوردر
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الأوردر غير موجود' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json(order);
});

export default router;
