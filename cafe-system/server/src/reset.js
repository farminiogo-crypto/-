// تجهيز النظام للافتتاح: يمسح بيانات التجربة ويصفّر المخزون — بدون مسح الإعداد
// (يفضل المنيو + أصناف المخزون + الوصفات + الترابيزات + المستخدمين + باسورد المدير)
// الاستخدام: npm run reset
import db from './db.js';

console.log('🧹 جاري تجهيز النظام للافتتاح...');

const tx = db.transaction(() => {
  // امسح كل حركات التجربة
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM expenses;
    DELETE FROM inventory_moves;
    DELETE FROM shifts;
  `);
  // صفّر أرصدة المخزون (يعملوا جرد ويدخّلوا الكميات الحقيقية)
  db.prepare('UPDATE inventory SET quantity = 0').run();
  // حرّر كل الترابيزات
  db.prepare("UPDATE tables SET status = 'free'").run();
  // صفّر عدّادات الترقيم
  db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('orders','shifts','expenses','inventory_moves');`);
});
tx();

const inv = db.prepare('SELECT COUNT(*) AS c FROM inventory').get().c;
const prods = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;

console.log('✅ تم التجهيز للافتتاح!');
console.log(`   🗑️  اتمسحت كل الفواتير والشيفتات والمصروفات وحركات المخزون`);
console.log(`   📦 ${inv} صنف مخزون رصيدهم = صفر (اعملوا جرد وأضيفوا الكميات الحقيقية)`);
console.log(`   🍹 ${prods} منتج في المنيو جاهزين (عدّلوا الأسعار/الأصناف حسب كافيكم)`);
console.log('   ✔️  المستخدمين وباسورد المدير والترابيزات زي ما هم');
