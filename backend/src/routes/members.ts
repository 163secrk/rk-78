import express from 'express';
import getDb from '../db';
import dayjs from 'dayjs';
import { requireHq } from '../middleware/auth';
import { markExpiredCoupons } from '../utils/couponExpiration';
import { logOperation } from '../utils/operationLog';

const router = express.Router();

router.get('/birthdays', (req, res) => {
  const db = getDb();
  const now = dayjs();
  const currentMonth = now.month() + 1;
  const currentYear = now.year();

  const birthdayCoupon = db.prepare('SELECT * FROM coupons WHERE is_birthday = 1').get();
  if (!birthdayCoupon) {
    return res.json({ code: 1, message: '生日专属优惠券不存在，请联系管理员' });
  }
  const bc = birthdayCoupon as any;

  let whereClause = `WHERE strftime('%m', m.birthday) = ?`;
  const params: any[] = [String(currentMonth).padStart(2, '0')];

  if (req.user!.role === 'store') {
    whereClause += ` AND m.id IN (
      SELECT DISTINCT member_id FROM transactions 
      WHERE store_id = ?
    )`;
    params.push(req.user!.storeId);
  }

  let sql = `
    SELECT m.*,
      (SELECT COUNT(*) FROM member_coupons mc 
       WHERE mc.member_id = m.id 
       AND mc.coupon_id = ? 
       AND strftime('%Y', mc.obtained_at) = ?) as has_birthday_coupon
    FROM members m
    ${whereClause}
    AND m.birthday IS NOT NULL AND m.birthday != ''
    ORDER BY strftime('%d', m.birthday) ASC
  `;
  params.unshift(bc.id, String(currentYear));

  const members = db.prepare(sql).all(...params) as any[];

  const result = members.map(member => {
    const birthday = dayjs(member.birthday);
    const age = currentYear - birthday.year();
    const birthdayDay = birthday.date();
    const daysUntilBirthday = birthday.month(currentMonth - 1).year(currentYear).diff(now, 'day');
    const isBirthdayToday = daysUntilBirthday === 0;

    return {
      ...member,
      age,
      birthday_day: birthdayDay,
      days_until_birthday: daysUntilBirthday >= 0 ? daysUntilBirthday : 0,
      is_birthday_today: isBirthdayToday,
      has_birthday_coupon: member.has_birthday_coupon > 0
    };
  });

  const membersToIssue = result.filter(m => !m.has_birthday_coupon);
  let issuedCount = 0;

  if (membersToIssue.length > 0) {
    const remaining = bc.total_quantity - bc.issued_quantity;
    if (remaining >= membersToIssue.length) {
      const insertMemberCoupon = db.prepare(`
        INSERT INTO member_coupons (member_id, coupon_id, store_id) VALUES (?, ?, ?)
      `);
      const updateCoupon = db.prepare(`
        UPDATE coupons SET issued_quantity = issued_quantity + ? WHERE id = ?
      `);

      const storeId = req.user!.role === 'store' ? req.user!.storeId : null;

      const transaction = db.transaction((memberIds: number[]) => {
        for (const mid of memberIds) {
          insertMemberCoupon.run(mid, bc.id, storeId);
        }
        updateCoupon.run(memberIds.length, bc.id);
      });

      try {
        transaction(membersToIssue.map(m => m.id));
        issuedCount = membersToIssue.length;
        result.forEach(m => {
          if (!m.has_birthday_coupon) {
            m.has_birthday_coupon = true;
          }
        });

        logOperation({
          operatorId: req.user!.id,
          operatorName: req.user!.username,
          operationType: 'birthday_coupon_issue',
          targetType: 'coupon',
          targetId: bc.id,
          detail: `自动向 ${issuedCount} 位生日会员发放生日券：${bc.name}`,
          storeId: storeId || undefined,
        });
      } catch (err: any) {
        console.error('自动发放生日优惠券失败:', err);
      }
    }
  }

  res.json({
    code: 0,
    data: {
      list: result,
      total: result.length,
      issued_count: issuedCount,
      coupon_info: {
        id: bc.id,
        name: bc.name,
        value: bc.value,
        type: bc.type
      }
    }
  });
});

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

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'member_create',
    targetType: 'member',
    targetId: Number(info.lastInsertRowid),
    detail: `创建会员：${name}，手机号：${phone}`,
  });

  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

router.put('/:id', requireHq, (req, res) => {
  const db = getDb();
  const { name, phone, email, birthday, level } = req.body;
  
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
      level = COALESCE(?, level)
    WHERE id = ?
  `).run(name, phone, email, birthday, level, req.params.id);

  const changes: string[] = [];
  if (name && name !== (member as any).name) changes.push(`姓名: ${(member as any).name} → ${name}`);
  if (phone && phone !== (member as any).phone) changes.push(`手机号: ${(member as any).phone} → ${phone}`);
  if (email !== undefined && email !== (member as any).email) changes.push(`邮箱: ${(member as any).email || '-'} → ${email || '-'}`);
  if (birthday !== undefined && birthday !== (member as any).birthday) changes.push(`生日: ${(member as any).birthday || '-'} → ${birthday || '-'}`);
  if (level && level !== (member as any).level) changes.push(`等级: ${(member as any).level} → ${level}`);

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'member_update',
    targetType: 'member',
    targetId: Number(req.params.id),
    detail: `更新会员：${(member as any).name}，修改内容：${changes.join('; ')}`,
  });

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

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'member_delete',
    targetType: 'member',
    targetId: Number(req.params.id),
    detail: `删除会员：${(member as any).name}，手机号：${(member as any).phone}`,
  });

  res.json({ code: 0, message: '删除成功' });
});

router.get('/:id/coupons', (req, res) => {
  const db = getDb();
  
  markExpiredCoupons();
  
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
