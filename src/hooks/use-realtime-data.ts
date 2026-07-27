'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LiveTick {
  instrumentKey: string;
  symbol: string;
  ltp: number;
  lt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
  oi?: number;
  bestBuyPrice?: number;
  bestSellPrice?: number;
}

interface RealtimeState {
  connected: boolean;          // Socket.io connected to bridge
  upstoxConnected: boolean;    // Bridge connected to Upstox WS
  authorized: boolean;         // Token has been sent
  liveTicks: Map<string, LiveTick>;
  lastTickTime: string;
}

export function useRealtimeData(symbols: string[]) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [upstoxConnected, setUpstoxConnected] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [liveTicks, setLiveTicks] = useState<Map<string, LiveTick>>(new Map());
  const [lastTickTime, setLastTickTime] = useState('');
  const symbolsRef = useRef<string[]>(symbols);
  const initializedRef = useRef(false);

  // Keep symbols ref in sync
  useEffect(() => {
    symbolsRef.current = symbols;
    // If socket is connected, subscribe to new symbols
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { symbols });
    }
  }, [symbols]);

  // Initialize Socket.io connection once
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 15000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      // Re-authorize and subscribe on reconnect
      authorizeAndSubscribe(socket);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('upstox-status', (data: { connected: boolean; authorized?: boolean; error?: string }) => {
      setUpstoxConnected(data.connected);
      if (data.authorized !== undefined) setAuthorized(data.authorized);
      if (data.error) {
        console.warn('[Realtime] Upstox error:', data.error);
      }
    });

    socket.on('tick', (tick: LiveTick) => {
      setLiveTicks(prev => {
        const next = new Map(prev);
        next.set(tick.symbol, tick);
        // Keep map size bounded (max 200 symbols)
        if (next.size > 200) {
          const oldest = next.keys().next().value;
          if (oldest) next.delete(oldest);
        }
        return next;
      });
      setLastTickTime(tick.lt || new Date().toLocaleTimeString('en-IN'));
    });

    socket.on('subscribed', () => {
      // Acknowledged
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const authorizeAndSubscribe = useCallback(async (socket: Socket) => {
    try {
      // Get token from our API
      const res = await fetch('/api/upstox/token');
      if (!res.ok) return;
      const data = await res.json();
      if (data.token) {
        socket.emit('set-token', { token: data.token });
        setAuthorized(true);
        // Subscribe to all tracked symbols
        setTimeout(() => {
          socket.emit('subscribe', { symbols: symbolsRef.current });
        }, 500);
      }
    } catch (err) {
      console.warn('[Realtime] Failed to get token:', err);
    }
  }, []);

  // Manual connect trigger (called after OAuth callback)
  const connectUpstox = useCallback(async () => {
    if (!socketRef.current) return;
    await authorizeAndSubscribe(socketRef.current);
  }, [authorizeAndSubscribe]);

  const disconnectUpstox = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe', { symbols: [...liveTicks.keys()] });
    }
    setAuthorized(false);
    setUpstoxConnected(false);
  }, [liveTicks]);

  // Get live price for a symbol
  const getLivePrice = useCallback((symbol: string): LiveTick | null => {
    return liveTicks.get(symbol) || null;
  }, [liveTicks]);

  return {
    connected,
    upstoxConnected,
    authorized,
    liveTicks,
    lastTickTime,
    connectUpstox,
    disconnectUpstox,
    getLivePrice,
  };
}
