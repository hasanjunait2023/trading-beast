import { useEffect, useState } from 'react';
import { Menu, X, Send } from 'lucide-react';
import Brand from './Brand';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

const links = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Sessions', href: '#sessions' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navigation() {
  const telegram = useTelegramLinks();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b backdrop-blur-md"
      style={{
        background: 'rgba(245, 250, 248, 0.88)',
        borderColor: scrolled ? 'var(--color-border)' : 'transparent',
        boxShadow: scrolled ? 'var(--shadow-sm)' : 'none',
      }}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-4 sm:px-6"
      >
        <a href="#top" aria-label="TradingBeast — back to top" className="rounded-lg">
          <Brand />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium transition-colors hover:bg-[var(--color-surface-hover)]"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href={telegram.primaryHref}
            {...telegramLinkProps(telegram)}
            className="hidden min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:inline-flex"
            style={{ background: 'var(--grad-accent)' }}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {telegram.isTelegram ? 'Open in Telegram' : 'Get started free'}
          </a>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full lg:hidden"
            style={{ color: 'var(--color-text)' }}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="border-t lg:hidden"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <ul className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[48px] items-center rounded-lg px-3 text-base font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li className="pt-2 pb-1">
              <a
                href={telegram.primaryHref}
                {...telegramLinkProps(telegram)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 font-semibold text-white"
                style={{ background: 'var(--grad-accent)' }}
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {telegram.isTelegram ? 'Open in Telegram' : 'Get started free'}
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
