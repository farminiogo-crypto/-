import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// كل الترابيزات مع إجمالي الفاتورة المفتوحة واسم الزبون (إن وجد)
router.get('/', requireAuth, (req, res) => {
  const tables = db.prepare('SELECT * FROM tables ORDER BY id').all();
  const openOrder = db.prepare(
    "SELECT id, total, customer_name FROM orders WHERE table_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1"
  );
  res.json(
    tables.map((t) => {
      const o = openOrder.get(t.id);
      return {
        ...t,
        order_id: o?.id || null,
        order_total: o?.total || 0,
        customer_name: o?.customer_name || null,
      };
    })
  );
});

// إضافة ترابيزة (متاح للكاشير أيضاً)
router.post('/', requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'اسم الترابيزة مطلوب' });
  const info = db.prepare('INSERT INTO tables (name) VALUES (?)').run(name.trim());
  res.status(201).json(db.prepare('SELECT * FROM tables WHERE id = ?').get(info.lastInsertRowid));
});

// حذف ترابيزة (مدير) — لا تُحذف لو عليها فاتورة مفتوحة
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const open = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE table_id = ? AND status = 'open'")
    .get(req.params.id).c;
  if (open > 0) return res.status(400).json({ error: 'الترابيزة عليها فاتورة مفتوحة' });
  db.prepare('DELETE FROM tables WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
