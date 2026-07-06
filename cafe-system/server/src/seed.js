// تعبئة قاعدة البيانات ببيانات أولية (مستخدمين + منيو)
import bcrypt from 'bcryptjs';
import db from './db.js';

console.log('⏳ جاري تعبئة قاعدة البيانات...');

// امسح البيانات القديمة (للبدء من نظيف)
db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

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

console.log(`✅ تم! ${products.length} منتج، ${Object.keys(cats).length} أقسام، مستخدمان.`);
console.log('   👤 المدير:  admin / admin123');
console.log('   👤 الكاشير: cashier / cashier123');
