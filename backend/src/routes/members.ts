import express from 'express';
import getDb from '../db';
import { requireHq } from '../middleware/auth';

const router = express.Router();

router.get('/stats/level-distribution', (req, res) => {
  const db = getDb();
  const distribution = db.prepare(`
    SELECT level, COUNT(*) as count 
    FROM members 
    GROUP BY level 
    ORDER BY count DESC
  `).all() as { level: string; count: number }[];
  
  const total = distribution.reduce((sum, item) => sum + item.count, 0);
  
  const result = distribution.map(item => ({
    level: item.level,
    count: item.count,
    percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
  }));
  
  const levels = ['金卡会员', '银卡会员', '普通会员'];
  const finalResult = levels.map(level => {
    const found = result.find(r => r.level === level);
    return found || { level, count: 0, percentage: 0 };
  });
  
  res.json({
    code: 0,
    data: finalResult
  });
});

router.get('/', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 10, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  
  let whereClause = '';
  const params: any[] = [];
  
  if (keyword) {
    whereClause = 'WHERE name LIKE ? OR phone LIKE ?';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM members ${whereClause}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT * FROM members ${whereClause}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(...params, Number(pageSize), offset);
  
  res.json({
    code: 0,
    data: {
      list,
      total: total.count,
      page: Number(page),
      pageSize: Number(pageSize)
    }
  });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.json({ code: 1, message: '会员不存在' });
  }
  res.json({ code: 0, data: member });
});

router.post('/', requireHq, (req, res) => {
  const db = getDb();
  const { name, phone, email, birthday, points = 0, level = '普通会员' } = req.body;
  
  if (!name || !phone) {
    return res.json({ code: 1, message: '姓名和手机号不能为空' });
  }
  
  const existing = db.prepare('SELECT * FROM members WHERE phone = ?').get(phone);
  if (existing) {
    return res.json({ code: 1, message: '该手机号已注册' });
  }
  
  const info = db.prepare(`
    INSERT INTO members (name, phone, email, birthday, points, level)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, phone, email, birthday, points, level);
  
  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

router.put('/:id', requireHq, (req, res) => {
  const db = getDb();
  const { name, phone, email, birthday, points, level } = req.body;
  
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.json({ code: 1, message: '会员不存在' });
  }
  
  if (phone && phone !== (member as any).phone) {
    const existing = db.prepare('SELECT * FROM members WHERE phone = ? AND id != ?').get(phone, req.params.id);
    if (existing) {
      return res.json({ code: 1, message: '该手机号已被使用' });
    }
  }
  
  db.prepare(`
    UPDATE members SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      birthday = COALESCE(?, birthday),
      points = COALESCE(?, points),
      level = COALESCE(?, level)
    WHERE id = ?
  `).run(name, phone, email, birthday, points, level, req.params.id);
  
  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', requireHq, (req, res) => {
  const db = getDb();
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) {
    return res.json({ code: 1, message: '会员不存在' });
  }
  
  db.prepare('DELETE FROM member_coupons WHERE member_id = ?').run(req.params.id);
  db.prepare('DELETE FROM transactions WHERE member_id = ?').run(req.params.id);
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  
  res.json({ code: 0, message: '删除成功' });
});

router.get('/:id/coupons', (req, res) => {
  const db = getDb();
  const coupons = db.prepare(`
    SELECT mc.*, c.name, c.type, c.value, c.min_amount, c.start_date, c.end_date, c.description
    FROM member_coupons mc
    JOIN coupons c ON mc.coupon_id = c.id
    WHERE mc.member_id = ?
    ORDER BY mc.obtained_at DESC
  `).all(req.params.id);
  
  res.json({ code: 0, data: coupons });
});

router.get('/:id/transactions', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  
  let whereClause = 'WHERE t.member_id = ?';
  const params: any[] = [req.params.id];
  
  if (req.user!.role === 'store') {
    whereClause += ' AND t.store_id = ?';
    params.push(req.user!.storeId);
  }
  
  const totalSql = `SELECT COUNT(*) as count FROM transactions t ${whereClause}`;
  const total = db.prepare(totalSql).get(...params) as { count: number };
  
  const listSql = `
    SELECT t.*, s.name as store_name, c.name as coupon_name
    FROM transactions t
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN member_coupons mc ON t.coupon_id = mc.id
    LEFT JOIN coupons c ON mc.coupon_id = c.id
    ${whereClause}
    ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `;
  const list = db.prepare(listSql).all(...params, Number(pageSize), offset);
  
  res.json({
    code: 0,
    data: {
      list,
      total: total.count,
      page: Number(page),
      pageSize: Number(pageSize)
    }
  });
});

export default router;
