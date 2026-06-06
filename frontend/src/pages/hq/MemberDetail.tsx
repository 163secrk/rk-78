import { useState, useEffect } from 'react';
import { Card, Descriptions, Table, Tabs, Tag, Button, Space, Modal, List, message, Form, InputNumber, Input, Radio } from 'antd';
import { ArrowLeftOutlined, GiftOutlined, DeleteOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { memberApi, couponApi, pointsApi } from '../../services/api';
import { Member, MemberCoupon, Transaction, PointRecord } from '../../types';

const HqMemberDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [member, setMember] = useState<Member | null>(null);
  const [coupons, setCoupons] = useState<MemberCoupon[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pointRecords, setPointRecords] = useState<PointRecord[]>([]);
  const [pointRecordsTotal, setPointRecordsTotal] = useState(0);
  const [pointPage, setPointPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [pointModalVisible, setPointModalVisible] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<number | null>(null);
  const [pointForm] = Form.useForm();

  const memberId = Number(id);

  useEffect(() => {
    if (memberId) {
      fetchMemberDetail();
      fetchMemberCoupons();
      fetchMemberTransactions();
      fetchAvailableCoupons();
      fetchPointRecords();
    }
  }, [memberId, pointPage]);

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

  const isTemplateExpired = (endDate: string) => {
    return dayjs().isAfter(dayjs(endDate).endOf('day'));
  };

  const fetchAvailableCoupons = async () => {
    try {
      const res = await couponApi.getList({ pageSize: 100 });
      const filtered = res.list.filter((c: any) => !isTemplateExpired(c.end_date));
      setAvailableCoupons(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPointRecords = async () => {
    try {
      const res = await pointsApi.getMemberPointRecords(memberId, { page: pointPage, pageSize: 10 });
      setPointRecords(res.list);
      setPointRecordsTotal(res.total);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjustPoints = async (values: { type: 'add' | 'subtract'; amount: number; remark?: string }) => {
    try {
      setLoading(true);
      const change = values.type === 'add' ? values.amount : -values.amount;
      await pointsApi.adjustPoints({
        member_id: memberId,
        change,
        remark: values.remark
      });
      message.success('积分调整成功');
      setPointModalVisible(false);
      pointForm.resetFields();
      fetchMemberDetail();
      fetchPointRecords();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

  const getTypeText = (type: string) => {
    const map: Record<string, string> = {
      earn: '获得',
      spend: '消耗',
      adjust: '调整'
    };
    return map[type] || type;
  };

  const getSourceTypeText = (type: string) => {
    const map: Record<string, string> = {
      transaction: '消费',
      exchange: '兑换',
      manual: '手动'
    };
    return map[type] || type;
  };

  const pointRecordColumns = [
    {
      title: '变动时间',
      dataIndex: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => {
        const colors: Record<string, string> = {
          earn: 'green',
          spend: 'red',
          adjust: 'blue'
        };
        return <Tag color={colors[type]}>{getTypeText(type)}</Tag>;
      }
    },
    {
      title: '来源',
      dataIndex: 'source_type',
      width: 80,
      render: (type: string) => getSourceTypeText(type),
    },
    {
      title: '变动积分',
      dataIndex: 'change',
      width: 100,
      render: (change: number, record: PointRecord) => (
        <span className={record.type === 'earn' ? 'text-green-600 font-semibold' : 'text-red-500 font-semibold'}>
          {record.type === 'earn' ? '+' : ''}{change}
        </span>
      ),
    },
    {
      title: '变动前余额',
      dataIndex: 'balance_before',
      width: 110,
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      width: 110,
    },
    {
      title: '备注',
      dataIndex: 'remark',
      width: 180,
      render: (text: string) => text || '-',
    },
    {
      title: '操作人',
      dataIndex: 'operator_name',
      width: 100,
      render: (text: string) => text || '-',
    },
  ];

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
            <Space>
              <span className="text-orange-500 font-semibold text-lg">{member.points}</span>
              <Button
                type="primary"
                size="small"
                onClick={() => setPointModalVisible(true)}
              >
                调整积分
              </Button>
            </Space>
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
          {
            key: 'points',
            label: `积分明细 (${pointRecordsTotal})`,
            children: (
              <div>
                <div className="mb-4 flex justify-end">
                  <Button
                    type="primary"
                    icon={member.points >= 0 ? <PlusOutlined /> : <MinusOutlined />}
                    onClick={() => setPointModalVisible(true)}
                  >
                    调整积分
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={pointRecordColumns}
                  dataSource={pointRecords}
                  pagination={{
                    current: pointPage,
                    pageSize: 10,
                    total: pointRecordsTotal,
                    onChange: (page) => setPointPage(page),
                    showSizeChanger: false,
                  }}
                />
              </div>
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
          renderItem={(item) => {
            const hasCoupon = coupons.some(c => c.coupon_id === item.id);
            const hasUnused = coupons.some(c => c.coupon_id === item.id && c.status === '未使用');
            const isNewUser = (item as any).is_new_user;
            const disabled = isNewUser && hasCoupon;
            
            return (
              <List.Item
                onClick={() => !disabled && setSelectedCoupon(item.id)}
                className={`rounded-lg mb-2 border-2 ${
                  disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200' :
                  selectedCoupon === item.id ? 'border-blue-500 bg-blue-50 cursor-pointer' : 
                  'border-transparent hover:border-gray-200 cursor-pointer'
                }`}
              >
                <div className="w-full">
                  <div className="flex justify-between items-start">
                    <div className="font-semibold flex items-center gap-2">
                      {item.name}
                      {isNewUser && (
                        <Tag color="orange" className="m-0">新人专享</Tag>
                      )}
                      {disabled && (
                        <Tag color="default" className="m-0">已领取</Tag>
                      )}
                      {!disabled && hasUnused && (
                        <Tag color="blue" className="m-0">未使用</Tag>
                      )}
                    </div>
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
            );
          }}
        />
      </Modal>

      <Modal
        title="调整积分"
        open={pointModalVisible}
        onCancel={() => setPointModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={pointForm}
          layout="vertical"
          onFinish={handleAdjustPoints}
          initialValues={{ type: 'add' }}
        >
          <Form.Item
            name="type"
            label="调整类型"
            rules={[{ required: true, message: '请选择调整类型' }]}
          >
            <Radio.Group>
              <Radio.Button value="add">
                <PlusOutlined /> 增加积分
              </Radio.Button>
              <Radio.Button value="subtract">
                <MinusOutlined /> 扣减积分
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            name="amount"
            label="调整数量"
            rules={[
              { required: true, message: '请输入调整数量' },
              { type: 'number', min: 1, message: '数量必须大于0' }
            ]}
          >
            <InputNumber
              min={1}
              max={999999}
              placeholder="请输入积分数量"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="remark"
            label="备注说明"
            rules={[{ max: 200, message: '备注不能超过200字' }]}
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入备注说明（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item className="mb-0 flex justify-end gap-2">
            <Button onClick={() => setPointModalVisible(false)}>取消</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              确认调整
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HqMemberDetail;
