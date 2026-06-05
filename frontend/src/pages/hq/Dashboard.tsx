import { Card, Statistic, Row, Col, Progress, Modal, Form, Select, Input, message } from 'antd';
import { TeamOutlined, GiftOutlined, DollarOutlined, RiseOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberApi, couponApi, transactionApi } from '../../services/api';

const { Option } = Select;

const HqDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalCoupons: 0,
    issuedCoupons: 0,
    totalTransactions: 0,
  });
  const [levelDistribution, setLevelDistribution] = useState<{ level: string; count: number; percentage: number }[]>([]);
  const [memberModalVisible, setMemberModalVisible] = useState(false);
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [memberForm] = Form.useForm();
  const [couponForm] = Form.useForm();
  const [issueForm] = Form.useForm();
  const [couponList, setCouponList] = useState<{ id: number; name: string }[]>([]);
  const [memberList, setMemberList] = useState<{ id: number; name: string; phone: string }[]>([]);

  useEffect(() => {
    fetchStats();
    fetchLevelDistribution();
  }, []);

  const fetchStats = async () => {
    try {
      const [membersRes, couponsRes, transactionsRes] = await Promise.all([
        memberApi.getList({ pageSize: 1 }),
        couponApi.getList({ pageSize: 100 }),
        transactionApi.getList({ pageSize: 1 }),
      ]);
      setStats({
        totalMembers: membersRes.total,
        totalCoupons: couponsRes.total,
        issuedCoupons: couponsRes.list.reduce((sum, c) => sum + c.issued_quantity, 0),
        totalTransactions: transactionsRes.total,
      });
      setCouponList(couponsRes.list.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLevelDistribution = async () => {
    try {
      const res = await memberApi.getLevelDistribution();
      setLevelDistribution(res);
    } catch (e) {
      console.error(e);
    }
  };

  const cardStyle = {
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  };

  const colorMap: Record<string, string> = {
    '金卡会员': '#faad14',
    '银卡会员': '#bfbfbf',
    '普通会员': '#1677ff',
  };

  const handleAddMember = () => {
    memberForm.resetFields();
    setMemberModalVisible(true);
  };

  const handleCreateCoupon = () => {
    navigate('/hq/coupons');
  };

  const handleBatchIssue = async () => {
    try {
      const membersRes = await memberApi.getList({ pageSize: 1000 });
      setMemberList(membersRes.list.map((m: any) => ({ id: m.id, name: m.name, phone: m.phone })));
      issueForm.resetFields();
      setIssueModalVisible(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleViewReport = () => {
    message.info('报表功能开发中');
  };

  const handleMemberSubmit = async () => {
    try {
      const values = await memberForm.validateFields();
      await memberApi.create(values);
      message.success('创建成功');
      setMemberModalVisible(false);
      fetchStats();
      fetchLevelDistribution();
    } catch (e) {
      console.error(e);
    }
  };

  const handleIssueSubmit = async () => {
    try {
      const values = await issueForm.validateFields();
      await couponApi.issue(values.coupon_id, { member_ids: values.member_ids });
      message.success('发放成功');
      setIssueModalVisible(false);
      fetchStats();
    } catch (e) {
      console.error(e);
    }
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
              {levelDistribution.map((item) => (
                <div key={item.level}>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">{item.level}</span>
                    <span className="font-medium">{item.percentage}% ({item.count}人)</span>
                  </div>
                  <Progress percent={item.percentage} strokeColor={colorMap[item.level]} showInfo={false} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="快捷操作" style={cardStyle}>
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 bg-blue-50 rounded-lg text-center cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={handleAddMember}
              >
                <TeamOutlined className="text-2xl text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">新增会员</p>
              </div>
              <div
                className="p-4 bg-green-50 rounded-lg text-center cursor-pointer hover:bg-green-100 transition-colors"
                onClick={handleCreateCoupon}
              >
                <GiftOutlined className="text-2xl text-green-500 mb-2" />
                <p className="text-sm text-gray-600">创建优惠券</p>
              </div>
              <div
                className="p-4 bg-orange-50 rounded-lg text-center cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={handleBatchIssue}
              >
                <RiseOutlined className="text-2xl text-orange-500 mb-2" />
                <p className="text-sm text-gray-600">批量发券</p>
              </div>
              <div
                className="p-4 bg-purple-50 rounded-lg text-center cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={handleViewReport}
              >
                <DollarOutlined className="text-2xl text-purple-500 mb-2" />
                <p className="text-sm text-gray-600">查看报表</p>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Modal
        title="新增会员"
        open={memberModalVisible}
        onOk={handleMemberSubmit}
        onCancel={() => setMemberModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={memberForm} layout="vertical">
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            name="email"
            label="邮箱"
            rules={[{ type: 'email', message: '请输入正确的邮箱格式' }]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="level"
            label="会员等级"
            initialValue="普通会员"
          >
            <Select>
              <Option value="普通会员">普通会员</Option>
              <Option value="银卡会员">银卡会员</Option>
              <Option value="金卡会员">金卡会员</Option>
            </Select>
          </Form.Item>
          <Form.Item name="points" label="初始积分" initialValue={0}>
            <Input type="number" min={0} placeholder="请输入积分" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量发券"
        open={issueModalVisible}
        onOk={handleIssueSubmit}
        onCancel={() => setIssueModalVisible(false)}
        okText="确定"
        cancelText="取消"
        width={500}
      >
        <Form form={issueForm} layout="vertical">
          <Form.Item
            name="coupon_id"
            label="选择优惠券"
            rules={[{ required: true, message: '请选择优惠券' }]}
          >
            <Select placeholder="请选择优惠券">
              {couponList.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="member_ids"
            label="选择会员"
            rules={[{ required: true, message: '请选择会员' }]}
          >
            <Select mode="multiple" placeholder="请选择会员" style={{ width: '100%' }}>
              {memberList.map((m) => (
                <Option key={m.id} value={m.id}>{m.name} - {m.phone}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HqDashboard;
