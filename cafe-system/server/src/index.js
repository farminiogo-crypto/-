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
import settingsRoutes from './routes/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// ===== نسخ احتياطي تلقائي لقاعدة البيانات =====
// نسختين في data/backups/:
//   يومية  (cafe-backup-YYYY-MM-DD.db)      — يحتفظ بآخر 30 يوم (شهر تاريخ)
//   بالساعة (cafe-hourly-YYYY-MM-DD_HH.db)  — يحتفظ بآخر 48 ساعة (يومين لقطات دقيقة)
// كده لو قطعت الكهربا في أي لحظة، أسوأ حالة تخسر شغل ساعة واحدة بحد أقصى.
const backupsDir = join(__dirname, '..', 'data', 'backups');
mkdirSync(backupsDir, { recursive: true });

async function makeBackup(prefix, stamp, keep) {
  const dest = join(backupsDir, `${prefix}-${stamp}.db`);
  if (existsSync(dest)) return; // نسخة نفس الفترة موجودة بالفعل
  try {
    await db.backup(dest); // نسخ آمن ومتسق حتى أثناء الاستخدام
    console.log(`💾 نسخة احتياطية: ${dest}`);
    // الاحتفاظ بآخر (keep) نسخة فقط من نفس النوع
    const files = readdirSync(backupsDir).filter((f) => f.startsWith(prefix + '-')).sort();
    while (files.length > keep) unlinkSync(join(backupsDir, files.shift()));
  } catch (e) {
    console.error('⚠️ فشل النسخ الاحتياطي:', e.message);
  }
}

function runBackups() {
  const now = new Date();
  const day = now.toLocaleDateString('sv'); // YYYY-MM-DD بتوقيت الجهاز
  const hour = String(now.getHours()).padStart(2, '0');
  makeBackup('cafe-backup', day, 30);              // يومية — آخر 30 يوم
  makeBackup('cafe-hourly', `${day}_${hour}`, 48); // بالساعة — آخر 48 ساعة
}

runBackups();                                 // عند التشغيل
setInterval(runBackups, 60 * 60 * 1000);      // وكل ساعة

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
app.use('/api/settings', settingsRoutes);
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
