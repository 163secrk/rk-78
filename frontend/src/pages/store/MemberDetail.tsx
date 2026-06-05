import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tabs, Tag, Button, Space, List, message } from 'antd';
import { ArrowLeftOutlined, ShoppingCartOutlined, GiftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { memberApi } from '../../services/api';
import { Member, MemberCoupon, Transaction } from '../../types';
import { useAuthStore } from '../../store/auth';

const StoreMemberDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuthStore();
  const [member, setMember] = useState<Member | null>(null);
  const [coupons, setCoupons] = useState<MemberCoupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  const memberId = Number(id);

  useEffect(() => {
    if (memberId) {
      fetchMemberDetail();
      fetchMemberCoupons();
      fetchMemberTransactions();
    }
  }, [memberId]);

  const fetchMemberDetail = async () => {
    try {
      const data = await memberApi.getDetail(memberId);
      setMember(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMemberCoupons = async () => {
    try {
      const data = await memberApi.getCoupons(memberId);
      setCoupons(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMemberTransactions = async () => {
    try {
      const res = await memberApi.getTransactions(memberId, { pageSize: 20 });
      setTransactions(res.list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateOrder = () => {
    navigate(`/store/order?memberId=${memberId}`);
  };

  const transactionColumns = [
    {
      title: '交易时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '门店',
      dataIndex: 'store_name',
      width: 120,
    },
    {
      title: '消费金额',
      dataIndex: 'amount',
      width: 100,
      render: (amount: number) => `¥${amount.toFixed(2)}`,
    },
    {
      title: '优惠金额',
      dataIndex: 'discount_amount',
      width: 100,
      render: (amount: number) => amount > 0 ? <span className="text-red-500">-¥{amount.toFixed(2)}</span> : '-',
    },
    {
      title: '使用优惠券',
      dataIndex: 'coupon_name',
      width: 140,
      render: (name: string) => name || '-',
    },
    {
      title: '获得积分',
      dataIndex: 'points_earned',
      width: 100,
      render: (points: number) => <span className="text-orange-500">+{points}</span>,
    },
  ];

  const getCouponValueText = (coupon: MemberCoupon) => {
    if (coupon.type === '满减') return `满${coupon.min_amount}减${coupon.value}`;
    if (coupon.type === '折扣') return `${coupon.value * 10}折`;
    if (coupon.type === '立减') return `立减${coupon.value}元`;
    return '';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      '未使用': 'green',
      '已使用': 'default',
      '已过期': 'red',
    };
    return colors[status] || 'default';
  };

  const availableCoupons = coupons.filter((c) => c.status === '未使用');

  if (!member) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/store/search')}
          >
            返回搜索
          </Button>
          <h2 className="text-xl font-semibold m-0">会员详情</h2>
        </div>
        <Button
          type="primary"
          icon={<ShoppingCartOutlined />}
          onClick={handleCreateOrder}
        >
          创建订单
        </Button>
      </div>

      <Card>
        <Descriptions title="基本信息" bordered column={2}>
          <Descriptions.Item label="ID">{member.id}</Descriptions.Item>
          <Descriptions.Item label="姓名">{member.name}</Descriptions.Item>
          <Descriptions.Item label="手机号">{member.phone}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{member.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="生日">{member.birthday || '-'}</Descriptions.Item>
          <Descriptions.Item label="会员等级">
            <Tag color={member.level === '金卡会员' ? 'gold' : member.level === '银卡会员' ? 'default' : 'blue'}>
              {member.level}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="当前积分">
            <span className="text-orange-500 font-semibold text-lg">{member.points}</span>
          </Descriptions.Item>
          <Descriptions.Item label="可用优惠券">
            <span className="text-green-500 font-semibold">{availableCoupons.length} 张</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Tabs
        defaultActiveKey="coupons"
        items={[
          {
            key: 'coupons',
            label: `优惠券 (${coupons.length})`,
            children: (
              <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
                dataSource={coupons}
                renderItem={(item) => (
                  <List.Item>
                    <Card
                      size="small"
                      className={`border-2 rounded-lg ${
                        item.status === '未使用' ? 'border-green-200 bg-green-50' :
                        item.status === '已过期' ? 'border-red-200 bg-red-50' :
                        'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-gray-500">{getCouponValueText(item)}</div>
                        </div>
                        <Tag color={getStatusColor(item.status)}>{item.status}</Tag>
                      </div>
                      <div className="text-xs text-gray-500">
                        <div>有效期：{dayjs(item.start_date).format('YYYY-MM-DD')} ~ {dayjs(item.end_date).format('YYYY-MM-DD')}</div>
                        <div>领取时间：{dayjs(item.obtained_at).format('YYYY-MM-DD HH:mm')}</div>
                      </div>
                    </Card>
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'transactions',
            label: '消费记录',
            children: (
              <Table
                rowKey="id"
                columns={transactionColumns}
                dataSource={transactions}
                pagination={false}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default StoreMemberDetail;
