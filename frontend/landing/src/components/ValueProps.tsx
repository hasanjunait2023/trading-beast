'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Brain,
  Layers,
  Zap,
  Clock,
  Globe,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: Target,
    title: 'Session-Aware Confluence',
    description:
      'Multi-timeframe analysis (15m, 1H, 4H) aligned with Asian, London, and New York session opens. Know which pairs are in play right now.',
    highlight: '3 Sessions × 3 Timeframes',
  },
  {
    icon: Brain,
    title: 'AI-Powered Bias Scoring',
    description:
      'Proprietary algorithm combining EMA stack, efficiency ratio, opening range breakouts, divergence detection, and ATR-based room-to-target calculations.',
    highlight: '0–100 Confidence Score',
  },
  {
    icon: Layers,
    title: 'Currency Strength Matrix',
    description:
      'Real-time strength/weakness across 8 majors derived from 28 pair cross-analysis. Instantly spot the strongest vs weakest currencies per session.',
    highlight: '8 Majors Tracked',
  },
  {
    icon: Zap,
    title: 'Live 15-Minute Resolution',
    description:
      'Yahoo Finance data piped directly into the engine. 15m candles, 1H/4H derived buckets, RSI, ATR, and swing detection — all updated in real-time.',
    highlight: 'Sub-minute Latency',
  },
  {
    icon: Clock,
    title: 'Opening Range Intelligence',
    description:
      'First-hour range detection with live breakout confirmation. OR high/low levels tracked, bias confirmed only on decisive closes beyond range.',
    highlight: 'Auto OR Detection',
  },
  {
    icon: Globe,
    title: 'Asset Class Coverage',
    description:
      'Beyond FX: Gold (XAU/USD), Silver (XAG/USD), WTI Oil, and Bitcoin. Session-aware filtering — metals active London/NY, Oil NY-only, BTC 24/7.',
    highlight: '4 Asset Classes',
  },
];

const sessionFeatures = [
  {
    session: 'Asian',
    time: '00:00–08:00 UTC',
    pairs: ['JPY', 'AUD', 'NZD'],
    color: '#22d3ee',
    icon: '🌅',
    description: 'Range-bound setups, carry trade unwinds, early momentum on yen crosses',
  },
  {
    session: 'London',
    time: '08:00–16:00 UTC',
    pairs: ['EUR', 'GBP', 'CHF'],
    color: '#7c5cff',
    icon: '🌆',
    description: 'High volume, trend initiation, breakout confirmations, major economic releases',
  },
  {
    session: 'New York',
    time: '13:00–21:00 UTC',
    pairs: ['USD', 'CAD', 'EUR', 'GBP'],
    color: '#4f6dff',
    icon: '🏙️',
    description: 'Overlap volatility, US data reaction, end-of-day positioning, liquidity flushes',
  },
];

export function ValueProps() {
  return (
    <>
      {/* Main Features */}
      <section id="features" className="py-24 md:py-32 bg-bg-dark" aria-labelledby="features-heading">
        <div className="grid-main">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 glass-card text-text-dim text-sm mono mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" />
              Core Capabilities
            </span>
            <h2 id="features-heading" className="font-display text-4xl md:text-5xl font-bold mb-6">
              Engineered for <span className="bg-gradient-to-r from-accent-blue to-accent-violet bg-clip-text text-transparent">Precision</span>
            </h2>
            <p className="text-lg text-text-dim leading-relaxed">
              Every feature is built around one goal: giving you a statistical edge at the session open.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.article
                key={feature.title}
                className="glass-card p-6 relative overflow-hidden group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                {/* Glow accent */}
                <div
                  className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-accent-blue to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div className="p-2 bg-gradient-to-br from-accent-blue/10 to-accent-violet/10 rounded-xl w-fit mb-4 group-hover:from-accent-blue/20 group-hover:to-accent-violet/20 transition-all">
                  <feature.icon className="w-6 h-6 text-accent-cyan" />
                </div>

                <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-text-dim leading-relaxed mb-4">{feature.description}</p>

                <div className="flex items-center gap-2 text-accent-cyan text-sm font-medium mono">
                  <span>{feature.highlight}</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all" />
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Session Deep Dive */}
      <section id="sessions" className="py-24 md:py-32 bg-bg-navy relative" aria-labelledby="sessions-heading">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-accent-blue/10 via-transparent to-accent-violet/10 blur-3xl" />
        </div>

        <div className="grid-main relative z-10">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 glass-card text-text-dim text-sm mono mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-violet" />
              Session Intelligence
            </span>
            <h2 id="sessions-heading" className="font-display text-4xl md:text-5xl font-bold mb-6">
              Three Sessions. <span className="bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent">One Engine.</span>
            </h2>
            <p className="text-lg text-text-dim leading-relaxed">
              Each session has distinct characteristics. The engine adapts its scoring weights, active pair filters, and bias thresholds per session.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {sessionFeatures.map((session, i) => (
              <motion.article
                key={session.session}
                className="relative glass-card p-6 overflow-hidden"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                {/* Session glow */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: `linear-gradient(90deg, transparent, ${session.color}, transparent)` }}
                />

                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{session.icon}</span>
                  <div>
                    <h3 className="font-display text-2xl font-bold" style={{ color: session.color }}>
                      {session.session}
                    </h3>
                    <span className="text-text-dim text-sm mono">{session.time}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {session.pairs.map((pair) => (
                    <span
                      key={pair}
                      className="px-2 py-1 text-xs font-medium rounded-full mono"
                      style={{
                        backgroundColor: `${session.color}20`,
                        color: session.color,
                        border: `1px solid ${session.color}40`,
                      }}
                    >
                      {pair}
                    </span>
                  ))}
                </div>

                <p className="text-text-dim text-sm leading-relaxed">{session.description}</p>
              </motion.article>
            ))}
          </div>

          {/* Session overlap indicator */}
          <motion.div
            className="mt-16 glass-card p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="font-display text-xl font-bold mb-4 text-center">Critical Overlap Windows</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <OverlapCard
                name="London / NY Overlap"
                time="13:00–16:00 UTC"
                description="Highest volume, cleanest trends, best breakout follow-through. Engine weights confluence +30%."
                color="from-accent-violet to-accent-blue"
              />
              <OverlapCard
                name="Asian / London Transition"
                time="07:00–08:00 UTC"
                description="Range breakouts on JPY/EUR/GBP crosses. Engine detects pre-London momentum shifts."
                color="from-accent-cyan to-accent-violet"
              />
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

function OverlapCard({
  name,
  time,
  description,
  color,
}: {
  name: string;
  time: string;
  description: string;
  color: string;
}) {
  return (
    <div className="relative p-4 rounded-xl bg-gradient-to-r from-bg-deep to-bg-navy border border-border-glass">
      <div className="absolute inset-0 bg-gradient-to-r opacity-5" style={{ background: color }} />
      <div className="relative flex items-start gap-3">
        <div className="p-2 rounded-xl" style={{ background: color }}>
          <CheckCircle className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold">{name}</h4>
            <span className="text-xs mono px-2 py-0.5 glass-card">{time}</span>
          </div>
          <p className="text-text-dim text-sm mt-2">{description}</p>
        </div>
      </div>
    </div>
  );
}