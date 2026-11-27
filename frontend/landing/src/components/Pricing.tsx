import { Check, Zap, Crown, ArrowRight, Clock } from 'lucide-react';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

interface Tier {
  name: string;
  icon: typeof Zap;
  color: string;
  border: string;
  /** Live tiers show a price; tiers that are not live yet show a status instead. */
  price?: string;
  period?: string;
  comingSoon?: boolean;
  features: string[];
  cta: 'free' | 'waitlist';
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    icon: Zap,
    color: 'text-gray-300',
    border: 'border-white/10',
    features: [
      '10 credits every day — credits never expire',
      '1 Radar run = 10 credits',
      'Session focus lists — Asian, London & New York',
      '28 FX pairs + Gold, Silver, Oil & Bitcoin',
      'Telegram bot + Mini App access',
      'Same credit wallet in the bot, Mini App & browser',
    ],
    cta: 'free',
  },
  {
    name: 'Pro',
    comingSoon: true,
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    features: [
      'Everything in Free',
      'Planned: +300 extra credits per month',
      'Planned: advanced session alerts',
      'Planned: correlation & strategy tools',
    ],
    cta: 'waitlist',
  },
  {
    name: 'Elite',
    comingSoon: true,
    icon: Crown,
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    features: [
      'Everything in Free',
      'Planned: +900 extra credits per month',
      'Planned: journal, strategy & AI tools — first access',
      'Planned: priority feature access',
    ],
    cta: 'waitlist',
  },
];

export default function Pricing() {
  const telegram = useTelegramLinks();

  return (
    <section id="pricing" className="py-24 bg-[#060918]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">Pricing</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Start free. More is on the way.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Free forever with 10 credits a day. No card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={`relative backdrop-blur-md bg-white/5 border ${t.border} rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1`}
              >
                {t.comingSoon && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 border border-white/15 text-gray-200 px-4 py-1.5 rounded-full">
                      <Clock className="w-3.5 h-3.5" />
                      Coming soon
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${t.color}`} />
                  </div>
                  <h3 className="font-space font-bold text-xl text-white">{t.name}</h3>
                </div>

                {t.comingSoon ? (
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={`font-space font-bold text-4xl ${t.color}`}>Coming soon</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className={`font-space font-bold text-4xl ${t.color}`}>{t.price}</span>
                    <span className="text-gray-400 text-sm">{t.period}</span>
                  </div>
                )}

                <ul className="space-y-3 mb-8 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {t.cta === 'free' ? (
                  <a
                    href={telegram.primaryHref}
                    {...telegramLinkProps(telegram)}
                    className="w-full text-center font-semibold py-3 rounded-full transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_20px_rgba(79,109,255,0.4)] hover:from-blue-500 hover:to-violet-500"
                  >
                    {telegram.isTelegram ? 'Open in Telegram' : 'Get Started Free'}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : telegram.botUrl ? (
                  <a
                    href={telegram.botUrl}
                    {...telegramLinkProps(telegram)}
                    className="w-full text-center font-semibold py-3 rounded-full transition-all flex items-center justify-center gap-2 bg-white/5 text-white border border-white/10 hover:bg-white/10"
                  >
                    Join the waitlist in Telegram
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="w-full text-center font-semibold py-3 rounded-full flex items-center justify-center gap-2 bg-white/5 text-gray-500 border border-white/10 cursor-not-allowed"
                  >
                    Join the waitlist in Telegram
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center max-w-3xl mx-auto space-y-2">
          <p className="text-sm text-gray-500">
            Pro and Elite are still in development — planned credit amounts may change before
            launch, and no paid plan can be purchased yet.
          </p>
          <p className="text-sm text-gray-500">
            ⚠️ Trading Beast is a market analysis tool only — not investment advice. Trading
            involves substantial risk of loss.
          </p>
        </div>
      </div>
    </section>
  );
}
