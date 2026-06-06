import request from '../utils/request';
import { Member, CouponTemplate, MemberCoupon, Transaction, Store, PageResult, LoginResponse, UserRole, StoreMemberCount, StoreConsumption, BirthdayResponse, PointRecord, OperationLog, OperationTypeOption, OperatorOption, MemberGrowthItem, CouponStatsResponse, LevelFunnelResponse } from '../types';

export const memberApi = {
  getList: (params: { page?: number; pageSize?: number; keyword?: string }) =>
    request<PageResult<Member>>({ url: '/members', method: 'get', params }),

  getLevelDistribution: () =>
    request<{ level: string; count: number; percentage: number }[]>({ url: '/members/stats/level-distribution', method: 'get' }),

  getDetail: (id: number) =>
    request<Member>({ url: `/members/${id}`, method: 'get' }),

  create: (data: Partial<Member>) =>
    request<{ id: number }>({ url: '/members', method: 'post', data }),

  update: (id: number, data: Partial<Member>) =>
    request({ url: `/members/${id}`, method: 'put', data }),

  delete: (id: number) =>
    request({ url: `/members/${id}`, method: 'delete' }),

  getCoupons: (id: number) =>
    request<MemberCoupon[]>({ url: `/members/${id}/coupons`, method: 'get' }),

  getTransactions: (id: number, params: { page?: number; pageSize?: number }) =>
    request<PageResult<Transaction>>({ url: `/members/${id}/transactions`, method: 'get', params }),

  getBirthdayMembers: () =>
    request<BirthdayResponse>({ url: '/members/birthdays', method: 'get' }),
};

export const couponApi = {
  getList: (params: { page?: number; pageSize?: number; keyword?: string }) =>
    request<PageResult<CouponTemplate>>({ url: '/coupons', method: 'get', params }),

  getDetail: (id: number) =>
    request<CouponTemplate>({ url: `/coupons/${id}`, method: 'get' }),

  create: (data: Partial<CouponTemplate>) =>
    request<{ id: number }>({ url: '/coupons', method: 'post', data }),

  update: (id: number, data: Partial<CouponTemplate>) =>
    request({ url: `/coupons/${id}`, method: 'put', data }),

  delete: (id: number) =>
    request({ url: `/coupons/${id}`, method: 'delete' }),

  issue: (id: number, data: { member_id?: number; member_ids?: number[] }) =>
    request({ url: `/coupons/${id}/issue`, method: 'post', data }),

  issueAll: (coupon_id: number) =>
    request({ url: '/coupons/issue-all', method: 'post', data: { coupon_id } }),

  redeem: (id: number, data: { member_id: number; store_id: number }) =>
    request({ url: `/coupons/${id}/redeem`, method: 'post', data }),

  expire: () =>
    request<{ count: number }>({ url: '/coupons/expire', method: 'post' }),
};

export const transactionApi = {
  getList: (params: {
    page?: number;
    pageSize?: number;
    member_id?: number;
    store_id?: number;
    start_date?: string;
    end_date?: string;
  }) => request<PageResult<Transaction>>({ url: '/transactions', method: 'get', params }),

  getDetail: (id: number) =>
    request<Transaction>({ url: `/transactions/${id}`, method: 'get' }),

  create: (data: {
    member_id: number;
    store_id: number;
    amount: number;
    coupon_id?: number;
    items?: any[];
  }) => request<{
    id: number;
    discount_amount: number;
    points_earned: number;
    final_amount: number;
  }>({ url: '/transactions', method: 'post', data }),
};

export const storeApi = {
  getList: () =>
    request<Store[]>({ url: '/stores', method: 'get' }),

  getMemberCountStats: () =>
    request<StoreMemberCount[]>({ url: '/stores/stats/member-count', method: 'get' }),

  getConsumptionStats: () =>
    request<StoreConsumption[]>({ url: '/stores/stats/consumption', method: 'get' }),
};

export const pointsApi = {
  getMemberPointRecords: (memberId: number, params: { page?: number; pageSize?: number; type?: string }) =>
    request<PageResult<PointRecord>>({ url: `/points/member/${memberId}`, method: 'get', params }),

  adjustPoints: (data: { member_id: number; change: number; remark?: string }) =>
    request<{ balance_before: number; balance_after: number }>({ url: '/points/adjust', method: 'post', data }),
};

export const authApi = {
  login: (data: { username: string; password: string; role: UserRole; storeId?: number }) =>
    request<LoginResponse>({ url: '/login', method: 'post', data }),
};

export const operationLogApi = {
  getList: (params: {
    page?: number;
    pageSize?: number;
    operation_type?: string;
    operator_id?: number;
    start_date?: string;
    end_date?: string;
    keyword?: string;
  }) => request<PageResult<OperationLog>>({ url: '/operation-logs', method: 'get', params }),

  getOperationTypes: () =>
    request<OperationTypeOption[]>({ url: '/operation-logs/operation-types', method: 'get' }),

  getOperators: () =>
    request<OperatorOption[]>({ url: '/operation-logs/operators', method: 'get' }),
};

export const reportApi = {
  getMemberGrowth: (params: {
    start_date?: string;
    end_date?: string;
    granularity?: 'day' | 'week' | 'month';
  }) => request<MemberGrowthItem[]>({ url: '/reports/member-growth', method: 'get', params }),

  getCouponStats: (params: {
    start_date?: string;
    end_date?: string;
  }) => request<CouponStatsResponse>({ url: '/reports/coupon-stats', method: 'get', params }),

  getLevelFunnel: (params: {
    start_date?: string;
    end_date?: string;
  }) => request<LevelFunnelResponse>({ url: '/reports/level-funnel', method: 'get', params }),
};
