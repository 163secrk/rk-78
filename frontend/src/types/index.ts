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

export interface LoginResponse {
  token: string;
  user: UserInfo;
}
