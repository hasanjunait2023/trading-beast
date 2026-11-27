import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'How do credits work?',
    a: 'You receive 10 free credits every day, and credits never expire — unused credits simply stack up. One Radar run costs 10 credits. Your balance is a single wallet shared across the Telegram bot, the Mini App and the browser portal, so credits earned in one place can be spent in another. You can also earn credits by referring other traders.',
  },
  {
    q: 'What are sessions, and why does TradingBeast organise by them?',
    a: 'The forex market moves in three main sessions — Asian, London and New York. Different pairs come alive in different sessions. TradingBeast scores all 28 FX pairs plus Gold, Silver, Oil and Bitcoin for the current session, using EMA alignment, RSI, ADR and the opening range, and ranks them into Focus, Watch and Avoid lists so you start each session knowing where to look.',
  },
  {
    q: 'How do I log in? Do I need a password?',
    a: 'No password at all. Open the TradingBeast bot or Mini App in Telegram and you are signed in with your Telegram account — nothing extra to remember. If you prefer the browser portal, the bot gives you a one-time login code to enter there.',
  },
  {
    q: 'How do payments work?',
    a: 'Payments are manual and verified by a person, not charged automatically. You pay via bKash, Nagad or Binance, submit your transaction ID, and once an admin verifies it, your account is updated. No card details are ever stored. Pro and Elite are not on sale yet, so there is nothing to pay for today — the Free plan is fully usable.',
  },
  {
    q: 'When are Pro and Elite launching?',
    a: 'Pro and Elite are coming soon. The planned grants are +300 credits per month for Pro and +900 for Elite, but planned amounts may change before launch and no paid plan can be purchased yet. Join the waitlist from the bot and you will be the first to know.',
  },
  {
    q: 'Is TradingBeast financial advice?',
    a: 'No. TradingBeast is a market analysis tool only — it computes and ranks indicator-based scores to help you prepare. It does not tell you what to buy or sell, and nothing on this site is investment advice. Trading involves substantial risk of loss, and every trading decision — and its outcome — is yours.',
  },
];

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
      >
        <span className="font-space font-semibold text-white">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className={`w-5 h-5 flex-shrink-0 ${open ? 'text-blue-400' : 'text-gray-500'}`} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <p className="px-6 pb-6 text-sm text-gray-400 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="faq" className="py-24 bg-[#0a0f24]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs uppercase tracking-[0.2em] text-blue-400 mb-3">FAQ</p>
          <h2 className="font-space font-bold text-4xl md:text-5xl text-white">
            Questions, answered.
          </h2>
          <p className="mt-4 text-gray-400 max-w-2xl mx-auto">
            Credits, sessions, login and payments — the things traders ask us most.
          </p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto space-y-4"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          {faqs.map((item, i) => (
            <FaqItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
