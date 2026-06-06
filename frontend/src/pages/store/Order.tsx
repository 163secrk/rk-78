import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Tag,
  message,
  Modal,
  Table,
  Typography,
  Descriptions,
} from 'antd';
import {
  SearchOutlined,
  ShoppingCartOutlined,
  GiftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { memberApi, couponApi, transactionApi } from '../../services/api';
import { Member, MemberCoupon } from '../../types';
import { useAuthStore } from '../../store/auth';

const { Title, Text } = Typography;
const { Option } = Select;

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const StoreOrder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [form] = Form.useForm();
  const [member, setMember] = useState<Member | null>(null);
  const [memberPhone, setMemberPhone] = useState('');
  const [coupons, setCoupons] = useState<MemberCoupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<MemberCoupon | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const paramMemberId = searchParams.get('memberId');

  useEffect(() => {
    if (paramMemberId) {
      loadMember(Number(paramMemberId));
    }
  }, [paramMemberId]);

  const loadMember = async (memberId: number) => {
    try {
      const data = await memberApi.getDetail(memberId);
      setMember(data);
      form.setFieldsValue({ member_name: data.name, member_phone: data.phone });
      loadMemberCoupons(memberId);
    } catch (e) {
      console.error(e);
    }
  };

  const isCouponExpired = (endDate: string) => {
    return dayjs().isAfter(dayjs(endDate).endOf('day'));
  };

  const loadMemberCoupons = async (memberId: number) => {
    try {
      const data = await memberApi.getCoupons(memberId);
      const available = data.filter((c: MemberCoupon) => c.status === '未使用');
      setCoupons(available);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchMember = async () => {
    if (!memberPhone.trim()) {
      message.warning('请输入会员手机号');
      return;
    }
    setSearchLoading(true);
    try {
      const res = await memberApi.getList({ keyword: memberPhone.trim(), pageSize: 1 });
      if (res.list.length > 0) {
        loadMember(res.list[0].id);
      } else {
        message.warning('未找到该会员');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const addItem = () => {
    const newItem: OrderItem = {
      id: Date.now().toString(),
      name: '',
      price: 0,
      quantity: 1,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof OrderItem, value: any) => {
    setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = selectedCoupon
    ? selectedCoupon.type === '折扣'
      ? subtotal * (1 - selectedCoupon.value)
      : selectedCoupon.value
    : 0;

  const finalAmount = Math.max(0, subtotal - discountAmount);
  const pointsEarned = Math.floor(finalAmount);

  const handleCouponChange = (couponId: number | null) => {
    if (!couponId) {
      setSelectedCoupon(null);
      return;
    }
    const coupon = coupons.find((c) => c.id === couponId);
    if (coupon) {
      if (isCouponExpired(coupon.end_date)) {
        Modal.warning({
          title: '优惠券已过期',
          content: (
            <div>
              <p>优惠券 <strong>{coupon.name}</strong> 已过期，无法使用。</p>
              <p className="text-gray-500 text-sm">有效期至：{dayjs(coupon.end_date).format('YYYY-MM-DD')}</p>
            </div>
          ),
          okText: '我知道了',
        });
        setSelectedCoupon(null);
        return;
      }
      if (coupon.min_amount && subtotal < coupon.min_amount) {
        message.warning(`该优惠券需要满¥${coupon.min_amount}才能使用`);
        setSelectedCoupon(null);
        return;
      }
      setSelectedCoupon(coupon);
    }
  };

  const handleSubmit = async () => {
    if (!member) {
      message.warning('请先选择会员');
      return;
    }
    if (items.length === 0 || items.some((i) => !i.name || i.price <= 0 || i.quantity <= 0)) {
      message.warning('请完善商品信息');
      return;
    }

    const validItems = items.filter((i) => i.name && i.price > 0 && i.quantity > 0);

    Modal.confirm({
      title: '确认收款',
      content: `确认向会员 ${member.name} 收取 ¥${finalAmount.toFixed(2)}？`,
      onOk: async () => {
        setLoading(true);
        try {
          const data: any = {
            member_id: member.id,
            store_id: user?.storeId,
            amount: subtotal,
            items: validItems,
          };

          if (selectedCoupon) {
            data.coupon_id = selectedCoupon.id;
          }

          const result = await transactionApi.create(data);
          setLastTransaction({
            ...result,
            items: validItems,
            member_name: member.name,
            member_phone: member.phone,
          });
          setSuccessModal(true);

          if (selectedCoupon) {
            setCoupons(coupons.filter((c) => c.id !== selectedCoupon.id));
            setSelectedCoupon(null);
          }
        } catch (e: any) {
          message.error(e.message || '收款失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const resetOrder = () => {
    setMember(null);
    setMemberPhone('');
    setItems([]);
    setCoupons([]);
    setSelectedCoupon(null);
    form.resetFields();
    setSuccessModal(false);
    setLastTransaction(null);
  };

  const itemColumns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      render: (_: any, record: OrderItem) => (
        <Input
          placeholder="商品名称"
          value={record.name}
          onChange={(e) => updateItem(record.id, 'name', e.target.value)}
        />
      ),
    },
    {
      title: '单价',
      dataIndex: 'price',
      width: 150,
      render: (_: any, record: OrderItem) => (
        <InputNumber
          style={{ width: '100%' }}
          min={0}
          precision={2}
          placeholder="0.00"
          value={record.price}
          onChange={(value) => updateItem(record.id, 'price', value || 0)}
          addonBefore="¥"
        />
      ),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      width: 120,
      render: (_: any, record: OrderItem) => (
        <InputNumber
          style={{ width: '100%' }}
          min={1}
          value={record.quantity}
          onChange={(value) => updateItem(record.id, 'quantity', value || 1)}
        />
      ),
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      width: 120,
      render: (_: any, record: OrderItem) => (
        <span className="font-semibold">¥{(record.price * record.quantity).toFixed(2)}</span>
      ),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: OrderItem) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.id)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold m-0">
          <ShoppingCartOutlined className="mr-2" />
          订单收款
        </h2>
        <Button onClick={() => navigate('/store/transactions')}>查看记录</Button>
      </div>

      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card title="会员信息" className="mb-4">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="输入会员手机号搜索"
                value={memberPhone}
                onChange={(e) => setMemberPhone(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchMember()}
                allowClear
                size="large"
                prefix={<SearchOutlined />}
              />
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={searchLoading}
                onClick={handleSearchMember}
                size="large"
              >
                搜索
              </Button>
            </Space.Compact>

            {member && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-lg">{member.name}</div>
                    <div className="text-sm text-gray-500">
                      {member.phone} · {member.level} · {member.points} 积分
                    </div>
                  </div>
                  <Tag color={member.level === '金卡会员' ? 'gold' : member.level === '银卡会员' ? 'default' : 'blue'}>
                    {member.level}
                  </Tag>
                </div>
              </div>
            )}
          </Card>

          <Card
            title="商品列表"
            extra={
              <Button type="dashed" icon={<PlusOutlined />} onClick={addItem}>
                添加商品
              </Button>
            }
          >
            {items.length > 0 ? (
              <Table
                rowKey="id"
                columns={itemColumns}
                dataSource={items}
                pagination={false}
                showHeader={false}
              />
            ) : (
              <div className="text-center py-8 text-gray-400">
                <ShoppingCartOutlined className="text-4xl mb-2 block" />
                <p>暂无商品，点击上方按钮添加</p>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="sticky top-4">
            <Title level={4} className="mb-4">
              收款金额
            </Title>

            {member && coupons.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">
                  <GiftOutlined className="mr-1" />
                  选择优惠券
                </label>
                <Select
                  style={{ width: '100%' }}
                  placeholder="选择可用优惠券"
                  allowClear
                  value={selectedCoupon?.id}
                  onChange={handleCouponChange}
                  optionRender={(option) => {
                    const coupon = coupons.find((c) => c.id === option.value);
                    if (!coupon) return option.label as React.ReactNode;
                    const expired = isCouponExpired(coupon.end_date);
                    return (
                      <div className="flex justify-between items-center w-full">
                        <span className={expired ? 'text-gray-400 line-through' : ''}>
                          {option.label as string}
                        </span>
                        {expired && (
                          <Tag color="red" className="ml-2">已过期</Tag>
                        )}
                      </div>
                    );
                  }}
                  options={coupons.map((c) => ({
                    label: `${c.name} - ${
                      c.type === '满减'
                        ? `满${c.min_amount}减${c.value}`
                        : c.type === '折扣'
                        ? `${c.value * 10}折`
                        : `立减${c.value}元`
                    }`,
                    value: c.id,
                  }))}
                />
              </div>
            )}

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">商品小计</span>
                <span className="font-medium">¥{subtotal.toFixed(2)}</span>
              </div>
              {selectedCoupon && (
                <div className="flex justify-between text-red-500">
                  <span>优惠券优惠</span>
                  <span>-¥{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {selectedCoupon && (
                <div className="text-xs text-gray-400 pl-2">
                  {selectedCoupon.name}
                </div>
              )}
              <Divider className="my-3" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">实付金额</span>
                <span className="text-3xl font-bold text-red-500">
                  ¥{finalAmount.toFixed(2)}
                </span>
              </div>
              {member && (
                <div className="flex justify-between text-sm text-orange-500">
                  <span>预计获得积分</span>
                  <span>+{pointsEarned} 积分</span>
                </div>
              )}
            </div>

            <Button
              type="primary"
              size="large"
              block
              className="mt-6 h-12 text-lg"
              icon={<CheckCircleOutlined />}
              loading={loading}
              onClick={handleSubmit}
              disabled={!member || items.length === 0}
            >
              确认收款
            </Button>
          </Card>
        </Col>
      </Row>

      <Modal
        open={successModal}
        title="收款成功"
        onCancel={() => setSuccessModal(false)}
        footer={[
          <Button key="reset" onClick={resetOrder}>
            新建订单
          </Button>,
          <Button
            key="view"
            type="primary"
            onClick={() => navigate(`/store/members/${member?.id}`)}
          >
            查看会员
          </Button>,
        ]}
      >
        {lastTransaction && (
          <div>
            <div className="text-center mb-4">
              <CheckCircleOutlined className="text-6xl text-green-500" />
              <div className="text-2xl font-bold text-green-500 mt-2">
                ¥{finalAmount.toFixed(2)}
              </div>
              <div className="text-gray-500">收款成功</div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="会员">
                {lastTransaction.member_name} ({lastTransaction.member_phone})
              </Descriptions.Item>
              <Descriptions.Item label="交易时间">
                {dayjs(lastTransaction.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="消费金额">¥{subtotal.toFixed(2)}</Descriptions.Item>
              {selectedCoupon && (
                <>
                  <Descriptions.Item label="优惠券">{selectedCoupon.name}</Descriptions.Item>
                  <Descriptions.Item label="优惠金额">-¥{discountAmount.toFixed(2)}</Descriptions.Item>
                </>
              )}
              <Descriptions.Item label="实付金额">
                <span className="text-green-600 font-semibold">¥{finalAmount.toFixed(2)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="获得积分">
                <span className="text-orange-500">+{pointsEarned}</span>
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4">
              <div className="text-sm font-medium mb-2">商品明细</div>
              {lastTransaction.items?.map((item: OrderItem, idx: number) => (
                <div key={idx} className="flex justify-between text-sm py-1">
                  <span>{item.name} × {item.quantity}</span>
                  <span>¥{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StoreOrder;
