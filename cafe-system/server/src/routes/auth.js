import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

// تسجيل الدخول
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'أدخل اسم المستخدم وكلمة المرور' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  });
});

// بيانات المستخدم الحالي
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
