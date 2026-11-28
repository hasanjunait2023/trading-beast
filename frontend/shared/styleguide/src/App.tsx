import React, { useState } from 'react';
import { useTheme } from '../../theme';
import {
  AppShell,
  BiasText,
  Button,
  Card,
  ChartPanel,
  CreditPill,
  DataFreshness,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Modal,
  PageHeader,
  PairRow,
  RankTable,
  ScoreEvidence,
  Select,
  SessionBadge,
  Sheet,
  Skeleton,
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
  { id: 'states', label: 'States', href: '#states' },
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

      <footer className="mt-12 border-t border-[var(--color-border)] pt-4 pb-2 text-xs text-[var(--color-text-muted)]">
        Internal style guide — sample content, not product data. TradingBeast Z0
        foundation.
      </footer>
    </AppShell>
  );
}
