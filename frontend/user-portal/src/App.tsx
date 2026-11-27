import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Focus from './pages/Focus';
import Watchlist from './pages/Watchlist';
import Subscription from './pages/Subscription';
import Referral from './pages/Referral';
import Payments from './pages/Payments';
import PaymentSuccess from './pages/PaymentSuccess';
import Plans from './pages/Plans';
import Billing from './pages/Billing';
import Help from './pages/Help';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/referral" element={<Referral />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;
