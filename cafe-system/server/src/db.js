// طبقة قاعدة البيانات - SQLite عبر better-sqlite3
import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true }); // المجلد متجاهَل في git فقد لا يكون موجوداً بعد الاستنساخ
const dbPath = join(dataDir, 'cafe.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// مخطط قاعدة البيانات
export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'cashier'   -- 'admin' | 'cashier'
  );

  CREATE TABLE IF NOT EXISTS categories (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL,
    sort  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    emoji       TEXT DEFAULT '☕',
    active      INTEGER NOT NULL DEFAULT 1
  );

  -- الترابيزات
  CREATE TABLE IF NOT EXISTS tables (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    name   TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'free'   -- 'free' | 'occupied'
  );

  -- الشيفتات
  CREATE TABLE IF NOT EXISTS shifts (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    user_id      INTEGER REFERENCES users(id),
    user_name    TEXT,
    opening_cash REAL NOT NULL DEFAULT 0,
    closing_cash REAL,                        -- الفعلي المعدود عند القفل
    status       TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
    notes        TEXT,
    opened_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    closed_at    TEXT
  );

  -- الفواتير (فاتورة لكل ترابيزة)
  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no     TEXT NOT NULL,
    table_id     INTEGER REFERENCES tables(id),
    table_name   TEXT,
    shift_id     INTEGER REFERENCES shifts(id),
    total        REAL NOT NULL DEFAULT 0,
    status       TEXT NOT NULL DEFAULT 'open', -- 'open' | 'paid' | 'cancelled'
    cashier_id   INTEGER REFERENCES users(id),
    cashier_name TEXT,
    opened_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    paid_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER,
    name       TEXT NOT NULL,
    price      REAL NOT NULL,
    qty        INTEGER NOT NULL
  );

  -- المخزون (الكمية بوحدة أساسية: جرام / مل / قطعة ...)
  CREATE TABLE IF NOT EXISTS inventory (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    unit          TEXT NOT NULL DEFAULT 'وحدة',
    quantity      REAL NOT NULL DEFAULT 0,
    min_quantity  REAL NOT NULL DEFAULT 0,
    package_label TEXT,                    -- اسم العبوة: كيس / كرتونة / علبة
    package_size  REAL,                    -- حجم العبوة بالوحدة الأساسية (كيس سكر = 1000 جرام)
    auto_deduct   INTEGER NOT NULL DEFAULT 0, -- 1 = ينقص تلقائياً مع البيع (بن/شاي)، 0 = يدوي (لبن/سكر/نعناع)
    updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- إعدادات عامة (باسورد المدير...)
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  -- وصفات المنتجات: كل منتج ومكوناته وكمية كل مكون للوحدة الواحدة
  CREATE TABLE IF NOT EXISTS product_ingredients (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    qty_per_unit REAL NOT NULL,            -- الكمية المستهلكة لكل قطعة مباعة
    UNIQUE(product_id, inventory_id)
  );

  -- سجل حركة المخزون: كل خصم أو إضافة لها أثر
  CREATE TABLE IF NOT EXISTS inventory_moves (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    delta        REAL NOT NULL,            -- سالب = خصم، موجب = إضافة
    reason       TEXT NOT NULL,            -- بيع / شراء / استهلاك عبوة / تسوية
    ref_order_id INTEGER,
    user_name    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- المصروفات (فلوس تخرج من الدرج)
  CREATE TABLE IF NOT EXISTS expenses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    shift_id    INTEGER REFERENCES shifts(id),
    description TEXT NOT NULL,
    amount      REAL NOT NULL,
    user_id     INTEGER REFERENCES users(id),
    user_name   TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`;

export function initSchema() {
  db.exec(SCHEMA);
  // ترقيات تلقائية لقواعد بيانات قديمة (بدون فقدان بيانات)
  const orderCols = db.prepare('PRAGMA table_info(orders)').all().map((c) => c.name);
  if (!orderCols.includes('customer_name')) {
    db.exec('ALTER TABLE orders ADD COLUMN customer_name TEXT');
  }
  const invCols = db.prepare('PRAGMA table_info(inventory)').all().map((c) => c.name);
  if (!invCols.includes('auto_deduct')) {
    db.exec('ALTER TABLE inventory ADD COLUMN auto_deduct INTEGER NOT NULL DEFAULT 0');
  }
  // باسورد مدير افتراضي أول مرة
  const pin = db.prepare("SELECT value FROM settings WHERE key = 'manager_pin'").get();
  if (!pin) db.prepare("INSERT INTO settings (key, value) VALUES ('manager_pin', '1234')").run();
}

initSchema();

export default db;
