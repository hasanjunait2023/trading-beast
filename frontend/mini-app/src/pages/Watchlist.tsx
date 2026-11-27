import { useState, useEffect } from 'react';
import { List, Check, Search, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { analysisApi, userApi } from '../services/api';
import { haptics } from '../telegram';

// Fallback list (same pairs as user-portal) if /api/analysis/pairs fails.
const FALLBACK_PAIRS = [
  'EUR/USD', 'EUR/GBP', 'EUR/AUD', 'EUR/NZD', 'EUR/CAD', 'EUR/CHF', 'EUR/JPY',
  'GBP/USD', 'GBP/AUD', 'GBP/NZD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY',
  'AUD/USD', 'AUD/NZD', 'AUD/CAD', 'AUD/CHF', 'AUD/JPY',
  'NZD/USD', 'NZD/CAD', 'NZD/CHF', 'NZD/JPY',
  'USD/CAD', 'USD/CHF', 'USD/JPY',
  'CAD/CHF', 'CAD/JPY', 'CHF/JPY',
  'Gold', 'Silver', 'Oil', 'Bitcoin',
];

export default function Watchlist() {
  const { user, setWatchlistLocal } = useAuth();
  const [pairs, setPairs] = useState<string[]>(FALLBACK_PAIRS);
  const [selected, setSelected] = useState<string[]>(user?.watchlist ?? []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.watchlist) setSelected(user.watchlist);
  }, [user?.watchlist]);

  useEffect(() => {
    analysisApi
      .getPairs()
      .then((r) => {
        if (r.data.success && Array.isArray(r.data.data) && r.data.data.length) {
          setPairs([...new Set(r.data.data as string[])]);
        }
      })
      .catch(() => {
        /* keep fallback list */
      });
  }, []);

  const toggle = (pair: string) => {
    haptics.selection();
    setSaved(false);
    setSelected((prev) => {
      if (prev.includes(pair)) return prev.filter((p) => p !== pair);
      if (prev.length >= 50) return prev;
      return [...prev, pair];
    });
  };

  const save = async () => {
    // Backend schema requires 1–50 pairs (z.array.min(1).max(50)).
    if (selected.length === 0) {
      setError('Select at least one pair — the watchlist cannot be empty.');
      haptics.notification('warning');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await userApi.updateWatchlist(selected);
      if (res.data.success) {
        setWatchlistLocal(res.data.data.watchlist ?? selected);
        setSaved(true);
        haptics.notification('success');
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError('Failed to save watchlist. Try again.');
      haptics.notification('error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = pairs.filter((p) =>
    p.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fade-in px-4">
      <div>
        <h1 className="text-xl">Watchlist</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Pairs used for your personalised Radar runs ({selected.length}/50)
        </p>
      </div>

      <div className="relative">
        <Search
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <input
          className="input"
          style={{ paddingLeft: 36 }}
          placeholder="Search pairs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span
              key={p}
              className="badge"
              style={{
                background: 'rgba(79,109,255,0.15)',
                color: 'var(--color-link)',
                textTransform: 'none',
                fontSize: 12,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      )}

      <div className="card space-y-1" style={{ padding: 8 }}>
        {filtered.length === 0 && (
          <p className="text-center py-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No matching pairs found
          </p>
        )}
        {filtered.map((pair) => {
          const active = selected.includes(pair);
          return (
            <button
              key={pair}
              onClick={() => toggle(pair)}
              aria-pressed={active}
              className="w-full flex items-center justify-between p-3 rounded-lg border-none text-left"
              style={{
                background: active ? 'rgba(79,109,255,0.12)' : 'transparent',
                color: 'var(--color-text)',
              }}
            >
              <span className="font-mono font-medium text-sm">{pair}</span>
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: active ? 'var(--color-accent)' : 'transparent',
                  border: active
                    ? '1px solid transparent'
                    : '1px solid var(--color-border)',
                  color: '#fff',
                }}
              >
                {active && <Check className="w-4 h-4" />}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      )}

      <button className="btn-primary" onClick={() => void save()} disabled={saving}>
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Watchlist'}
      </button>
      <p className="text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        Free tier analyses the first 3 watchlist pairs; Pro uses the full list.
      </p>
    </div>
  );
}
