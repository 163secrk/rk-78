import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import HqLayout from './components/HqLayout';
import StoreLayout from './components/StoreLayout';
import HqDashboard from './pages/hq/Dashboard';
import HqMembers from './pages/hq/Members';
import HqMemberDetail from './pages/hq/MemberDetail';
import HqCoupons from './pages/hq/Coupons';
import HqStoreStats from './pages/hq/StoreStats';
import HqOperationLogs from './pages/hq/OperationLogs';
import HqReports from './pages/hq/Reports';
import StoreDashboard from './pages/store/Dashboard';
import StoreSearch from './pages/store/Search';
import StoreMemberDetail from './pages/store/MemberDetail';
import StoreTransactions from './pages/store/Transactions';
import StoreOrder from './pages/store/Order';

function HqRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!user || !token || user.role !== 'hq') {
    return <Navigate to="/login" replace />;
  }
  return <HqLayout>{children}</HqLayout>;
}

function StoreRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore();
  if (!user || !token || user.role !== 'store') {
    return <Navigate to="/login" replace />;
  }
  return <StoreLayout>{children}</StoreLayout>;
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#1677ff' } }}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/hq"
            element={
              <HqRoute>
                <HqDashboard />
              </HqRoute>
            }
          />
          <Route
            path="/hq/members"
            element={
              <HqRoute>
                <HqMembers />
              </HqRoute>
            }
          />
          <Route
            path="/hq/members/:id"
            element={
              <HqRoute>
                <HqMemberDetail />
              </HqRoute>
            }
          />
          <Route
            path="/hq/coupons"
            element={
              <HqRoute>
                <HqCoupons />
              </HqRoute>
            }
          />
          <Route
            path="/hq/stats"
            element={
              <HqRoute>
                <HqStoreStats />
              </HqRoute>
            }
          />
          <Route
            path="/hq/logs"
            element={
              <HqRoute>
                <HqOperationLogs />
              </HqRoute>
            }
          />
          <Route
            path="/hq/reports"
            element={
              <HqRoute>
                <HqReports />
              </HqRoute>
            }
          />

          <Route
            path="/store"
            element={
              <StoreRoute>
                <StoreDashboard />
              </StoreRoute>
            }
          />
          <Route
            path="/store/search"
            element={
              <StoreRoute>
                <StoreSearch />
              </StoreRoute>
            }
          />
          <Route
            path="/store/members/:id"
            element={
              <StoreRoute>
                <StoreMemberDetail />
              </StoreRoute>
            }
          />
          <Route
            path="/store/transactions"
            element={
              <StoreRoute>
                <StoreTransactions />
              </StoreRoute>
            }
          />
          <Route
            path="/store/order"
            element={
              <StoreRoute>
                <StoreOrder />
              </StoreRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
