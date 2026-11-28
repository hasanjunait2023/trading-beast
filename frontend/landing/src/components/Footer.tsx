import { ArrowRight } from 'lucide-react';
import Brand from './Brand';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

export default function Footer() {
  const telegram = useTelegramLinks();
  return (
    <footer
      className="border-t py-14"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 grid gap-10 md:grid-cols-4">
          <div>
            <a href="#top" aria-label="TradingBeast — back to top" className="inline-block rounded-lg">
              <Brand />
            </a>
            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Session-aware market analysis: a Focus Radar for the Asian, London and New York
              sessions, inside Telegram and in your browser.
            </p>
          </div>

          <nav aria-label="Product">
            <h3 className="mb-4 font-semibold">Product</h3>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <li>
                <a href="#sessions" className="flex min-h-[36px] items-center hover:underline">
                  Sessions
                </a>
              </li>
              <li>
                <a href="#features" className="flex min-h-[36px] items-center hover:underline">
                  Features
                </a>
              </li>
              <li>
                <a href="#showcase" className="flex min-h-[36px] items-center hover:underline">
                  The app
                </a>
              </li>
              <li>
                <a href="#pricing" className="flex min-h-[36px] items-center hover:underline">
                  Pricing
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h3 className="mb-4 font-semibold">Resources</h3>
            <ul className="space-y-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <li>
                <a href="#how-it-works" className="flex min-h-[36px] items-center hover:underline">
                  How it works
                </a>
              </li>
              <li>
                <a href="#faq" className="flex min-h-[36px] items-center hover:underline">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href={telegram.botUrl ?? '#how-it-works'}
                  {...(telegram.botUrl ? telegramLinkProps(telegram) : {})}
                  className="flex min-h-[36px] items-center hover:underline"
                >
                  Telegram bot
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="mb-4 font-semibold">Get started</h3>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Free forever: 10 credits a day, one Radar run for 10 credits, and credits that
              never expire.
            </p>
            <a
              href={telegram.primaryHref}
              {...telegramLinkProps(telegram)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'var(--grad-accent)' }}
            >
              {telegram.isTelegram ? 'Open in Telegram' : 'Get started free'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-between gap-3 border-t pt-8 text-xs md:flex-row"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
        >
          <p>© 2026 TradingBeast. Market analysis tool only — not financial advice.</p>
          <p>Built for traders who prepare.</p>
        </div>
      </div>
    </footer>
  );
}
