import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
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
  db.prepare("INSERT INTO settings (key, value) VALUES ('manager_pin', ?) ON CONFLICT(key) DO UPDATE SET value = ?")
    .run(String(next), String(next));
  res.json({ ok: true });
});

export default router;
