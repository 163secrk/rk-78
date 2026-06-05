import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  GiftOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
const { Header, Sider, Content } = Layout;

interface HqLayoutProps {
  children: React.ReactNode;
}

const HqLayout = ({ children }: HqLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/hq',
      icon: <DashboardOutlined />,
      label: '数据概览',
      onClick: () => navigate('/hq'),
    },
    {
      key: '/hq/members',
      icon: <TeamOutlined />,
      label: '会员管理',
      onClick: () => navigate('/hq/members'),
    },
    {
      key: '/hq/coupons',
      icon: <GiftOutlined />,
      label: '优惠券管理',
      onClick: () => navigate('/hq/coupons'),
    },
  ];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout className="min-h-screen">
      <Sider width={220} className="bg-white shadow-md">
        <div className="h-16 flex items-center justify-center border-b">
          <h1 className="text-lg font-bold text-blue-600">💊 总部管理</h1>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          className="border-none pt-4"
        />
      </Sider>
      <Layout>
        <Header className="bg-white px-6 flex justify-between items-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-700">
            {menuItems.find((m) => m.key === location.pathname)?.label || '药店会员管理系统'}
          </h2>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="text-gray-600">{user?.username || '管理员'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content className="p-6 bg-gray-50">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default HqLayout;
