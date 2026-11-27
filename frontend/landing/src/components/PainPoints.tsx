import { motion } from 'framer-motion';
import { Eye, Hourglass, MessagesSquare, Wrench, ArrowRight } from 'lucide-react';

const pains = [
  {
    icon: Eye,
    title: '28+ pairs, 3 sessions, one pair of eyes',
    pain: 'Serious moves can start in any session — Asian, London or New York. Watching every pair on every chart, all day, is not a strategy. It is exhaustion.',
    fix: 'TradingBeast scans the full list for you and ranks what deserves your attention this session.',
  },
  {
    icon: Hourglass,
    title: 'Analysis paralysis at the open',
    pain: 'The session opens, you start flipping through charts — and by the time you finish scanning, the opening move you were preparing for is already gone.',
    fix: 'One ranked focus list, ready when the session starts, so your prep takes minutes, not the whole open.',
  },
  {
    icon: MessagesSquare,
    title: 'Noisy paid signal groups',
    pain: 'Screenshots, hype and “guaranteed” calls — with no reasoning you can check. When a call goes wrong, there is no score, no method and no accountability.',
    fix: 'No signals here. Every score shows the EMA, RSI, ADR and opening-range inputs behind it, so you can judge it yourself.',
  },
  {
    icon: Wrench,
    title: 'Tools scattered everywhere',
    pain: 'Charts in one app, a watchlist in a spreadsheet, alerts in a chat, notes somewhere else. Your trading workflow lives in five places — and none of them talk to each other.',
    fix: 'Focus list, watchlist and credits in one place — inside Telegram and in your browser, on the same account.',
  },
];

export default function PainPoints() {
  return (
    <section id="pain-points" className="py-24 bg-[#060918]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">The Problem</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Trading is hard enough.<br className="hidden md:block" /> Preparation shouldn&apos;t be.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Most traders don&apos;t lose because they can&apos;t read a chart. They lose time —
            and focus — long before the trade.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {pains.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors duration-300"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: (i % 2) * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="font-space font-semibold text-xl text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-5">{item.pain}</p>
                <p className="flex items-start gap-2 text-sm text-gray-200 leading-relaxed border-t border-white/10 pt-4">
                  <ArrowRight className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{item.fix}</span>
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
