import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/AppLayout';
import { Skeleton } from '@shared/components/Skeleton';

// Routes are lazy-loaded per page to keep the entry chunk lean (Z2).
const Login = lazy(() => import('./pages/Login'));
const Welcome = lazy(() => import('./pages/Welcome'));
const Setup = lazy(() => import('./pages/Setup'));
const Home = lazy(() => import('./pages/Home'));
const Markets = lazy(() => import('./pages/Markets'));
const Plan = lazy(() => import('./pages/Plan'));
const Journal = lazy(() => import('./pages/Journal'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Tools = lazy(() => import('./pages/Tools'));
const TradeEditor = lazy(() => import('./pages/TradeEditor'));
const PairDetail = lazy(() => import('./pages/PairDetail'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const Credits = lazy(() => import('./pages/Credits'));
const Membership = lazy(() => import('./pages/Membership'));
const PaymentHistoryPage = lazy(() => import('./pages/PaymentHistory'));
const Checkout = lazy(() => import('./pages/Checkout'));
const PaymentSubmitted = lazy(() => import('./pages/PaymentSubmitted'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Settings = lazy(() => import('./pages/Settings'));
const Help = lazy(() => import('./pages/Help'));
const NotFound = lazy(() => import('./pages/NotFound'));

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
  const location = useLocation();
  if (isLoading) return <PageFallback />;
  return user ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  );
}

/**
 * Route map (handoff §3). Canonical routes live under /app; every legacy
 * alias mounts the SAME component so its intent is preserved (Membership
 * aliases select their section via initialSection) rather than blind
 * redirects. Screens whose backend contracts do not exist yet have no
 * route and navigation never links to them (Journal shipped once its
 * owner-scoped API landed).
 */
function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Onboarding wizard — full-screen, outside the app shell; the
            shell's profile gate routes known-incomplete profiles here. */}
        <Route
          path="/app/welcome"
          element={
            <PrivateRoute>
              <Welcome />
            </PrivateRoute>
          }
        />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<Navigate to="/app" replace />} />
          {/* Home (03) */}
          <Route path="/app" element={<Home />} />
          <Route path="/dashboard" element={<Home />} />
          {/* Setup (02) */}
          <Route path="/app/setup" element={<Setup />} />
          {/* Markets (04/28) + Pair Detail (05/29) */}
          <Route path="/app/markets" element={<Markets />} />
          <Route path="/focus" element={<Markets />} />
          <Route path="/app/markets/:symbol" element={<PairDetail />} />
          {/* Session Plan (09) — canonical only; no legacy alias exists */}
          <Route path="/app/plan" element={<Plan />} />
          {/* Journal (11) + Trade Editor (18) — canonical only */}
          <Route path="/app/journal" element={<Journal />} />
          <Route path="/app/journal/new" element={<TradeEditor />} />
          <Route path="/app/journal/:id/edit" element={<TradeEditor />} />
          {/* Alerts (13) — canonical only */}
          <Route path="/app/alerts" element={<Alerts />} />
          {/* Risk Tools (10) — availability is server-driven (B5) */}
          <Route path="/app/tools" element={<Tools />} />
          {/* Session Clock (06) */}
          <Route path="/app/sessions" element={<SessionsPage />} />
          {/* Watchlist (08) */}
          <Route path="/app/watchlist" element={<WatchlistPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          {/* Credits (21) */}
          <Route path="/app/credits" element={<Credits />} />
          {/* Membership (16) — route-aware initial section per alias intent */}
          <Route path="/app/membership" element={<Membership initialSection="current" />} />
          <Route path="/subscription" element={<Membership initialSection="current" />} />
          <Route path="/plans" element={<Membership initialSection="plans" />} />
          <Route path="/billing" element={<Membership initialSection="payments" />} />
          {/* Payment History (23) */}
          <Route path="/app/membership/payments" element={<PaymentHistoryPage />} />
          <Route path="/payments" element={<PaymentHistoryPage />} />
          {/* Payment Submission (24) + Submitted (25) */}
          <Route path="/app/membership/checkout" element={<Checkout />} />
          <Route path="/app/membership/payment-submitted" element={<PaymentSubmitted />} />
          <Route path="/payment/success" element={<PaymentSubmitted />} />
          {/* Referrals (26) */}
          <Route path="/app/referrals" element={<Referrals />} />
          <Route path="/referral" element={<Referrals />} />
          {/* Settings (15) */}
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/settings" element={<Settings />} />
          {/* Help (17) */}
          <Route path="/app/help" element={<Help />} />
          <Route path="/help" element={<Help />} />
        </Route>
        {/* 404 (27) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;
