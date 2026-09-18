import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { currentShift } from './shifts.js';

const router = Router();

// يعيد حساب إجمالي الفاتورة من عناصرها
function recalc(orderId) {
  const { total } = db
    .prepare('SELECT COALESCE(SUM(price * qty),0) AS total FROM order_items WHERE order_id = ?')
    .get(orderId);
  db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(total, orderId);
  return total;
}

// يرفق العناصر بالفاتورة
function withItems(order) {
  if (!order) return order;
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(order.id);
  return order;
}

// يخصم مكونات مجموعة أصناف مباعة من المخزون (الخصم التلقائي فقط: بن/شاي...)
// ويسجّل الحركة. اليدوي (لبن/سكر/نعناع) لا يُخصم آلياً.
// للأصناف اللي ليها إنتاجية: qty_per_unit = عدد الكوبايات، والاستهلاك الفعلي =
// كوبايات × (حجم العبوة ÷ كوبايات العبوة).
function deductInventoryForItems(items, orderId, userName) {
  const getIngredients = db.prepare(
    `SELECT pi.inventory_id, pi.qty_per_unit, i.package_size, i.cups_per_package
     FROM product_ingredients pi JOIN inventory i ON i.id = pi.inventory_id
     WHERE pi.product_id = ? AND i.auto_deduct = 1`
  );
  const perUnitAmount = (ing) =>
    ing.cups_per_package && ing.package_size
      ? ing.qty_per_unit * (ing.package_size / ing.cups_per_package)
      : ing.qty_per_unit;
  const deduct = db.prepare(
    "UPDATE inventory SET quantity = MAX(0, quantity - ?), updated_at = datetime('now','localtime') WHERE id = ?"
  );
  const logMove = db.prepare(
    'INSERT INTO inventory_moves (inventory_id, delta, reason, ref_order_id, user_name) VALUES (?, ?, ?, ?, ?)'
  );
  for (const it of items) {
    if (!it.product_id) continue;
    for (const ing of getIngredients.all(it.product_id)) {
      const used = perUnitAmount(ing) * it.qty;
      deduct.run(used, ing.inventory_id);
      logMove.run(ing.inventory_id, -used, `بيع: ${it.name} ×${it.qty}`, orderId, userName);
    }
  }
}

// فتح فاتورة لترابيزة (أو إرجاع المفتوحة لو موجودة)
router.post('/open', requireAuth, (req, res) => {
  const shift = currentShift();
  if (!shift) return res.status(400).json({ error: 'افتح شيفت أولاً قبل استقبال الطلبات' });

  const { table_id, customer_name } = req.body || {};
  const table = db.prepare('SELECT * FROM tables WHERE id = ?').get(table_id);
  if (!table) return res.status(404).json({ error: 'الترابيزة غير موجودة' });

  // لو فيه فاتورة مفتوحة على الترابيزة، رجّعها
  const existing = db
    .prepare("SELECT * FROM orders WHERE table_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1")
    .get(table_id);
  if (existing) return res.json(withItems(existing));

  const orderNo = 'ORD-' + Date.now().toString().slice(-6);
  const info = db
    .prepare(
      'INSERT INTO orders (order_no, table_id, table_name, customer_name, cashier_id, cashier_name) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(orderNo, table.id, table.name, customer_name?.trim() || null, req.user.id, req.user.name);
  db.prepare("UPDATE tables SET status = 'occupied' WHERE id = ?").run(table.id);

  res.status(201).json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid)));
});

// كل الفواتير المفتوحة
router.get('/open', requireAuth, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE status = 'open' ORDER BY id").all();
  res.json(orders.map(withItems));
});

// فاتورة واحدة بالتفاصيل
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  res.json(withItems(order));
});

// إضافة صنف للفاتورة (يزيد الكمية لو موجود)
router.post('/:id/items', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open') return res.status(400).json({ error: 'الفاتورة غير مفتوحة' });

  const { product_id, qty = 1 } = req.body || {};
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
  if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

  const q = Math.max(1, parseInt(qty) || 1);
  // يندمج فقط مع سطر بنفس المنتج وبدون ملاحظة — عشان الأصناف اللي عليها ملاحظات
  // مختلفة تفضل كل واحدة في سطر لوحدها
  const line = db
    .prepare('SELECT * FROM order_items WHERE order_id = ? AND product_id = ? AND note IS NULL')
    .get(order.id, product_id);
  if (line) {
    db.prepare('UPDATE order_items SET qty = qty + ? WHERE id = ?').run(q, line.id);
  } else {
    db.prepare(
      'INSERT INTO order_items (order_id, product_id, name, price, qty) VALUES (?, ?, ?, ?, ?)'
    ).run(order.id, product.id, product.name, product.price, q);
  }
  recalc(order.id);
  res.json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

// تعديل ملاحظة صنف (سكر زيادة / بدون نعناع...) — على فاتورة مفتوحة فقط
router.patch('/:id/items/:itemId/note', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open')
    return res.status(400).json({ error: 'لا يمكن تعديل فاتورة غير مفتوحة' });
  const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

  const { note } = req.body || {};
  db.prepare('UPDATE order_items SET note = ? WHERE id = ?').run(note?.trim() || null, item.id);
  res.json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

// تعديل كمية صنف (delta موجب أو سالب) — يُحذف لو وصل صفر
router.patch('/:id/items/:itemId', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open')
    return res.status(400).json({ error: 'لا يمكن تعديل فاتورة غير مفتوحة' });

  const { delta = 0 } = req.body || {};
  const item = db
    .prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?')
    .get(req.params.itemId, req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

  const newQty = item.qty + (parseInt(delta) || 0);
  if (newQty <= 0) db.prepare('DELETE FROM order_items WHERE id = ?').run(item.id);
  else db.prepare('UPDATE order_items SET qty = ? WHERE id = ?').run(newQty, item.id);

  recalc(req.params.id);
  res.json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

// حذف صنف
router.delete('/:id/items/:itemId', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open')
    return res.status(400).json({ error: 'لا يمكن تعديل فاتورة غير مفتوحة' });

  db.prepare('DELETE FROM order_items WHERE id = ? AND order_id = ?').run(req.params.itemId, req.params.id);
  recalc(req.params.id);
  res.json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)));
});

// دفع الفاتورة (كاش) + خصم المكونات من المخزون تلقائياً + تحرير الترابيزة
router.post('/:id/pay', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open') return res.status(400).json({ error: 'الفاتورة غير مفتوحة' });

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  if (items.length === 0) return res.status(400).json({ error: 'الفاتورة فارغة' });

  const shift = currentShift();
  const tx = db.transaction(() => {
    recalc(order.id);
    db.prepare(
      "UPDATE orders SET status = 'paid', shift_id = ?, paid_at = datetime('now','localtime') WHERE id = ?"
    ).run(shift?.id || null, order.id);
    if (order.table_id) db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(order.table_id);
    deductInventoryForItems(items, order.id, req.user.name);
  });
  tx();

  // أصناف نزلت تحت الحد الأدنى بعد الخصم (لتنبيه الكاشير فوراً)
  const lowStock = db
    .prepare('SELECT name, quantity, unit FROM inventory WHERE quantity <= min_quantity')
    .all();

  const paid = withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id));
  paid.low_stock = lowStock;
  res.json(paid);
});

// دفع جزئي: زبون في ترابيزة فيها كذا شخص يحاسب على أصنافه لوحده.
// بيعمل فاتورة جديدة مدفوعة بالأصناف المختارة (تُطبع + تخصم مخزون + تتحسب مبيعات)،
// ويقلّل كميات الأصناف من الترابيزة الأصلية. لو الترابيزة فضلت فاضية تتحرّر.
router.post('/:id/split-pay', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open') return res.status(400).json({ error: 'الفاتورة غير مفتوحة' });

  const picks = Array.isArray(req.body?.items) ? req.body.items : [];
  const selected = [];
  for (const p of picks) {
    const qty = Math.max(0, parseInt(p.qty) || 0);
    if (qty <= 0) continue;
    const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(p.item_id, order.id);
    if (!item) return res.status(404).json({ error: 'صنف غير موجود في الفاتورة' });
    if (qty > item.qty) return res.status(400).json({ error: `الكمية المطلوبة من "${item.name}" أكبر من الموجود` });
    selected.push({ item, qty });
  }
  if (selected.length === 0) return res.status(400).json({ error: 'اختار الأصناف اللي هتتحاسب' });

  const shift = currentShift();
  let newOrderId = null;
  const tx = db.transaction(() => {
    const orderNo = 'ORD-' + Date.now().toString().slice(-6);
    const info = db
      .prepare(
        'INSERT INTO orders (order_no, table_id, table_name, customer_name, cashier_id, cashier_name, status, shift_id, paid_at) ' +
          "VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, datetime('now','localtime'))"
      )
      .run(orderNo, order.table_id, order.table_name, order.customer_name, req.user.id, req.user.name, shift?.id || null);
    newOrderId = info.lastInsertRowid;

    const paidItems = [];
    for (const { item, qty } of selected) {
      db.prepare('INSERT INTO order_items (order_id, product_id, name, price, qty, note) VALUES (?, ?, ?, ?, ?, ?)')
        .run(newOrderId, item.product_id, item.name, item.price, qty, item.note || null);
      paidItems.push({ product_id: item.product_id, name: item.name, qty });
      if (qty >= item.qty) db.prepare('DELETE FROM order_items WHERE id = ?').run(item.id);
      else db.prepare('UPDATE order_items SET qty = qty - ? WHERE id = ?').run(qty, item.id);
    }
    recalc(newOrderId);
    deductInventoryForItems(paidItems, newOrderId, req.user.name);

    const remaining = db.prepare('SELECT COUNT(*) AS c FROM order_items WHERE order_id = ?').get(order.id).c;
    if (remaining === 0) {
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
      if (order.table_id) db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(order.table_id);
    } else {
      recalc(order.id);
    }
  });
  tx();

  const paid = withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(newOrderId));
  paid.low_stock = db.prepare('SELECT name, quantity, unit FROM inventory WHERE quantity <= min_quantity').all();
  const remainingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ paid, order: remainingOrder.status === 'open' ? withItems(remainingOrder) : null });
});

// تعديل اسم الزبون على فاتورة مفتوحة (في أي وقت قبل الدفع)
router.patch('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open') return res.status(400).json({ error: 'الفاتورة غير مفتوحة' });
  const { customer_name } = req.body || {};
  db.prepare('UPDATE orders SET customer_name = ? WHERE id = ?').run(customer_name?.trim() || null, order.id);
  res.json(withItems(db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)));
});

// إلغاء فاتورة مفتوحة وتحرير الترابيزة
router.post('/:id/cancel', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order || order.status !== 'open') return res.status(400).json({ error: 'الفاتورة غير مفتوحة' });
  db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(order.id);
  if (order.table_id) db.prepare("UPDATE tables SET status = 'free' WHERE id = ?").run(order.table_id);
  res.json({ ok: true });
});

// إلغاء/استرجاع فاتورة مدفوعة (اتدفعت بالغلط) — يرجّع المخزون المخصوم ويعلّمها "ملغاة"
// محمي فعلياً ببوابة المدير في صفحة الفواتير. الفاتورة لا تُحذف — تفضل بسجل للتوثيق.
router.post('/:id/void', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
  if (order.status !== 'paid') return res.status(400).json({ error: 'الإلغاء متاح للفواتير المدفوعة فقط' });

  // الحركات اللي اتخصمت وقت الدفع (delta سالب) — نرجّعها للمخزون زي ما كانت
  const soldMoves = db
    .prepare('SELECT inventory_id, delta FROM inventory_moves WHERE ref_order_id = ? AND delta < 0')
    .all(order.id);

  // quantity - delta(سالب) = quantity + الكمية المخصومة → استرجاع
  const restore = db.prepare(
    "UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now','localtime') WHERE id = ?"
  );
  const logMove = db.prepare(
    'INSERT INTO inventory_moves (inventory_id, delta, reason, ref_order_id, user_name) VALUES (?, ?, ?, ?, ?)'
  );

  const tx = db.transaction(() => {
    for (const m of soldMoves) {
      restore.run(m.delta, m.inventory_id);
      logMove.run(m.inventory_id, -m.delta, `إلغاء فاتورة: ${order.order_no}`, order.id, req.user.name);
    }
    db.prepare("UPDATE orders SET status = 'voided' WHERE id = ?").run(order.id);
  });
  tx();

  res.json({ ok: true, restored: soldMoves.length });
});

// سجل الفواتير المدفوعة — مع فلتر تاريخ وبحث
router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const { date, q } = req.query;

  let sql = "SELECT * FROM orders WHERE status = 'paid'";
  const params = [];
  if (date) {
    sql += ' AND date(paid_at) = ?';
    params.push(date);
  }
  if (q?.trim()) {
    sql += ' AND (order_no LIKE ? OR table_name LIKE ? OR customer_name LIKE ?)';
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  const total = +rows.reduce((s, r) => s + r.total, 0).toFixed(2);
  res.json({ rows, count: rows.length, total });
});

export default router;
