import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { TeamOutlined, DollarOutlined, ShopOutlined, BarChartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { storeApi } from '../../services/api';
import { StoreMemberCount, StoreConsumption } from '../../types';

const HqStoreStats = () => {
  const [memberCountData, setMemberCountData] = useState<StoreMemberCount[]>([]);
  const [consumptionData, setConsumptionData] = useState<StoreConsumption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [memberRes, consumptionRes] = await Promise.all([
        storeApi.getMemberCountStats(),
        storeApi.getConsumptionStats(),
      ]);
      setMemberCountData(memberRes);
      setConsumptionData(consumptionRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const totalMembers = memberCountData.reduce((sum, item) => sum + item.member_count, 0);
  const totalAmount = consumptionData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalTransactions = consumptionData.reduce((sum, item) => sum + item.transaction_count, 0);

  const memberCountChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>会员数：${data.value}人`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: memberCountData.map(item => item.store_name),
      axisLabel: {
        interval: 0,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '会员数(人)',
    },
    series: [
      {
        name: '会员数',
        type: 'bar',
        data: memberCountData.map(item => item.member_count),
        itemStyle: {
          color: '#1677ff',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}人',
        },
        barWidth: '50%',
      },
    ],
  };

  const consumptionChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        let result = `${params[0].name}<br/>`;
        params.forEach((param: any) => {
          result += `${param.marker}${param.seriesName}：¥${param.value.toFixed(2)}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['消费总额', '实收金额'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: consumptionData.map(item => item.store_name),
      axisLabel: {
        interval: 0,
        rotate: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: '金额(元)',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series: [
      {
        name: '消费总额',
        type: 'bar',
        data: consumptionData.map(item => item.total_amount),
        itemStyle: {
          color: '#52c41a',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: '¥{c}',
        },
        barWidth: '35%',
      },
      {
        name: '实收金额',
        type: 'bar',
        data: consumptionData.map(item => item.final_amount),
        itemStyle: {
          color: '#fa8c16',
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          formatter: '¥{c}',
        },
        barWidth: '35%',
      },
    ],
  };

  const memberRankColumns = [
    {
      title: '排名',
      width: 80,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1;
        let color = '#1677ff';
        if (rank === 1) color = '#faad14';
        if (rank === 2) color = '#bfbfbf';
        if (rank === 3) color = '#d46b08';
        return (
          <span className="font-bold" style={{ color }}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
          </span>
        );
      },
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      render: (name: string) => (
        <span className="flex items-center gap-2">
          <ShopOutlined className="text-blue-500" />
          {name}
        </span>
      ),
    },
    {
      title: '会员数',
      dataIndex: 'member_count',
      width: 120,
      render: (count: number) => (
        <span className="font-semibold text-blue-600">{count}人</span>
      ),
    },
    {
      title: '占比',
      width: 150,
      render: (_: any, record: StoreMemberCount) => {
        const percentage = totalMembers > 0 ? ((record.member_count / totalMembers) * 100).toFixed(1) : '0';
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12">{percentage}%</span>
          </div>
        );
      },
    },
  ];

  const consumptionColumns = [
    {
      title: '排名',
      width: 80,
      render: (_: any, __: any, index: number) => {
        const rank = index + 1;
        let color = '#1677ff';
        if (rank === 1) color = '#faad14';
        if (rank === 2) color = '#bfbfbf';
        if (rank === 3) color = '#d46b08';
        return (
          <span className="font-bold" style={{ color }}>
            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
          </span>
        );
      },
    },
    {
      title: '门店名称',
      dataIndex: 'store_name',
      render: (name: string) => (
        <span className="flex items-center gap-2">
          <ShopOutlined className="text-green-500" />
          {name}
        </span>
      ),
    },
    {
      title: '消费总额',
      dataIndex: 'total_amount',
      width: 120,
      render: (amount: number) => (
        <span className="font-semibold text-green-600">¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: '实收金额',
      dataIndex: 'final_amount',
      width: 120,
      render: (amount: number) => (
        <span className="font-semibold text-orange-600">¥{amount.toFixed(2)}</span>
      ),
    },
    {
      title: '优惠金额',
      width: 120,
      render: (_: any, record: StoreConsumption) => (
        <span className="font-semibold text-red-500">
          ¥{(record.total_amount - record.final_amount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '交易笔数',
      dataIndex: 'transaction_count',
      width: 100,
      render: (count: number) => (
        <span className="text-gray-600">{count}笔</span>
      ),
    },
  ];

  const sortedMemberData = [...memberCountData].sort((a, b) => b.member_count - a.member_count);
  const sortedConsumptionData = [...consumptionData].sort((a, b) => b.total_amount - a.total_amount);

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">门店总数</span>}
              value={memberCountData.length}
              prefix={<ShopOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">总会员数</span>}
              value={totalMembers}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff' }}
              suffix="人"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">总消费额</span>}
              value={totalAmount}
              prefix={<DollarOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
              precision={2}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <BarChartOutlined className="text-blue-500" />
                各门店会员数排名
              </span>
            }
            style={cardStyle}
          >
            <ReactECharts option={memberCountChartOption} style={{ height: '350px' }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <BarChartOutlined className="text-green-500" />
                各门店消费总额对比
              </span>
            }
            style={cardStyle}
          >
            <ReactECharts option={consumptionChartOption} style={{ height: '350px' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <TeamOutlined className="text-blue-500" />
                会员数排行榜
              </span>
            }
            style={cardStyle}
          >
            <Table
              rowKey="store_id"
              columns={memberRankColumns}
              dataSource={sortedMemberData}
              pagination={false}
              loading={loading}
              size="middle"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <span className="flex items-center gap-2">
                <DollarOutlined className="text-green-500" />
                消费额排行榜
              </span>
            }
            style={cardStyle}
          >
            <Table
              rowKey="store_id"
              columns={consumptionColumns}
              dataSource={sortedConsumptionData}
              pagination={false}
              loading={loading}
              size="middle"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HqStoreStats;
