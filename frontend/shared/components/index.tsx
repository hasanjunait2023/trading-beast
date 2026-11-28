// TradingBeast shared components — Z0 primitive library.
// Legacy (pre-Z0) components are re-exported from ./legacy and kept working
// for landing/admin-portal; new surfaces use the Z0 primitives below.

export * from './legacy';
import { NeonRing, GlassCard, GradientButton, StatCard } from './legacy';
export default { NeonRing, GlassCard, GradientButton, StatCard };

export * from './Button';
export * from './Card';
export * from './PageHeader';
export * from './FormField';
export * from './Tabs';
export * from './Modal';
export * from './Sheet';
export * from './Toast';
export * from './StatusPill';
export * from './CreditPill';
export * from './SessionBadge';
export * from './Bias';
export * from './PairRow';
export * from './RankTable';
export * from './ScoreEvidence';
export * from './DataFreshness';
export * from './ChartPanel';
export * from './Skeleton';
export * from './EmptyState';
export * from './ErrorState';
export * from './ErrorBoundary';
export * from './OfflineBanner';
export * from './UnavailableState';
export * from './Sidebar';
export * from './BottomNav';
export * from './AppShell';
// Reference-match layer (R0): brand, icons, flag pairs, sparklines, heroes.
export * from './Brand';
export * from './icons';
export * from './PairFlags';
export * from './Sparkline';
export * from './SessionHeroArt';
export * from './SessionHero';
export * from './RadarArt';
