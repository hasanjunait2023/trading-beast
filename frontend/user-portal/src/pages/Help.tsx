import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Coins,
  Radar,
  List,
  CreditCard,
  Gift,
  KeyRound,
  Send,
  AlertTriangle
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  icon: typeof Coins;
  items: FaqItem[];
}

const FAQ: FaqSection[] = [
  {
    title: 'Credits',
    icon: Coins,
    items: [
      {
        q: 'How do credits work?',
        a: 'You receive 10 free credits every UTC day, starting from signup. Credits never expire, and if you are away for a few days the missed daily grants catch up automatically when you return.'
      },
      {
        q: 'What does a Focus Radar run cost?',
        a: 'One Radar run costs 10 credits — exactly one day of free grants. Credits are only spent when you explicitly trigger a run; there is no automatic or recurring scan. If a run fails on our side, the 10 credits are refunded automatically.'
      },
      {
        q: 'Is my balance the same in Telegram and the browser?',
        a: 'Yes. One wallet is shared across the Telegram bot, the Mini App and this web portal — earn and spend anywhere, the balance follows you.'
      }
    ]
  },
  {
    title: 'Sessions & Focus Radar',
    icon: Radar,
    items: [
      {
        q: 'What is the Focus Radar?',
        a: 'The Radar scans 28 forex pairs plus Gold, Silver, Oil and Bitcoin for the current trading session and sorts them into Focus, Watch and Avoid lists. Scoring uses EMA trend, RSI, ADR (average daily range) and the session opening range — it is an analysis aid, not a signal service.'
      },
      {
        q: 'Which sessions does it cover?',
        a: 'Asian, London and New York. The Radar automatically works with the session that is active (in UTC) when you run it, so the focus list always matches the market you are about to trade.'
      },
      {
        q: 'Why did a run fail or return nothing?',
        a: 'Runs can return an empty focus list when the market is closed or no pair meets the scoring criteria — that is the tool telling you there is nothing clean to focus on. Failed runs caused by a system error are refunded.'
      }
    ]
  },
  {
    title: 'Watchlist',
    icon: List,
    items: [
      {
        q: 'What does the watchlist do?',
        a: 'Your watchlist holds the pairs you care about most. Radar runs take your watchlist into account so the pairs you follow are always part of the analysis scope.'
      },
      {
        q: 'How do I change my watchlist?',
        a: 'Open the Watchlist page, add or remove pairs, and save. The change applies to your next Radar run in every channel — bot, Mini App and browser.'
      }
    ]
  },
  {
    title: 'Payments & verification',
    icon: CreditCard,
    items: [
      {
        q: 'How do I pay?',
        a: 'Payments are manual: send money via bKash, Nagad or USDT (TRC20), then submit the transaction ID (and a screenshot for bKash/Nagad) on the Payments page. Keep the transaction ID exactly as shown in your payment app.'
      },
      {
        q: 'How long does verification take?',
        a: 'Every payment is checked by an admin against the transaction records — there is no instant activation. While you wait, the receipt shows as Pending in Billing; it changes to Verified (or Rejected) once the review is done.'
      },
      {
        q: 'My payment was rejected — what now?',
        a: 'Double-check that the transaction ID matches your payment app and that the screenshot is readable, then submit again from the Payments page. If it still fails, contact support through the Telegram bot with your transaction ID.'
      }
    ]
  },
  {
    title: 'Referrals',
    icon: Gift,
    items: [
      {
        q: 'How do referrals work?',
        a: 'Share your referral code or link from the Referral page. When a friend signs up with it, you both earn free Pro days for every successful referral.'
      },
      {
        q: 'Where do I see my referrals?',
        a: 'The Referral page lists everyone who joined with your code and whether each referral is pending or credited.'
      }
    ]
  },
  {
    title: 'Login via Telegram',
    icon: KeyRound,
    items: [
      {
        q: 'How do I log in?',
        a: 'Open the Telegram bot and use /app to launch the app (you are signed in automatically inside Telegram), or use /login in the bot to get a one-time code for signing in here in the browser.'
      },
      {
        q: 'I opened the portal in a browser and I am logged out. Why?',
        a: 'Browser sessions can expire for security. Just request a fresh one-time code with /login in the Telegram bot and sign in again — your credits, watchlist and history are all tied to your account, not the session.'
      }
    ]
  }
];

function FaqAccordionItem({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-[var(--color-bg)] hover:bg-[var(--color-surface-elevated)] transition-colors"
      >
        <span className="font-medium text-sm">{item.q}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-[var(--color-text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            <p className="px-4 py-3 text-sm text-[var(--color-text-muted)] border-t border-[var(--color-border)]">
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const [openKey, setOpenKey] = useState<string | null>('Credits-0');
  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined;
  const botUrl = botUsername && botUsername !== 'your_bot' ? `https://t.me/${botUsername}` : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Help & FAQ</h1>
        <p className="text-[var(--color-text-muted)]">Answers about credits, the Radar, payments and your account</p>
      </div>

      {/* FAQ sections */}
      {FAQ.map((section) => (
        <section key={section.title} className="card">
          <h2 className="font-medium mb-4 flex items-center gap-2">
            <section.icon className="w-5 h-5 text-[var(--color-accent)]" />
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`;
              return (
                <FaqAccordionItem
                  key={key}
                  item={item}
                  isOpen={openKey === key}
                  onToggle={() => setOpenKey(openKey === key ? null : key)}
                />
              );
            })}
          </div>
        </section>
      ))}

      {/* Support contact */}
      <div className="card-elevated">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-accent)]/15 flex items-center justify-center flex-shrink-0">
            <Send className="w-6 h-6 text-[var(--color-accent)]" />
          </div>
          <div className="flex-1">
            <h2 className="font-medium">Still need help?</h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Support runs through the Telegram bot. Send your question there — and include your transaction
              ID if it is about a payment.
            </p>
          </div>
          {botUrl ? (
            <a href={botUrl} target="_blank" rel="noreferrer" className="btn btn-primary whitespace-nowrap">
              <Send className="w-4 h-4" />
              Open the bot
            </a>
          ) : (
            <Link to="/dashboard" className="btn btn-primary whitespace-nowrap">
              <Send className="w-4 h-4" />
              Open via the app menu
            </Link>
          )}
        </div>
      </div>

      {/* Risk disclaimer */}
      <div className="card border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Risk disclaimer</p>
            <p className="text-[var(--color-text-muted)]">
              TradingBeast is a market analysis tool only. Nothing in the app — including Focus, Watch and
              Avoid lists — is investment advice, a trading signal, or a recommendation to buy or sell any
              instrument. Forex and CFD trading involves substantial risk of loss; only trade with money you
              can afford to lose and make your own decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
