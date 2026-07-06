import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// مستوى التنبيه: low = وصل/تحت الحد الأدنى، warn = قرب يخلص (أقل من 150% من الحد)
export function stockLevel(r) {
  if (r.quantity <= r.min_quantity) return 'low';
  if (r.quantity <= r.min_quantity * 1.5) return 'warn';
  return 'ok';
}

// كل أصناف المخزون (النواقص أولاً)
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  const withLevel = rows.map((r) => ({ ...r, level: stockLevel(r), low: r.quantity <= r.min_quantity }));
  const rank = { low: 0, warn: 1, ok: 2 };
  withLevel.sort((a, b) => rank[a.level] - rank[b.level] || a.name.localeCompare(b.name, 'ar'));
  res.json(withLevel);
});

// إضافة صنف مخزون (مدير)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, unit = 'وحدة', quantity = 0, min_quantity = 0 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'اسم الصنف مطلوب' });
  const info = db
    .prepare('INSERT INTO inventory (name, unit, quantity, min_quantity) VALUES (?, ?, ?, ?)')
    .run(name.trim(), unit, Number(quantity) || 0, Number(min_quantity) || 0);
  res.status(201).json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(info.lastInsertRowid));
});

// تعديل صنف / ضبط الكمية (مدير)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

  const { name, unit, quantity, min_quantity } = req.body || {};
  db.prepare(
    "UPDATE inventory SET name = ?, unit = ?, quantity = ?, min_quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(
    name ?? item.name,
    unit ?? item.unit,
    quantity != null ? Number(quantity) : item.quantity,
    min_quantity != null ? Number(min_quantity) : item.min_quantity,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id));
});

// تعديل سريع للكمية بمقدار (+/-) (مدير)
router.post('/:id/adjust', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  const delta = Number(req.body?.delta) || 0;
  const newQty = Math.max(0, item.quantity + delta);
  db.prepare(
    "UPDATE inventory SET quantity = ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(newQty, req.params.id);
  res.json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id));
});

// حذف صنف (مدير)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
