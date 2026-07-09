import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// الشيفت المفتوح حالياً (واحد فقط على الخزينة)
export function currentShift() {
  return db.prepare("SELECT * FROM shifts WHERE status = 'open' ORDER BY id DESC LIMIT 1").get();
}

// يحسب ملخص شيفت: مبيعات كاش، مصروفات، المتوقع في الدرج
function shiftSummary(shift) {
  const sales = db
    .prepare(
      "SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS total FROM orders WHERE shift_id = ? AND status = 'paid'"
    )
    .get(shift.id);
  const exp = db
    .prepare('SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE shift_id = ?')
    .get(shift.id);

  const expected = shift.opening_cash + sales.total - exp.total;
  const difference = shift.closing_cash != null ? +(shift.closing_cash - expected).toFixed(2) : null;

  return {
    ...shift,
    sales_count: sales.orders,
    sales_total: +sales.total.toFixed(2),
    expenses_total: +exp.total.toFixed(2),
    expected_cash: +expected.toFixed(2),
    difference,
  };
}

// الشيفت الحالي مع ملخصه
router.get('/current', requireAuth, (req, res) => {
  const shift = currentShift();
  res.json(shift ? shiftSummary(shift) : null);
});

// فتح شيفت جديد
router.post('/open', requireAuth, (req, res) => {
  if (currentShift()) return res.status(400).json({ error: 'يوجد شيفت مفتوح بالفعل، اقفله أولاً' });

  const { name, opening_cash = 0 } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'اكتب اسم الكاشير المسؤول عن الشيفت' });
  const info = db
    .prepare(
      'INSERT INTO shifts (name, user_id, user_name, opening_cash) VALUES (?, ?, ?, ?)'
    )
    .run(name.trim(), req.user.id, req.user.name, Number(opening_cash) || 0);

  res.status(201).json(shiftSummary(db.prepare('SELECT * FROM shifts WHERE id = ?').get(info.lastInsertRowid)));
});

// قفل الشيفت الحالي (مع جرد الدرج)
router.post('/close', requireAuth, (req, res) => {
  const shift = currentShift();
  if (!shift) return res.status(400).json({ error: 'لا يوجد شيفت مفتوح' });

  const openOrders = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'open'")
    .get().c;
  if (openOrders > 0)
    return res.status(400).json({ error: `يوجد ${openOrders} فاتورة مفتوحة، أغلقها قبل قفل الشيفت` });

  const { closing_cash = 0, notes = '' } = req.body || {};
  db.prepare(
    "UPDATE shifts SET status = 'closed', closing_cash = ?, notes = ?, closed_at = datetime('now','localtime') WHERE id = ?"
  ).run(Number(closing_cash) || 0, notes, shift.id);

  res.json(shiftSummary(db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift.id)));
});

// يمسح شيفت وكل بياناته ويرجّع المخزون والترابيزات (للتجربة/التصحيح)
// alsoOpenOrders = true للشيفت المفتوح (عشان يشمل الأوردرات اللي لسه مالهاش shift_id)
function purgeShift(shiftId, alsoOpenOrders) {
  const restore = db.prepare('UPDATE inventory SET quantity = quantity - ? WHERE id = ?');
  const orders = db
    .prepare(
      alsoOpenOrders
        ? "SELECT id, table_id FROM orders WHERE shift_id = ? OR status = 'open'"
        : 'SELECT id, table_id FROM orders WHERE shift_id = ?'
    )
    .all(shiftId);

  // 1) استرجاع المخزون المخصوم (delta السالب → نرجّعه)
  for (const o of orders) {
    const moves = db
      .prepare('SELECT inventory_id, delta FROM inventory_moves WHERE ref_order_id = ? AND delta < 0')
      .all(o.id);
    for (const m of moves) restore.run(m.delta, m.inventory_id);
  }

  // 2) تحرير الترابيزات المرتبطة
  if (alsoOpenOrders) db.prepare("UPDATE tables SET status = 'free'").run();
  else for (const o of orders) if (o.table_id) db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(o.table_id);

  // 3) مسح عناصر الأوردرات وحركات المخزون والأوردرات نفسها
  for (const o of orders) {
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(o.id);
    db.prepare('DELETE FROM inventory_moves WHERE ref_order_id = ?').run(o.id);
    db.prepare('DELETE FROM orders WHERE id = ?').run(o.id);
  }

  // 4) مسح مصروفات الشيفت ثم الشيفت نفسه
  db.prepare('DELETE FROM expenses WHERE shift_id = ?').run(shiftId);
  db.prepare('DELETE FROM shifts WHERE id = ?').run(shiftId);
}

// إلغاء الشيفت المفتوح حالياً ومسح بياناته (للتجربة/التصحيح)
router.post('/cancel', requireAuth, (req, res) => {
  const shift = currentShift();
  if (!shift) return res.status(400).json({ error: 'لا يوجد شيفت مفتوح' });
  db.transaction(() => purgeShift(shift.id, true))();
  res.json({ ok: true });
});

// حذف أي شيفت من السجل (مدير) — يرجّع المخزون ويمسح أوردراته ومصروفاته
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'الشيفت غير موجود' });
  db.transaction(() => purgeShift(shift.id, shift.status === 'open'))();
  res.json({ ok: true });
});

// سجل الشيفتات (مدير)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const shifts = db.prepare('SELECT * FROM shifts ORDER BY id DESC LIMIT 50').all();
  res.json(shifts.map(shiftSummary));
});

// تفاصيل شيفت واحد (مدير)
router.get('/:id', requireAuth, requireAdmin, (req, res) => {
  const shift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
  if (!shift) return res.status(404).json({ error: 'الشيفت غير موجود' });
  const summary = shiftSummary(shift);
  summary.expenses = db.prepare('SELECT * FROM expenses WHERE shift_id = ? ORDER BY id DESC').all(shift.id);
  res.json(summary);
});

export default router;
