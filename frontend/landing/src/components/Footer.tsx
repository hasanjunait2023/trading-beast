import { Zap, ArrowRight } from 'lucide-react';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

export default function Footer() {
  const telegram = useTelegramLinks();
  return (
    <footer className="bg-[#03050d] border-t border-white/10 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div className="col-span-1">
            <a href="#hero" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="font-space font-bold text-lg">Trading Beast</span>
            </a>
            <p className="text-sm text-gray-400 leading-relaxed">
              Session-aware market analysis for forex traders worldwide.
            </p>
          </div>

          <div>
            <h4 className="font-space font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#sessions" className="hover:text-white transition-colors">Sessions</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li>
                <a
                  href={telegram.primaryHref}
                  {...telegramLinkProps(telegram)}
                  className="hover:text-white transition-colors"
                >
                  {telegram.isTelegram ? 'Open in Telegram' : 'Get Started'}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-space font-semibold text-white mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#docs" className="hover:text-white transition-colors">How It Works</a></li>
              <li>
                <a
                  href={telegram.botUrl ?? '#docs'}
                  {...(telegram.botUrl ? telegramLinkProps(telegram) : {})}
                  className="hover:text-white transition-colors"
                >
                  Telegram Bot
                </a>
              </li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Upgrade</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-space font-semibold text-white mb-4">Get Started</h4>
            <p className="text-sm text-gray-400 mb-4">
              Join 12,000+ analysts using session-aware market intelligence.
            </p>
            <a
              href={telegram.primaryHref}
              {...telegramLinkProps(telegram)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(79,109,255,0.4)] transition-all"
            >
              {telegram.isTelegram ? 'Open in Telegram' : 'Get Started Free'}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © 2026 Trading Beast. Market analysis tool only. Not investment advice.
          </p>
          <p className="text-xs text-gray-500">
            Built for traders who prepare.
          </p>
        </div>
      </div>
    </footer>
  );
}