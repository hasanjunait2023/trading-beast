import React from 'react';

// Rotating neon ring — hero background element from reference
export function NeonRing({
  size = 500,
  blur = 90,
  speed = 20,
  className = '',
}: { size?: number; blur?: number; speed?: number; className?: string }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
    >
      <div
        style={{
          width: size,
          height: size,
          background:
            'conic-gradient(from 0deg, #4f6dff, #7c5cff, #22d3ee, #4f6dff)',
          filter: `blur(${blur}px)`,
          opacity: 0.4,
          borderRadius: '50%',
          animation: `rotate ${speed}s linear infinite`,
        }}
      />
      <style>{`@keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Glass card with hover lift
export function GlassCard({
  children,
  className = '',
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl transition-all duration-300 ${
        hover ? 'hover:-translate-y-1 hover:border-white/20' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Gradient button
export function GradientButton({
  children,
  className = '',
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-semibold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(79,109,255,0.4)] transition-all duration-200 ${className}`}
    >
      {children}
    </button>
  );
}

// Stat card with number
export function StatCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold font-space mt-1">{value}</p>
          {change && <p className="text-xs text-green-400 mt-1">{change}</p>}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default { NeonRing, GlassCard, GradientButton, StatCard };