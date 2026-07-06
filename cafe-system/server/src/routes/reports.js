import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { currentShift } from './shifts.js';

const router = Router();

// ملخص لوحة التحكم (مدير)
router.get('/summary', requireAuth, requireAdmin, (req, res) => {
  const paid = "status = 'paid'";

  const today = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE ${paid} AND date(paid_at) = date('now','localtime')`
    )
    .get();

  const all = db.prepare(`SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders WHERE ${paid}`).get();
  const avg = today.orders > 0 ? +(today.revenue / today.orders).toFixed(2) : 0;

  // مصروفات اليوم
  const expensesToday = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE date(created_at) = date('now','localtime')`)
    .get().total;

  // الأكثر مبيعاً
  const topProducts = db
    .prepare(
      `SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'paid'
       GROUP BY oi.name ORDER BY qty DESC LIMIT 5`
    )
    .all();

  // مبيعات آخر 7 أيام
  const daily = db
    .prepare(
      `SELECT date(paid_at) AS day, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE ${paid} AND paid_at >= datetime('now','localtime','-6 days')
       GROUP BY day ORDER BY day`
    )
    .all();

  // فواتير مفتوحة حالياً
  const openTabs = db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(total),0) AS total FROM orders WHERE status = 'open'").get();

  // نواقص المخزون (وصل أو قرب يوصل للحد الأدنى) — عشان يطلبوا قبل ما يخلص
  const lowStock = db
    .prepare('SELECT * FROM inventory WHERE quantity <= min_quantity * 1.5 ORDER BY quantity / NULLIF(min_quantity,0)')
    .all()
    .map((r) => ({ ...r, level: r.quantity <= r.min_quantity ? 'low' : 'warn' }));

  res.json({
    today: { ...today, avg, expenses: +expensesToday.toFixed(2), net: +(today.revenue - expensesToday).toFixed(2) },
    all,
    topProducts,
    daily,
    openTabs,
    lowStock,
    shift: currentShift() || null,
  });
});

export default router;
