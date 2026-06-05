import express from 'express';
import getDb from '../db';
import dayjs from 'dayjs';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 10, member_id, store_id, start_date, end_date } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  
  const whereClauses: string[] = [];
  const params: any[] = [];
  
  if (req.user!.role === 'store') {
    whereClauses.push('t.store_id = ?');
    params.push(req.user!.storeId);
  }
  
  if (member_id) {
    whereClauses.push('t.member_id = ?');
    params.push(member_id);
  }
  if (store_id) {
    if (req.user!.role === 'store' && Number(store_id) !== req.user!.storeId) {
      return res.json({ code: 1, message: '只能查询本店数据' });
    }
    whereClauses.push('t.store_id = ?');
    params.push(store_id);
  }
  if (start_date) {
    whereClauses.push('t.created_at >= ?');
    params.push(start_date);
  }
  if (end_date) {
    whereClauses.push('t.created_at <= ?');
    params.push(end_date + ' 23:59:59');
  }
  
  const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM transactions t ${whereClause}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT t.*, m.name as member_name, m.phone as member_phone,
           s.name as store_name, c.name as coupon_name
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN member_coupons mc ON t.coupon_id = mc.id
    LEFT JOIN coupons c ON mc.coupon_id = c.id
    ${whereClause}
    ORDER BY t.created_at DESC LIMIT ? OFFSET ?
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
  
  let whereClause = 'WHERE t.id = ?';
  const params: any[] = [req.params.id];
  
  if (req.user!.role === 'store') {
    whereClause += ' AND t.store_id = ?';
    params.push(req.user!.storeId);
  }
  
  const transaction = db.prepare(`
    SELECT t.*, m.name as member_name, m.phone as member_phone,
           s.name as store_name, c.name as coupon_name
    FROM transactions t
    JOIN members m ON t.member_id = m.id
    JOIN stores s ON t.store_id = s.id
    LEFT JOIN member_coupons mc ON t.coupon_id = mc.id
    LEFT JOIN coupons c ON mc.coupon_id = c.id
    ${whereClause}
  `).get(...params);
  
  if (!transaction) {
    return res.json({ code: 1, message: '交易记录不存在或无权限查看' });
  }
  
  res.json({ code: 0, data: transaction });
});

router.post('/', (req, res) => {
  const db = getDb();
  const { member_id, store_id, amount, coupon_id, items } = req.body;
  
  if (!member_id || !store_id || !amount) {
    return res.json({ code: 1, message: '请填写完整信息' });
  }
  
  if (req.user!.role === 'store' && Number(store_id) !== req.user!.storeId) {
    return res.json({ code: 1, message: '只能为本店创建交易记录' });
  }
  
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(member_id);
  if (!member) {
    return res.json({ code: 1, message: '会员不存在' });
  }
  
  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(store_id);
  if (!store) {
    return res.json({ code: 1, message: '门店不存在' });
  }
  
  let discountAmount = 0;
  let finalCouponId = null;
  
  if (coupon_id) {
    const memberCoupon = db.prepare(`
      SELECT mc.*, c.type, c.value, c.min_amount, c.start_date, c.end_date
      FROM member_coupons mc
      JOIN coupons c ON mc.coupon_id = c.id
      WHERE mc.id = ? AND mc.member_id = ?
    `).get(coupon_id, member_id);
    
    if (!memberCoupon) {
      return res.json({ code: 1, message: '优惠券不存在' });
    }
    
    const mc = memberCoupon as any;
    
    if (mc.status !== '未使用') {
      return res.json({ code: 1, message: '优惠券状态不正确' });
    }
    
    const now = dayjs();
    if (now.isBefore(dayjs(mc.start_date)) || now.isAfter(dayjs(mc.end_date).endOf('day'))) {
      return res.json({ code: 1, message: '优惠券不在有效期内' });
    }
    
    if (amount < mc.min_amount) {
      return res.json({ code: 1, message: `消费金额不满足最低 ${mc.min_amount} 元` });
    }
    
    if (mc.type === '满减' || mc.type === '立减') {
      discountAmount = mc.value;
    } else if (mc.type === '折扣') {
      discountAmount = amount * (1 - mc.value);
    }
    
    finalCouponId = coupon_id;
  }
  
  const pointsEarned = Math.floor(amount);
  
  const transaction = db.transaction(() => {
    const info = db.prepare(`
      INSERT INTO transactions (member_id, store_id, amount, coupon_id, discount_amount, points_earned, items)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(member_id, store_id, amount, finalCouponId, discountAmount, pointsEarned, items ? JSON.stringify(items) : null);
    
    db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(pointsEarned, member_id);
    
    if (finalCouponId) {
      db.prepare(`
        UPDATE member_coupons
        SET status = '已使用', used_at = CURRENT_TIMESTAMP, store_id = ?
        WHERE id = ?
      `).run(store_id, finalCouponId);
    }
    
    return info.lastInsertRowid;
  });
  
  try {
    const transactionId = transaction();
    res.json({
      code: 0,
      data: {
        id: transactionId,
        discount_amount: discountAmount,
        points_earned: pointsEarned,
        final_amount: amount - discountAmount
      }
    });
  } catch (err: any) {
    res.json({ code: 1, message: err.message });
  }
});

export default router;
