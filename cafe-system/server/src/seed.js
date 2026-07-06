// تعبئة قاعدة البيانات ببيانات أولية (منيو مشروبات + مخزون بوصفات مترابطة)
import bcrypt from 'bcryptjs';
import db, { initSchema } from './db.js';

console.log('⏳ جاري تعبئة قاعدة البيانات...');

// إعادة بناء نظيفة
db.exec(`
  DROP TABLE IF EXISTS inventory_moves;
  DROP TABLE IF EXISTS product_ingredients;
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

// ===== المستخدمون =====
const insertUser = db.prepare(
  'INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)'
);
insertUser.run('admin', bcrypt.hashSync('admin123', 10), 'المدير', 'admin');
insertUser.run('cashier', bcrypt.hashSync('cashier123', 10), 'أحمد الكاشير', 'cashier');

// ===== المخزون =====
// [اسم, وحدة أساسية, كمية, حد أدنى, اسم العبوة, حجم العبوة]
const inventoryDefs = [
  ['بن',            'جرام',  5000,  1000, 'كيس',     1000],
  ['حليب',          'مل',    30000, 10000, 'كرتونة', 1000],
  ['سكر',           'جرام',  10000, 2000, 'كيس',     1000],
  ['شاي',           'فتلة',  200,   50,   'علبة',    100],
  ['كاكاو',         'جرام',  3000,  800,  'كيس',     500],
  ['نسكافيه',       'جرام',  1500,  400,  'برطمان',  200],
  ['أكواب ورقية',   'كوب',   500,   150,  'سليف',    50],
  ['برتقال',        'قطعة',  80,    30,   null,      null],
  ['ليمون',         'قطعة',  60,    20,   null,      null],
  ['مانجو',         'جرام',  5000,  1500, null,      null],
  ['فراولة',        'جرام',  4000,  1000, null,      null],
  ['موز',           'قطعة',  30,    10,   null,      null],
  ['نعناع',         'باقة',  15,    5,    null,      null],
  ['ينسون',         'جرام',  800,   200,  'علبة',    250],
];
const insertInv = db.prepare(
  'INSERT INTO inventory (name, unit, quantity, min_quantity, package_label, package_size) VALUES (?, ?, ?, ?, ?, ?)'
);
const inv = {};
for (const d of inventoryDefs) inv[d[0]] = insertInv.run(...d).lastInsertRowid;

// ===== الأقسام =====
const insertCat = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
const cats = {
  hot:    insertCat.run('مشروبات ساخنة', 1).lastInsertRowid,
  cold:   insertCat.run('مشروبات باردة', 2).lastInsertRowid,
  juice:  insertCat.run('عصائر طبيعية', 3).lastInsertRowid,
};

// ===== المنتجات + وصفاتها =====
// recipe: { اسم المخزون: الكمية المستهلكة لكل كوب }
// ملحوظة: كل مشروب يستهلك كوب ورقي واحد تلقائياً
const productDefs = [
  // --- ساخنة ---
  { cat: 'hot', name: 'قهوة تركي',      price: 25, emoji: '☕', recipe: { 'بن': 10, 'سكر': 8 } },      // كيلو البن = 100 كوباية
  { cat: 'hot', name: 'قهوة دبل',       price: 35, emoji: '☕', recipe: { 'بن': 20, 'سكر': 8 } },
  { cat: 'hot', name: 'إسبريسو',        price: 30, emoji: '☕', recipe: { 'بن': 8 } },
  { cat: 'hot', name: 'كابتشينو',       price: 45, emoji: '☕', recipe: { 'بن': 8, 'حليب': 120, 'سكر': 8 } },
  { cat: 'hot', name: 'لاتيه',          price: 50, emoji: '🥛', recipe: { 'بن': 8, 'حليب': 180 } },
  { cat: 'hot', name: 'موكا',           price: 55, emoji: '🍫', recipe: { 'بن': 8, 'حليب': 150, 'كاكاو': 20 } },
  { cat: 'hot', name: 'نسكافيه',        price: 35, emoji: '☕', recipe: { 'نسكافيه': 5, 'حليب': 50, 'سكر': 8 } },
  { cat: 'hot', name: 'شاي',            price: 15, emoji: '🍵', recipe: { 'شاي': 1, 'سكر': 8 } },
  { cat: 'hot', name: 'شاي بالنعناع',   price: 20, emoji: '🌿', recipe: { 'شاي': 1, 'نعناع': 0.1, 'سكر': 8 } },
  { cat: 'hot', name: 'ينسون',          price: 20, emoji: '🫖', recipe: { 'ينسون': 10, 'سكر': 8 } },
  { cat: 'hot', name: 'هوت شوكليت',     price: 55, emoji: '🍫', recipe: { 'كاكاو': 30, 'حليب': 180 } },
  { cat: 'hot', name: 'سحلب',           price: 40, emoji: '🥛', recipe: { 'حليب': 200, 'سكر': 10 } },

  // --- باردة ---
  { cat: 'cold', name: 'آيس كوفي',      price: 55, emoji: '🧊', recipe: { 'بن': 10, 'حليب': 100, 'سكر': 10 } },
  { cat: 'cold', name: 'آيس لاتيه',     price: 60, emoji: '🧊', recipe: { 'بن': 8, 'حليب': 180 } },
  { cat: 'cold', name: 'فرابيه',        price: 65, emoji: '🥤', recipe: { 'بن': 10, 'حليب': 150, 'سكر': 12 } },
  { cat: 'cold', name: 'آيس موكا',      price: 65, emoji: '🍫', recipe: { 'بن': 8, 'حليب': 150, 'كاكاو': 20 } },
  { cat: 'cold', name: 'ميلك شيك شوكليت', price: 60, emoji: '🧋', recipe: { 'حليب': 200, 'كاكاو': 20, 'سكر': 15 } },
  { cat: 'cold', name: 'سموزي فراولة',  price: 55, emoji: '🍓', recipe: { 'فراولة': 150, 'سكر': 15 } },
  { cat: 'cold', name: 'موهيتو',        price: 50, emoji: '🌿', recipe: { 'ليمون': 1, 'نعناع': 0.3, 'سكر': 15 } },
  { cat: 'cold', name: 'ليمون بالنعناع', price: 40, emoji: '🍋', recipe: { 'ليمون': 2, 'نعناع': 0.2, 'سكر': 15 } },

  // --- عصائر ---
  { cat: 'juice', name: 'عصير برتقال',  price: 45, emoji: '🍊', recipe: { 'برتقال': 4 } },
  { cat: 'juice', name: 'عصير مانجو',   price: 55, emoji: '🥭', recipe: { 'مانجو': 250, 'سكر': 10 } },
  { cat: 'juice', name: 'عصير فراولة',  price: 50, emoji: '🍓', recipe: { 'فراولة': 200, 'سكر': 10 } },
  { cat: 'juice', name: 'موز بالحليب',  price: 50, emoji: '🍌', recipe: { 'موز': 2, 'حليب': 200, 'سكر': 10 } },
  { cat: 'juice', name: 'كوكتيل',       price: 60, emoji: '🍹', recipe: { 'مانجو': 100, 'فراولة': 100, 'موز': 1 } },
];

const insertProd = db.prepare(
  'INSERT INTO products (category_id, name, price, emoji) VALUES (?, ?, ?, ?)'
);
const insertIng = db.prepare(
  'INSERT INTO product_ingredients (product_id, inventory_id, qty_per_unit) VALUES (?, ?, ?)'
);
let recipeCount = 0;
for (const p of productDefs) {
  const pid = insertProd.run(cats[p.cat], p.name, p.price, p.emoji).lastInsertRowid;
  const recipe = { ...p.recipe, 'أكواب ورقية': 1 }; // كل مشروب = كوب
  for (const [ingName, qty] of Object.entries(recipe)) {
    insertIng.run(pid, inv[ingName], qty);
    recipeCount++;
  }
}

// ===== الترابيزات =====
const insertTable = db.prepare('INSERT INTO tables (name) VALUES (?)');
for (let i = 1; i <= 10; i++) insertTable.run('ترابيزة ' + i);
insertTable.run('تيك أواي');

console.log('✅ تم!');
console.log(`   🍹 ${productDefs.length} مشروب بوصفات كاملة (${recipeCount} مكوّن مرتبط)`);
console.log(`   📦 ${inventoryDefs.length} صنف مخزون، 11 ترابيزة`);
console.log('   👤 المدير:  admin / admin123');
console.log('   👤 الكاشير: cashier / cashier123');
