import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

function logMove(inventory_id, delta, reason, user_name) {
  db.prepare(
    'INSERT INTO inventory_moves (inventory_id, delta, reason, user_name) VALUES (?, ?, ?, ?)'
  ).run(inventory_id, delta, reason, user_name);
}

// مستوى التنبيه: low = وصل/تحت الحد الأدنى، warn = قرب يخلص (أقل من 150% من الحد)
export function stockLevel(r) {
  if (r.quantity <= r.min_quantity) return 'low';
  if (r.quantity <= r.min_quantity * 1.5) return 'warn';
  return 'ok';
}

// كل أصناف المخزون (النواقص أولاً) + تقدير "يكفي لكام كوباية" من الوصفات المرتبطة
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  const usageStmt = db.prepare(
    `SELECT p.name AS product_name, pi.qty_per_unit
     FROM product_ingredients pi JOIN products p ON p.id = pi.product_id
     WHERE pi.inventory_id = ? AND p.active = 1
     ORDER BY pi.qty_per_unit DESC`
  );
  const withLevel = rows.map((r) => {
    const usages = usageStmt.all(r.id).map((u) => ({
      product: u.product_name,
      per_unit: u.qty_per_unit,
      servings_left: Math.floor(r.quantity / u.qty_per_unit),
    }));
    return { ...r, level: stockLevel(r), low: r.quantity <= r.min_quantity, usages };
  });
  const rank = { low: 0, warn: 1, ok: 2 };
  withLevel.sort((a, b) => rank[a.level] - rank[b.level] || a.name.localeCompare(b.name, 'ar'));
  res.json(withLevel);
});

// سجل حركة المخزون (أحدث أولاً)
router.get('/moves', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const moves = db
    .prepare(
      `SELECT m.*, i.name AS item_name, i.unit
       FROM inventory_moves m JOIN inventory i ON i.id = m.inventory_id
       ORDER BY m.id DESC LIMIT ?`
    )
    .all(limit);
  res.json(moves);
});

// إضافة صنف مخزون (مدير)
router.post('/', requireAuth, requireAdmin, (req, res) => {
  const { name, unit = 'وحدة', quantity = 0, min_quantity = 0, package_label, package_size } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'اسم الصنف مطلوب' });
  const info = db
    .prepare(
      'INSERT INTO inventory (name, unit, quantity, min_quantity, package_label, package_size) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(name.trim(), unit, Number(quantity) || 0, Number(min_quantity) || 0, package_label || null, Number(package_size) || null);
  if (Number(quantity) > 0) logMove(info.lastInsertRowid, Number(quantity), 'رصيد افتتاحي', req.user.name);
  res.status(201).json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(info.lastInsertRowid));
});

// تعديل بيانات صنف (مدير)
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

  const { name, unit, quantity, min_quantity, package_label, package_size } = req.body || {};
  const newQty = quantity != null ? Number(quantity) : item.quantity;
  if (newQty !== item.quantity) logMove(item.id, newQty - item.quantity, 'تسوية جرد', req.user.name);

  db.prepare(
    `UPDATE inventory SET name = ?, unit = ?, quantity = ?, min_quantity = ?, package_label = ?, package_size = ?,
     updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(
    name ?? item.name,
    unit ?? item.unit,
    newQty,
    min_quantity != null ? Number(min_quantity) : item.min_quantity,
    package_label !== undefined ? package_label || null : item.package_label,
    package_size !== undefined ? Number(package_size) || null : item.package_size,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id));
});

// إضافة كمية (شراء/توريد) — مدير
router.post('/:id/restock', requireAuth, requireAdmin, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  const qty = Number(req.body?.qty);
  if (!(qty > 0)) return res.status(400).json({ error: 'أدخل كمية صحيحة' });

  db.prepare(
    "UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(qty, req.params.id);
  logMove(item.id, qty, 'شراء/توريد', req.user.name);
  res.json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id));
});

// "خلّصت عبوة" — خصم عبوة كاملة (متاح للكاشير: كيس سكر خلص، سليف أكواب خلص...)
router.post('/:id/consume-package', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  if (!item.package_size) return res.status(400).json({ error: 'هذا الصنف ليس له عبوة محددة' });

  db.prepare(
    "UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(item.package_size, req.params.id);
  logMove(item.id, -item.package_size, `استهلاك ${item.package_label || 'عبوة'}`, req.user.name);
  res.json(db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id));
});

// حذف صنف (مدير)
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
