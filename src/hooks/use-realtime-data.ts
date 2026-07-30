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

export function useRealtimeData(symbols: string[]) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const [upstoxConnected, setUpstoxConnected] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveTicks, setLiveTicks] = useState<Map<string, LiveTick>>(new Map());
  const [lastTickTime, setLastTickTime] = useState('');
  const symbolsRef = useRef<string[]>(symbols);
  const mountedRef = useRef(true);

  // Keep symbols ref in sync
  useEffect(() => {
    symbolsRef.current = symbols;
  }, [symbols]);

  // Reconnect SSE when symbols change (so server subscribes to new ones)
  useEffect(() => {
    if (!mountedRef.current) return;
    // Don't reconnect on very first mount — the main effect handles that
    // Only reconnect if we already have an SSE connection
    if (!eventSourceRef.current) return;

    // Close old and open new with updated symbols
    eventSourceRef.current.close();
    eventSourceRef.current = null;

    const syms = symbolsRef.current.join(',');
    const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;
    attachSSEHandlers(es);
  }, [symbols]);

  // Attach event handlers to an EventSource
  const attachSSEHandlers = useCallback((es: EventSource) => {
    es.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
    };

    es.onerror = () => {
      if (!mountedRef.current) return;
      setConnected(false);
    };

    es.addEventListener('tick', (event) => {
      if (!mountedRef.current) return;
      try {
        const tick: LiveTick = JSON.parse(event.data);
        setLiveTicks(prev => {
          const next = new Map(prev);
          next.set(tick.symbol, tick);
          if (next.size > 200) {
            const oldest = next.keys().next().value;
            if (oldest) next.delete(oldest);
          }
          return next;
        });
        setLastTickTime(tick.lt || new Date().toLocaleTimeString('en-IN'));
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener('status', (event) => {
      if (!mountedRef.current) return;
      try {
        const status = JSON.parse(event.data);
        // Only upgrade to connected, never downgrade — the poll handles downgrade
        if (status.connected || status.authorized) {
          setUpstoxConnected(true);
        }
        if (status.authorized) setWsConnected(true);
        else setWsConnected(false);
      } catch { /* ignore */ }
    });
  }, []);

  // Main SSE connection — connect on mount, poll /api/upstox/status for token check
  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      const syms = symbolsRef.current.join(',');
      const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      attachSSEHandlers(es);
    }

    connect();

    // Immediately check Upstox status on mount (don't wait 10s)
    (async () => {
      try {
        const res = await fetch('/api/upstox/status');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setUpstoxConnected(true);
            // Reconnect SSE to subscribe with Upstox data
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
            }
            const syms = symbolsRef.current.join(',');
            const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
            const es = new EventSource(url);
            eventSourceRef.current = es;
            attachSSEHandlers(es);
          }
        }
      } catch { /* ignore */ }
    })();

    // Poll Upstox token status every 10s
    // This is the ONLY source that can set upstoxConnected back to false
    const statusPoll = setInterval(async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch('/api/upstox/status');
        if (res.ok) {
          const data = await res.json();
          setUpstoxConnected(!!data.connected);
          setWsConnected(!!data.wsConnected);
        }
      } catch { /* ignore */ }
    }, 10000);

    return () => {
      mountedRef.current = false;
      clearInterval(statusPoll);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Handle OAuth callback — reconnect SSE after Upstox token is stored
  const connectUpstox = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setConnected(false);
    setUpstoxConnected(false);
    // Delay to let the server-side token be stored
    setTimeout(() => {
      if (!mountedRef.current) return;
      const syms = symbolsRef.current.join(',');
      const url = `/api/realtime?symbols=${encodeURIComponent(syms)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;
      attachSSEHandlers(es);
    }, 2000);
  }, [attachSSEHandlers]);

  // Get live price for a symbol
  const getLivePrice = useCallback((symbol: string): LiveTick | null => {
    return liveTicks.get(symbol) || null;
  }, [liveTicks]);

  return {
    connected,
    upstoxConnected,
    wsConnected,
    liveTicks,
    lastTickTime,
    connectUpstox,
    getLivePrice,
  };
}
