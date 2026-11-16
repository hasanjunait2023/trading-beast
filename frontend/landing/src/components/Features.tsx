import { Activity, BarChart3, Shield, Bell, Globe, Zap, Brain, Layers } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Multi-Timeframe Scoring',
    desc: 'EMA alignment, RSI, ADR, and Opening Range across 4H, 1H, 15M. Every pair scored 0–100.',
  },
  {
    icon: Layers,
    title: 'Focus / Watch / Avoid',
    desc: 'Three ranked lists per session. Only the pairs with a real edge get FOCUS.',
  },
  {
    icon: BarChart3,
    title: 'Live Price + Chart Images',
    desc: 'Real-time prices with self-hosted QuickChart images. Refresh every 5 minutes.',
  },
  {
    icon: Bell,
    title: 'Session Start Alerts',
    desc: 'Get pinged the moment Asian, London, or NY opens. Never miss the move.',
  },
  {
    icon: Shield,
    title: 'Risk-Aware Scoring',
    desc: 'ATR room, cramped/stretched flags, divergence detection. We surface risk, not just opportunity.',
  },
  {
    icon: Globe,
    title: 'English + Bengali',
    desc: 'Fully bilingual UI. Switch languages instantly from settings.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#0a0f24]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">The Engine</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Built for traders who prepare.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            No signals, no hype. Just structured, session-aware analysis you can act on.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-space font-bold text-xl text-white mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}