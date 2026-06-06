import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  HistoryOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

const { Header, Sider, Content } = Layout;

interface StoreLayoutProps {
  children: React.ReactNode;
}

const StoreLayout = ({ children }: StoreLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const menuItems = [
    {
      key: '/store',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/store'),
    },
    {
      key: '/store/search',
      icon: <SearchOutlined />,
      label: '会员搜索',
      onClick: () => navigate('/store/search'),
    },
    {
      key: '/store/order',
      icon: <ShoppingCartOutlined />,
      label: '核销订单',
      onClick: () => navigate('/store/order'),
    },
    {
      key: '/store/transactions',
      icon: <HistoryOutlined />,
      label: '消费记录',
      onClick: () => navigate('/store/transactions'),
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
          <h1 className="text-lg font-bold text-green-600">🏪 门店端</h1>
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
            {menuItems.find((m) => m.key === location.pathname)?.label || '门店管理系统'}
          </h2>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
              <Avatar size="small" icon={<UserOutlined />} />
              <span className="text-gray-600">{user?.username || '操作员'}</span>
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

export default StoreLayout;
