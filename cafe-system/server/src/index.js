// نقطة تشغيل الخادم
import express from 'express';
import cors from 'cors';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import db from './db.js'; // ينشئ الجداول عند الإقلاع
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import reportRoutes from './routes/reports.js';
import tableRoutes from './routes/tables.js';
import shiftRoutes from './routes/shifts.js';
import expenseRoutes from './routes/expenses.js';
import inventoryRoutes from './routes/inventory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// ===== نسخ احتياطي تلقائي لقاعدة البيانات =====
// نسخة يومية في data/backups/ — يحتفظ بآخر 30 نسخة
const backupsDir = join(__dirname, '..', 'data', 'backups');
mkdirSync(backupsDir, { recursive: true });

async function backupDatabase() {
  const today = new Date().toLocaleDateString('sv'); // YYYY-MM-DD بتوقيت الجهاز
  const dest = join(backupsDir, `cafe-backup-${today}.db`);
  if (existsSync(dest)) return; // نسخة النهارده موجودة
  try {
    await db.backup(dest); // نسخ آمن ومتسق حتى أثناء الاستخدام
    console.log(`💾 نسخة احتياطية: ${dest}`);
    // الاحتفاظ بآخر 30 نسخة فقط
    const files = readdirSync(backupsDir).filter((f) => f.startsWith('cafe-backup-')).sort();
    while (files.length > 30) unlinkSync(join(backupsDir, files.shift()));
  } catch (e) {
    console.error('⚠️ فشل النسخ الاحتياطي:', e.message);
  }
}
backupDatabase();                                   // عند التشغيل
setInterval(backupDatabase, 6 * 60 * 60 * 1000);    // وكل 6 ساعات (لو اليوم اتغيّر)

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api', menuRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// خدمة واجهة الإنتاج (بعد بناء الـ client) لو موجودة
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`☕ نظام الكافيه يعمل على  http://localhost:${PORT}`);
});
