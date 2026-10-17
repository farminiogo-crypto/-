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

// ===== قائمة كل الشهور المتاحة بإجمالياتها (مدير) =====
// GET /api/reports/months  → [{ month:'2026-09', orders, revenue, expenses, net }, ...] الأحدث أولاً
router.get('/months', requireAuth, requireAdmin, (req, res) => {
  // الشهور من المبيعات ومن المصروفات معاً (عشان نضم أي شهر فيه حركة)
  const salesByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', paid_at) AS month,
              COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
       FROM orders WHERE status='paid' AND paid_at IS NOT NULL
       GROUP BY month`
    )
    .all();
  const expByMonth = db
    .prepare(
      `SELECT strftime('%Y-%m', created_at) AS month, COALESCE(SUM(amount),0) AS expenses
       FROM expenses GROUP BY month`
    )
    .all();

  const map = new Map();
  for (const r of salesByMonth) {
    if (!r.month) continue;
    map.set(r.month, { month: r.month, orders: r.orders, revenue: r.revenue, expenses: 0 });
  }
  for (const r of expByMonth) {
    if (!r.month) continue;
    const cur = map.get(r.month) || { month: r.month, orders: 0, revenue: 0, expenses: 0 };
    cur.expenses = r.expenses;
    map.set(r.month, cur);
  }

  const months = [...map.values()]
    .map((m) => ({
      month: m.month,
      orders: m.orders,
      revenue: +m.revenue.toFixed(2),
      expenses: +m.expenses.toFixed(2),
      net: +(m.revenue - m.expenses).toFixed(2),
    }))
    .sort((a, b) => (a.month < b.month ? 1 : -1)); // الأحدث أولاً

  res.json({ months });
});

// ===== أنماط الإكسيل المشتركة =====
const HEAD_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7B4B2A' } },
  alignment: { horizontal: 'center', vertical: 'middle' },
};

function makeWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'نظام الكافيه';
  const addSheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true }] });
    ws.columns = columns;
    ws.getRow(1).height = 22;
    columns.forEach((_, i) => Object.assign(ws.getRow(1).getCell(i + 1), HEAD_STYLE));
    rows.forEach((r) => ws.addRow(r));
    return ws;
  };
  return { wb, addSheet };
}

// يبني صفحات التقرير لمدى زمني محدد (شهر واحد أو كل الفترة)
// range = { label, orderWhere, orderParams, expWhere, expParams, shiftWhere, shiftParams }
function buildReportSheets(addSheet, range, { monthlyBreakdown = false } = {}) {
  const { label, orderWhere, orderParams, expWhere, expParams, shiftWhere, shiftParams } = range;

  const totals = db
    .prepare(`SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
              FROM orders WHERE status='paid' AND ${orderWhere}`)
    .get(...orderParams);
  const expTotal = db
    .prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE ${expWhere}`)
    .get(...expParams).total;

  const invoices = db
    .prepare(`SELECT order_no, paid_at, table_name, customer_name, cashier_name, total
              FROM orders WHERE status='paid' AND ${orderWhere} ORDER BY id`)
    .all(...orderParams);
  const expenses = db
    .prepare(`SELECT e.created_at, e.description, e.amount, e.user_name, s.name AS shift_name
              FROM expenses e LEFT JOIN shifts s ON s.id = e.shift_id
              WHERE ${expWhere} ORDER BY e.id`)
    .all(...expParams);
  const shifts = db
    .prepare(`SELECT s.*,
        (SELECT COALESCE(SUM(total),0) FROM orders WHERE shift_id=s.id AND status='paid') AS sales_total,
        (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE shift_id=s.id) AS expenses_total
       FROM shifts s WHERE ${shiftWhere} ORDER BY s.id`)
    .all(...shiftParams);
  const topProducts = db
    .prepare(`SELECT oi.name, SUM(oi.qty) AS qty, SUM(oi.qty*oi.price) AS revenue
              FROM order_items oi JOIN orders o ON o.id=oi.order_id
              WHERE o.status='paid' AND ${orderWhere.replace(/\bpaid_at\b/g, 'o.paid_at')}
              GROUP BY oi.name ORDER BY qty DESC`)
    .all(...orderParams);

  // 1) الملخص
  const summary = addSheet(
    'ملخص ' + label,
    [
      { header: 'البند', key: 'k', width: 32 },
      { header: 'القيمة', key: 'v', width: 20 },
    ],
    [
      { k: 'الفترة', v: label },
      { k: 'إجمالي المبيعات (ج)', v: +totals.revenue.toFixed(2) },
      { k: 'عدد الفواتير', v: totals.orders },
      { k: 'متوسط الفاتورة (ج)', v: totals.orders ? +(totals.revenue / totals.orders).toFixed(2) : 0 },
      { k: 'إجمالي المصروفات (ج)', v: +expTotal.toFixed(2) },
      { k: 'الصافي (مبيعات − مصروفات) (ج)', v: +(totals.revenue - expTotal).toFixed(2) },
      { k: 'عدد الشيفتات', v: shifts.length },
    ]
  );
  summary.getColumn(2).font = { bold: true };

  // 2) تفصيل شهري (في تقرير "كل الشهور" فقط) أو مبيعات يومية (تقرير الشهر الواحد)
  if (monthlyBreakdown) {
    const byMonth = db
      .prepare(`SELECT strftime('%Y-%m', paid_at) AS month, COUNT(*) AS orders,
                       COALESCE(SUM(total),0) AS revenue
                FROM orders WHERE status='paid' AND ${orderWhere}
                GROUP BY month ORDER BY month`)
      .all(...orderParams);
    const expMon = db
      .prepare(`SELECT strftime('%Y-%m', created_at) AS month, COALESCE(SUM(amount),0) AS expenses
                FROM expenses WHERE ${expWhere} GROUP BY month`)
      .all(...expParams);
    const em = new Map(expMon.map((r) => [r.month, r.expenses]));
    addSheet(
      'كل الشهور',
      [
        { header: 'الشهر', key: 'month', width: 14 },
        { header: 'عدد الفواتير', key: 'orders', width: 14 },
        { header: 'المبيعات (ج)', key: 'revenue', width: 16 },
        { header: 'المصروفات (ج)', key: 'expenses', width: 16 },
        { header: 'الصافي (ج)', key: 'net', width: 16 },
      ],
      byMonth.map((m) => {
        const expenses = +(em.get(m.month) || 0).toFixed(2);
        return { month: m.month, orders: m.orders, revenue: +m.revenue.toFixed(2),
          expenses, net: +(m.revenue - expenses).toFixed(2) };
      })
    );
  } else {
    const daily = db
      .prepare(`SELECT date(paid_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
                FROM orders WHERE status='paid' AND ${orderWhere}
                GROUP BY day ORDER BY day`)
      .all(...orderParams);
    addSheet(
      'مبيعات يومية',
      [
        { header: 'اليوم', key: 'day', width: 15 },
        { header: 'عدد الفواتير', key: 'orders', width: 15 },
        { header: 'الإجمالي (ج)', key: 'revenue', width: 15 },
      ],
      daily.map((d) => ({ ...d, revenue: +d.revenue.toFixed(2) }))
    );
  }

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
}

async function sendWorkbook(res, wb, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

// ===== تقرير شهري كامل بصيغة Excel (مدير) =====
// GET /api/reports/monthly.xlsx?month=2026-07
router.get('/monthly.xlsx', requireAuth, requireAdmin, async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
    ? req.query.month
    : new Date().toISOString().slice(0, 7);
  const like = month + '%';

  const { wb, addSheet } = makeWorkbook();
  buildReportSheets(addSheet, {
    label: 'الشهر ' + month,
    orderWhere: 'paid_at LIKE ?', orderParams: [like],
    expWhere: 'created_at LIKE ?', expParams: [like],
    shiftWhere: 's.opened_at LIKE ?', shiftParams: [like],
  });

  await sendWorkbook(res, wb, `cafe-report-${month}.xlsx`);
});

// ===== تقرير كل الشهور في ملف واحد (مدير) =====
// GET /api/reports/all.xlsx  — كل الفترة + صفحة تفصيل شهري
router.get('/all.xlsx', requireAuth, requireAdmin, async (req, res) => {
  const { wb, addSheet } = makeWorkbook();
  buildReportSheets(
    addSheet,
    {
      label: 'كل الفترة',
      orderWhere: 'paid_at IS NOT NULL', orderParams: [],
      expWhere: '1=1', expParams: [],
      shiftWhere: '1=1', shiftParams: [],
    },
    { monthlyBreakdown: true }
  );

  const today = new Date().toISOString().slice(0, 10);
  await sendWorkbook(res, wb, `cafe-report-all-${today}.xlsx`);
});

export default router;
