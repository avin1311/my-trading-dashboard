'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Star, X, TrendingUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SIG_BG } from '@/lib/formatters';
import { useWatchlist, type WatchlistItem } from '../watchlist';

interface WatchlistTabProps {
  onSelectStock: (sym: string, type: string) => void;
  selectedSymbol: string;
}

interface WatchlistQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  signal: string | null;
}

export function WatchlistTab({ onSelectStock, selectedSymbol }: WatchlistTabProps) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const [quotes, setQuotes] = useState<Record<string, WatchlistQuote>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Fetch quotes for all watchlisted stocks (max 3 concurrent)
  const fetchQuotes = useCallback(async (items: WatchlistItem[]) => {
    if (items.length === 0) {
      setQuotes({});
      return;
    }
    setLoading(prev => {
      const next = { ...prev };
      items.forEach(i => { next[i.symbol] = true; });
      return next;
    });

    // Process in batches of 3
    for (let i = 0; i < items.length; i += 3) {
      const batch = items.slice(i, i + 3);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const res = await fetch(`/api/stock-detail?symbol=${item.symbol}`);
          const data = await res.json();
          return {
            symbol: item.symbol,
            quote: data.quote ? {
              symbol: item.symbol,
              name: data.quote.name || data.quote.longName || item.symbol,
              price: data.quote.price,
              change: data.quote.change,
              changePct: data.quote.changePct,
              signal: data.technicals?.signal || 'HOLD',
            } : null,
          };
        })
      );

      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value.quote) {
          setQuotes(prev => ({ ...prev, [r.value.symbol]: r.value.quote }));
        }
      });

      // Small delay between batches
      if (i + 3 < items.length) {
        await new Promise(res => setTimeout(res, 500));
      }
    }

    setLoading(prev => {
      const next = { ...prev };
      items.forEach(i => { next[i.symbol] = false; });
      return next;
    });
  }, []);

  // Ref to track if we already fetched for current watchlist
  const fetchedRef = useRef<string>('');
  useEffect(() => {
    const key = watchlist.map(w => w.symbol).join(',');
    if (key === fetchedRef.current) return;
    fetchedRef.current = key;
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const id = requestAnimationFrame(() => { fetchQuotes(watchlist); });
    return () => cancelAnimationFrame(id);
  }, [watchlist, fetchQuotes]);

  if (watchlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Star className="w-12 h-12 text-slate-700 mb-4" />
        <h3 className="text-sm font-semibold text-slate-400">No stocks in watchlist</h3>
        <p className="text-xs text-slate-600 mt-1">Click the star icon next to a stock name to add it here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {watchlist.map(item => {
        const q = quotes[item.symbol];
        const isLoading = loading[item.symbol];
        const isSelected = item.symbol === selectedSymbol;

        return (
          <div
            key={item.symbol}
            className={cn(
              'relative rounded-xl border p-3.5 cursor-pointer transition-all hover:border-slate-700 group',
              isSelected
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-900/50'
            )}
            onClick={() => onSelectStock(item.symbol, item.type)}
          >
            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFromWatchlist(item.symbol);
              }}
              className="absolute top-2 right-2 p-1 rounded-md text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Remove from watchlist"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500/70" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{item.symbol}</div>
                {q && (
                  <div className="text-[9px] text-slate-500 truncate">{q.name}</div>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />
              </div>
            ) : q ? (
              <div className="space-y-1.5">
                <div className="text-base font-extrabold font-mono text-white">
                  {q.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-[11px] font-semibold font-mono',
                    q.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    {q.changePct >= 0 ? '+' : ''}{q.changePct.toFixed(2)}%
                  </span>
                  {q.signal && (
                    <Badge
                      variant="outline"
                      className={cn('text-[7px] px-1.5 py-0', SIG_BG[q.signal] || SIG_BG.HOLD)}
                    >
                      {q.signal}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 py-1">Loading...</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
