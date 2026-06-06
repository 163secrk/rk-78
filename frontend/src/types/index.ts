export interface Member {
  id: number;
  name: string;
  phone: string;
  email?: string;
  birthday?: string;
  points: number;
  level: string;
  created_at: string;
}

export interface CouponTemplate {
  id: number;
  name: string;
  type: '满减' | '折扣' | '立减';
  value: number;
  min_amount: number;
  total_quantity: number;
  issued_quantity: number;
  start_date: string;
  end_date: string;
  description?: string;
  created_at: string;
}

export interface MemberCoupon {
  id: number;
  member_id: number;
  coupon_id: number;
  status: '未使用' | '已使用' | '已过期';
  obtained_at: string;
  used_at?: string;
  store_id?: number;
  name: string;
  type: string;
  value: number;
  min_amount: number;
  start_date: string;
  end_date: string;
  description?: string;
}

export interface Transaction {
  id: number;
  member_id: number;
  store_id: number;
  amount: number;
  coupon_id?: number;
  discount_amount: number;
  points_earned: number;
  items?: string;
  created_at: string;
  member_name: string;
  member_phone?: string;
  store_name: string;
  coupon_name?: string;
}

export interface Store {
  id: number;
  name: string;
  address?: string;
  created_at: string;
}

export interface ApiResponse<T> {
  code: number;
  message?: string;
  data?: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type UserRole = 'hq' | 'store';

export interface UserInfo {
  id: number;
  role: UserRole;
  username: string;
  storeId?: number;
}

export interface StoreMemberCount {
  store_id: number;
  store_name: string;
  member_count: number;
}

export interface StoreConsumption {
  store_id: number;
  store_name: string;
  total_amount: number;
  final_amount: number;
  transaction_count: number;
}

export interface BirthdayMember extends Member {
  age: number;
  birthday_day: number;
  days_until_birthday: number;
  is_birthday_today: boolean;
  has_birthday_coupon: boolean;
}

export interface BirthdayResponse {
  list: BirthdayMember[];
  total: number;
  issued_count: number;
  coupon_info: {
    id: number;
    name: string;
    value: number;
    type: string;
  };
}

export interface CouponTemplateWithBirthday extends CouponTemplate {
  is_birthday: number;
}

export interface PointRecord {
  id: number;
  member_id: number;
  type: 'earn' | 'spend' | 'adjust';
  change: number;
  balance_before: number;
  balance_after: number;
  source_type: 'transaction' | 'exchange' | 'manual';
  source_id?: number;
  remark?: string;
  operator_id?: number;
  operator_name?: string;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

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

export interface OperationLog {
  id: number;
  operator_id: number;
  operator_name: string;
  operation_type: OperationType;
  operation_type_label: string;
  target_type?: string;
  target_id?: number;
  detail?: string;
  store_id?: number;
  store_name?: string;
  created_at: string;
}

export interface OperationTypeOption {
  value: OperationType;
  label: string;
}

export interface OperatorOption {
  id: number;
  name: string;
}
