'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  Zap,
  Brain,
  BarChart3,
  Globe,
  Check,
  ArrowUpRight,
} from 'lucide-react';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#sessions', label: 'Sessions' },
  { href: '#samples', label: 'Analysis' },
  { href: '#pricing', label: 'Pricing' },
];

const badges = [
  { icon: Zap, label: 'Real-time 15m Data' },
  { icon: Brain, label: 'AI Session Logic' },
  { icon: BarChart3, label: 'Multi-TF Confluence' },
  { icon: Globe, label: 'Asian / London / NY' },
];

const stats = [
  { value: '28', label: 'FX Pairs' },
  { value: '4', label: 'Asset Classes' },
  { value: '3', label: 'Active Sessions' },
  { value: '15m', label: 'Resolution' },
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" aria-labelledby="hero-heading">
      {/* Background glow ring */}
      <div className="ring-container pointer-events-none" aria-hidden="true">
        <div className="glow-ring" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-accent-blue/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              scale: [0, 1, 0],
              y: [0, -100, -200],
            }}
            transition={{
              duration: 8 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 grid-main w-full">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 glass-card mx-6 mt-6 max-w-[1200px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
              <span className="text-accent-blue">Trading</span>
              <span className="text-accent-violet">Beast</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-text-dim hover:text-white transition-colors text-sm font-medium"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <a href="#pricing" className="hidden sm:block btn-primary text-sm">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2 inline-block" />
              </a>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <main className="pt-32 pb-24 md:pt-48 md:pb-32">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 glass-card mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
                <span className="text-text-dim text-sm mono">Live Analysis Engine</span>
              </motion.div>

              <motion.h1
                id="hero-heading"
                className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                <span className="block">Market Analysis</span>
                <span className="block bg-gradient-to-r from-accent-blue via-accent-violet to-accent-cyan bg-clip-text text-transparent">
                  Engine
                </span>
              </motion.h1>

              <motion.p
                className="text-lg md:text-xl text-text-dim max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Session-aware, multi-timeframe confluence scoring for 28 FX pairs
                {' '}
                <span className="font-semibold text-white">+ Gold, Silver, Oil, BTC</span>
                . Know the bias before the open.
              </motion.p>

              {/* Stats */}
              <motion.div
                className="grid grid-cols-2 gap-6 md:gap-8 mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {stats.map((stat, i) => (
                  <div key={stat.label} className="text-center">
                    <div className="font-display text-3xl md:text-4xl font-bold bg-gradient-to-r from-accent-blue to-accent-violet bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-text-dim text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <a
                  href="#pricing"
                  className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2"
                >
                  Start Free Analysis
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a
                  href="#samples"
                  className="glass-card w-full sm:w-auto px-8 py-4 text-center font-medium text-text-white hover:text-white hover:border-accent-blue/50 transition-all"
                >
                  View Live Samples
                </a>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-12 pt-8 border-t border-border-glass"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <span className="text-text-dim text-sm">Trusted by</span>
                <div className="flex items-center gap-6 opacity-50">
                  <span className="text-text-dim text-xs uppercase tracking-wider mono">TradingView</span>
                  <span className="text-text-dim text-xs uppercase tracking-wider mono">MetaTrader</span>
                  <span className="text-text-dim text-xs uppercase tracking-wider mono">cTrader</span>
                  <span className="text-text-dim text-xs uppercase tracking-wider mono">Yahoo Finance</span>
                </div>
              </motion.div>
            </div>

            {/* Right: Device Mockup */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <DeviceMockup />
            </motion.div>
          </div>
        </main>

        {/* Feature highlights bar */}
        <motion.div
          className="absolute bottom-16 left-6 right-6 mx-auto max-w-[1200px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="glass-card px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {badges.map((badge, i) => (
                <motion.div
                  key={badge.label}
                  className="flex items-center gap-3 group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.1 + i * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="p-2 bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 rounded-xl group-hover:from-accent-blue/40 group-hover:to-accent-violet/40 transition-all">
                    <badge.icon className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <span className="text-sm font-medium text-white">{badge.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-text-dim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.5 }}
      >
        <span className="text-xs uppercase tracking-wider mono">Scroll</span>
        <motion.div
          className="w-1 h-6 border border-border-glass rounded-full overflow-hidden"
          animate={{ height: [6, 24, 6] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            className="w-full h-full bg-gradient-to-b from-accent-blue to-accent-violet"
            animate={{ y: [-24, 0, -24] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

function DeviceMockup() {
  const screenContent = (
    <div className="relative w-full h-full bg-bg-deep rounded-[20px] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-glass">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
        <span className="text-xs text-text-dim mono">session-focus-radar.local</span>
        <div className="w-12" />
      </div>

      {/* Session tabs */}
      <div className="flex gap-1 px-3 py-2 border-b border-border-glass overflow-x-auto">
        {['Asian', 'London', 'New York', 'All'].map((session) => (
          <button
            key={session}
            className="px-3 py-1 text-xs font-medium rounded-full glass-card border border-border-glass whitespace-nowrap text-text-dim hover:text-white transition-colors"
          >
            {session}
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="p-4 space-y-4">
        {/* Focus pair card */}
        <motion.div
          className="glass-card p-4 border-l-4 border-accent-cyan"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇪🇺</span>
              <span className="font-display text-lg font-bold">EUR/USD</span>
              <span className="px-2 py-0.5 text-xs bg-accent-cyan/20 text-accent-cyan rounded">FOCUS</span>
            </div>
            <span className="font-display text-xl font-bold mono tabular-nums text-accent-cyan">1.08472</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-text-dim">Bias</div>
              <div className="font-semibold text-green-400">BUY</div>
            </div>
            <div>
              <div className="text-text-dim">Score</div>
              <div className="font-semibold text-white">87</div>
            </div>
            <div>
              <div className="text-text-dim">Confluence</div>
              <div className="font-semibold text-accent-violet">3/3 TF</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-text-dim">
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> EMA Stack</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> ER &gt; 0.5</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> OR Break</span>
          </div>
        </motion.div>

        {/* Watch pairs */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { pair: 'GBP/JPY', bias: 'SELL', score: 72, icon: '🇬🇧' },
            { pair: 'XAU/USD', bias: 'BUY', score: 68, icon: '🥇' },
          ].map((item, i) => (
            <motion.div
              key={item.pair}
              className="glass-card p-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.pair}</span>
                </div>
                <span className={`font-bold ${item.bias === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                  {item.bias}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-dim">Score: <span className="text-white font-semibold">{item.score}</span></span>
                <span className="text-text-dim">Watch</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mini chart placeholder */}
        <motion.div
          className="glass-card h-32 relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <canvas className="w-full h-full" id="mini-chart" />
          <div className="absolute inset-0 flex items-end justify-between px-3 pb-3">
            <span className="text-xs text-text-dim">15m</span>
            <span className="text-xs text-text-dim">1H</span>
            <span className="text-xs text-text-dim">4H</span>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/20 via-transparent to-accent-violet/20 rounded-[28px] blur-2xl opacity-50 -z-10 animate-pulse" />

      {/* Device frame */}
      <div className="relative bg-gradient-to-b from-[#0d1125] to-[#060918] rounded-[28px] border border-border-glass p-1 shadow-[0_0_80px_rgba(79,109,255,0.2)]">
        <div className="relative bg-bg-deep rounded-[24px] overflow-hidden aspect-[9/16] max-w-[480px] mx-auto">
          {screenContent}
        </div>
      </div>

      {/* Floating indicator */}
      <motion.div
        className="absolute -top-4 -right-4 bg-accent-cyan/20 border border-accent-cyan/50 rounded-full p-3"
        animate={{ y: [-4, 0, -4] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <div className="flex items-center gap-1 text-accent-cyan text-xs font-medium mono">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          LIVE
        </div>
      </motion.div>
    </div>
  );
}