import React, { useState } from 'react';
import { useTheme } from '../../theme';
import {
  AppShell,
  ArrowRightIcon,
  BiasText,
  Brand,
  Button,
  CalendarCheckIcon,
  Card,
  ChartPanel,
  CreditPill,
  CrosshairIcon,
  DataFreshness,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  PageHeader,
  PairFlags,
  PairRow,
  RankTable,
  RefreshIcon,
  ScoreEvidence,
  Select,
  SessionBadge,
  SessionHero,
  Sheet,
  Skeleton,
  Sparkline,
  StatusPill,
  Tabs,
  Textarea,
  UnavailableState,
  useToast,
  type NavItem,
  type RankRow,
} from '../../components';

const NAV: NavItem[] = [
  { id: 'buttons', label: 'Buttons', href: '#buttons', active: true },
  { id: 'forms', label: 'Forms', href: '#forms' },
  { id: 'overlays', label: 'Tabs & overlays', href: '#overlays' },
  { id: 'market', label: 'Market primitives', href: '#market' },
  { id: 'reference-home', label: 'Reference 03 Home', href: '#reference-home' },
  { id: 'states', label: 'States', href: '#states' },
  { id: 'type-motion', label: 'Type & motion', href: '#type-motion' },
];;

// Reference-03 visual-gate samples (style guide ONLY — never product data):
// London live, Top 3 = EUR/USD Focus 78, GBP/USD Watch 64, USD/JPY Watch 58.
const SAMPLE_SPARK = [1.0812, 1.0821, 1.0818, 1.083, 1.0842, 1.0839, 1.0851, 1.0864];
const SAMPLE_HOME_ROWS = [
  { pair: 'EUR/USD', base: 'EUR', quote: 'USD', status: 'focus' as const, score: 78, spark: SAMPLE_SPARK },
  { pair: 'GBP/USD', base: 'GBP', quote: 'USD', status: 'watch' as const, score: 64, spark: SAMPLE_SPARK },
  { pair: 'USD/JPY', base: 'USD', quote: 'JPY', status: 'watch' as const, score: 58, spark: SAMPLE_SPARK },
];

// Style-guide sample rows only — NOT product data.
const SAMPLE_ROWS: RankRow[] = [
  { pair: 'EUR/USD', status: 'focus', bias: 'bullish', score: 78 },
  { pair: 'GBP/USD', status: 'watch', bias: 'neutral', score: 64 },
  { pair: 'USD/JPY', status: 'watch', bias: 'bearish', score: 58 },
  { pair: 'Gold', status: 'unavailable' },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-20">
      <h2 className="mb-3 text-xl font-bold text-[var(--color-text)]">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [motionKey, setMotionKey] = useState(0);

  const now = Date.now();

  const runLoadingDemo = () => {
    setLoadingDemo(true);
    window.setTimeout(() => setLoadingDemo(false), 1600);
  };

  const validateEmail = () => {
    if (!email.includes('@')) {
      setEmailError('Enter a valid email address.');
    } else {
      setEmailError(undefined);
      toast.success('Style guide form validated.');
    }
  };

  return (
    <AppShell
      navItems={NAV}
      brand={
        <span className="text-lg font-bold text-[var(--color-text)]">
          TradingBeast
        </span>
      }
      headerRight={
        <>
          <SessionBadge name="London" state="live" />
          <CreditPill credits={20} />
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            Theme: {theme === 'light' ? 'Light' : 'Dark'}
          </Button>
        </>
      }
    >
      <PageHeader
        title="Internal style guide"
        subtitle="Sample content, not product data. Every Z0 primitive, in both themes — use the theme toggle in the top bar."
      />

      <Section id="buttons" title="Buttons">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="lg">Large</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="primary" loading={loadingDemo} onClick={runLoadingDemo}>
              {loadingDemo ? 'Working…' : 'Trigger loading'}
            </Button>
          </div>
        </Card>
      </Section>

      <Section id="forms" title="Form fields">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" error={emailError} hint="We never share your email.">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
            <FormField label="Session">
              <Select defaultValue="london">
                <option value="asian">Asian</option>
                <option value="london">London</option>
                <option value="new-york">New York</option>
              </Select>
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Notes">
                <Textarea rows={3} placeholder="Style guide sample notes field" />
              </FormField>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={validateEmail}>Validate email</Button>
          </div>
        </Card>
      </Section>

      <Section id="overlays" title="Tabs, modal, sheet, toasts">
        <Card>
          <Tabs
            ariaLabel="Style guide demo tabs"
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'details', label: 'Details' },
              { id: 'disabled', label: 'Disabled', disabled: true },
            ]}
            activeId={activeTab}
            onChange={setActiveTab}
          />
          <div
            role="tabpanel"
            id={`tabpanel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            className="pt-3 text-sm text-[var(--color-text-muted)]"
          >
            Active panel: <strong className="text-[var(--color-text)]">{activeTab}</strong>{' '}
            (style guide sample panel)
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Open bottom sheet
            </Button>
            <Button variant="secondary" onClick={() => toast.success('Saved (style guide sample).')}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Something failed (style guide sample).')}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Heads up (style guide sample).')}>
              Info toast
            </Button>
          </div>
        </Card>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Sample modal"
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </>
          }
        >
          This is a style guide sample dialog. Esc, backdrop click and the close
          button all dismiss it; focus returns to the trigger.
        </Modal>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Sample bottom sheet"
          footer={<Button onClick={() => setSheetOpen(false)}>Done</Button>}
        >
          Bottom sheet variant for small screens — short secondary choices live
          here, with the primary action kept above the keyboard area.
        </Sheet>
      </Section>

      <Section id="market" title="Market primitives (style guide sample rows)">
        <div className="flex flex-col gap-4">
          <Card>
            <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">
              Status pills — status is always a text label, never color alone
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="focus" />
              <StatusPill status="watch" />
              <StatusPill status="avoid" />
              <StatusPill status="unavailable" />
            </div>
            <p className="mt-4 mb-2 text-sm font-semibold text-[var(--color-text)]">
              Bias — separate from rank
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <BiasText bias="bullish" />
              <BiasText bias="bearish" />
              <BiasText bias="neutral" />
            </div>
            <p className="mt-4 mb-2 text-sm font-semibold text-[var(--color-text)]">
              Session badges
            </p>
            <div className="flex flex-wrap gap-2">
              <SessionBadge name="London" state="live" detail="08:00 – 16:00 GMT" />
              <SessionBadge name="New York" state="upcoming" detail="16:00 – 21:00 GMT" />
              <SessionBadge name="Asian" state="closed" />
            </div>
            <p className="mt-4 mb-2 text-sm font-semibold text-[var(--color-text)]">
              Data freshness — fresh vs stale
            </p>
            <div className="flex flex-wrap gap-4">
              <DataFreshness timestamp={now - 3 * 60_000} now={now} />
              <DataFreshness timestamp={now - 2 * 3_600_000} now={now} />
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            {SAMPLE_ROWS.slice(0, 3).map((row) => (
              <PairRow
                key={row.pair}
                pair={row.pair}
                status={row.status}
                bias={row.bias}
                score={row.score}
                freshness={<DataFreshness timestamp={now - 3 * 60_000} now={now} />}
                onClick={() => setSelectedRow(row.pair)}
              />
            ))}
          </div>

          <RankTable
            rows={SAMPLE_ROWS}
            caption="Style guide sample radar table"
            onRowSelect={(row) => setSelectedRow(row.pair)}
          />
          {selectedRow && (
            <p className="text-sm text-[var(--color-text-muted)]">
              Last selected row: <strong className="text-[var(--color-text)]">{selectedRow}</strong>{' '}
              (style guide sample interaction)
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ScoreEvidence
              score={78}
              timestamp={now - 3 * 60_000}
              evidence={[
                { label: 'D4 trend alignment', value: 'Aligned' },
                { label: 'RSI (15m)', value: '58' },
                { label: 'Opening range', value: 'Confirmed' },
              ]}
            />
            <ChartPanel
              state="unavailable"
              unavailableReason="Candle data is not available yet — scan evidence still applies."
              externalLink={{ href: 'https://www.tradingview.com/', label: 'Open in TradingView' }}
            />
          </div>
          <ChartPanel state="no-data" title="Chart — no data state" />
        </div>
      </Section>

      <Section id="reference-home" title="Reference 03 — Mini App Home composition (sample data)">
        <div className="mx-auto max-w-[420px] space-y-5 rounded-[var(--radius-card-xl)] border border-[var(--color-border-soft)] bg-[var(--color-canvas-top)] p-4">
          <div className="flex items-center justify-between gap-3">
            <Brand size={36} />
            <CreditPill credits={20} />
          </div>
          <div>
            <p className="text-xl font-semibold text-[var(--color-accent)]">Good Morning,</p>
            <p className="mt-0.5 text-[38px] leading-[1.05] font-extrabold tracking-tight text-[var(--color-text)]">
              Session Focus Radar
            </p>
            <p className="mt-2 text-[15px] text-[var(--color-text-muted)]">
              Professional discretionary FX analysis, session by session.
            </p>
          </div>
          <SessionHero
            sessionName="London"
            state="live"
            rangeLabel="08:00 – 16:00 GMT"
            nextLabel="New York 16:00 – 21:00 GMT"
          />
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 py-3.5">
            <RefreshIcon size={26} className="shrink-0 text-[var(--color-accent)]" />
            <span className="text-[15px] font-bold text-[var(--color-text)]">Analysis Freshness</span>
            <span aria-hidden="true" className="h-8 w-px bg-[var(--color-border)]" />
            <DataFreshness timestamp={now - 3 * 60_000} now={now} className="text-[13px]" />
          </div>
          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <p className="text-2xl font-extrabold tracking-tight text-[var(--color-text)]">Top 3 Shortlist</p>
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[15px] font-semibold text-[var(--color-accent)]">
                See Details <ArrowRightIcon size={18} />
              </span>
            </div>
            <div className="space-y-2.5">
              {SAMPLE_HOME_ROWS.map((row) => (
                <PairRow
                  key={row.pair}
                  variant="home"
                  pair={row.pair}
                  status={row.status}
                  score={row.score}
                  leading={<PairFlags pair={row.pair} base={row.base} quote={row.quote} kind="fx" />}
                  sparkline={<Sparkline values={row.spark} label={`${row.pair} sample series`} />}
                  onClick={() => setSelectedRow(row.pair)}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <span
              className="flex min-h-[64px] flex-[1.2] items-center justify-center gap-2.5 rounded-[var(--radius-lg)] px-4 text-lg font-bold text-white shadow-[var(--shadow-hero)]"
              style={{ background: 'var(--gradient-primary-action)' }}
            >
              <CrosshairIcon size={26} /> Open Radar <ArrowRightIcon size={22} />
            </span>
            <span className="flex min-h-[64px] flex-1 items-center justify-center gap-2.5 rounded-[var(--radius-lg)] bg-[var(--color-mint-wash)] px-4 text-lg font-bold text-[var(--color-text)]">
              <CalendarCheckIcon size={26} className="text-[var(--color-accent)]" /> Continue Plan
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PairFlags pair="Gold" kind="asset" name="Gold" size={38} />
            <PairFlags pair="Bitcoin" kind="asset" name="Bitcoin" size={38} />
            <PairFlags pair="AUD/USD" base="AUD" quote="USD" kind="fx" size={38} />
            <PairFlags pair="USD/CAD" base="USD" quote="CAD" kind="fx" size={38} />
            <PairFlags pair="CHF/JPY" base="CHF" quote="JPY" kind="fx" size={38} />
            <PairFlags pair="NZD/USD" base="NZD" quote="USD" kind="fx" size={38} />
          </div>
        </div>
      </Section>

      <Section id="states" title="Loading, empty, error, unavailable states">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">Skeleton</p>
            <Skeleton variant="text" lines={3} />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton variant="circle" width={40} height={40} />
              <Skeleton width="55%" height={16} />
            </div>
            <Skeleton height={72} className="mt-3" />
          </Card>
          <Card padded={false}>
            <EmptyState
              title="No scan yet"
              message="Run a Radar scan to see ranked pairs for this session."
              action={<Button>Open Radar</Button>}
            />
          </Card>
          <Card padded={false}>
            <ErrorState
              message="The style guide sample request failed. This is a demo of the error state."
              onRetry={() => toast.info('Retry pressed (style guide sample).')}
            />
          </Card>
          <Card padded={false}>
            <UnavailableState
              reason="Currency strength needs its data contract before it can be shown."
            />
          </Card>
        </div>
      </Section>

      <Section id="type-motion" title="Typography & motion (self-hosted fonts, shared utilities)">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-semibold text-[var(--color-text)]">
              Type — Inter (UI + display)
            </p>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              One family, self-hosted from <code>shared/fonts/</code> via{' '}
              <code>shared/fonts.css</code> (font-display: swap, ~24 KB per weight, no
              runtime CDN). Headings take <code>--font-display</code> automatically
              (Inter with -0.015em tracking); body text uses <code>--font-sans</code>.
              Use <code>.tb-font-display</code> for display type on non-heading
              elements and <code>.tnum</code> for tabular numerals (scores, prices,
              credits). Rationale: docs/brand/TYPE-AND-SCALE.md.
            </p>
            <div className="mt-4 space-y-2">
              <p className="tb-font-display text-3xl font-bold text-[var(--color-text)]">
                Session Focus Radar
              </p>
              <p className="tb-font-display text-xl font-semibold text-[var(--color-text)]">
                London session is live
              </p>
              <p className="text-sm text-[var(--color-text)]">
                Inter carries body copy, labels and controls across every app.
              </p>
              <p className="tnum text-sm text-[var(--color-text-muted)]">
                EUR/USD 1.0864 · Score 78/100 · Balance 1,240 credits
              </p>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Motion utilities (theme.css)
              </p>
              <Button onClick={() => setMotionKey((k) => k + 1)}>Replay</Button>
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              Transform + opacity only; every utility is neutralised under
              prefers-reduced-motion. <code>.tb-enter</code> screen entrance,{' '}
              <code>.tb-stagger</code> card sequence, <code>.tb-press</code> button press,{' '}
              <code>.tb-lift</code> hover lift, <code>.tb-sheet-in</code> /{' '}
              <code>.tb-modal-in</code> / <code>.tb-backdrop-in</code> overlay entrances,{' '}
              <code>.tb-skeleton</code> shimmer loaders, <code>.tb-success-check</code>{' '}
              drawn confirmation.
            </p>
            <div key={motionKey} className="mt-4 space-y-4">
              <div className="tb-stagger grid grid-cols-3 gap-3">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 text-center text-sm font-semibold text-[var(--color-text)]"
                  >
                    Card {n}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="tb-press rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                  style={{ background: 'var(--gradient-primary-action)' }}
                >
                  Press me
                </button>
                <svg
                  className="tb-success-check"
                  width="52"
                  height="52"
                  viewBox="0 0 52 52"
                  fill="none"
                  role="img"
                  aria-label="Success check animation demo"
                >
                  <circle
                    className="tb-check-circle"
                    cx="26"
                    cy="26"
                    r="24"
                    pathLength={1}
                    stroke="var(--color-success)"
                    strokeWidth="2.5"
                  />
                  <path
                    className="tb-check-mark"
                    d="M15 27l7.5 7.5L37 19"
                    pathLength={1}
                    stroke="var(--color-success)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs text-[var(--color-text-muted)]">
                  Success check (pathLength=1 contract)
                </span>
              </div>
            </div>
          </Card>
        </div>
      </Section>

      <footer className="mt-12 border-t border-[var(--color-border)] pt-4 pb-2 text-xs text-[var(--color-text-muted)]">
        Internal style guide — sample content, not product data. TradingBeast Z0
        foundation.
      </footer>
    </AppShell>
  );
}
