import * as XLSX from 'xlsx';
import type { MemberGrowthItem, CouponStatItem, LevelFunnelItem, ConversionPathItem } from '../types';

interface ExcelSheetConfig<T> {
  name: string;
  data: T[];
  headers: { key: keyof T; label: string }[];
}

export function exportToExcel<T extends object>(
  sheets: ExcelSheetConfig<T>[],
  fileName: string
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(sheet => {
    const rows = sheet.data.map(item => {
      const row: Record<string, unknown> = {};
      sheet.headers.forEach(header => {
        row[header.label] = item[header.key];
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = sheet.headers.map(() => ({ wch: 15 }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  });

  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportMemberGrowth(data: MemberGrowthItem[], startDate: string, endDate: string) {
  exportToExcel([{
    name: '会员增长趋势',
    data,
    headers: [
      { key: 'date', label: '日期' },
      { key: 'new_count', label: '新增会员数' },
      { key: 'cumulative_count', label: '累计会员数' }
    ]
  }], `会员增长报表_${startDate}_${endDate}`);
}

export function exportCouponStats(
  data: CouponStatItem[],
  startDate: string,
  endDate: string
) {
  exportToExcel([{
    name: '优惠券统计',
    data,
    headers: [
      { key: 'coupon_name', label: '优惠券名称' },
      { key: 'coupon_type', label: '类型' },
      { key: 'coupon_value', label: '面值' },
      { key: 'issued_count', label: '发放数量' },
      { key: 'redeemed_count', label: '核销数量' },
      { key: 'expired_count', label: '过期数量' },
      { key: 'redemption_rate', label: '核销率(%)' }
    ]
  }], `优惠券统计报表_${startDate}_${endDate}`);
}

export function exportLevelFunnel(
  funnelData: LevelFunnelItem[],
  conversionPath: ConversionPathItem[],
  startDate: string,
  endDate: string
) {
  const wb = XLSX.utils.book_new();

  const funnelRows = funnelData.map(item => ({
    '会员等级': item.level,
    '会员数量': item.count,
    '占比(%)': item.percentage
  }));
  const funnelWs = XLSX.utils.json_to_sheet(funnelRows);
  funnelWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, funnelWs, '会员等级分布');

  const conversionRows = conversionPath.map(item => ({
    '来源阶段': item.from,
    '目标阶段': item.to,
    '转化人数': item.count,
    '转化率(%)': item.rate
  }));
  const conversionWs = XLSX.utils.json_to_sheet(conversionRows);
  conversionWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, conversionWs, '等级转化路径');

  XLSX.writeFile(wb, `会员等级转化报表_${startDate}_${endDate}.xlsx`);
}

export function exportAllReports(
  memberGrowth: MemberGrowthItem[],
  couponStats: CouponStatItem[],
  funnelData: LevelFunnelItem[],
  conversionPath: ConversionPathItem[],
  startDate: string,
  endDate: string
) {
  const wb = XLSX.utils.book_new();

  const growthRows = memberGrowth.map(item => ({
    '日期': item.date,
    '新增会员数': item.new_count,
    '累计会员数': item.cumulative_count
  }));
  const growthWs = XLSX.utils.json_to_sheet(growthRows);
  growthWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, growthWs, '会员增长趋势');

  const couponRows = couponStats.map(item => ({
    '优惠券名称': item.coupon_name,
    '类型': item.coupon_type,
    '面值': item.coupon_value,
    '发放数量': item.issued_count,
    '核销数量': item.redeemed_count,
    '过期数量': item.expired_count,
    '核销率(%)': item.redemption_rate
  }));
  const couponWs = XLSX.utils.json_to_sheet(couponRows);
  couponWs['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, couponWs, '优惠券统计');

  const funnelRows = funnelData.map(item => ({
    '会员等级': item.level,
    '会员数量': item.count,
    '占比(%)': item.percentage
  }));
  const funnelWs = XLSX.utils.json_to_sheet(funnelRows);
  funnelWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, funnelWs, '会员等级分布');

  const conversionRows = conversionPath.map(item => ({
    '来源阶段': item.from,
    '目标阶段': item.to,
    '转化人数': item.count,
    '转化率(%)': item.rate
  }));
  const conversionWs = XLSX.utils.json_to_sheet(conversionRows);
  conversionWs['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, conversionWs, '等级转化路径');

  XLSX.writeFile(wb, `总部数据报表_${startDate}_${endDate}.xlsx`);
}
