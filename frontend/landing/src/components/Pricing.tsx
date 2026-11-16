import { Check, Zap, Crown, ArrowRight } from 'lucide-react';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    icon: Zap,
    color: 'text-gray-300',
    border: 'border-white/10',
    features: [
      '3 focus pairs per session',
      'Delayed updates (15 min)',
      'Basic analysis only',
      'Community support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: '/month',
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'Most Popular',
    features: [
      'All pairs, live focus',
      'Full watch / avoid lists',
      'Session start alerts',
      'Complete analysis details',
      'Custom watchlist (50 pairs)',
      'Priority support',
    ],
    cta: 'Start 7-Day Trial',
    highlighted: true,
  },
  {
    name: 'Elite',
    price: '$29.99',
    period: '/month',
    icon: Crown,
    color: 'text-violet-400',
    border: 'border-violet-500/40',
    features: [
      'Everything in Pro',
      'Custom alert rules',
      'API access (REST)',
      'Webhook notifications',
      'Historical data export',
      'Dedicated support',
    ],
    cta: 'Go Elite',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#060918]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">Pricing</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Start free. Upgrade when you're ready.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            7-day Pro trial. Cancel anytime. No credit card required for Free.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.name}
                className={`relative backdrop-blur-md bg-white/5 border ${t.border} rounded-2xl p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                  t.highlighted ? 'shadow-[0_0_40px_rgba(79,109,255,0.3)]' : ''
                }`}
              >
                {t.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-semibold bg-gradient-to-r from-blue-600 to-violet-600 text-white px-4 py-1.5 rounded-full">
                      {t.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${t.color}`} />
                  </div>
                  <h3 className="font-space font-bold text-xl text-white">{t.name}</h3>
                </div>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className={`font-space font-bold text-4xl ${t.color}`}>{t.price}</span>
                  <span className="text-gray-400 text-sm">{t.period}</span>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="/dashboard"
                  className={`w-full text-center font-semibold py-3 rounded-full transition-all flex items-center justify-center gap-2 ${
                    t.highlighted
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_20px_rgba(79,109,255,0.4)] hover:from-blue-500 hover:to-violet-500'
                      : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {t.cta}
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}