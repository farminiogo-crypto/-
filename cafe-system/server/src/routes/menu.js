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

// وصفة منتج: المكونات المرتبطة به (مدير)
router.get('/products/:id/ingredients', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT pi.id, pi.inventory_id, pi.qty_per_unit, i.name, i.unit
       FROM product_ingredients pi JOIN inventory i ON i.id = pi.inventory_id
       WHERE pi.product_id = ? ORDER BY pi.id`
    )
    .all(req.params.id);
  res.json(rows);
});

// حفظ وصفة منتج بالكامل (استبدال) — مدير
router.put('/products/:id/ingredients', requireAuth, requireAdmin, (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  for (const it of items) {
    if (!it.inventory_id || !(Number(it.qty_per_unit) > 0))
      return res.status(400).json({ error: 'كل مكوّن لازم يكون له صنف مخزون وكمية أكبر من صفر' });
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM product_ingredients WHERE product_id = ?').run(product.id);
    const ins = db.prepare(
      'INSERT INTO product_ingredients (product_id, inventory_id, qty_per_unit) VALUES (?, ?, ?)'
    );
    for (const it of items) ins.run(product.id, it.inventory_id, Number(it.qty_per_unit));
  });
  tx();

  const rows = db
    .prepare(
      `SELECT pi.id, pi.inventory_id, pi.qty_per_unit, i.name, i.unit
       FROM product_ingredients pi JOIN inventory i ON i.id = pi.inventory_id
       WHERE pi.product_id = ? ORDER BY pi.id`
    )
    .all(product.id);
  res.json(rows);
});

export default router;
