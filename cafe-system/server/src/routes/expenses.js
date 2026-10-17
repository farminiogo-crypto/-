import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../auth.js';
import { currentShift } from './shifts.js';

const router = Router();

// مصروفات الشيفت الحالي (أو كل المصروفات للمدير عبر ?all=1)
router.get('/', requireAuth, (req, res) => {
  if (req.query.all === '1' && req.user.role === 'admin') {
    return res.json(db.prepare('SELECT * FROM expenses ORDER BY id DESC LIMIT 100').all());
  }
  const shift = currentShift();
  if (!shift) return res.json([]);
  res.json(db.prepare('SELECT * FROM expenses WHERE shift_id = ? ORDER BY id DESC').all(shift.id));
});

// تسجيل مصروف (يخصم من درج الشيفت الحالي)
router.post('/', requireAuth, (req, res) => {
  const shift = currentShift();
  if (!shift) return res.status(400).json({ error: 'افتح شيفت أولاً لتسجيل المصروفات' });

  const { description, amount } = req.body || {};
  if (!description?.trim() || !(Number(amount) > 0))
    return res.status(400).json({ error: 'أدخل بيان المصروف ومبلغاً صحيحاً' });

  const info = db
    .prepare(
      'INSERT INTO expenses (shift_id, description, amount, user_id, user_name) VALUES (?, ?, ?, ?, ?)'
    )
    .run(shift.id, description.trim(), Number(amount), req.user.id, req.user.name);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid));
});

// حذف مصروف (من الشيفت الحالي فقط)
router.delete('/:id', requireAuth, (req, res) => {
  const shift = currentShift();
  const exp = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'المصروف غير موجود' });
  if (!shift || exp.shift_id !== shift.id)
    return res.status(400).json({ error: 'لا يمكن حذف مصروف من شيفت مقفول' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
