import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../auth.js';

const router = Router();

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    .run(key, value, value);
}

// التحقق من باسورد المدير (لفتح صفحات التقارير والحسابات)
router.post('/verify-pin', requireAuth, (req, res) => {
  const { pin } = req.body || {};
  const real = getSetting('manager_pin', '1234');
  res.json({ ok: String(pin || '') === String(real) });
});

// تغيير باسورد المدير (لازم الباسورد الحالي صح)
router.post('/change-pin', requireAuth, (req, res) => {
  const { current, next } = req.body || {};
  const real = getSetting('manager_pin', '1234');
  if (String(current || '') !== String(real))
    return res.status(400).json({ error: 'الباسورد الحالي غير صحيح' });
  if (!next || String(next).length < 3)
    return res.status(400).json({ error: 'الباسورد الجديد لازم 3 أرقام على الأقل' });
  setSetting('manager_pin', String(next));
  res.json({ ok: true });
});

// اسم ماكينة الفواتير المختارة (للطباعة الصامتة المباشرة)
router.get('/printer', requireAuth, (req, res) => {
  res.json({ printer_name: getSetting('printer_name', '') });
});
router.post('/printer', requireAuth, requireAdmin, (req, res) => {
  setSetting('printer_name', String(req.body?.name || ''));
  res.json({ ok: true, printer_name: getSetting('printer_name', '') });
});

// تنظيف بيانات التجربة: يمسح الفواتير/الشيفتات/المصروفات ويصفّر المخزون (مدير)
router.post('/reset-data', requireAuth, requireAdmin, (req, res) => {
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM order_items;
      DELETE FROM orders;
      DELETE FROM expenses;
      DELETE FROM inventory_moves;
      DELETE FROM shifts;
    `);
    db.prepare('UPDATE inventory SET quantity = 0').run();
    db.prepare("UPDATE tables SET status = 'free'").run();
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('orders','shifts','expenses','inventory_moves');");
  });
  tx();
  res.json({ ok: true });
});

export default router;
