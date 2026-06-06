import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Tabs, Select, message } from 'antd';
import { UserOutlined, LockOutlined, ShopOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { UserRole, Store } from '../types';
import { storeApi } from '../services/api';

const Login = () => {
  const [role, setRole] = useState<UserRole>('hq');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await storeApi.getList();
        setStores(data);
      } catch (e) {
        console.error('获取门店列表失败', e);
      }
    };
    fetchStores();
  }, []);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await login(role, values.username, values.password, values.storeId);
      message.success('登录成功');
      if (role === 'hq') {
        navigate('/hq');
      } else {
        navigate('/store');
      }
    } catch (e: any) {
      console.error('登录失败', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">💊 药店会员管理系统</h1>
          <p className="text-gray-500">Pharmacy Member Management System</p>
        </div>
        
        <Card className="shadow-lg">
          <Tabs
            activeKey={role}
            onChange={(key) => setRole(key as UserRole)}
            centered
            items={[
              {
                key: 'hq',
                label: (
                  <span className="flex items-center gap-2">
                    <ApartmentOutlined /> 总部管理
                  </span>
                ),
              },
              {
                key: 'store',
                label: (
                  <span className="flex items-center gap-2">
                    <ShopOutlined /> 门店端
                  </span>
                ),
              },
            ]}
          />

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="用户名"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="密码"
              />
            </Form.Item>

            {role === 'store' && (
              <Form.Item
                name="storeId"
                rules={[{ required: true, message: '请选择门店' }]}
              >
                <Select
                  placeholder="选择门店"
                  options={stores.map((s) => ({
                    label: s.name,
                    value: s.id,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="w-full h-12 text-base"
                loading={loading}
              >
                登 录
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center text-sm text-gray-400">
            <p>总部账号：admin / admin123</p>
            <p>门店账号：store1/store2/store3 / store123</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;
