'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WatchlistItem {
  symbol: string;
  type: string;
}

const STORAGE_KEY = 'nse_watchlist';

function readStorage(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: WatchlistItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const addToWatchlist = useCallback((symbol: string, type: string) => {
    setWatchlist(prev => {
      if (prev.some(w => w.symbol === symbol)) return prev;
      const next = [...prev, { symbol, type }];
      writeStorage(next);
      return next;
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      const next = prev.filter(w => w.symbol !== symbol);
      writeStorage(next);
      return next;
    });
  }, []);

  const isInWatchlist = useCallback((symbol: string) => {
    return watchlist.some(w => w.symbol === symbol);
  }, [watchlist]);

  return { watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist };
}
