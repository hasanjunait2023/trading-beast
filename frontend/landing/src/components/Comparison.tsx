import { motion } from 'framer-motion';
import { Check, Minus, Zap } from 'lucide-react';

type Cell =
  | { kind: 'yes' }
  | { kind: 'no' }
  | { kind: 'partial'; note: string };

const yes: Cell = { kind: 'yes' };
const no: Cell = { kind: 'no' };
const partial = (note: string): Cell => ({ kind: 'partial', note });

interface Row {
  feature: string;
  tradingBeast: Cell;
  manual: Cell;
  signalGroups: Cell;
  indicatorBots: Cell;
}

const rows: Row[] = [
  {
    feature: 'Session-aware focus list (Asian / London / NY)',
    tradingBeast: yes,
    manual: no,
    signalGroups: no,
    indicatorBots: no,
  },
  {
    feature: 'Transparent scoring — EMA, RSI, ADR & opening range',
    tradingBeast: yes,
    manual: partial('Possible, but chart by chart, by hand'),
    signalGroups: no,
    indicatorBots: partial('Usually a single indicator'),
  },
  {
    feature: 'Works inside Telegram — no new app to install',
    tradingBeast: yes,
    manual: no,
    signalGroups: partial('Chat messages only, no app'),
    indicatorBots: no,
  },
  {
    feature: 'Credit-based pay-per-use — no subscription lock-in',
    tradingBeast: yes,
    manual: partial('Free, but it costs your time'),
    signalGroups: no,
    indicatorBots: no,
  },
  {
    feature: 'No buy/sell signals or advice claims',
    tradingBeast: yes,
    manual: yes,
    signalGroups: no,
    indicatorBots: partial('Often marketed as signal bots'),
  },
  {
    feature: 'Personal watchlist, synced across devices',
    tradingBeast: yes,
    manual: partial('Separate apps, notes & spreadsheets'),
    signalGroups: no,
    indicatorBots: partial('Depends on the platform'),
  },
  {
    feature: 'Earn credits by referring other traders',
    tradingBeast: yes,
    manual: no,
    signalGroups: no,
    indicatorBots: no,
  },
];

const columns: { key: keyof Omit<Row, 'feature'>; label: string; highlight?: boolean }[] = [
  { key: 'tradingBeast', label: 'TradingBeast', highlight: true },
  { key: 'manual', label: 'Manual chart-watching' },
  { key: 'signalGroups', label: 'Paid signal groups' },
  { key: 'indicatorBots', label: 'Generic indicator bots' },
];

function CellView({ cell, highlight }: { cell: Cell; highlight?: boolean }) {
  if (cell.kind === 'yes') {
    return (
      <span className="inline-flex items-center justify-center">
        <span
          className={`w-7 h-7 rounded-full flex items-center justify-center ${
            highlight ? 'bg-emerald-400/20' : 'bg-white/5'
          }`}
        >
          <Check className={`w-4 h-4 ${highlight ? 'text-emerald-400' : 'text-gray-300'}`} />
        </span>
      </span>
    );
  }
  if (cell.kind === 'no') {
    return (
      <span className="inline-flex items-center justify-center">
        <Minus className="w-4 h-4 text-gray-600" />
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center gap-1">
      <Minus className="w-4 h-4 text-amber-400/80" />
      <span className="text-[11px] leading-tight text-gray-500 max-w-[130px]">{cell.note}</span>
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="comparison" className="py-24 bg-[#060918]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">Compare</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            A calmer way to prepare.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            TradingBeast doesn&apos;t replace your judgement — it replaces the hours of
            scanning before it. Here is how it stacks up against the usual options.
          </p>
        </motion.div>

        <motion.div
          className="max-w-5xl mx-auto overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-medium text-gray-400 px-6 py-5 w-[30%]">Feature</th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-5 text-center align-bottom ${
                      col.highlight ? 'bg-gradient-to-b from-blue-600/15 to-violet-600/10' : ''
                    }`}
                  >
                    {col.highlight ? (
                      <span className="inline-flex items-center gap-2 font-space font-bold text-white">
                        <span className="w-6 h-6 rounded-md bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center">
                          <Zap className="w-3.5 h-3.5 text-white" />
                        </span>
                        {col.label}
                      </span>
                    ) : (
                      <span className="font-space font-semibold text-gray-300">{col.label}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  className={i < rows.length - 1 ? 'border-b border-white/5' : ''}
                >
                  <td className="px-6 py-4 text-gray-200 font-medium">{row.feature}</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-4 text-center align-middle ${
                        col.highlight ? 'bg-gradient-to-b from-blue-600/[0.07] to-violet-600/[0.05]' : ''
                      }`}
                    >
                      <CellView cell={row[col.key]} highlight={col.highlight} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        <motion.p
          className="mt-8 text-center text-sm text-gray-500 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          You always make the final call. TradingBeast is an analysis tool — it shows you
          where to look and why, never what to buy or sell.
        </motion.p>
      </div>
    </section>
  );
}
