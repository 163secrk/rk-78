import express from 'express';
import getDb from '../db';
import dayjs from 'dayjs';

const router = express.Router();

router.get('/member-growth', (req, res) => {
  const db = getDb();
  const { start_date, end_date, granularity = 'day' } = req.query;

  let startDate = start_date ? dayjs(start_date as string).startOf('day') : dayjs().subtract(30, 'day').startOf('day');
  let endDate = end_date ? dayjs(end_date as string).endOf('day') : dayjs().endOf('day');

  let dateFormat = '%Y-%m-%d';
  let groupByExpression = 'strftime(?, created_at)';

  if (granularity === 'month') {
    dateFormat = '%Y-%m';
    groupByExpression = 'strftime(?, created_at)';
  } else if (granularity === 'week') {
    dateFormat = '%Y-%m-%d';
    groupByExpression = "date(created_at, 'weekday 1', '-6 days')";
  }

  const sql = `
    SELECT
      ${groupByExpression} as date,
      COUNT(*) as new_count
    FROM members
    WHERE created_at >= ? AND created_at <= ?
    GROUP BY ${groupByExpression}
    ORDER BY date ASC
  `;

  const rawData = db.prepare(sql).all(
    dateFormat,
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as { date: string; new_count: number }[];

  const totalMembersBefore = db.prepare(`
    SELECT COUNT(*) as count FROM members WHERE created_at < ?
  `).get(startDate.format('YYYY-MM-DD HH:mm:ss')) as { count: number };

  let cumulative = totalMembersBefore.count;
  const result = rawData.map(item => {
    cumulative += item.new_count;
    return {
      date: item.date,
      new_count: item.new_count,
      cumulative_count: cumulative
    };
  });

  const allDates: string[] = [];
  let current = startDate.clone();
  while (current.isBefore(endDate) || current.isSame(endDate, 'day')) {
    if (granularity === 'month') {
      allDates.push(current.format('YYYY-MM'));
      current = current.add(1, 'month');
    } else if (granularity === 'week') {
      allDates.push(current.startOf('week').add(1, 'day').format('YYYY-MM-DD'));
      current = current.add(1, 'week');
    } else {
      allDates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
  }

  const finalResult = allDates.map(date => {
    const found = result.find(r => r.date === date);
    if (found) return found;
    const prevCumulative = cumulative;
    return {
      date,
      new_count: 0,
      cumulative_count: prevCumulative
    };
  });

  res.json({
    code: 0,
    data: finalResult
  });
});

router.get('/coupon-stats', (req, res) => {
  const db = getDb();
  const { start_date, end_date } = req.query;

  let startDate = start_date ? dayjs(start_date as string).startOf('day') : dayjs().subtract(30, 'day').startOf('day');
  let endDate = end_date ? dayjs(end_date as string).endOf('day') : dayjs().endOf('day');

  const issuedData = db.prepare(`
    SELECT
      c.id,
      c.name,
      c.type,
      c.value,
      COUNT(mc.id) as issued_count
    FROM coupons c
    LEFT JOIN member_coupons mc ON c.id = mc.coupon_id
      AND mc.obtained_at >= ? AND mc.obtained_at <= ?
    GROUP BY c.id, c.name, c.type, c.value
    ORDER BY issued_count DESC
  `).all(
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as any[];

  const redeemedData = db.prepare(`
    SELECT
      c.id,
      c.name,
      COUNT(mc.id) as redeemed_count
    FROM coupons c
    LEFT JOIN member_coupons mc ON c.id = mc.coupon_id
      AND mc.status = '已使用'
      AND mc.used_at >= ? AND mc.used_at <= ?
    GROUP BY c.id, c.name
    ORDER BY redeemed_count DESC
  `).all(
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as any[];

  const expiredData = db.prepare(`
    SELECT
      c.id,
      c.name,
      COUNT(mc.id) as expired_count
    FROM coupons c
    LEFT JOIN member_coupons mc ON c.id = mc.coupon_id
      AND mc.status = '已过期'
    WHERE c.end_date >= ? AND c.end_date <= ?
    GROUP BY c.id, c.name
    ORDER BY expired_count DESC
  `).all(
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as any[];

  const result = issuedData.map(issued => {
    const redeemed = redeemedData.find(r => r.id === issued.id);
    const expired = expiredData.find(e => e.id === issued.id);
    return {
      coupon_id: issued.id,
      coupon_name: issued.name,
      coupon_type: issued.type,
      coupon_value: issued.value,
      issued_count: issued.issued_count,
      redeemed_count: redeemed?.redeemed_count || 0,
      expired_count: expired?.expired_count || 0,
      redemption_rate: issued.issued_count > 0
        ? Math.round((redeemed?.redeemed_count || 0) / issued.issued_count * 100)
        : 0
    };
  });

  const summary = {
    total_issued: result.reduce((sum, r) => sum + r.issued_count, 0),
    total_redeemed: result.reduce((sum, r) => sum + r.redeemed_count, 0),
    total_expired: result.reduce((sum, r) => sum + r.expired_count, 0),
    overall_redemption_rate: 0
  };
  summary.overall_redemption_rate = summary.total_issued > 0
    ? Math.round(summary.total_redeemed / summary.total_issued * 100)
    : 0;

  res.json({
    code: 0,
    data: {
      list: result,
      summary
    }
  });
});

router.get('/level-funnel', (req, res) => {
  const db = getDb();
  const { start_date, end_date } = req.query;

  let startDate = start_date ? dayjs(start_date as string).startOf('day') : dayjs().subtract(90, 'day').startOf('day');
  let endDate = end_date ? dayjs(end_date as string).endOf('day') : dayjs().endOf('day');

  const totalMembers = db.prepare(`
    SELECT COUNT(*) as count FROM members
  `).get() as { count: number };

  const newMembers = db.prepare(`
    SELECT COUNT(*) as count FROM members
    WHERE created_at >= ? AND created_at <= ?
  `).get(
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as { count: number };

  const levelCounts = db.prepare(`
    SELECT level, COUNT(*) as count
    FROM members
    GROUP BY level
  `).all() as { level: string; count: number }[];

  const levelOrder = ['普通会员', '银卡会员', '金卡会员'];
  const funnelData = levelOrder.map(level => {
    const found = levelCounts.find(l => l.level === level);
    return {
      level,
      count: found?.count || 0,
      percentage: totalMembers.count > 0
        ? Math.round((found?.count || 0) / totalMembers.count * 100)
        : 0
    };
  });

  const levelUpStats = db.prepare(`
    SELECT
      SUM(CASE WHEN level = '银卡会员' THEN 1 ELSE 0 END) as to_silver,
      SUM(CASE WHEN level = '金卡会员' THEN 1 ELSE 0 END) as to_gold
    FROM members
    WHERE created_at >= ? AND created_at <= ?
  `).get(
    startDate.format('YYYY-MM-DD HH:mm:ss'),
    endDate.format('YYYY-MM-DD HH:mm:ss')
  ) as { to_silver: number; to_gold: number };

  const silverToGold = db.prepare(`
    SELECT COUNT(*) as count
    FROM members
    WHERE level = '金卡会员'
  `).get() as { count: number };

  res.json({
    code: 0,
    data: {
      funnel: funnelData,
      total_members: totalMembers.count,
      new_members_in_period: newMembers.count,
      conversion_path: [
        { from: '新增会员', to: '普通会员', count: newMembers.count, rate: 100 },
        { from: '普通会员', to: '银卡会员', count: levelUpStats.to_silver, rate: funnelData[0].count > 0 ? Math.round(levelUpStats.to_silver / funnelData[0].count * 100) : 0 },
        { from: '银卡会员', to: '金卡会员', count: levelUpStats.to_gold + silverToGold.count, rate: funnelData[1].count > 0 ? Math.round((levelUpStats.to_gold + silverToGold.count) / funnelData[1].count * 100) : 0 }
      ]
    }
  });
});

export default router;
