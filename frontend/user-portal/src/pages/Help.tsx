import { useMemo, useState, type ComponentType } from 'react';
import { Card } from '@shared/components/Card';
import { Button } from '@shared/components/Button';
import { PageHeader } from '@shared/components/PageHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { MarketsHeroArt } from '@shared/components/MarketsHeroArt';
import {
  ArrowRightIcon,
  BookmarkIcon,
  CardIcon,
  CoinsIcon,
  CrosshairIcon,
  HeadsetIcon,
  LockIcon,
  SearchIcon,
  UsersIcon,
} from '@shared/components/icons';
import { useBotUsername, botUrl } from '../hooks/useBotConfig';

/** Study 17: one mint icon chip per FAQ section. */
const SECTION_ICONS: Record<string, ComponentType<{ size?: number }>> = {
  'Scores & the Focus Radar': CrosshairIcon,
  Credits: CoinsIcon,
  Watchlist: BookmarkIcon,
  'Payments & verification': CardIcon,
  Referrals: UsersIcon,
  'Account & login': LockIcon,
};

/**
 * Help (study 17). Searchable static FAQ with vetted copy (score meaning,
 * data age, account, credits, payments, referrals, login) — the same
 * answers the previous Help page shipped, kept consistent with the product
 * truths (10 credits/day, 10 per run, 7 days Pro per credited referral for
 * both sides). The support link is rendered ONLY when a bot destination is
 * actually configured; otherwise it is omitted entirely. Aliased at /help.
 */

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  items: FaqItem[];
}

const FAQ: FaqSection[] = [
  {
    title: 'Scores & the Focus Radar',
    items: [
      {
        q: 'What does the score mean?',
        a: 'The score is points out of 100 summarising how strongly a pair matches the Radar\u2019s session criteria. It is an analysis ranking, not a probability or a success rate, and it is separate from the directional bias (Bullish/Bearish/Neutral), which comes from the pair\u2019s own evidence.',
      },
      {
        q: 'What is the Focus Radar?',
        a: 'The Radar scans 28 forex pairs plus Gold, Silver, Oil and Bitcoin for a trading session and sorts them into Focus, Watch and Avoid lists. Scoring uses EMA trend, RSI, ADR (average daily range) and the session opening range — it is an analysis aid, not a signal service.',
      },
      {
        q: 'Which sessions does it cover?',
        a: 'Asian, London and New York. You choose the session when you run a scan; the Session Clock shows which windows are open in your timezone.',
      },
      {
        q: 'How fresh is the data in a result?',
        a: 'Every result shows when the scan ran, and pair evidence carries the candle time it is based on. If a pair\u2019s data was stale at scan time it is flagged "Stale data" on the result — treat stale evidence with extra caution, and remember a stored result never updates itself: run a new scan for fresh data.',
      },
      {
        q: 'Why did a run fail or return nothing?',
        a: 'Runs can return an empty focus list when the market is closed or no pair meets the scoring criteria — that is the tool telling you there is nothing clean to focus on. Failed runs caused by a system error are refunded.',
      },
    ],
  },
  {
    title: 'Credits',
    items: [
      {
        q: 'How do credits work?',
        a: 'You receive 10 free credits every UTC day, starting from signup. Credits never expire, and if you are away for a few days the missed daily grants catch up automatically when you return.',
      },
      {
        q: 'What does a Focus Radar run cost?',
        a: 'One Radar run costs 10 credits — exactly one day of free grants. Credits are only spent when you explicitly confirm a run; browsing, filters and the Session Clock are free, and there is no automatic or recurring scan. If a run fails on our side, the 10 credits are refunded automatically.',
      },
      {
        q: 'Is my balance the same in Telegram and the browser?',
        a: 'Yes. One wallet is shared across the Telegram bot, the Mini App and this web portal — earn and spend anywhere, the balance follows you.',
      },
    ],
  },
  {
    title: 'Watchlist',
    items: [
      {
        q: 'What does the watchlist do?',
        a: 'Your watchlist holds the pairs you care about most. Radar runs can be scoped to your watchlist so the pairs you follow are the ones analysed.',
      },
      {
        q: 'How do I change my watchlist?',
        a: 'Open the Watchlist page, add, remove or reorder pairs — every change saves automatically. The change applies to your next Radar run in every channel — bot, Mini App and browser.',
      },
    ],
  },
  {
    title: 'Payments & verification',
    items: [
      {
        q: 'How do I pay?',
        a: 'Payments are manual: send money via bKash, Nagad or USDT (TRC20), then submit the transaction ID (and optionally a screenshot link) from Membership → Submit a payment. Keep the transaction ID exactly as shown in your payment app.',
      },
      {
        q: 'How long does verification take?',
        a: 'Every payment is checked by an admin against the transaction records — there is no instant activation. While you wait, the receipt shows as Pending verification in Payment History; it changes to Verified (or Rejected) once the review is done.',
      },
      {
        q: 'My payment was rejected — what now?',
        a: 'Double-check that the transaction ID matches your payment app, then submit again from the payment page. If it still fails, contact support through the Telegram bot with your transaction ID.',
      },
    ],
  },
  {
    title: 'Referrals',
    items: [
      {
        q: 'How do referrals work?',
        a: 'Share your referral code or link from the Referrals page. When a friend signs up with it and the referral is credited, you both earn 7 days of free Pro.',
      },
      {
        q: 'Where do I see my referrals?',
        a: 'The Referrals page lists everyone who joined with your code and whether each referral is pending or credited.',
      },
    ],
  },
  {
    title: 'Account & login',
    items: [
      {
        q: 'How do I log in?',
        a: 'Open the Telegram bot and use /app to launch the app (you are signed in automatically inside Telegram), or use /login in the bot to get a one-time code for signing in here in the browser. Codes expire after 5 minutes.',
      },
      {
        q: 'I opened the portal in a browser and I am logged out. Why?',
        a: 'Browser sessions can expire for security. Just request a fresh one-time code with /login in the Telegram bot and sign in again — your credits, watchlist and history are all tied to your account, not the session.',
      },
    ],
  },
];

function FaqAccordionItem({
  item,
  icon: Icon,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  icon?: ComponentType<{ size?: number }>;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-row)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[var(--shadow-row)]">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        {Icon && (
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-mint-wash)] text-[var(--color-accent)]"
          >
            <Icon size={20} />
          </span>
        )}
        <span className="flex-1 text-[15px] font-bold">{item.q}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>
      {isOpen && (
        <p className="border-t border-[var(--color-border-soft)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {item.a}
        </p>
      )}
    </div>
  );
}

export default function Help() {
  const [openKey, setOpenKey] = useState<string | null>('Scores & the Focus Radar-0');
  const [query, setQuery] = useState('');
  const botUsername = useBotUsername();
  const supportUrl = botUrl(botUsername);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q),
      ),
    })).filter((section) => section.items.length > 0);
  }, [query]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <section
        aria-label="TradingBeast — professional FX analysis"
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 text-white shadow-[var(--shadow-hero)]"
        style={{ background: 'var(--gradient-session-hero)' }}
      >
        <MarketsHeroArt />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(3,40,28,0.55) 0%, rgba(3,40,28,0.2) 55%, rgba(3,40,28,0) 82%)',
          }}
        />
        <div className="relative max-w-md">
          <p className="text-[12px] font-bold tracking-[0.22em] text-[var(--color-hero-text-soft)]">
            PROFESSIONAL FX ANALYSIS
          </p>
          <h2 className="mt-2 text-[28px] leading-tight font-extrabold tracking-tight">
            Trade FX with discretion and clarity
          </h2>
          <p className="mt-2 text-[15px] leading-snug text-white/90">
            Expert analysis, radar insights, and actionable trade ideas.
          </p>
        </div>
      </section>

      <PageHeader
        title="Help & Support"
        subtitle="Find answers, get guidance, or contact our support team."
      />

      <div className="flex max-w-xl items-center gap-2.5 rounded-full bg-[var(--color-mint-wash)] px-4 py-1">
        <SearchIcon size={20} className="shrink-0 text-[var(--color-accent)]" />
        <input
          type="search"
          aria-label="Search help articles"
          placeholder="Search help articles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-[44px] w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--color-text-faint)]"
        />
      </div>

      {sections.length === 0 ? (
        <Card>
          <EmptyState
            title="No answers match your search"
            message="Try different words — for example “credits”, “score” or “payment”."
          />
        </Card>
      ) : (
        sections.map((section) => (
          <section key={section.title} aria-label={section.title}>
            <h2 className="mb-2.5 text-[19px] font-extrabold tracking-tight">{section.title}</h2>
            <div className="space-y-2">
              {section.items.map((item, i) => {
                const key = `${section.title}-${i}`;
                return (
                  <FaqAccordionItem
                    key={key}
                    item={item}
                    icon={SECTION_ICONS[section.title]}
                    isOpen={openKey === key}
                    onToggle={() => setOpenKey(openKey === key ? null : key)}
                  />
                );
              })}
            </div>
          </section>
        ))
      )}

      <div className="rounded-[var(--radius-card-xl)] bg-[var(--color-mint-panel)] p-5 shadow-[var(--shadow-card-soft)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span aria-hidden="true" className="shrink-0 text-[var(--color-accent)]">
            <HeadsetIcon size={44} />
          </span>
          <div className="flex-1">
            <h2 className="text-[20px] font-extrabold tracking-tight">Need more help?</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Get in touch with our support team. Support runs through the Telegram bot — send
              your question there, and include your transaction ID if it is about a payment.
            </p>
            {supportUrl && (
              <a href={supportUrl} target="_blank" rel="noreferrer" className="mt-3.5 block">
                <Button
                  size="lg"
                  className="w-full rounded-full text-white sm:w-auto sm:min-w-[280px]"
                  style={{ background: 'var(--gradient-primary-action)' }}
                >
                  Contact Support <ArrowRightIcon size={19} />
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      <Card className="border-[var(--color-warning)]">
        <p className="font-semibold">Risk disclaimer</p>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          TradingBeast is a market analysis tool only. Nothing in the app — including Focus,
          Watch and Avoid lists — is investment advice, a trading signal, or a recommendation to
          buy or sell any instrument. Forex and CFD trading involves substantial risk of loss;
          only trade with money you can afford to lose and make your own decisions.
        </p>
      </Card>
    </div>
  );
}
