import { useEffect, useRef } from 'react';
import { useTheme } from '@shared/theme';

/**
 * TradingView Advanced Real-Time Chart — the FREE embeddable widget
 * (Conversion chapter). Loads TradingView's own external-embedding script
 * and lets it render into a container we own; no chart data passes through
 * our backend and no symbol is guessed — the caller supplies the mapped
 * symbol from utils/tradingView.ts.
 *
 * Failure handling: if the script errors (blocked CDN, offline) or no
 * iframe appears within the load window, `onFail` fires and the caller
 * falls back to the honest unavailable chart card.
 */

const WIDGET_SRC =
  'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
const LOAD_TIMEOUT_MS = 15000;

export interface TradingViewChartProps {
  /** Exchange-prefixed symbol, e.g. "FX:EURUSD". */
  symbol: string;
  /** Widget interval code: "15" | "60" | "240". */
  interval: string;
  /** IANA timezone for the chart clock, e.g. "Asia/Dhaka". */
  timezone: string;
  onFail: () => void;
}

export function TradingViewChart({ symbol, interval, timezone, onFail }: TradingViewChartProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = WIDGET_SRC;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone,
      theme,
      style: '1',
      locale: 'en',
      allow_symbol_change: false,
      hide_side_toolbar: false,
      withdateranges: false,
      support_host: 'https://www.tradingview.com',
    });
    script.onerror = () => {
      if (!cancelled) onFailRef.current();
    };
    container.appendChild(script);

    // The widget replaces the container content with an iframe once it
    // boots; if that never happens (script blocked silently), fall back.
    const timer = window.setTimeout(() => {
      if (!cancelled && !container.querySelector('iframe')) {
        onFailRef.current();
      }
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      container.innerHTML = '';
    };
  }, [symbol, interval, timezone, theme]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full overflow-hidden rounded-[var(--radius-md)]"
      style={{ height: 520 }}
      role="img"
      aria-label={`TradingView chart for ${symbol}, interval ${interval}`}
    />
  );
}
