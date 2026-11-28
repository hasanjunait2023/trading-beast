import { useEffect, useRef, useState } from 'react';
import { ChartPanel } from '@shared/components/ChartPanel';
import { Skeleton } from '@shared/components/Skeleton';
import { TRADINGVIEW_WIDGET_SRC } from '../utils/tradingview';

/**
 * TradingView Advanced Real-Time Chart — the FREE embeddable widget
 * (https://www.tradingview.com/widgets/advanced-chart/). The widget script
 * is loaded lazily, only when a Pair Detail mounts this component (Pair
 * Detail itself ships in the lazy Markets chunk, so the entry bundle is
 * untouched). If the script is blocked / offline, or no iframe appears
 * within the load window, we fall back to the honest chart-unavailable
 * card — never a fake chart.
 */

type LoadState = 'loading' | 'ready' | 'failed';

const LOAD_TIMEOUT_MS = 12_000;

export function TradingViewChart({
  symbol,
  interval,
  theme,
  title,
}: {
  /** Fully mapped TradingView symbol, e.g. "FX:EURUSD". */
  symbol: string;
  /** Widget interval code: "15" | "60" | "240". */
  interval: string;
  theme: 'light' | 'dark';
  title: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setState('loading');
    host.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    container.appendChild(widget);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = TRADINGVIEW_WIDGET_SRC;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);
    host.appendChild(container);

    let settled = false;
    const finish = (next: LoadState) => {
      if (settled) return;
      settled = true;
      setState(next);
    };

    // The widget injects an <iframe> into the container once it boots.
    const observer = new MutationObserver(() => {
      if (container.querySelector('iframe')) finish('ready');
    });
    observer.observe(container, { childList: true, subtree: true });
    if (container.querySelector('iframe')) finish('ready');

    script.onerror = () => finish('failed');
    const timer = window.setTimeout(() => {
      if (!container.querySelector('iframe')) finish('failed');
    }, LOAD_TIMEOUT_MS);

    return () => {
      settled = true;
      observer.disconnect();
      window.clearTimeout(timer);
      host.innerHTML = '';
    };
  }, [symbol, interval, theme]);

  if (state === 'failed') {
    return (
      <ChartPanel
        state="unavailable"
        title={title}
        unavailableReason="The live TradingView chart couldn't load (connection or content blocker). The scan evidence below is the data this result is based on."
        className="border-0 p-0 shadow-none"
      />
    );
  }

  return (
    <div>
      <div className="relative h-[440px] w-full overflow-hidden rounded-[var(--radius-md)]">
        <div ref={hostRef} className="absolute inset-0" />
        {state === 'loading' && (
          <div className="absolute inset-0" role="status" aria-label="Loading chart">
            <Skeleton height={440} />
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm font-semibold text-[var(--color-text-muted)]">
              Loading live chart…
            </p>
          </div>
        )}
      </div>
      <p className="mt-1.5 text-right text-[11px] text-[var(--color-text-muted)]">
        Chart by{' '}
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--color-link)]"
        >
          TradingView
        </a>{' '}
        — live market data, not the scan's candles.
      </p>
    </div>
  );
}
