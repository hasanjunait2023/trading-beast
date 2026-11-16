import { Clock, TrendingUp, Sun, Moon } from 'lucide-react';

const sessions = [
  {
    name: 'Asian Session',
    icon: Sun,
    time: '22:00 – 07:00 UTC',
    pairs: 'JPY, AUD, NZD, CHF',
    accent: 'from-amber-400 to-orange-500',
    desc: 'Tokyo liquidity sweep. Range-break candidates identified before London overlap.',
  },
  {
    name: 'London Session',
    icon: Moon,
    time: '07:00 – 12:00 UTC',
    pairs: 'EUR, GBP, USD, CHF',
    accent: 'from-blue-400 to-violet-500',
    desc: 'The deepest liquidity window. Opening Range breakouts scored and ranked.',
  },
  {
    name: 'New York Session',
    icon: TrendingUp,
    time: '12:00 – 21:00 UTC',
    pairs: 'USD, CAD, MXN, Crude',
    accent: 'from-cyan-400 to-blue-500',
    desc: 'US data-driven moves. ADR expansion and trend continuation signals.',
  },
];

export default function Sessions() {
  return (
    <section id="sessions" className="py-24 bg-[#060918]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">Session-Aware</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Three Sessions. One Focus List.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            We don't guess the market. We watch it session by session — Asian range,
            London breakout, New York trend — and rank what actually has an edge.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {sessions.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.name}
                className="group backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-r ${s.accent} flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(79,109,255,0.3)]`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-space font-bold text-2xl text-white mb-1">{s.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{s.time}</p>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{s.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {s.pairs.split(', ').map((p) => (
                    <span
                      key={p}
                      className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}