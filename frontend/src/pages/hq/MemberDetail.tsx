import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tabs, Tag, Button, Space, Modal, List, message } from 'antd';
import { ArrowLeftOutlined, GiftOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { memberApi, couponApi } from '../../services/api';
import { Member, MemberCoupon, Transaction } from '../../types';

const HqMemberDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [coupons, setCoupons] = useState<MemberCoupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null);

  const memberId = Number(id);

  useEffect(() => {
    if (memberId) {
      fetchMemberDetail();
      fetchMemberCoupons();
      fetchMemberTransactions();
      fetchAvailableCoupons();
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

  const fetchAvailableCoupons = async () => {
    try {
      const res = await couponApi.getList({ pageSize: 100 });
      setAvailableCoupons(res.list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleIssueCoupon = async () => {
    if (!selectedCoupon) {
      message.warning('请选择优惠券');
      return;
    }
    try {
      setLoading(true);
      await couponApi.issue(selectedCoupon, { member_id: memberId });
      message.success('发放成功');
      setCouponModalVisible(false);
      fetchMemberCoupons();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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

  if (!member) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/hq/members')}
        >
          返回列表
        </Button>
        <h2 className="text-xl font-semibold m-0">会员详情</h2>
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
          <Descriptions.Item label="注册时间">
            {dayjs(member.created_at).format('YYYY-MM-DD HH:mm')}
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
              <div>
                <div className="mb-4 flex justify-end">
                  <Button
                    type="primary"
                    icon={<GiftOutlined />}
                    onClick={() => setCouponModalVisible(true)}
                  >
                    发放优惠券
                  </Button>
                </div>
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
                          {item.used_at && (
                            <div>使用时间：{dayjs(item.used_at).format('YYYY-MM-DD HH:mm')}</div>
                          )}
                        </div>
                      </Card>
                    </List.Item>
                  )}
                />
              </div>
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

      <Modal
        title="发放优惠券"
        open={couponModalVisible}
        onOk={handleIssueCoupon}
        onCancel={() => setCouponModalVisible(false)}
        okText="确认发放"
        cancelText="取消"
        confirmLoading={loading}
      >
        <List
          dataSource={availableCoupons}
          renderItem={(item) => (
            <List.Item
              onClick={() => setSelectedCoupon(item.id)}
              className={`cursor-pointer rounded-lg mb-2 border-2 ${
                selectedCoupon === item.id ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <div className="w-full">
                <div className="flex justify-between">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    剩余：{item.total_quantity - item.issued_quantity} 张
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {item.type === '满减' ? `满${item.min_amount}减${item.value}` :
                   item.type === '折扣' ? `${item.value * 10}折` :
                   `立减${item.value}元`}
                  {' | '}
                  有效期：{dayjs(item.start_date).format('YYYY-MM-DD')} ~ {dayjs(item.end_date).format('YYYY-MM-DD')}
                </div>
              </div>
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default HqMemberDetail;
