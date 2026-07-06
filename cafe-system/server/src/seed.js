// تعبئة قاعدة البيانات ببيانات أولية
import bcrypt from 'bcryptjs';
import db, { initSchema } from './db.js';

console.log('⏳ جاري تعبئة قاعدة البيانات...');

// إعادة بناء نظيفة (مهم لو المخطط اتغيّر)
db.exec(`
  DROP TABLE IF EXISTS order_items;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS expenses;
  DROP TABLE IF EXISTS shifts;
  DROP TABLE IF EXISTS tables;
  DROP TABLE IF EXISTS inventory;
  DROP TABLE IF EXISTS products;
  DROP TABLE IF EXISTS categories;
  DROP TABLE IF EXISTS users;
`);
initSchema();

// المستخدمون
const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)'
);
insertUser.run('admin', bcrypt.hashSync('admin123', 10), 'المدير', 'admin');
insertUser.run('cashier', bcrypt.hashSync('cashier123', 10), 'أحمد الكاشير', 'cashier');

// الأقسام
const insertCat = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
const cats = {
  hot:     insertCat.run('مشروبات ساخنة', 1).lastInsertRowid,
  cold:    insertCat.run('مشروبات باردة', 2).lastInsertRowid,
  dessert: insertCat.run('حلويات', 3).lastInsertRowid,
  snack:   insertCat.run('سناكس', 4).lastInsertRowid,
};

// المنتجات  [قسم, اسم, سعر, ايموجي]
const products = [
  [cats.hot, 'قهوة تركي', 25, '☕'],
  [cats.hot, 'إسبريسو', 30, '☕'],
  [cats.hot, 'كابتشينو', 45, '☕'],
  [cats.hot, 'لاتيه', 50, '🥛'],
  [cats.hot, 'شاي', 15, '🍵'],
  [cats.hot, 'هوت شوكليت', 55, '🍫'],
  [cats.cold, 'آيس كوفي', 55, '🧊'],
  [cats.cold, 'فرابيه', 65, '🥤'],
  [cats.cold, 'آيس لاتيه', 60, '🧊'],
  [cats.cold, 'ليمون بالنعناع', 40, '🍋'],
  [cats.cold, 'موهيتو', 50, '🌿'],
  [cats.cold, 'عصير برتقال', 45, '🍊'],
  [cats.dessert, 'تشيز كيك', 70, '🍰'],
  [cats.dessert, 'براوني', 60, '🍫'],
  [cats.dessert, 'كروسان', 40, '🥐'],
  [cats.dessert, 'وافل', 75, '🧇'],
  [cats.snack, 'ساندويتش تونة', 55, '🥪'],
  [cats.snack, 'ساندويتش حلومي', 65, '🧀'],
  [cats.snack, 'بطاطس', 35, '🍟'],
  [cats.snack, 'كوكيز', 30, '🍪'],
];
const insertProd = db.prepare(
  'INSERT INTO products (category_id, name, price, emoji) VALUES (?, ?, ?, ?)'
);
for (const p of products) insertProd.run(...p);

// الترابيزات
const insertTable = db.prepare('INSERT INTO tables (name) VALUES (?)');
for (let i = 1; i <= 12; i++) insertTable.run('ترابيزة ' + i);
insertTable.run('تيك أواي'); // للطلبات الخارجية

// المخزون
const insertInv = db.prepare(
  'INSERT INTO inventory (name, unit, quantity, min_quantity) VALUES (?, ?, ?, ?)'
);
const stock = [
  ['بن', 'كجم', 8, 3],
  ['حليب', 'لتر', 20, 8],
  ['سكر', 'كجم', 15, 5],
  ['شاي', 'علبة', 6, 2],
  ['أكواب ورقية', 'كرتونة', 4, 2],
  ['شوكولاتة', 'كجم', 3, 2],
  ['ليمون', 'كجم', 5, 3],
  ['نعناع', 'باقة', 10, 4],
];
for (const s of stock) insertInv.run(...s);

console.log(`✅ تم!`);
console.log(`   🍽️  ${products.length} منتج، 13 ترابيزة، ${stock.length} صنف مخزون`);
console.log('   👤 المدير:  admin / admin123');
console.log('   👤 الكاشير: cashier / cashier123');
