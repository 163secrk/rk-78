import { useState, useEffect } from 'react';
import { Table, Button, Input, Space, Modal, Form, Select, DatePicker, message, Popconfirm, Tag, Progress, Row, Col, Radio } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, GiftOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { couponApi, memberApi } from '../../services/api';
import { CouponTemplate, Member } from '../../types';

const { Option } = Select;
const { RangePicker } = DatePicker;

const HqCoupons = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<CouponTemplate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponTemplate | null>(null);
  const [currentCoupon, setCurrentCoupon] = useState<CouponTemplate | null>(null);
  const [issueType, setIssueType] = useState<'single' | 'batch' | 'all'>('single');
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await couponApi.getList({ page, pageSize, keyword });
      setCoupons(res.list);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await memberApi.getList({ pageSize: 1000 });
      setMembers(res.list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchMembers();
  }, [page, pageSize, keyword]);

  const handleAdd = () => {
    setEditingCoupon(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (coupon: CouponTemplate) => {
    setEditingCoupon(coupon);
    const c = coupon as any;
    let specialType = 0;
    if (c.is_new_user) specialType = 1;
    if (c.is_birthday) specialType = 2;
    form.setFieldsValue({
      ...coupon,
      dateRange: [dayjs(coupon.start_date), dayjs(coupon.end_date)],
      coupon_special_type: specialType,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await couponApi.delete(id);
      message.success('删除成功');
      fetchCoupons();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '删除失败');
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const [startDate, endDate] = values.dateRange;

      if (values.type === '满减' && values.value > values.min_amount) {
        message.error('满减金额不能大于最低消费金额');
        return;
      }
      if (values.type === '折扣' && (values.value <= 0 || values.value > 1)) {
        message.error('折扣值必须在0到1之间');
        return;
      }
      if ((values.type === '满减' || values.type === '立减') && values.value <= 0) {
        message.error('优惠金额必须大于0');
        return;
      }

      const data = {
        name: values.name,
        type: values.type,
        value: values.value,
        min_amount: values.min_amount || 0,
        total_quantity: values.total_quantity,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        description: values.description,
        is_new_user: values.coupon_special_type === 1 ? 1 : 0,
        is_birthday: values.coupon_special_type === 2 ? 1 : 0,
      };

      if (editingCoupon) {
        await couponApi.update(editingCoupon.id, data);
        message.success('更新成功');
      } else {
        await couponApi.create(data);
        message.success('创建成功');
      }

      setModalVisible(false);
      fetchCoupons();
    } catch (e: any) {
      if (e?.response?.data?.message) {
        message.error(e.response.data.message);
      }
      console.error(e);
    }
  };

  const openIssueModal = (coupon: CouponTemplate) => {
    setCurrentCoupon(coupon);
    setIssueType((coupon as any).is_new_user ? 'single' : 'single');
    setSelectedMembers([]);
    setIssueModalVisible(true);
  };

  const handleIssue = async () => {
    if (!currentCoupon) return;
    setSubmitting(true);
    try {
      if (issueType === 'all') {
        await couponApi.issueAll(currentCoupon.id);
        message.success('已向所有会员发放优惠券');
      } else if (issueType === 'single' && selectedMembers.length > 0) {
        await couponApi.issue(currentCoupon.id, { member_id: selectedMembers[0] });
        message.success('成功发放优惠券');
      } else if (issueType === 'batch' && selectedMembers.length > 0) {
        await couponApi.issue(currentCoupon.id, { member_ids: selectedMembers });
        message.success(`成功向 ${selectedMembers.length} 位会员发放优惠券`);
      } else {
        message.warning('请选择要发放的会员');
        return;
      }
      setIssueModalVisible(false);
      fetchCoupons();
    } catch (e: any) {
      message.error(e?.response?.data?.message || '发放失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeTagColor = (type: string) => {
    const colors: Record<string, string> = {
      '满减': 'blue',
      '折扣': 'orange',
      '立减': 'green',
    };
    return colors[type] || 'default';
  };

  const isTemplateExpired = (endDate: string) => {
    return dayjs().isAfter(dayjs(endDate).endOf('day'));
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '优惠券名称',
      dataIndex: 'name',
      width: 220,
      render: (name: string, record: CouponTemplate) => (
        <div className="flex items-center gap-2">
          <span className={isTemplateExpired(record.end_date) ? 'text-gray-400 line-through' : ''}>
            {name}
          </span>
          {isTemplateExpired(record.end_date) && (
            <Tag color="red" className="m-0">已过期</Tag>
          )}
          {(record as any).is_birthday && (
            <Tag color="purple" className="m-0">生日专属</Tag>
          )}
          {(record as any).is_new_user && (
            <Tag color="orange" className="m-0">新人专享</Tag>
          )}
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 80,
      render: (type: string) => <Tag color={getTypeTagColor(type)}>{type}</Tag>,
    },
    {
      title: '面值',
      dataIndex: 'value',
      width: 100,
      render: (value: number, record: CouponTemplate) => {
        if (record.type === '满减') return `满${record.min_amount}减${value}`;
        if (record.type === '折扣') return `${value * 10}折`;
        return `${value}元`;
      },
    },
    {
      title: '发放进度',
      width: 180,
      render: (_: any, record: CouponTemplate) => {
        const percent = Math.round((record.issued_quantity / record.total_quantity) * 100);
        return (
          <div className="flex items-center gap-2">
            <Progress
              percent={percent}
              size="small"
              strokeColor={isTemplateExpired(record.end_date) ? '#bfbfbf' : '#1677ff'}
              style={{ width: 120 }}
            />
            <span className="text-sm text-gray-500">
              {record.issued_quantity}/{record.total_quantity}
            </span>
          </div>
        );
      },
    },
    {
      title: '有效期',
      width: 220,
      render: (_: any, record: CouponTemplate) => {
        const expired = isTemplateExpired(record.end_date);
        return (
          <div className="text-sm">
            <div className={expired ? 'text-gray-400' : ''}>
              {dayjs(record.start_date).format('YYYY-MM-DD')}
            </div>
            <div className={expired ? 'text-red-500' : 'text-gray-400'}>
              ~ {dayjs(record.end_date).format('YYYY-MM-DD')}
              {expired && <span className="ml-1 text-red-500">（已过期）</span>}
            </div>
          </div>
        );
      },
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_: any, record: CouponTemplate) => {
        const expired = isTemplateExpired(record.end_date);
        return (
          <Space size="small">
            <Button
              type="link"
              size="small"
              icon={<GiftOutlined />}
              onClick={() => openIssueModal(record)}
              disabled={expired}
            >
              发放
            </Button>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
            <Popconfirm
              title="确定删除该优惠券？"
              onConfirm={() => handleDelete(record.id)}
              okText="确定"
              cancelText="取消"
              disabled={expired && record.issued_quantity > 0}
            >
              <Button 
                type="link" 
                size="small" 
                danger 
                icon={<DeleteOutlined />}
                disabled={expired && record.issued_quantity > 0}
              >
                删除
              </Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="搜索优惠券名称"
          prefix={<SearchOutlined />}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 300 }}
          allowClear
        />
        <Space>
          <Button
            icon={<GiftOutlined />}
            onClick={async () => {
              try {
                const res = await couponApi.expire();
                message.success(`已标记 ${res.count} 张过期优惠券`);
                fetchCoupons();
              } catch (e: any) {
                message.error(e?.response?.data?.message || '操作失败');
              }
            }}
          >
            立即检查过期
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增优惠券
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={coupons}
        loading={loading}
        rowClassName={(record) =>
          isTemplateExpired(record.end_date) ? 'bg-gray-50 opacity-70' : ''
        }
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条记录`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
        scroll={{ x: 1100 }}
      />

      <Modal
        title={editingCoupon ? '编辑优惠券' : '新增优惠券'}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="优惠券名称"
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder="请输入优惠券名称" />
          </Form.Item>
          <Form.Item
            name="type"
            label="优惠类型"
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select placeholder="选择优惠类型">
              <Option value="满减">满减</Option>
              <Option value="折扣">折扣</Option>
              <Option value="立减">立减</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="value"
                label="面值"
                rules={[{ required: true, message: '请输入面值' }]}
              >
                <Input type="number" placeholder="面值" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="min_amount"
                label="最低消费"
                initialValue={0}
              >
                <Input type="number" placeholder="0表示无限制" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="total_quantity"
            label="发放总量"
            rules={[{ required: true, message: '请输入发放总量' }]}
          >
            <Input type="number" min={1} placeholder="请输入发放总量" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="有效期"
            rules={[{ required: true, message: '请选择有效期' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="使用说明">
            <Input.TextArea rows={3} placeholder="请输入使用说明" />
          </Form.Item>
          <Form.Item
            name="coupon_special_type"
            label="特殊类型"
            initialValue={0}
          >
            <Radio.Group>
              <Radio value={0}>普通优惠券</Radio>
              <Radio value={1}>新人专享</Radio>
              <Radio value={2}>生日专属</Radio>
            </Radio.Group>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="发放优惠券"
        open={issueModalVisible}
        onOk={handleIssue}
        onCancel={() => setIssueModalVisible(false)}
        okText="确认发放"
        cancelText="取消"
        confirmLoading={submitting}
        width={500}
      >
        {currentCoupon && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-semibold text-blue-600">{currentCoupon.name}</div>
              <div className="text-sm text-gray-600">
                {currentCoupon.type === '满减' ? `满${currentCoupon.min_amount}减${currentCoupon.value}` :
                 currentCoupon.type === '折扣' ? `${currentCoupon.value * 10}折` :
                 `立减${currentCoupon.value}元`}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                剩余库存：{currentCoupon.total_quantity - currentCoupon.issued_quantity} 张
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-4">
                <Button
                  type={issueType === 'single' ? 'primary' : 'default'}
                  icon={<UserOutlined />}
                  onClick={() => setIssueType('single')}
                >
                  单个发放
                </Button>
                <Button
                  type={issueType === 'batch' ? 'primary' : 'default'}
                  icon={<TeamOutlined />}
                  onClick={() => setIssueType('batch')}
                  disabled={(currentCoupon as any)?.is_new_user}
                >
                  批量发放
                </Button>
                <Button
                  type={issueType === 'all' ? 'primary' : 'default'}
                  icon={<TeamOutlined />}
                  onClick={() => setIssueType('all')}
                  disabled={(currentCoupon as any)?.is_new_user}
                >
                  全员发放
                </Button>
              </div>
              {(currentCoupon as any)?.is_new_user && (
                <div className="p-3 bg-orange-50 rounded-lg text-orange-600 text-sm">
                  新人专享优惠券每位会员只能领取一次，仅支持单个发放
                </div>
              )}

              {issueType === 'single' && (
                <Select
                  placeholder="选择会员"
                  style={{ width: '100%' }}
                  onChange={(value) => setSelectedMembers([value])}
                  options={members.map((m) => ({
                    label: `${m.name} - ${m.phone}`,
                    value: m.id,
                  }))}
                />
              )}

              {issueType === 'batch' && (
                <Select
                  mode="multiple"
                  placeholder="选择多个会员"
                  style={{ width: '100%' }}
                  value={selectedMembers}
                  onChange={setSelectedMembers}
                  options={members.map((m) => ({
                    label: `${m.name} - ${m.phone}`,
                    value: m.id,
                  }))}
                />
              )}

              {issueType === 'all' && (
                <div className="p-3 bg-orange-50 rounded-lg text-orange-600 text-sm">
                  将向所有 {members.length} 位会员发放此优惠券
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HqCoupons;
