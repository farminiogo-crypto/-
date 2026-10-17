// مصادقة بسيطة عبر JWT
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'cafe-secret-change-me';

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    SECRET,
    { expiresIn: '12h' }
  );
}

// يتحقق من التوكن ويحط بيانات المستخدم في req.user
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'الجلسة منتهية، سجّل الدخول من جديد' });
  }
}

// يتأكد أن المستخدم مدير
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'هذه الصفحة للمدير فقط' });
  next();
}
