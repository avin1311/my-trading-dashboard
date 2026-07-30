// Upstox v2 WebSocket Manager — Singleton
// Maintains a single WS connection to Upstox, fans out ticks to SSE subscribers

import { getUpstoxToken } from './upstox-client';
import { toInstrumentKey } from './instrument-keys';

// ==================== TYPES ====================

export interface LiveTick {
  symbol: string;          // RELIANCE, NIFTY, etc.
  instrumentKey: string;   // NSE_EQ|RELIANCE
  ltp: number;
  lt: string;              // Last trade time
  open: number;
  high: number;
  low: number;
  close: number;           // Previous close
  volume: number;
  changePct: number;
  change: number;
  oi?: number;
  bestBuyPrice?: number;
  bestSellPrice?: number;
  timestamp: number;       // epoch ms when we received this
}

type TickListener = (tick: LiveTick) => void;
type StatusListener = (status: { connected: boolean; authorized: boolean; error?: string }) => void;

// ==================== SINGLETON ====================

class UpstoxWSManager {
  private ws: WebSocket | null = null;
  private tickListeners: Set<TickListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private subscribedSymbols: Set<string> = new Set();
  private subscribedKeys: Set<string> = new Set();
  private latestTicks: Map<string, LiveTick> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _connected = false;
  private _authorized = false;
  private _destroyed = false;
  private guidCounter = 0;

  // ==================== PUBLIC API ====================

  get connected() { return this._connected; }
  get authorized() { return this._authorized; }
  get ticks() { return this.latestTicks; }

  /**
   * Connect to Upstox WebSocket. Call this after OAuth token is stored.
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    if (this._destroyed) return;

    const token = getUpstoxToken();
    if (!token) {
      console.log('[UpstoxWS] No token available — cannot connect');
      this.emitStatus({ connected: false, authorized: false, error: 'No Upstox token. Connect via OAuth first.' });
      return;
    }

    console.log('[UpstoxWS] Connecting with token...');

    this.emitStatus({ connected: false, authorized: true });

    try {
      this.ws = new WebSocket('wss://api.upstox.com/v2/feed/market-data-feed', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-version': '2.0',
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      console.error('[UpstoxWS] Failed to create WebSocket:', (err as Error).message);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[UpstoxWS] Connected');
      this._connected = true;
      this._authorized = true;
      this.emitStatus({ connected: true, authorized: true });

      // Start heartbeat
      this.heartbeatTimer = setInterval(() => this.heartbeat(), 25000);

      // Re-subscribe to all tracked symbols
      if (this.subscribedSymbols.size > 0) {
        this.subscribeInternal([...this.subscribedSymbols]);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(data);
      } catch {
        // Non-JSON message, ignore
      }
    };

    this.ws.onerror = (event) => {
      console.error('[UpstoxWS] WebSocket error — may indicate auth failure or network issue');
    };

    this.ws.onclose = (event) => {
      console.log(`[UpstoxWS] Closed: code=${event.code} reason=${event.reason || 'none'}`);
      this._connected = false;
      this.cleanup();
      this.emitStatus({ connected: false, authorized: false, error: `Disconnected (code ${event.code})` });
      if (!this._destroyed) {
        this.scheduleReconnect();
      }
    };
  }

  /**
   * Subscribe to real-time data for given NSE symbols (e.g. RELIANCE, NIFTY, BANKNIFTY)
   */
  subscribe(symbols: string[]): void {
    const newSymbols = symbols.filter(s => !this.subscribedSymbols.has(s));
    if (newSymbols.length === 0) return;

    for (const s of newSymbols) {
      this.subscribedSymbols.add(s);
    }

    if (this._connected && this.ws?.readyState === WebSocket.OPEN) {
      this.subscribeInternal(newSymbols);
    }
  }

  /**
   * Unsubscribe from symbols
   */
  unsubscribe(symbols: string[]): void {
    const keysToRemove: string[] = [];
    for (const s of symbols) {
      const key = toInstrumentKey(s);
      if (key) {
        this.subscribedKeys.delete(key);
        keysToRemove.push(key);
        this.subscribedSymbols.delete(s);
        this.latestTicks.delete(s);
      }
    }

    if (keysToRemove.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      this.guidCounter++;
      this.ws.send(JSON.stringify({
        guid: `unsub_${this.guidCounter}`,
        method: 'unsub',
        data: { instrumentKeys: keysToRemove },
      }));
    }
  }

  /**
   * Register a listener for live ticks
   */
  onTick(listener: TickListener): () => void {
    this.tickListeners.add(listener);
    return () => this.tickListeners.delete(listener);
  }

  /**
   * Register a listener for connection status changes
   */
  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Emit current status immediately
    listener({ connected: this._connected, authorized: this._authorized });
    return () => this.statusListeners.delete(listener);
  }

  /**
   * Get latest tick for a symbol (synchronous)
   */
  getTick(symbol: string): LiveTick | null {
    return this.latestTicks.get(symbol) || null;
  }

  /**
   * Destroy the manager (stop reconnect, cleanup)
   */
  destroy(): void {
    this._destroyed = true;
    this.cleanup();
    this.tickListeners.clear();
    this.statusListeners.clear();
  }

  // ==================== INTERNAL ====================

  private subscribeInternal(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const keys: string[] = [];
    for (const s of symbols) {
      const key = toInstrumentKey(s);
      if (key) {
        this.subscribedKeys.add(key);
        keys.push(key);
      }
    }

    if (keys.length === 0) return;

    // Upstox allows max 100 instrument keys per subscribe message
    const BATCH_SIZE = 100;
    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batch = keys.slice(i, i + BATCH_SIZE);
      this.guidCounter++;
      this.ws.send(JSON.stringify({
        guid: `sub_${this.guidCounter}`,
        method: 'sub',
        data: { instrumentKeys: batch },
      }));
    }

    console.log(`[UpstoxWS] Subscribed to ${keys.length} instruments:`, symbols.join(', '));
  }

  private handleMessage(data: any): void {
    // Handle subscription acknowledgment
    if (data.method === 'sub' && data.status === 'success') {
      return;
    }

    // Handle heartbeat response
    if (data.method === 'hb') {
      return;
    }

    // Handle error
    if (data.error) {
      console.error('[UpstoxWS] Error from server:', data.error);
      return;
    }

    // Handle feed data
    const feeds = data.feeds;
    if (!feeds) return;

    for (const [instrumentKey, feedData] of Object.entries(feeds)) {
 const feed = feedData as any;
      const symbol = this.extractSymbol(instrumentKey);
      if (!symbol) continue;

      const ff = feed.ff; // full feed
      if (!ff) continue;

      const ltp = parseFloat(ff.ltp) || 0;
      const close = parseFloat(ff.ohlc?.close) || 0;
      const change = ltp - close;
      const changePct = close > 0 ? (change / close) * 100 : 0;

      const tick: LiveTick = {
        symbol,
        instrumentKey,
        ltp,
        lt: ff.ltt || new Date().toISOString().replace('T', ' ').slice(0, 19),
        open: parseFloat(ff.ohlc?.open) || 0,
        high: parseFloat(ff.ohlc?.high) || parseFloat(ff.hp) || 0,
        low: parseFloat(ff.ohlc?.low) || parseFloat(ff.lp) || 0,
        close,
        volume: parseInt(ff.v, 10) || 0,
        changePct: Math.round(changePct * 100) / 100,
        change: Math.round(change * 100) / 100,
        oi: ff.oi ? parseInt(ff.oi, 10) : undefined,
        bestBuyPrice: ff.b1p ? parseFloat(ff.b1p) : undefined,
        bestSellPrice: ff.s1p ? parseFloat(ff.s1p) : undefined,
        timestamp: Date.now(),
      };

      this.latestTicks.set(symbol, tick);

      // Notify all listeners
      for (const listener of this.tickListeners) {
        try { listener(tick); } catch { /* ignore listener errors */ }
      }
    }
  }

  /**
   * Extract our internal symbol name from Upstox instrument key
   * e.g. "NSE_EQ|RELIANCE" -> "RELIANCE", "NSE_INDEX|Nifty 50" -> "NIFTY"
   */
  private extractSymbol(instrumentKey: string): string | null {
    // Check known index name mappings
    const INDEX_MAP: Record<string, string> = {
      'Nifty 50': 'NIFTY',
      'Nifty Bank': 'BANKNIFTY',
      'Nifty IT': 'NIFTYIT',
      'Nifty Fin Service': 'FINNIFTY',
      'Nifty Next 50': 'NIFTYNXT50',
      'Nifty Midcap 50': 'MIDCPNIFTY',
      'India VIX': 'INDIAVIX',
    };

    for (const [upstoxName, ourSymbol] of Object.entries(INDEX_MAP)) {
      if (instrumentKey.includes(upstoxName)) return ourSymbol;
    }

    // For equities: NSE_EQ|RELIANCE -> RELIANCE
    const parts = instrumentKey.split('|');
    if (parts.length === 2) {
      return parts[1].trim();
    }

    return null;
  }

  private heartbeat(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ method: 'hb' }));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[UpstoxWS] Attempting reconnect...');
      this.connect();
    }, 5000);
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  private emitStatus(status: { connected: boolean; authorized: boolean; error?: string }): void {
    for (const listener of this.statusListeners) {
      try { listener(status); } catch { /* ignore */ }
    }
  }
}

// ==================== GLOBAL SINGLETON ====================
// Module-level singleton — persists across API route invocations in dev mode
// In production, each serverless function may get its own instance,
// but since we use SSE streaming, the connection lives for the request duration.

let _manager: UpstoxWSManager | null = null;

export function getWSManager(): UpstoxWSManager {
  if (!_manager) {
    _manager = new UpstoxWSManager();
  }
  return _manager;
}

export function ensureWSConnected(): void {
  const mgr = getWSManager();
  if (!mgr.connected) {
    mgr.connect();
  }
}
