'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface LiveTick {
  symbol: string;
  instrumentKey: string;
  ltp: number;
  lt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
  change: number;
  oi?: number;
  bestBuyPrice?: number;
  bestSellPrice?: number;
  timestamp: number;
}

interface RealtimeState {
  connected: boolean;
  upstoxConnected: boolean;
  liveTicks: Map<string, LiveTick>;
  lastTickTime: string;
}

export function useRealtimeData(symbols: string[]) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const [upstoxConnected, setUpstoxConnected] = useState(false);
  const [liveTicks, setLiveTicks] = useState<Map<string, LiveTick>>(new Map());
  const [lastTickTime, setLastTickTime] = useState('');
  const symbolsRef = useRef<string[]>(symbols);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Keep symbols ref in sync
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  // Main SSE connection effect
  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const syms = symbolsRef.current.join(',');
      const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // EventSource auto-reconnects, but we also clean up state
      };

      // Listen for tick events
      es.addEventListener('tick', (event) => {
        if (!mountedRef.current) return;
        try {
          const tick: LiveTick = JSON.parse(event.data);
          setLiveTicks(prev => {
            const next = new Map(prev);
            next.set(tick.symbol, tick);
            // Keep map bounded (max 200 symbols)
            if (next.size > 200) {
              const oldest = next.keys().next().value;
              if (oldest) next.delete(oldest);
            }
            return next;
          });
          setLastTickTime(tick.lt || new Date().toLocaleTimeString('en-IN'));
        } catch { /* ignore parse errors */ }
      });

      // Listen for status events
      es.addEventListener('status', (event) => {
        if (!mountedRef.current) return;
        try {
          const status = JSON.parse(event.data);
          setUpstoxConnected(status.connected);
        } catch { /* ignore */ }
      });
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []); // Connect once on mount

  // Manual connect trigger (called after OAuth callback)
  const connectUpstox = useCallback(() => {
    // Reconnect the SSE with fresh state
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setConnected(false);
    // Small delay to let the callback set the token
    setTimeout(() => {
      if (!mountedRef.current) return;
      const syms = symbolsRef.current.join(',');
      const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => { if (mountedRef.current) setConnected(true); };
      es.onerror = () => { if (mountedRef.current) setConnected(false); };

      es.addEventListener('tick', (event) => {
        if (!mountedRef.current) return;
        try {
          const tick: LiveTick = JSON.parse(event.data);
          setLiveTicks(prev => {
            const next = new Map(prev);
            next.set(tick.symbol, tick);
            return next;
          });
          setLastTickTime(tick.lt || new Date().toLocaleTimeString('en-IN'));
        } catch { /* ignore */ }
      });

      es.addEventListener('status', (event) => {
        if (!mountedRef.current) return;
        try {
          const status = JSON.parse(event.data);
          setUpstoxConnected(status.connected);
        } catch { /* ignore */ }
      });
    }, 1000);
  }, []);

  // Get live price for a symbol
  const getLivePrice = useCallback((symbol: string): LiveTick | null => {
    return liveTicks.get(symbol) || null;
  }, [liveTicks]);

  return {
    connected,
    upstoxConnected,
    liveTicks,
    lastTickTime,
    connectUpstox,
    getLivePrice,
  };
}
