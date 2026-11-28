import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { Skeleton } from '@shared/components/Skeleton';

// Pages are lazy-loaded per route to keep the entry chunk lean (Z3).
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Payments = lazy(() => import('./pages/Payments'));
const Metrics = lazy(() => import('./pages/Metrics'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Telegram = lazy(() => import('./pages/Telegram'));
const Finance = lazy(() => import('./pages/Finance'));
const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const Credits = lazy(() => import('./pages/Credits'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="space-y-3" role="status" aria-label="Loading page">
      <Skeleton height={40} />
      <Skeleton height={160} />
      <Skeleton height={120} />
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageFallback />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<Users />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/metrics" element={<Metrics />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/telegram" element={<Telegram />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
