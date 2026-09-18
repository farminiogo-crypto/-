import { Router } from 'express';
import ExcelJS from 'exceljs';
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

// ===== تقرير شهري كامل بصيغة Excel (مدير) =====
// GET /api/reports/monthly.xlsx?month=2026-07
router.get('/monthly.xlsx', requireAuth, requireAdmin, async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
    ? req.query.month
    : new Date().toISOString().slice(0, 7);

  const like = month + '%';

  // البيانات
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE status = 'paid' AND paid_at LIKE ?`
    )
    .get(like);
  const expTotal = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE created_at LIKE ?`)
    .get(like).total;

  const daily = db
    .prepare(
      `SELECT date(paid_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE status = 'paid' AND paid_at LIKE ?
       GROUP BY day ORDER BY day`
    )
    .all(like);

  const invoices = db
    .prepare(
      `SELECT order_no, paid_at, table_name, customer_name, cashier_name, total
       FROM orders WHERE status = 'paid' AND paid_at LIKE ? ORDER BY id`
    )
    .all(like);

  const expenses = db
    .prepare(
      `SELECT e.created_at, e.description, e.amount, e.user_name, s.name AS shift_name
       FROM expenses e LEFT JOIN shifts s ON s.id = e.shift_id
       WHERE e.created_at LIKE ? ORDER BY e.id`
    )
    .all(like);

  const shifts = db
    .prepare(
      `SELECT s.*,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE shift_id = s.id AND status='paid') AS sales_total,
        (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE shift_id = s.id) AS expenses_total
       FROM shifts s WHERE s.opened_at LIKE ? ORDER BY s.id`
    )
    .all(like);

  const topProducts = db
    .prepare(
      `SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.qty * oi.price) AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.status = 'paid' AND o.paid_at LIKE ?
       GROUP BY oi.name ORDER BY qty DESC`
    )
    .all(like);

  // بناء ملف الإكسيل
  const wb = new ExcelJS.Workbook();
  wb.creator = 'نظام الكافيه';

  const headStyle = {
    font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B4B2A' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  function addSheet(name, columns, rows) {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] });
    ws.columns = columns;
    ws.getRow(1).height = 22;
    columns.forEach((_, i) => Object.assign(ws.getRow(1).getCell(i + 1), headStyle));
    rows.forEach((r) => ws.addRow(r));
    return ws;
  }

  // 1) ملخص الشهر
  const summary = addSheet(
    'ملخص الشهر',
    [
      { header: 'البند', key: 'k', width: 30 },
      { header: 'القيمة', key: 'v', width: 20 },
    ],
    [
      { k: 'الشهر', v: month },
      { k: 'إجمالي المبيعات (ج)', v: +totals.revenue.toFixed(2) },
      { k: 'عدد الفواتير', v: totals.orders },
      { k: 'متوسط الفاتورة (ج)', v: totals.orders ? +(totals.revenue / totals.orders).toFixed(2) : 0 },
      { k: 'إجمالي المصروفات (ج)', v: +expTotal.toFixed(2) },
      { k: 'الصافي (مبيعات − مصروفات) (ج)', v: +(totals.revenue - expTotal).toFixed(2) },
      { k: 'عدد الشيفتات', v: shifts.length },
    ]
  );
  summary.getColumn(2).font = { bold: true };

  // 2) المبيعات اليومية
  addSheet(
    'مبيعات يومية',
    [
      { header: 'اليوم', key: 'day', width: 15 },
      { header: 'عدد الفواتير', key: 'orders', width: 15 },
      { header: 'الإجمالي (ج)', key: 'revenue', width: 15 },
    ],
    daily.map((d) => ({ ...d, revenue: +d.revenue.toFixed(2) }))
  );

  // 3) كل الفواتير
  addSheet(
    'الفواتير',
    [
      { header: 'رقم الفاتورة', key: 'order_no', width: 15 },
      { header: 'التاريخ والوقت', key: 'paid_at', width: 20 },
      { header: 'الترابيزة', key: 'table_name', width: 14 },
      { header: 'الزبون', key: 'customer_name', width: 18 },
      { header: 'الكاشير', key: 'cashier_name', width: 16 },
      { header: 'الإجمالي (ج)', key: 'total', width: 13 },
    ],
    invoices.map((o) => ({ ...o, customer_name: o.customer_name || '—' }))
  );

  // 4) المصروفات
  addSheet(
    'المصروفات',
    [
      { header: 'التاريخ', key: 'created_at', width: 20 },
      { header: 'البيان', key: 'description', width: 30 },
      { header: 'المبلغ (ج)', key: 'amount', width: 13 },
      { header: 'بواسطة', key: 'user_name', width: 16 },
      { header: 'الشيفت', key: 'shift_name', width: 16 },
    ],
    expenses
  );

  // 5) الشيفتات
  addSheet(
    'الشيفتات',
    [
      { header: 'الشيفت', key: 'name', width: 16 },
      { header: 'فتح', key: 'opened_at', width: 20 },
      { header: 'قفل', key: 'closed_at', width: 20 },
      { header: 'رصيد البداية', key: 'opening_cash', width: 14 },
      { header: 'مبيعات', key: 'sales_total', width: 12 },
      { header: 'مصروفات', key: 'expenses_total', width: 12 },
      { header: 'متوقع', key: 'expected', width: 12 },
      { header: 'فعلي', key: 'closing_cash', width: 12 },
      { header: 'فرق', key: 'diff', width: 10 },
    ],
    shifts.map((s) => {
      const expected = +(s.opening_cash + s.sales_total - s.expenses_total).toFixed(2);
      return {
        ...s,
        closed_at: s.closed_at || 'مفتوح',
        expected,
        closing_cash: s.closing_cash ?? '—',
        diff: s.closing_cash != null ? +(s.closing_cash - expected).toFixed(2) : '—',
      };
    })
  );

  // 6) الأكثر مبيعاً
  addSheet(
    'الأكثر مبيعاً',
    [
      { header: 'المنتج', key: 'name', width: 25 },
      { header: 'الكمية المباعة', key: 'qty', width: 15 },
      { header: 'الإيراد (ج)', key: 'revenue', width: 15 },
    ],
    topProducts.map((p) => ({ ...p, revenue: +p.revenue.toFixed(2) }))
  );

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="cafe-report-${month}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

export default router;
