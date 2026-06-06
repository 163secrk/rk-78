import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  message,
  Space,
  Dropdown,
  MenuProps,
} from 'antd';
import {
  DownloadOutlined,
  ReloadOutlined,
  LineChartOutlined,
  BarChartOutlined,
  FilterOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs, { Dayjs } from 'dayjs';
import { reportApi } from '../../services/api';
import type {
  MemberGrowthItem,
  CouponStatItem,
  CouponStatsSummary,
  LevelFunnelItem,
  ConversionPathItem,
} from '../../types';
import {
  exportMemberGrowth,
  exportCouponStats,
  exportLevelFunnel,
  exportAllReports,
} from '../../utils/exportExcel';

const { RangePicker } = DatePicker;
const { Option } = Select;

const HqReports = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [loading, setLoading] = useState(false);

  const [memberGrowth, setMemberGrowth] = useState<MemberGrowthItem[]>([]);
  const [couponStats, setCouponStats] = useState<CouponStatItem[]>([]);
  const [couponSummary, setCouponSummary] = useState<CouponStatsSummary | null>(null);
  const [funnelData, setFunnelData] = useState<LevelFunnelItem[]>([]);
  const [conversionPath, setConversionPath] = useState<ConversionPathItem[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [newMembersInPeriod, setNewMembersInPeriod] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [startDate, endDate] = dateRange;
      const params = {
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
      };

      const [growthRes, couponRes, funnelRes] = await Promise.all([
        reportApi.getMemberGrowth({
          ...params,
          granularity,
        }),
        reportApi.getCouponStats(params),
        reportApi.getLevelFunnel(params),
      ]);

      setMemberGrowth(growthRes);
      setCouponStats(couponRes.list);
      setCouponSummary(couponRes.summary);
      setFunnelData(funnelRes.funnel);
      setConversionPath(funnelRes.conversion_path);
      setTotalMembers(funnelRes.total_members);
      setNewMembersInPeriod(funnelRes.new_members_in_period);
    } catch (e) {
      console.error(e);
      message.error('获取报表数据失败');
    } finally {
      setLoading(false);
    }
  }, [dateRange, granularity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange(dates as [Dayjs, Dayjs]);
    }
  };

  const getMemberGrowthChart = () => {
    const dates = memberGrowth.map(item => item.date);
    const newCounts = memberGrowth.map(item => item.new_count);
    const cumulativeCounts = memberGrowth.map(item => item.cumulative_count);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        data: ['新增会员', '累计会员'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: dates.length > 15 ? 45 : 0,
        },
      },
      yAxis: [
        {
        type: 'value',
        name: '新增会员',
        position: 'left',
        axisLine: {
          lineStyle: {
            color: '#1677ff',
          },
        },
      },
      {
        type: 'value',
        name: '累计会员',
        position: 'right',
        axisLine: {
          lineStyle: {
            color: '#52c41a',
          },
        },
      },
    ],
      series: [
        {
          name: '新增会员',
          type: 'bar',
          data: newCounts,
          itemStyle: {
            color: '#1677ff',
          },
          yAxisIndex: 0,
        },
        {
          name: '累计会员',
          type: 'line',
          data: cumulativeCounts,
          smooth: true,
          itemStyle: {
            color: '#52c41a',
          },
          lineStyle: {
            width: 3,
          },
          yAxisIndex: 1,
        },
      ],
    };
  };

  const getCouponStatsChart = () => {
    const topCoupons = couponStats.slice(0, 8);
    const couponNames = topCoupons.map(item => item.coupon_name);
    const issuedCounts = topCoupons.map(item => item.issued_count);
    const redeemedCounts = topCoupons.map(item => item.redeemed_count);
    const expiredCounts = topCoupons.map(item => item.expired_count);

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
      },
      legend: {
        data: ['发放数量', '核销数量', '过期数量'],
        top: 0,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: couponNames,
        axisLabel: {
          rotate: couponNames.length > 5 ? 30 : 0,
          interval: 0,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '发放数量',
          type: 'bar',
          data: issuedCounts,
          itemStyle: {
            color: '#1677ff',
          },
        },
        {
          name: '核销数量',
          type: 'bar',
          data: redeemedCounts,
          itemStyle: {
            color: '#52c41a',
          },
        },
        {
          name: '过期数量',
          type: 'bar',
          data: expiredCounts,
          itemStyle: {
            color: '#ff4d4f',
          },
        },
      ],
    };
  };

  const getLevelFunnelChart = () => {
    const funnelValues = funnelData.map(item => ({
      value: item.count,
      name: item.level,
    }));

    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
      },
      legend: {
        top: 0,
      },
      series: [
        {
          name: '会员等级',
          type: 'funnel',
          left: '10%',
          top: 60,
          bottom: 60,
          width: '80%',
          min: 0,
          max: Math.max(...funnelData.map(item => item.count)),
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}\n{c}人 ({d}%)',
          },
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            label: {
              fontSize: 18,
            },
          },
          data: funnelValues,
          color: ['#1677ff', '#faad14', '#52c41a'],
        },
      ],
    };
  };

  const getConversionPathChart = () => {
    const nodes = [
      { name: '新增会员' },
      { name: '普通会员' },
      { name: '银卡会员' },
      { name: '金卡会员' },
    ];

    const links = conversionPath.map(item => ({
      source: item.from,
      target: item.to,
      value: item.count,
    }));

    return {
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
      },
      series: [
        {
          type: 'sankey',
          layout: 'none',
          emphasis: {
            focus: 'adjacency',
          },
          left: '10%',
          right: '10%',
          top: 60,
          bottom: 10,
          data: nodes,
          links: links,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
          },
          label: {
            fontSize: 14,
          },
        },
      ],
    };
  };

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'all',
      label: '导出全部报表',
      icon: <ExportOutlined />,
      onClick: () => {
        const [startDate, endDate] = dateRange;
        exportAllReports(
          memberGrowth,
          couponStats,
          funnelData,
          conversionPath,
          startDate.format('YYYYMMDD'),
          endDate.format('YYYYMMDD')
        );
        message.success('导出成功');
      },
    },
    {
      key: 'growth',
      label: '导出会员增长报表',
      icon: <LineChartOutlined />,
      onClick: () => {
        const [startDate, endDate] = dateRange;
        exportMemberGrowth(
          memberGrowth,
          startDate.format('YYYYMMDD'),
          endDate.format('YYYYMMDD')
        );
        message.success('导出成功');
      },
    },
    {
      key: 'coupon',
      label: '导出优惠券统计报表',
      icon: <BarChartOutlined />,
      onClick: () => {
        const [startDate, endDate] = dateRange;
        exportCouponStats(
          couponStats,
          startDate.format('YYYYMMDD'),
          endDate.format('YYYYMMDD')
        );
        message.success('导出成功');
      },
    },
    {
      key: 'funnel',
      label: '导出会员等级报表',
      icon: <FilterOutlined />,
      onClick: () => {
        const [startDate, endDate] = dateRange;
        exportLevelFunnel(
          funnelData,
          conversionPath,
          startDate.format('YYYYMMDD'),
          endDate.format('YYYYMMDD')
        );
        message.success('导出成功');
      },
    },
  ];

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  return (
    <div className="space-y-6">
      <Card style={cardStyle}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Space>
              <span className="text-gray-600">时间范围：</span>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                allowClear={false}
              />
            </Space>
            <Space>
              <span className="text-gray-600">时间粒度：</span>
              <Select
                value={granularity}
                onChange={(value) => setGranularity(value)}
                style={{ width: 120 }}
              >
                <Option value="day">按日</Option>
                <Option value="week">按周</Option>
                <Option value="month">按月</Option>
              </Select>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              刷新数据
            </Button>
          </div>
          <Dropdown menu={{ items: exportMenuItems }}>
            <Button type="primary" icon={<DownloadOutlined />}>
              导出Excel
            </Button>
          </Dropdown>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">会员总数</span>}
              value={totalMembers}
              prefix={<LineChartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">期间新增会员</span>}
              value={newMembersInPeriod}
              prefix={<LineChartOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">优惠券发放总数</span>}
              value={couponSummary?.total_issued || 0}
              prefix={<BarChartOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">整体核销率</span>}
              value={couponSummary?.overall_redemption_rate || 0}
              suffix="%"
              prefix={<BarChartOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <LineChartOutlined className="text-blue-500" />
            <span>会员增长趋势</span>
          </Space>
        }
        style={cardStyle}
        extra={
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => {
              const [startDate, endDate] = dateRange;
              exportMemberGrowth(
                memberGrowth,
                startDate.format('YYYYMMDD'),
                endDate.format('YYYYMMDD')
              );
              message.success('导出成功');
            }}
          >
            导出
          </Button>
        }
      >
        <ReactECharts
          option={getMemberGrowthChart()}
          style={{ height: '400px' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <BarChartOutlined className="text-green-500" />
                <span>优惠券发放核销统计</span>
              </Space>
            }
            style={cardStyle}
            extra={
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const [startDate, endDate] = dateRange;
                  exportCouponStats(
                    couponStats,
                    startDate.format('YYYYMMDD'),
                    endDate.format('YYYYMMDD')
                  );
                  message.success('导出成功');
                }}
              >
                导出
              </Button>
            }
          >
            <ReactECharts
              option={getCouponStatsChart()}
              style={{ height: '400px' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FilterOutlined className="text-orange-500" />
                <span>会员等级转化漏斗</span>
              </Space>
            }
            style={cardStyle}
            extra={
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => {
                  const [startDate, endDate] = dateRange;
                  exportLevelFunnel(
                    funnelData,
                    conversionPath,
                    startDate.format('YYYYMMDD'),
                    endDate.format('YYYYMMDD')
                  );
                  message.success('导出成功');
                }}
              >
                导出
              </Button>
            }
          >
            <ReactECharts
              option={getLevelFunnelChart()}
              style={{ height: '400px' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <FilterOutlined className="text-purple-500" />
            <span>会员等级转化路径</span>
          </Space>
        }
        style={cardStyle}
      >
        <ReactECharts
          option={getConversionPathChart()}
          style={{ height: '350px' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </Card>
    </div>
  );
};

export default HqReports;
