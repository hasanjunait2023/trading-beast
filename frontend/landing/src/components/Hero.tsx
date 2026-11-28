import { useRef } from 'react';
import { Send, ArrowDown, Coins, Radar, Clock3 } from 'lucide-react';
import { useTelegramLinks, telegramLinkProps } from '../services/telegram';

/**
 * Hero: emerald gradient panel (handoff §2 hero #054333 -> #007959) showing
 * the real product interface — the design package's Home screen study — in a
 * phone frame. Subtle pointer tilt, transform-only, disabled under
 * prefers-reduced-motion and for touch pointers.
 */
export function Hero() {
  const telegram = useTelegramLinks();
  const frameRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = frameRef.current;
    if (!el || e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
  };
  const onLeave = () => {
    if (frameRef.current) frameRef.current.style.transform = '';
  };

  return (
    <section id="top" className="px-3 pt-[84px] sm:px-5" aria-labelledby="hero-heading">
      <div
        className="mx-auto max-w-7xl overflow-hidden rounded-[28px] text-white"
        style={{ background: 'var(--grad-hero)' }}
      >
        <div className="grid items-center gap-10 px-6 py-14 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-14 lg:py-20">
          <div>
            <p
              className="mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold tracking-wide uppercase"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#c9f2e2' }}
            >
              <Radar className="h-4 w-4" aria-hidden="true" />
              Session Focus Radar
            </p>
            <h1
              id="hero-heading"
              className="text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem]"
            >
              Know which pairs deserve your focus — before the session starts.
            </h1>
            <p
              className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: '#d7efe6' }}
            >
              TradingBeast scores the pair list for the Asian, London and New York sessions and
              ranks it into Focus, Watch and Avoid — every score shown as points out of 100, with
              its bias and the indicator evidence behind it. No signals. No hype. Just
              preparation, inside Telegram.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={telegram.primaryHref}
                {...telegramLinkProps(telegram)}
                className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white px-7 text-base font-semibold transition-transform hover:-translate-y-0.5"
                style={{ color: '#054333' }}
              >
                <Send className="h-5 w-5" aria-hidden="true" />
                {telegram.isTelegram ? 'Open the Telegram bot' : 'Get started free'}
              </a>
              <a
                href="#how-it-works"
                className="inline-flex min-h-[52px] items-center gap-2 rounded-full px-7 text-base font-semibold text-white"
                style={{ border: '1px solid rgba(255,255,255,0.45)' }}
              >
                How it works
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm" style={{ color: '#c9f2e2' }}>
              <li className="inline-flex items-center gap-2">
                <Coins className="h-4 w-4" aria-hidden="true" />
                Free: 10 credits a day — they never expire
              </li>
              <li className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                One Radar run costs 10 credits
              </li>
            </ul>
          </div>

          <div className="tilt-wrap mx-auto w-full max-w-[340px] lg:max-w-[380px]">
            <div ref={frameRef} className="tilt" onPointerMove={onMove} onPointerLeave={onLeave}>
              <figure className="phone-frame" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>
                <img
                  src="/img/app-home.webp"
                  alt="TradingBeast Mini App home screen: current session status, credit balance and the Open Radar action"
                  width={560}
                  height={995}
                  fetchPriority="high"
                />
              </figure>
            </div>
            <p className="mt-4 text-center text-xs" style={{ color: '#a9d8c6' }}>
              The TradingBeast Mini App interface.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
