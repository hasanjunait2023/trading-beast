import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userApi } from '../services/api';
import { List, Trash2, Search, X, Check, ArrowUp, ArrowDown } from 'lucide-react';

const AVAILABLE_PAIRS = [
  'EUR/USD', 'EUR/GBP', 'EUR/AUD', 'EUR/NZD', 'EUR/CAD', 'EUR/CHF', 'EUR/JPY',
  'GBP/USD', 'GBP/AUD', 'GBP/NZD', 'GBP/CAD', 'GBP/CHF', 'GBP/JPY',
  'AUD/USD', 'AUD/NZD', 'AUD/CAD', 'AUD/CHF', 'AUD/JPY',
  'NZD/USD', 'NZD/CAD', 'NZD/CHF', 'NZD/JPY',
  'USD/CAD', 'USD/CHF', 'USD/JPY',
  'CAD/CHF', 'CAD/JPY', 'CHF/JPY',
  'Gold', 'Silver', 'Oil', 'Bitcoin'
];

export default function Watchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>(user?.watchlist || []);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.watchlist) setWatchlist(user.watchlist);
  }, [user?.watchlist]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await userApi.updateWatchlist(watchlist);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save watchlist:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addPair = (pair: string) => {
    if (!watchlist.includes(pair) && watchlist.length < 50) {
      setWatchlist([...watchlist, pair]);
    }
  };

  const removePair = (pair: string) => {
    setWatchlist(watchlist.filter(p => p !== pair));
  };

  const movePair = (index: number, direction: 'up' | 'down') => {
    const newList = [...watchlist];
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (targetIndex >= 0 && targetIndex < newList.length) {
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      setWatchlist(newList);
    }
  };

  const filteredPairs = AVAILABLE_PAIRS.filter(p =>
    !watchlist.includes(p) && p.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold">Watchlist</h1>
          <p className="text-[var(--color-text-muted)]">Manage your custom pair list for personalized analysis</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
          {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Current Watchlist */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Your Watchlist ({watchlist.length}/50)</h2>
          {watchlist.length === 0 && (
            <span className="text-sm text-[var(--color-text-muted)]">Empty — add pairs from below</span>
          )}
        </div>

        {watchlist.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-text-muted)]">
            <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Your watchlist is empty</p>
            <p className="text-sm mt-1">Search and add pairs from the available list below</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {watchlist.map((pair, index) => (
              <div key={pair} className="flex items-center gap-3 p-3 bg-[var(--color-bg)] rounded-lg">
                <button
                  onClick={() => movePair(index, 'up')}
                  disabled={index === 0}
                  className="btn btn-ghost btn-sm p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                  aria-label="Move up"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => movePair(index, 'down')}
                  disabled={index === watchlist.length - 1}
                  className="btn btn-ghost btn-sm p-1 text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                  aria-label="Move down"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <span className="font-mono font-medium flex-1 text-left">{pair}</span>
                <button
                  onClick={() => removePair(pair)}
                  className="btn btn-ghost btn-sm p-1 text-red-400 hover:text-red-300"
                  aria-label={`Remove ${pair}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Pairs */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Available Pairs</h2>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              className="input pl-10 w-full"
              placeholder="Search pairs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-2 md:grid-3 lg:grid-4 gap-2 max-h-96 overflow-y-auto">
          {filteredPairs.map((pair) => (
            <button
              key={pair}
              onClick={() => addPair(pair)}
              className="btn btn-secondary justify-start gap-2 text-left p-3 hover:bg-[var(--color-accent)]/10 hover:border-[var(--color-accent)]/30 transition-colors"
            >
              <span className="font-mono font-medium">{pair}</span>
              <Check className="w-4 h-4 text-[var(--color-success)]" />
            </button>
          ))}
          {filteredPairs.length === 0 && (
            <div className="col-span-full text-center py-8 text-[var(--color-text-muted)]">
              <X className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No matching pairs found</p>
            </div>
          )}
        </div>

        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Tip: Your watchlist is used for personalized /focus analysis. Free tier gets 3 pairs, Pro gets full list.
        </p>
      </div>
    </div>
  );
}