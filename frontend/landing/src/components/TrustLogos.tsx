'use client';

import { motion } from 'framer-motion';

const logos = [
  { name: 'TradingView', color: '#2962FF' },
  { name: 'MetaTrader 5', color: '#0078D4' },
  { name: 'cTrader', color: '#00D4AA' },
  { name: 'Yahoo Finance', color: '#6001D2' },
  { name: 'Bloomberg', color: '#000000' },
  { name: 'Reuters', color: '#E60012' },
  { name: 'Investing.com', color: '#00A859' },
  { name: 'Forex Factory', color: '#FF6B00' },
];

export function TrustLogos() {
  return (
    <section className="py-16 border-y border-border-glass" aria-label="Trusted platforms">
      <div className="grid-main">
        <div className="text-center mb-12">
          <p className="text-text-dim text-sm uppercase tracking-wider mono mb-2">Integrated with</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold">Seamless Platform Integration</h2>
        </div>

        {/* Marquee */}
        <div className="overflow-hidden">
          <div className="flex gap-12 md:gap-16 lg:gap-24 items-center">
            <Marquee logos={logos} direction="left" duration={30} />
            <Marquee logos={logos} direction="right" duration={35} />
            <Marquee logos={logos} direction="left" duration={30} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee({ logos, direction, duration }: { logos: { name: string; color: string }[]; direction: 'left' | 'right'; duration: number }) {
  return (
    <motion.div
      className="flex items-center gap-12 md:gap-16 lg:gap-24 whitespace-nowrap"
      initial={{ x: direction === 'left' ? 0 : -2000 }}
      animate={{ x: direction === 'left' ? -2000 : 0 }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
      style={{ willChange: 'transform' }}
    >
      {logos.map((logo) => (
        <motion.div
          key={logo.name}
          className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity duration-300"
          whileHover={{ scale: 1.1 }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs"
            style={{ backgroundColor: logo.color }}
          >
            {logo.name.charAt(0)}
          </div>
          <span className="text-text-dim font-medium text-sm hidden sm:block">{logo.name}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}