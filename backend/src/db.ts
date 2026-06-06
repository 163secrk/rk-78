import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const dbPath = path.join(__dirname, '..', 'data', 'pharmacy.db');
let db: Database.Database;

export function initDatabase() {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('hq', 'store')),
      store_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      birthday TEXT,
      points INTEGER DEFAULT 0,
      level TEXT DEFAULT '普通会员',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('满减', '折扣', '立减')),
      value REAL NOT NULL,
      min_amount REAL DEFAULT 0,
      total_quantity INTEGER NOT NULL,
      issued_quantity INTEGER DEFAULT 0,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      description TEXT,
      is_birthday INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS member_coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      coupon_id INTEGER NOT NULL,
      status TEXT DEFAULT '未使用' CHECK(status IN ('未使用', '已使用', '已过期')),
      obtained_at TEXT DEFAULT CURRENT_TIMESTAMP,
      used_at TEXT,
      store_id INTEGER,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (coupon_id) REFERENCES coupons(id),
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      coupon_id INTEGER,
      discount_amount REAL DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      items TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (store_id) REFERENCES stores(id),
      FOREIGN KEY (coupon_id) REFERENCES member_coupons(id)
    );

    CREATE TABLE IF NOT EXISTS point_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('earn', 'spend', 'adjust')),
      change INTEGER NOT NULL,
      balance_before INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('transaction', 'exchange', 'manual')),
      source_id INTEGER,
      remark TEXT,
      operator_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id),
      FOREIGN KEY (operator_id) REFERENCES users(id)
    );
  `);

  try {
    db.prepare('ALTER TABLE coupons ADD COLUMN is_birthday INTEGER DEFAULT 0').run();
  } catch (e) {
    // 字段可能已存在，忽略错误
  }

  const storeCount = db.prepare('SELECT COUNT(*) as count FROM stores').get() as { count: number };
  if (storeCount.count === 0) {
    const insertStore = db.prepare('INSERT INTO stores (name, address) VALUES (?, ?)');
    insertStore.run('中心店', '北京市朝阳区中心路1号');
    insertStore.run('海淀分店', '北京市海淀区海淀路2号');
    insertStore.run('朝阳分店', '北京市朝阳区朝阳路3号');
  }

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number };
  if (memberCount.count === 0) {
    const insertMember = db.prepare('INSERT INTO members (name, phone, email, birthday, points, level) VALUES (?, ?, ?, ?, ?, ?)');
    insertMember.run('张三', '13800138001', 'zhangsan@example.com', '1990-01-15', 1500, '金卡会员');
    insertMember.run('李四', '13800138002', 'lisi@example.com', '1992-03-20', 800, '银卡会员');
    insertMember.run('王五', '13800138003', 'wangwu@example.com', '1988-07-10', 200, '普通会员');
    insertMember.run('赵六', '13800138004', 'zhaoliu@example.com', '1995-06-06', 3000, '金卡会员');
    insertMember.run('钱七', '13800138005', 'qianqi@example.com', '1993-06-15', 1200, '银卡会员');
    insertMember.run('孙八', '13800138006', 'sunba@example.com', '1991-06-28', 500, '普通会员');
    insertMember.run('周九', '13800138007', 'zhoujiu@example.com', '1989-06-20', 800, '普通会员');
    insertMember.run('吴十', '13800138008', 'wushi@example.com', '1997-06-01', 2500, '金卡会员');
  }

  const transactionCount = db.prepare('SELECT COUNT(*) as count FROM transactions').get() as { count: number };
  if (transactionCount.count === 0) {
    const insertTransaction = db.prepare('INSERT INTO transactions (member_id, store_id, amount, points_earned, items) VALUES (?, ?, ?, ?, ?)');
    insertTransaction.run(4, 1, 158.5, 158, JSON.stringify([{ name: '感冒药', price: 58.5 }, { name: '维生素C', price: 100 }]));
    insertTransaction.run(5, 1, 89.0, 89, JSON.stringify([{ name: '退烧药', price: 89 }]));
    insertTransaction.run(6, 2, 200.0, 200, JSON.stringify([{ name: '保健品套装', price: 200 }]));
    insertTransaction.run(7, 2, 150.0, 150, JSON.stringify([{ name: '钙片', price: 150 }]));
    insertTransaction.run(8, 3, 320.0, 320, JSON.stringify([{ name: '蛋白粉', price: 320 }]));
  }

  const couponCount = db.prepare('SELECT COUNT(*) as count FROM coupons').get() as { count: number };
  if (couponCount.count === 0) {
    const insertCoupon = db.prepare('INSERT INTO coupons (name, type, value, min_amount, total_quantity, start_date, end_date, description, is_birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    insertCoupon.run('满100减20', '满减', 20, 100, 500, '2026-01-01', '2026-12-31', '全场满100元减20元', 0);
    insertCoupon.run('8折优惠券', '折扣', 0.8, 0, 300, '2026-01-01', '2026-06-30', '全场8折', 0);
    insertCoupon.run('新人专享10元', '立减', 10, 0, 1000, '2026-01-01', '2026-12-31', '新会员注册专享', 0);
    insertCoupon.run('生日专属优惠券', '立减', 50, 0, 99999, '2026-01-01', '2026-12-31', '生日当月专属，全场立减50元', 1);
  } else {
    const birthdayCoupon = db.prepare('SELECT * FROM coupons WHERE is_birthday = 1').get();
    if (!birthdayCoupon) {
      const insertCoupon = db.prepare('INSERT INTO coupons (name, type, value, min_amount, total_quantity, start_date, end_date, description, is_birthday) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertCoupon.run('生日专属优惠券', '立减', 50, 0, 99999, '2026-01-01', '2026-12-31', '生日当月专属，全场立减50元', 1);
    }
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const hashPassword = (pwd: string) => bcrypt.hashSync(pwd, 10);
    const insertUser = db.prepare('INSERT INTO users (username, password_hash, role, store_id) VALUES (?, ?, ?, ?)');
    insertUser.run('admin', hashPassword('admin123'), 'hq', null);
    insertUser.run('store1', hashPassword('store123'), 'store', 1);
    insertUser.run('store2', hashPassword('store123'), 'store', 2);
    insertUser.run('store3', hashPassword('store123'), 'store', 3);
  }

  console.log('数据库初始化完成');
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()');
  }
  return db;
}

export default getDb;
