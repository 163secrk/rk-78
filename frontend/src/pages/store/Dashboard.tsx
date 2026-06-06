import { Card, Statistic, Row, Col } from 'antd';
import { TeamOutlined, GiftOutlined, DollarOutlined, HistoryOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { memberApi, couponApi, transactionApi } from '../../services/api';
import BirthdayList from '../../components/BirthdayList';
import { useAuthStore } from '../../store/auth';

const StoreDashboard = () => {
  const { user } = useAuthStore();
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
        couponApi.getList({ pageSize: 100 }),
        transactionApi.getList({ pageSize: 1, store_id: user?.storeId }),
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
              prefix={<GiftOutlined className="text-orange-500" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={cardStyle}>
            <Statistic
              title={<span className="text-gray-500">本店交易记录</span>}
              value={stats.totalTransactions}
              prefix={<HistoryOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={24}>
          <BirthdayList role="store" />
        </Col>
      </Row>
    </div>
  );
};

export default StoreDashboard;
