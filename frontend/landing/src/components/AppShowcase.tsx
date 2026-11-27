import { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from 'framer-motion';
import { Coins, Radar, Star, TrendingUp, TrendingDown, Zap } from 'lucide-react';

const sessions = ['Asian', 'London', 'New York'];

const focusRows = [
  { pair: 'EUR/USD', bias: 'BUY', score: 87, tag: 'FOCUS' },
  { pair: 'XAU/USD', bias: 'BUY', score: 81, tag: 'FOCUS' },
  { pair: 'GBP/JPY', bias: 'SELL', score: 72, tag: 'WATCH' },
  { pair: 'USD/CHF', bias: 'SELL', score: 64, tag: 'WATCH' },
] as const;

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
        initial={{ width: 0 }}
        whileInView={{ width: `${score}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function AppShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Subtle scroll parallax for the floating cards.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const floatY = useTransform(scrollYProgress, [0, 1], [14, -14]);
  const floatYAlt = useTransform(scrollYProgress, [0, 1], [-10, 10]);

  // Gentle mouse tilt on the phone (max ~7deg — app feel, not a toy).
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 150, damping: 18 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = tiltRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };
  const handleMouseLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <section id="showcase" ref={sectionRef} className="py-24 bg-[#0a0f24] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">Inside Telegram</p>
            <h2 className="font-space font-bold text-4xl md:text-5xl text-white leading-tight">
              The whole radar,<br />in your pocket.
            </h2>
            <p className="mt-5 text-gray-400 leading-relaxed max-w-lg">
              TradingBeast lives where you already are — Telegram. Open the Mini App and
              your session focus list, watchlist and credit balance are right there.
              No new account, no password, nothing to install.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                { icon: Radar, text: 'Radar — one tap runs the session scan (10 credits)' },
                { icon: Star, text: 'Watchlist — the pairs you care about, always one tap away' },
                { icon: Coins, text: 'Credits — balance and history, the same wallet as the browser' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.text} className="flex items-center gap-3 text-gray-200">
                    <span className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4.5 h-4.5 text-blue-400" />
                    </span>
                    <span className="text-sm md:text-base">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Phone mock */}
          <div className="relative flex justify-center" style={{ perspective: 1200 }}>
            {/* Glow */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[480px] bg-gradient-to-b from-blue-600/20 to-violet-600/20 blur-3xl rounded-full pointer-events-none"
              aria-hidden="true"
            />

            <motion.div
              ref={tiltRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7 }}
              className="relative w-[300px] sm:w-[320px]"
            >
              <div className="relative rounded-[2.6rem] border border-white/15 bg-[#0b0f22] shadow-[0_40px_80px_rgba(0,0,0,0.55)] p-2.5">
                <div className="relative rounded-[2.1rem] bg-[#060918] overflow-hidden">
                  {/* Notch */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-10" />

                  {/* App header */}
                  <div className="px-5 pt-10 pb-3 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                      </span>
                      <span className="font-space font-bold text-sm text-white">TradingBeast</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/25 rounded-full px-2.5 py-1">
                      <Coins className="w-3.5 h-3.5" />
                      40 credits
                    </span>
                  </div>

                  {/* Session tabs */}
                  <div className="px-5 py-3 flex gap-2">
                    {sessions.map((s) => (
                      <span
                        key={s}
                        className={`text-[11px] font-medium rounded-full px-3 py-1.5 ${
                          s === 'London'
                            ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white'
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Radar rows */}
                  <div className="px-4 pb-3 space-y-2.5">
                    {focusRows.map((row) => {
                      const up = row.bias === 'BUY';
                      return (
                        <div
                          key={row.pair}
                          className="bg-white/[0.04] border border-white/10 rounded-xl px-3.5 py-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="flex items-center gap-2">
                              <span className="font-space font-semibold text-sm text-white">{row.pair}</span>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  up ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {row.bias}
                              </span>
                            </span>
                            <span
                              className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded ${
                                row.tag === 'FOCUS'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-white/10 text-gray-400'
                              }`}
                            >
                              {row.tag}
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <ScoreBar score={row.score} />
                            <span className="font-space font-bold text-sm text-white tabular-nums">{row.score}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Run Radar button (Mini App MainButton style) */}
                  <div className="px-4 pb-6 pt-1">
                    <div className="text-center text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 rounded-xl py-3 shadow-[0_8px_24px_rgba(79,109,255,0.35)]">
                      Run Radar · 10 credits
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating card: top focus */}
              <motion.div
                style={{ y: floatY, transform: 'translateZ(50px)' }}
                className="absolute -left-10 sm:-left-16 top-24 z-10"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  className="backdrop-blur-md bg-white/[0.07] border border-white/15 rounded-2xl px-4 py-3 shadow-xl"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Top focus · London</p>
                  <p className="font-space font-bold text-white text-sm">
                    EUR/USD <span className="text-emerald-400">87</span>
                  </p>
                </motion.div>
              </motion.div>

              {/* Floating card: daily credits */}
              <motion.div
                style={{ y: floatYAlt, transform: 'translateZ(50px)' }}
                className="absolute -right-8 sm:-right-14 bottom-28 z-10"
              >
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                  className="backdrop-blur-md bg-white/[0.07] border border-white/15 rounded-2xl px-4 py-3 shadow-xl"
                >
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Today</p>
                  <p className="inline-flex items-center gap-1.5 font-space font-bold text-amber-300 text-sm">
                    <Coins className="w-4 h-4" /> +10 credits
                  </p>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
