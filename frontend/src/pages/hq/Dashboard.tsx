import { Card, Statistic, Row, Col, Progress } from 'antd';
import { TeamOutlined, GiftOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { memberApi, couponApi, transactionApi } from '../../services/api';

const HqDashboard = () => {
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCoupons: 0,
    issuedCoupons: 0,
    totalTransactions: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [membersRes, couponsRes, transactionsRes] = await Promise.all([
        memberApi.getList({ pageSize: 1 }),
        couponApi.getList({ pageSize: 1 }),
        transactionApi.getList({ pageSize: 1 }),
      ]);
      setStats({
        totalMembers: membersRes.total,
        totalCoupons: couponsRes.total,
        issuedCoupons: couponsRes.list.reduce((sum, c) => sum + c.issued_quantity, 0),
        totalTransactions: transactionsRes.total,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  return (
    <div className="space-y-6">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">会员总数</span>}
              value={stats.totalMembers}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">优惠券模板</span>}
              value={stats.totalCoupons}
              prefix={<GiftOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">已发放优惠券</span>}
              value={stats.issuedCoupons}
              prefix={<RiseOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">交易记录数</span>}
              value={stats.totalTransactions}
              prefix={<DollarOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="会员等级分布" style={cardStyle}>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">金卡会员</span>
                  <span className="font-medium">33%</span>
                </div>
                <Progress percent={33} strokeColor="#faad14" showInfo={false} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">银卡会员</span>
                  <span className="font-medium">33%</span>
                </div>
                <Progress percent={33} strokeColor="#bfbfbf" showInfo={false} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">普通会员</span>
                  <span className="font-medium">34%</span>
                </div>
                <Progress percent={34} strokeColor="#1677ff" showInfo={false} />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="快捷操作" style={cardStyle}>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg text-center cursor-pointer hover:bg-blue-100 transition-colors">
                <TeamOutlined className="text-2xl text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">新增会员</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center cursor-pointer hover:bg-green-100 transition-colors">
                <GiftOutlined className="text-2xl text-green-500 mb-2" />
                <p className="text-sm text-gray-600">创建优惠券</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center cursor-pointer hover:bg-orange-100 transition-colors">
                <RiseOutlined className="text-2xl text-orange-500 mb-2" />
                <p className="text-sm text-gray-600">批量发券</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg text-center cursor-pointer hover:bg-purple-100 transition-colors">
                <DollarOutlined className="text-2xl text-purple-500 mb-2" />
                <p className="text-sm text-gray-600">查看报表</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HqDashboard;
