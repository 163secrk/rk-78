import getDb from '../db';
import dayjs from 'dayjs';

export function markExpiredCoupons(): number {
  const db = getDb();
  const now = dayjs().format('YYYY-MM-DD');
  
  const result = db.prepare(`
    UPDATE member_coupons
    SET status = '已过期'
    WHERE status = '未使用'
      AND coupon_id IN (
        SELECT id FROM coupons
        WHERE DATE(end_date) < DATE(?)
      )
  `).run(now);
  
  const count = result.changes || 0;
  if (count > 0) {
    console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] 已自动标记 ${count} 张过期优惠券`);
  }
  return count;
}

export function isCouponExpired(endDate: string): boolean {
  return dayjs().isAfter(dayjs(endDate).endOf('day'));
}

export function isCouponTemplateExpired(endDate: string): boolean {
  return dayjs().isAfter(dayjs(endDate).endOf('day'));
}

export function getExpiredCount(): number {
  const db = getDb();
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM member_coupons
    WHERE status = '已过期'
  `).get() as { count: number };
  return result.count;
}
