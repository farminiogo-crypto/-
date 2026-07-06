import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// كل الأقسام
router.get('/categories', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort, id').all());
});

// كل المنتجات (للـ POS: النشطة فقط ما لم يطلب المدير الكل)
router.get('/products', requireAuth, (req, res) => {
  const all = req.query.all === '1' && req.user.role === 'admin';
  const rows = all
    ? db.prepare('SELECT * FROM products ORDER BY category_id, id').all()
    : db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY category_id, id').all();
  res.json(rows);
});

// إضافة منتج (مدير)
router.post('/products', requireAuth, requireAdmin, (req, res) => {
  const { category_id, name, price, emoji } = req.body || {};
  if (!category_id || !name || price == null)
    return res.status(400).json({ error: 'القسم والاسم والسعر مطلوبة' });

  const info = db
    .prepare('INSERT INTO products (category_id, name, price, emoji) VALUES (?, ?, ?, ?)')
    .run(category_id, name, Number(price), emoji || '☕');
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid));
});

// تعديل منتج (مدير)
router.put('/products/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'المنتج غير موجود' });

  const { category_id, name, price, emoji, active } = req.body || {};
  db.prepare(
    `UPDATE products SET category_id = ?, name = ?, price = ?, emoji = ?, active = ? WHERE id = ?`
  ).run(
    category_id ?? existing.category_id,
    name ?? existing.name,
    price != null ? Number(price) : existing.price,
    emoji ?? existing.emoji,
    active != null ? (active ? 1 : 0) : existing.active,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// حذف منتج (مدير)
router.delete('/products/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
