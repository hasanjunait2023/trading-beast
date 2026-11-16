import { Terminal, Cpu, Database, ShieldCheck, Globe, Zap } from 'lucide-react';

const docs = [
  {
    icon: Terminal,
    title: 'Analysis Pipeline',
    desc: 'Multi-timeframe EMA/RSI/ADR computed on 28 FX pairs + 4 assets every 5 minutes.',
  },
  {
    icon: Cpu,
    title: 'Scoring Engine',
    desc: 'Each pair gets a 0–100 score with bias, ATR room, and divergence flags.',
  },
  {
    icon: Database,
    title: 'Historical Data',
    desc: 'Export focus results, watchlists, and full analysis history (Elite).',
  },
  {
    icon: ShieldCheck,
    title: 'Risk-Aware',
    desc: 'Cramped, stretched, divergence-against warnings surface before you trade.',
  },
  {
    icon: Globe,
    title: 'Bilingual',
    desc: 'English + Bengali UI. Switch instantly from settings.',
  },
  {
    icon: Zap,
    title: 'Telegram Bot',
    desc: '/focus, watchlist, and alerts — the same engine, in your pocket.',
  },
];

export default function Docs() {
  return (
    <section id="docs" className="py-24 bg-[#0a0f24]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">How It Works</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Analysis you can verify.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Every score is backed by visible math. No black boxes, no promises.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {docs.map((d) => {
            const Icon = d.icon;
            return (
              <div
                key={d.title}
                className="group backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-space font-bold text-xl text-white mb-2">{d.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{d.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-16 text-center">
          <div className="inline-block backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl px-8 py-6 max-w-3xl">
            <p className="text-sm text-gray-400 leading-relaxed">
              <span className="text-white font-semibold">⚠️ Disclaimer:</span> Trading Beast is a
              market analysis tool. It does not provide investment advice, trade signals, or
              guaranteed returns. Trading involves risk. Past performance does not predict future
              results. Always do your own research.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}