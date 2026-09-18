// تعبئة تلقائية للبيانات الأولية لو قاعدة البيانات فاضية (للنشر السحابي)
// يُشغّل قبل الخادم على الاستضافة؛ لا يمسح أي بيانات موجودة.
import db from './db.js';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const hasUsersTable = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
  .get();
const userCount = hasUsersTable ? db.prepare('SELECT COUNT(*) AS c FROM users').get().c : 0;

if (userCount === 0) {
  console.log('🌱 قاعدة البيانات فاضية — تعبئة تلقائية بالبيانات الأولية...');
  execFileSync('node', [join(__dirname, 'seed.js')], { stdio: 'inherit' });
} else {
  console.log(`✅ قاعدة البيانات موجودة (${userCount} مستخدم) — تخطّي التعبئة.`);
}
