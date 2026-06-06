import express from 'express';
import getDb from '../db';
import dayjs from 'dayjs';
import { requireHq } from '../middleware/auth';
import { markExpiredCoupons, isCouponTemplateExpired } from '../utils/couponExpiration';
import { logOperation } from '../utils/operationLog';

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 10, keyword = '' } = req.query;
  const offset = (Number(page) - 1) * Number(pageSize);
  
  let whereClause = '';
  const params: any[] = [];
  
  if (keyword) {
    whereClause = 'WHERE name LIKE ?';
    params.push(`%${keyword}%`);
  }
  
  const total = db.prepare(`SELECT COUNT(*) as count FROM coupons ${whereClause}`).get(...params) as { count: number };
  const list = db.prepare(`
    SELECT * FROM coupons ${whereClause}
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
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!coupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  res.json({ code: 0, data: coupon });
});

router.post('/', requireHq, (req, res) => {
  const db = getDb();
  const { name, type, value, min_amount = 0, total_quantity, start_date, end_date, description, is_birthday = 0, is_new_user = 0 } = req.body;
  
  if (!name || !type || !value || !total_quantity || !start_date || !end_date) {
    return res.json({ code: 1, message: '请填写完整信息' });
  }
  
  if (type === '满减' && value > min_amount) {
    return res.json({ code: 1, message: '满减金额不能大于最低消费金额' });
  }
  if (type === '折扣' && (value <= 0 || value > 1)) {
    return res.json({ code: 1, message: '折扣值必须在0到1之间' });
  }
  if ((type === '满减' || type === '立减') && value <= 0) {
    return res.json({ code: 1, message: '优惠金额必须大于0' });
  }
  
  if (is_birthday && is_new_user) {
    return res.json({ code: 1, message: '不能同时设置为生日专属和新人专享' });
  }
  
  if (is_birthday) {
    const existing = db.prepare('SELECT * FROM coupons WHERE is_birthday = 1').get();
    if (existing) {
      return res.json({ code: 1, message: '已存在生日专属优惠券' });
    }
  }
  
  if (is_new_user) {
    const existing = db.prepare('SELECT * FROM coupons WHERE is_new_user = 1').get();
    if (existing) {
      return res.json({ code: 1, message: '已存在新人专享优惠券' });
    }
  }
  
  const info = db.prepare(`
    INSERT INTO coupons (name, type, value, min_amount, total_quantity, start_date, end_date, description, is_birthday, is_new_user)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, value, min_amount, total_quantity, start_date, end_date, description, is_birthday ? 1 : 0, is_new_user ? 1 : 0);

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'coupon_create',
    targetType: 'coupon',
    targetId: Number(info.lastInsertRowid),
    detail: `创建优惠券：${name}，类型：${type}，面值：${value}，数量：${total_quantity}`,
  });

  res.json({ code: 0, data: { id: info.lastInsertRowid } });
});

router.put('/:id', requireHq, (req, res) => {
  const db = getDb();
  const { name, type, value, min_amount, total_quantity, start_date, end_date, description, is_birthday, is_new_user } = req.body;
  
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id) as any;
  if (!coupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  
  const finalType = type || coupon.type;
  const finalValue = value !== undefined ? value : coupon.value;
  const finalMinAmount = min_amount !== undefined ? min_amount : coupon.min_amount;
  const finalIsBirthday = is_birthday !== undefined ? (is_birthday ? 1 : 0) : coupon.is_birthday;
  const finalIsNewUser = is_new_user !== undefined ? (is_new_user ? 1 : 0) : coupon.is_new_user;
  
  if (finalType === '满减' && finalValue > finalMinAmount) {
    return res.json({ code: 1, message: '满减金额不能大于最低消费金额' });
  }
  if (finalType === '折扣' && (finalValue <= 0 || finalValue > 1)) {
    return res.json({ code: 1, message: '折扣值必须在0到1之间' });
  }
  if ((finalType === '满减' || finalType === '立减') && finalValue <= 0) {
    return res.json({ code: 1, message: '优惠金额必须大于0' });
  }
  
  if (finalIsBirthday && finalIsNewUser) {
    return res.json({ code: 1, message: '不能同时设置为生日专属和新人专享' });
  }
  
  if (finalIsBirthday) {
    const existing = db.prepare('SELECT * FROM coupons WHERE is_birthday = 1 AND id != ?').get(req.params.id);
    if (existing) {
      return res.json({ code: 1, message: '已存在生日专属优惠券' });
    }
  }
  
  if (finalIsNewUser) {
    const existing = db.prepare('SELECT * FROM coupons WHERE is_new_user = 1 AND id != ?').get(req.params.id);
    if (existing) {
      return res.json({ code: 1, message: '已存在新人专享优惠券' });
    }
  }
  
  db.prepare(`
    UPDATE coupons SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      value = COALESCE(?, value),
      min_amount = COALESCE(?, min_amount),
      total_quantity = COALESCE(?, total_quantity),
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      description = COALESCE(?, description),
      is_birthday = COALESCE(?, is_birthday),
      is_new_user = COALESCE(?, is_new_user)
    WHERE id = ?
  `).run(name, type, value, min_amount, total_quantity, start_date, end_date, description, finalIsBirthday, finalIsNewUser, req.params.id);

  const changes: string[] = [];
  if (name && name !== coupon.name) changes.push(`名称: ${coupon.name} → ${name}`);
  if (type && type !== coupon.type) changes.push(`类型: ${coupon.type} → ${type}`);
  if (value !== undefined && value !== coupon.value) changes.push(`面值: ${coupon.value} → ${value}`);
  if (min_amount !== undefined && min_amount !== coupon.min_amount) changes.push(`最低消费: ${coupon.min_amount} → ${min_amount}`);
  if (total_quantity !== undefined && total_quantity !== coupon.total_quantity) changes.push(`总数量: ${coupon.total_quantity} → ${total_quantity}`);
  if (start_date && start_date !== coupon.start_date) changes.push(`开始日期: ${coupon.start_date} → ${start_date}`);
  if (end_date && end_date !== coupon.end_date) changes.push(`结束日期: ${coupon.end_date} → ${end_date}`);

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'coupon_update',
    targetType: 'coupon',
    targetId: Number(req.params.id),
    detail: `更新优惠券：${coupon.name}，修改内容：${changes.join('; ')}`,
  });

  res.json({ code: 0, message: '更新成功' });
});

router.delete('/:id', requireHq, (req, res) => {
  const db = getDb();
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id) as any;
  if (!coupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  
  if (coupon.issued_quantity > 0) {
    return res.json({ code: 1, message: `该优惠券已发放 ${coupon.issued_quantity} 张，不允许删除` });
  }
  
  db.prepare('DELETE FROM member_coupons WHERE coupon_id = ?').run(req.params.id);
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'coupon_delete',
    targetType: 'coupon',
    targetId: Number(req.params.id),
    detail: `删除优惠券：${coupon.name}，类型：${coupon.type}，面值：${coupon.value}`,
  });

  res.json({ code: 0, message: '删除成功' });
});

router.post('/:id/issue', requireHq, (req, res) => {
  const db = getDb();
  const { member_id, member_ids } = req.body;
  
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!coupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  
  const couponData = coupon as any;
  
  if (isCouponTemplateExpired(couponData.end_date)) {
    return res.json({ code: 1, message: '优惠券已过期，无法发放' });
  }
  
  const remaining = couponData.total_quantity - couponData.issued_quantity;
  
  const targetMemberIds = member_ids || (member_id ? [member_id] : []);
  
  if (targetMemberIds.length === 0) {
    return res.json({ code: 1, message: '请选择要发放的会员' });
  }
  
  if (targetMemberIds.length > remaining) {
    return res.json({ code: 1, message: `库存不足，剩余 ${remaining} 张` });
  }
  
  if (couponData.is_new_user) {
    const invalidMembers: number[] = [];
    for (const mid of targetMemberIds) {
      const exists = db.prepare(`
        SELECT COUNT(*) as count FROM member_coupons 
        WHERE member_id = ? AND coupon_id = ?
      `).get(mid, couponData.id) as { count: number };
      if (exists.count > 0) {
        invalidMembers.push(mid);
      }
    }
    if (invalidMembers.length > 0) {
      return res.json({ 
        code: 1, 
        message: `新人专项优惠券每位会员只能领取一次，会员ID ${invalidMembers.join(', ')} 已领取过` 
      });
    }
  } else {
    for (const mid of targetMemberIds) {
      const exists = db.prepare(`
        SELECT COUNT(*) as count FROM member_coupons 
        WHERE member_id = ? AND coupon_id = ? AND status = '未使用'
      `).get(mid, couponData.id) as { count: number };
      if (exists.count > 0) {
        return res.json({ 
          code: 1, 
          message: `会员ID ${mid} 已有一张未使用的该优惠券，请先使用后再发放` 
        });
      }
    }
  }
  
  const insertMemberCoupon = db.prepare(`
    INSERT INTO member_coupons (member_id, coupon_id) VALUES (?, ?)
  `);
  
  const updateCoupon = db.prepare(`
    UPDATE coupons SET issued_quantity = issued_quantity + ? WHERE id = ?
  `);
  
  const transaction = db.transaction((memberIds: number[], couponId: number) => {
    for (const mid of memberIds) {
      const member = db.prepare('SELECT * FROM members WHERE id = ?').get(mid);
      if (!member) {
        throw new Error(`会员 ${mid} 不存在`);
      }
      insertMemberCoupon.run(mid, couponId);
    }
    updateCoupon.run(memberIds.length, couponId);
  });
  
  try {
    transaction(targetMemberIds.map(Number), Number(req.params.id));

    logOperation({
      operatorId: req.user!.id,
      operatorName: req.user!.username,
      operationType: 'coupon_issue',
      targetType: 'coupon',
      targetId: Number(req.params.id),
      detail: `发放优惠券：${couponData.name}，共 ${targetMemberIds.length} 张`,
    });

    res.json({ code: 0, message: `成功发放 ${targetMemberIds.length} 张优惠券` });
  } catch (err: any) {
    res.json({ code: 1, message: err.message });
  }
});

router.post('/issue-all', requireHq, (req, res) => {
  const db = getDb();
  const { coupon_id } = req.body;
  
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(coupon_id);
  if (!coupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  
  const couponData = coupon as any;
  
  if (isCouponTemplateExpired(couponData.end_date)) {
    return res.json({ code: 1, message: '优惠券已过期，无法发放' });
  }
  
  if (couponData.is_new_user) {
    return res.json({ code: 1, message: '新人专项优惠券不支持全员发放' });
  }
  
  const members = db.prepare('SELECT id FROM members').all() as { id: number }[];
  const remaining = couponData.total_quantity - couponData.issued_quantity;
  
  if (members.length > remaining) {
    return res.json({ code: 1, message: `库存不足，需要 ${members.length} 张，剩余 ${remaining} 张` });
  }
  
  const eligibleMembers = members.filter(m => {
    const exists = db.prepare(`
      SELECT COUNT(*) as count FROM member_coupons 
      WHERE member_id = ? AND coupon_id = ? AND status = '未使用'
    `).get(m.id, couponData.id) as { count: number };
    return exists.count === 0;
  });
  
  if (eligibleMembers.length === 0) {
    return res.json({ code: 1, message: '所有会员都已有未使用的该优惠券' });
  }
  
  if (eligibleMembers.length > remaining) {
    return res.json({ code: 1, message: `库存不足，需要 ${eligibleMembers.length} 张，剩余 ${remaining} 张` });
  }
  
  const insertMemberCoupon = db.prepare(`
    INSERT INTO member_coupons (member_id, coupon_id) VALUES (?, ?)
  `);
  
  const updateCoupon = db.prepare(`
    UPDATE coupons SET issued_quantity = issued_quantity + ? WHERE id = ?
  `);
  
  const transaction = db.transaction((memberList: { id: number }[], cid: number) => {
    for (const m of memberList) {
      insertMemberCoupon.run(m.id, cid);
    }
    updateCoupon.run(memberList.length, cid);
  });
  
  try {
    transaction(eligibleMembers, Number(coupon_id));

    logOperation({
      operatorId: req.user!.id,
      operatorName: req.user!.username,
      operationType: 'coupon_issue_all',
      targetType: 'coupon',
      targetId: Number(coupon_id),
      detail: `批量发放优惠券：${couponData.name}，共 ${eligibleMembers.length} 张`,
    });

    res.json({ code: 0, message: `成功向 ${eligibleMembers.length} 位会员发放优惠券` });
  } catch (err: any) {
    res.json({ code: 1, message: err.message });
  }
});

router.post('/:id/redeem', (req, res) => {
  const db = getDb();
  const { member_id, store_id } = req.body;
  
  if (req.user!.role === 'store' && Number(store_id) !== req.user!.storeId) {
    return res.json({ code: 1, message: '只能核销本店的优惠券' });
  }
  
  markExpiredCoupons();
  
  const memberCoupon = db.prepare(`
    SELECT mc.*, c.name, c.type, c.value, c.min_amount, c.start_date, c.end_date
    FROM member_coupons mc
    JOIN coupons c ON mc.coupon_id = c.id
    WHERE mc.id = ? AND mc.member_id = ?
  `).get(req.params.id, member_id);
  
  if (!memberCoupon) {
    return res.json({ code: 1, message: '优惠券不存在' });
  }
  
  const mc = memberCoupon as any;
  
  if (mc.status === '已过期') {
    return res.json({ code: 1, message: '优惠券已过期，无法使用' });
  }
  
  if (mc.status === '已使用') {
    return res.json({ code: 1, message: '优惠券已使用' });
  }
  
  if (mc.status !== '未使用') {
    return res.json({ code: 1, message: '优惠券状态不正确' });
  }
  
  const now = dayjs();
  if (now.isBefore(dayjs(mc.start_date))) {
    return res.json({ code: 1, message: '优惠券尚未生效' });
  }
  if (now.isAfter(dayjs(mc.end_date).endOf('day'))) {
    return res.json({ code: 1, message: '优惠券已过期，无法使用' });
  }
  
  db.prepare(`
    UPDATE member_coupons
    SET status = '已使用', used_at = CURRENT_TIMESTAMP, store_id = ?
    WHERE id = ?
  `).run(store_id, req.params.id);

  logOperation({
    operatorId: req.user!.id,
    operatorName: req.user!.username,
    operationType: 'coupon_redeem',
    targetType: 'member_coupon',
    targetId: Number(req.params.id),
    detail: `核销优惠券：${mc.name}，会员ID：${member_id}，门店ID：${store_id}`,
    storeId: Number(store_id),
  });

  res.json({
    code: 0,
    message: '核销成功',
    data: {
      coupon_name: mc.name,
      type: mc.type,
      value: mc.value,
      min_amount: mc.min_amount
    }
  });
});

router.post('/expire', requireHq, (req, res) => {
  const count = markExpiredCoupons();
  res.json({ code: 0, data: { count } });
});

export default router;
