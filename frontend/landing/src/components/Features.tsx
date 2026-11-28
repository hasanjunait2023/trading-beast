import { Radar, ListFilter, Star, Coins, Users, LayoutGrid } from 'lucide-react';
import Reveal from './Reveal';

const features = [
  {
    icon: Radar,
    title: 'Session Focus Radar',
    desc: 'Run a scan for a session and get every pair scored in points out of 100, with a Bullish, Bearish or Neutral bias — ranked, not cherry-picked.',
  },
  {
    icon: ListFilter,
    title: 'Focus / Watch / Avoid',
    desc: 'Results are sorted into three lists: Focus (dark teal), Watch (ochre) and Avoid (burgundy). Rank and bias are always shown separately.',
  },
  {
    icon: Star,
    title: 'Your watchlist',
    desc: 'Keep the pairs you care about in one list, saved to your account and available in Telegram and the browser.',
  },
  {
    icon: Coins,
    title: 'One credits wallet',
    desc: '10 free credits every UTC day, and credits never expire. The same wallet works in the Telegram bot, the Mini App and the web portal.',
  },
  {
    icon: Users,
    title: 'Referrals that pay both sides',
    desc: 'Share your referral link: when a new trader joins through it, you both receive 7 days of Pro free.',
  },
  {
    icon: LayoutGrid,
    title: 'Mini App + web portal',
    desc: 'The full workspace inside Telegram, plus a browser portal signed in with a one-time code from the bot. No password to remember.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-16 sm:py-20" aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--color-accent)' }}
          >
            What you get today
          </p>
          <h2
            id="features-heading"
            className="text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl"
          >
            Built for traders who prepare.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
            No signals, no hype. Structured, session-aware analysis with the evidence shown —
            and a score that is points out of 100, never a promised success rate.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <article
                  className="h-full rounded-[var(--radius-lg)] border p-7 transition-shadow hover:shadow-[var(--shadow-md)] sm:p-8"
                  style={{
                    background: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] text-white"
                    style={{ background: 'var(--grad-accent)' }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                    {f.desc}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={100}>
          <p
            className="mx-auto mt-10 max-w-2xl text-center text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            On the roadmap — not available yet: a trade journal, an economic calendar, custom
            alerts, a strategy lab and correlation tools. We would rather label them honestly
            than advertise features that do not exist.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
