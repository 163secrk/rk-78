import express from 'express';
import getDb from '../db';

const router = express.Router();

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

router.post('/', (req, res) => {
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

router.put('/:id', (req, res) => {
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

router.delete('/:id', (req, res) => {
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
  
  const total = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE member_id = ?').get(req.params.id) as { count: number };
  const list = db.prepare(`
    SELECT t.*, s.name as store_name, c.name as coupon_name
    FROM transactions t
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN member_coupons mc ON t.coupon_id = mc.id
    LEFT JOIN coupons c ON mc.coupon_id = c.id
    WHERE t.member_id = ?
    ORDER BY t.created_at DESC LIMIT ? OFFSET ?
  `).all(req.params.id, Number(pageSize), offset);
  
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
