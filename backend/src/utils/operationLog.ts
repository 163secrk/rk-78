import getDb from '../db';

export type OperationType =
  | 'member_create'
  | 'member_update'
  | 'member_delete'
  | 'coupon_create'
  | 'coupon_update'
  | 'coupon_delete'
  | 'coupon_issue'
  | 'coupon_redeem'
  | 'points_adjust'
  | 'transaction_create'
  | 'coupon_issue_all'
  | 'coupon_expire'
  | 'birthday_coupon_issue';

export interface LogOperationParams {
  operatorId: number;
  operatorName: string;
  operationType: OperationType;
  targetType?: string;
  targetId?: number;
  detail?: string;
  storeId?: number;
}

export function logOperation(params: LogOperationParams): void {
  const db = getDb();
  const { operatorId, operatorName, operationType, targetType, targetId, detail, storeId } = params;

  try {
    db.prepare(`
      INSERT INTO operation_logs (
        operator_id, operator_name, operation_type, target_type, target_id, detail, store_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(operatorId, operatorName, operationType, targetType, targetId, detail, storeId || null);
  } catch (err) {
    console.error('记录操作日志失败:', err);
  }
}

export const operationTypeLabels: Record<OperationType, string> = {
  member_create: '创建会员',
  member_update: '更新会员',
  member_delete: '删除会员',
  coupon_create: '创建优惠券',
  coupon_update: '更新优惠券',
  coupon_delete: '删除优惠券',
  coupon_issue: '发放优惠券',
  coupon_issue_all: '批量发放优惠券',
  coupon_redeem: '核销优惠券',
  coupon_expire: '标记过期优惠券',
  points_adjust: '调整积分',
  transaction_create: '创建交易',
  birthday_coupon_issue: '自动发放生日券',
};

export default logOperation;
