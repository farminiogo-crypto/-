// تعبئة قاعدة البيانات ببيانات أولية واقعية لكافيه مصري
// ⚠️ حماية: لو فيه فواتير مسجّلة، السكربت يرفض يمسح إلا بـ npm run seed:force
import bcrypt from 'bcryptjs';
import db, { initSchema } from './db.js';

const FORCE = process.argv.includes('--force') || process.env.FORCE === '1';

// ===== حماية البيانات الحقيقية =====
try {
  const hasOrders = db.prepare("SELECT COUNT(*) AS c FROM orders").get().c;
  if (hasOrders > 0 && !FORCE) {
    console.error('⛔ قاعدة البيانات فيها ' + hasOrders + ' فاتورة مسجّلة!');
    console.error('   إعادة التعبئة هتمسح كل البيانات (فواتير، شيفتات، مصروفات، حركة مخزون).');
    console.error('   لو متأكد إنك عايز تبدأ من الصفر: npm run seed:force');
    process.exit(1);
  }
} catch { /* جداول مش موجودة بعد — قاعدة جديدة */ }

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
insertUser.run('cashier', bcrypt.hashSync('cashier123', 10), 'الكاشير', 'cashier');

// ===== المخزون (وحدات أساسية: جرام / مل / قطعة / كوب / فتلة / حبة / زجاجة) =====
// [اسم, وحدة, كمية حالية, حد التنبيه, اسم العبوة, حجم العبوة]
const inventoryDefs = [
  // قهوة وبن
  ['بن',              'جرام',  5000,  1000, 'كيس',     1000],
  ['نسكافيه',         'جرام',  1000,  250,  'برطمان',  200],
  ['كاكاو',           'جرام',  2000,  500,  'كيس',     500],
  // شاي وأعشاب
  ['شاي فتلة',        'فتلة',  300,   100,  'علبة',    100],
  ['شاي أخضر',        'فتلة',  100,   30,   'علبة',    25],
  ['ينسون',           'جرام',  500,   150,  'كيس',     250],
  ['قرفة',            'جرام',  500,   150,  'كيس',     250],
  ['جنزبيل',          'جرام',  400,   100,  'كيس',     200],
  ['كركديه',          'جرام',  1000,  300,  'كيس',     500],
  ['حلبة',            'جرام',  500,   150,  'كيس',     250],
  ['سحلب بودر',       'جرام',  1500,  400,  'كيس',     500],
  // أساسيات
  ['سكر',             'جرام',  10000, 2000, 'كيس',     1000],
  ['حليب',            'مل',    20000, 5000, 'كرتونة',  1000],
  ['فانيليا بودر',    'جرام',  500,   100,  'كيس',     250],
  // فواكه
  ['برتقال',          'قطعة',  60,    20,   null,      null],
  ['ليمون',           'قطعة',  60,    20,   null,      null],
  ['مانجو',           'جرام',  5000,  1500, 'كيس',     1000],
  ['فراولة',          'جرام',  4000,  1000, 'كيس',     1000],
  ['جوافة',           'جرام',  3000,  1000, 'كيس',     1000],
  ['موز',             'قطعة',  25,    10,   null,      null],
  ['نعناع',           'باقة',  10,    4,    null,      null],
  // أكواب ومستهلكات
  ['أكواب ورقية (ساخن)',   'كوب', 300, 100, 'سليف',   50],
  ['أكواب بلاستيك (بارد)', 'كوب', 300, 100, 'سليف',   50],
  // مشروبات معبأة
  ['مياه صغيرة',      'زجاجة', 48,    24,   'شد',      12],
  ['مياه كبيرة',      'زجاجة', 24,    12,   'شد',      6],
  ['بيبسي كانز',      'حبة',   48,    24,   'كرتونة',  24],
  ['سفن أب كانز',     'حبة',   48,    24,   'كرتونة',  24],
  ['ريد بول',         'حبة',   24,    12,   'كرتونة',  24],
];
const insertInv = db.prepare(
  'INSERT INTO inventory (name, unit, quantity, min_quantity, package_label, package_size) VALUES (?, ?, ?, ?, ?, ?)'
);
const inv = {};
for (const d of inventoryDefs) inv[d[0]] = insertInv.run(...d).lastInsertRowid;

// ===== الأقسام =====
const insertCat = db.prepare('INSERT INTO categories (name, sort) VALUES (?, ?)');
const cats = {
  hot:     insertCat.run('مشروبات ساخنة', 1).lastInsertRowid,
  cold:    insertCat.run('مشروبات باردة', 2).lastInsertRowid,
  juice:   insertCat.run('عصائر طبيعية', 3).lastInsertRowid,
  bottled: insertCat.run('مياه وغازية', 4).lastInsertRowid,
};

// ===== المنتجات + وصفاتها =====
// recipe: { اسم صنف المخزون: الكمية لكل كوباية }
// المشروبات الساخنة تستهلك كوب ورقي، الباردة كوب بلاستيك، المعبأة من غير كوب
const productDefs = [
  // --- ساخنة ---
  { cat: 'hot', name: 'شاي',             price: 15, emoji: '🍵', recipe: { 'شاي فتلة': 1, 'سكر': 10 } },
  { cat: 'hot', name: 'شاي بالنعناع',    price: 20, emoji: '🌿', recipe: { 'شاي فتلة': 1, 'نعناع': 0.1, 'سكر': 10 } },
  { cat: 'hot', name: 'شاي أخضر',        price: 20, emoji: '🍃', recipe: { 'شاي أخضر': 1 } },
  { cat: 'hot', name: 'قهوة تركي',       price: 25, emoji: '☕', recipe: { 'بن': 10, 'سكر': 8 } },   // كيلو البن ≈ 100 كوباية
  { cat: 'hot', name: 'قهوة تركي دبل',   price: 35, emoji: '☕', recipe: { 'بن': 20, 'سكر': 8 } },
  { cat: 'hot', name: 'قهوة فرنساوي',    price: 40, emoji: '☕', recipe: { 'بن': 12, 'حليب': 60, 'سكر': 8 } },
  { cat: 'hot', name: 'إسبريسو',         price: 30, emoji: '☕', recipe: { 'بن': 8 } },
  { cat: 'hot', name: 'إسبريسو دبل',     price: 40, emoji: '☕', recipe: { 'بن': 16 } },
  { cat: 'hot', name: 'كابتشينو',        price: 45, emoji: '☕', recipe: { 'بن': 8, 'حليب': 120, 'سكر': 8 } },
  { cat: 'hot', name: 'لاتيه',           price: 50, emoji: '🥛', recipe: { 'بن': 8, 'حليب': 180 } },
  { cat: 'hot', name: 'موكا',            price: 55, emoji: '🍫', recipe: { 'بن': 8, 'حليب': 150, 'كاكاو': 20, 'سكر': 5 } },
  { cat: 'hot', name: 'نسكافيه',         price: 35, emoji: '☕', recipe: { 'نسكافيه': 4, 'سكر': 8 } },
  { cat: 'hot', name: 'نسكافيه بالحليب', price: 45, emoji: '🥛', recipe: { 'نسكافيه': 4, 'حليب': 150, 'سكر': 8 } },
  { cat: 'hot', name: 'هوت شوكليت',      price: 55, emoji: '🍫', recipe: { 'كاكاو': 30, 'حليب': 180, 'سكر': 10 } },
  { cat: 'hot', name: 'سحلب',            price: 45, emoji: '🍮', recipe: { 'سحلب بودر': 30, 'حليب': 200, 'سكر': 10 } },
  { cat: 'hot', name: 'ينسون',           price: 20, emoji: '🫖', recipe: { 'ينسون': 8, 'سكر': 10 } },
  { cat: 'hot', name: 'قرفة',            price: 25, emoji: '🫖', recipe: { 'قرفة': 5, 'سكر': 10 } },
  { cat: 'hot', name: 'قرفة بالجنزبيل',  price: 30, emoji: '🫚', recipe: { 'قرفة': 5, 'جنزبيل': 3, 'سكر': 10 } },
  { cat: 'hot', name: 'جنزبيل',          price: 25, emoji: '🫚', recipe: { 'جنزبيل': 5, 'سكر': 10 } },
  { cat: 'hot', name: 'حلبة',            price: 20, emoji: '🫖', recipe: { 'حلبة': 8, 'سكر': 10 } },
  { cat: 'hot', name: 'كركديه ساخن',     price: 25, emoji: '🌺', recipe: { 'كركديه': 15, 'سكر': 15 } },

  // --- باردة ---
  { cat: 'cold', name: 'آيس كوفي',       price: 55, emoji: '🧊', cold: true, recipe: { 'بن': 10, 'حليب': 100, 'سكر': 10 } },
  { cat: 'cold', name: 'آيس لاتيه',      price: 60, emoji: '🧊', cold: true, recipe: { 'بن': 8, 'حليب': 180 } },
  { cat: 'cold', name: 'آيس موكا',       price: 65, emoji: '🧊', cold: true, recipe: { 'بن': 8, 'حليب': 150, 'كاكاو': 20 } },
  { cat: 'cold', name: 'فرابتشينو',      price: 70, emoji: '🧋', cold: true, recipe: { 'بن': 10, 'حليب': 150, 'سكر': 12, 'فانيليا بودر': 5 } },
  { cat: 'cold', name: 'ميلك شيك فانيليا', price: 60, emoji: '🥤', cold: true, recipe: { 'حليب': 200, 'فانيليا بودر': 15, 'سكر': 15 } },
  { cat: 'cold', name: 'ميلك شيك شوكليت', price: 65, emoji: '🥤', cold: true, recipe: { 'حليب': 200, 'كاكاو': 25, 'سكر': 15 } },
  { cat: 'cold', name: 'ميلك شيك فراولة', price: 65, emoji: '🥤', cold: true, recipe: { 'حليب': 180, 'فراولة': 100, 'سكر': 15 } },
  { cat: 'cold', name: 'سموزي مانجو',    price: 60, emoji: '🥭', cold: true, recipe: { 'مانجو': 200, 'سكر': 15 } },
  { cat: 'cold', name: 'سموزي فراولة',   price: 60, emoji: '🍓', cold: true, recipe: { 'فراولة': 200, 'سكر': 15 } },
  { cat: 'cold', name: 'موهيتو',         price: 50, emoji: '🌿', cold: true, recipe: { 'ليمون': 1, 'نعناع': 0.2, 'سكر': 10, 'سفن أب كانز': 1 } },
  { cat: 'cold', name: 'ليمون بالنعناع', price: 40, emoji: '🍋', cold: true, recipe: { 'ليمون': 2, 'نعناع': 0.2, 'سكر': 15 } },
  { cat: 'cold', name: 'كركديه بارد',    price: 30, emoji: '🌺', cold: true, recipe: { 'كركديه': 15, 'سكر': 15 } },

  // --- عصائر طبيعية ---
  { cat: 'juice', name: 'عصير برتقال',   price: 45, emoji: '🍊', cold: true, recipe: { 'برتقال': 4 } },
  { cat: 'juice', name: 'عصير ليمون',    price: 35, emoji: '🍋', cold: true, recipe: { 'ليمون': 3, 'سكر': 20 } },
  { cat: 'juice', name: 'عصير مانجو',    price: 55, emoji: '🥭', cold: true, recipe: { 'مانجو': 250, 'سكر': 10 } },
  { cat: 'juice', name: 'عصير فراولة',   price: 50, emoji: '🍓', cold: true, recipe: { 'فراولة': 200, 'سكر': 10 } },
  { cat: 'juice', name: 'عصير جوافة',    price: 45, emoji: '🍐', cold: true, recipe: { 'جوافة': 250, 'سكر': 10 } },
  { cat: 'juice', name: 'موز بالحليب',   price: 50, emoji: '🍌', cold: true, recipe: { 'موز': 2, 'حليب': 200, 'سكر': 10 } },
  { cat: 'juice', name: 'كوكتيل فواكه',  price: 60, emoji: '🍹', cold: true, recipe: { 'مانجو': 100, 'فراولة': 100, 'موز': 1 } },

  // --- مياه وغازية (تُباع كما هي — بدون كوب) ---
  { cat: 'bottled', name: 'مياه صغيرة',  price: 10, emoji: '💧', no_cup: true, recipe: { 'مياه صغيرة': 1 } },
  { cat: 'bottled', name: 'مياه كبيرة',  price: 15, emoji: '💧', no_cup: true, recipe: { 'مياه كبيرة': 1 } },
  { cat: 'bottled', name: 'بيبسي',       price: 25, emoji: '🥫', no_cup: true, recipe: { 'بيبسي كانز': 1 } },
  { cat: 'bottled', name: 'سفن أب',      price: 25, emoji: '🥫', no_cup: true, recipe: { 'سفن أب كانز': 1 } },
  { cat: 'bottled', name: 'ريد بول',     price: 60, emoji: '⚡', no_cup: true, recipe: { 'ريد بول': 1 } },
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
  const recipe = { ...p.recipe };
  // الساخن ياخد كوب ورقي والبارد كوب بلاستيك؛ المعبأ من غير كوب
  if (!p.no_cup) recipe[p.cold ? 'أكواب بلاستيك (بارد)' : 'أكواب ورقية (ساخن)'] = 1;
  for (const [ingName, qty] of Object.entries(recipe)) {
    if (!inv[ingName]) throw new Error(`مكوّن غير معروف في وصفة ${p.name}: ${ingName}`);
    insertIng.run(pid, inv[ingName], qty);
    recipeCount++;
  }
}

// ===== الترابيزات =====
const insertTable = db.prepare('INSERT INTO tables (name) VALUES (?)');
for (let i = 1; i <= 12; i++) insertTable.run('ترابيزة ' + i);
insertTable.run('تيك أواي');

console.log('✅ تم!');
console.log(`   🍹 ${productDefs.length} مشروب بوصفات كاملة (${recipeCount} مكوّن مرتبط)`);
console.log(`   📦 ${inventoryDefs.length} صنف مخزون، 13 ترابيزة`);
console.log('   👤 المدير:  admin / admin123');
console.log('   👤 الكاشير: cashier / cashier123');
