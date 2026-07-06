import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

// ملخص لوحة التحكم (مدير)
router.get('/summary', requireAuth, requireAdmin, (req, res) => {
  const today = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE date(created_at) = date('now','localtime')`
    )
    .get();

  const all = db
    .prepare(`SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders`)
    .get();

  const avg = today.orders > 0 ? +(today.revenue / today.orders).toFixed(2) : 0;

  // الأكثر مبيعاً (كل الأوقات)
  const topProducts = db
    .prepare(
      `SELECT name, SUM(qty) AS qty, SUM(qty * price) AS revenue
       FROM order_items GROUP BY name ORDER BY qty DESC LIMIT 5`
    )
    .all();

  // مبيعات آخر 7 أيام
  const daily = db
    .prepare(
      `SELECT date(created_at) AS day, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS orders
       FROM orders
       WHERE created_at >= datetime('now','localtime','-6 days')
       GROUP BY day ORDER BY day`
    )
    .all();

  // توزيع طرق الدفع اليوم
  const payments = db
    .prepare(
      `SELECT payment_method AS method, COUNT(*) AS count, COALESCE(SUM(total),0) AS total
       FROM orders WHERE date(created_at) = date('now','localtime')
       GROUP BY payment_method`
    )
    .all();

  res.json({
    today: { ...today, avg },
    all,
    topProducts,
    daily,
    payments,
  });
});

export default router;
