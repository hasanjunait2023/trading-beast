import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Reveal from './Reveal';

const faqs = [
  {
    q: 'How do credits work?',
    a: 'You receive 10 free credits every UTC day, and credits never expire — if you skip a few days, the grants catch up and stack in your wallet. One Radar run costs 10 credits, charged only when you confirm a run; browsing, the session clock and your watchlist are always free. It is one wallet shared across the Telegram bot, the Mini App and the browser portal. If an analysis fails, the run is refunded.',
  },
  {
    q: 'What does a Radar score actually mean?',
    a: 'Each pair gets a score in points out of 100 for the session, built from indicator evidence — EMA alignment, RSI, ADR usage and the opening range — plus a separate Bullish, Bearish or Neutral bias and a Focus, Watch or Avoid ranking. A score is a preparation aid, not a probability: 80 points does not mean an 80% chance of anything, and TradingBeast never presents scores as success rates.',
  },
  {
    q: 'What are sessions, and why does TradingBeast organise by them?',
    a: 'The forex market moves in three main sessions — Asian, London and New York — and different pairs come alive in different sessions. TradingBeast scores the pair list for the session you choose and ranks it into Focus, Watch and Avoid lists, so you start each session knowing where to look. The built-in session clock shows which session is active now and when the next one opens, in your timezone.',
  },
  {
    q: 'How do I log in? Do I need a password?',
    a: 'No password at all. Open the TradingBeast bot or Mini App in Telegram and you are signed in with your Telegram account. If you prefer the browser portal, ask the bot for a login code (the /login command) and enter the one-time code there — it is the same account and the same credit wallet.',
  },
  {
    q: 'How do referrals work?',
    a: 'Every account has a personal referral link. When a new trader joins through your link, you both receive 7 days of Pro free — the reward goes to the referrer and the referred trader alike.',
  },
  {
    q: 'Can I buy Pro or Elite today?',
    a: 'Not yet. Pro and Elite are planned tiers: the plan is +300 credits per verified monthly renewal for Pro and +900 for Elite, on top of the daily free grant, but they are not activated and planned amounts may change before launch. The Free tier is fully usable today. When paid digital purchases arrive inside Telegram, they will use Telegram Stars, as Telegram requires.',
  },
  {
    q: 'Is TradingBeast financial advice?',
    a: 'No. TradingBeast is a market analysis and information tool only — it computes and ranks indicator-based scores to help you prepare. It does not tell you what to buy or sell, nothing here is financial or investment advice, and no outcome is guaranteed. Trading involves substantial risk of loss, and every trading decision — and its outcome — is yours.',
  },
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
  id,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
  id: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-[var(--radius-lg)] border"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          className="flex min-h-[56px] w-full items-center justify-between gap-4 px-6 py-4 text-left"
        >
          <span className="font-semibold">{q}</span>
          <ChevronDown
            className="h-5 w-5 flex-shrink-0 transition-transform duration-200"
            style={{
              color: 'var(--color-accent)',
              transform: open ? 'rotate(180deg)' : undefined,
            }}
            aria-hidden="true"
          />
        </button>
      </h3>
      {open && (
        <div id={`${id}-panel`} role="region" aria-labelledby={`${id}-button`}>
          <p
            className="px-6 pb-6 text-sm leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="py-16 sm:py-20" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            FAQ
          </p>
          <h2
            id="faq-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Questions, answered.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            Credits, scores, sessions, login and referrals — the things traders ask us most.
          </p>
        </Reveal>

        <Reveal>
          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((item, i) => (
              <FaqItem
                key={item.q}
                id={`faq-${i}`}
                q={item.q}
                a={item.a}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
