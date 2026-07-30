// Pluggable Broker API Infrastructure
// Supports: NSE Direct (free, may 403), Zerodha Kite, Upstox (OAuth)
// Configure via environment variables - no code changes needed to switch provider

export type DataSource = 'nse' | 'zerodha' | 'upstox' | 'mock';

export interface OIProvider {
  name: string;
  fetchOptionChain(symbol: string, expiry?: string): Promise<any>;
  fetchFuturesData(symbol: string): Promise<any>;
  isAvailable(): boolean;
}

// ---- Provider Factory ----

export function getProvider(): OIProvider {
  const source = (process.env.OI_DATA_SOURCE || 'nse').toLowerCase() as DataSource;

  switch (source) {
    case 'zerodha': {
      const apiKey = process.env.ZERODHA_API_KEY;
      const accessToken = process.env.ZERODHA_ACCESS_TOKEN;
      if (apiKey && accessToken) return new ZerodhaProvider(apiKey, accessToken);
      console.warn('[OI] Zerodha configured but ZERODHA_API_KEY or ZERODHA_ACCESS_TOKEN missing, falling back to NSE');
      break;
    }
    case 'upstox': {
      // Use OAuth token if available (from connect flow), otherwise fall back to env var
      const token = getUpstoxOAuthToken();
      if (token) return new UpstoxProvider(token);
      console.warn('[OI] Upstox configured but no OAuth token available, falling back to NSE');
      break;
    }
    case 'mock':
      return new MockProvider();
  }

  // Default: NSE
  return new NSEProvider();
}

// ---- Get OAuth token from upstox-client ----
function getUpstoxOAuthToken(): string | null {
  try {
    // Dynamic import to avoid circular deps — upstox-client is server-only
    const { getUpstoxToken } = require('./upstox-client');
    return (getUpstoxToken as () => string | null)();
  } catch {
    return null;
  }
}

// ---- NSE Direct Provider ----

class NSEProvider implements OIProvider {
  name = 'nse';
  isAvailable() { return true; }

  async fetchOptionChain(symbol: string, expiry?: string) {
    const { isIndexSymbol, fetchIndexOptionChain, fetchStockOptionChain } = await import('@/lib/nse-option-chain');
    const isIdx = isIndexSymbol(symbol);
    return isIdx
      ? fetchIndexOptionChain(symbol)
      : fetchStockOptionChain(symbol);
  }

  async fetchFuturesData(symbol: string) {
    const { fetchFuturesData } = await import('@/lib/nse-option-chain');
    return fetchFuturesData(symbol);
  }
}

// ---- Zerodha Kite Provider ----

class ZerodhaProvider implements OIProvider {
  name = 'zerodha';
  private apiKey: string;
  private accessToken: string;

  constructor(apiKey: string, accessToken: string) {
    this.apiKey = apiKey;
    this.accessToken = accessToken;
  }

  isAvailable() {
    return !!(this.apiKey && this.accessToken);
  }

  async fetchOptionChain(symbol: string) {
    try {
      // Zerodha doesn't have a direct OC endpoint; use quote + instruments
      const url = `https://api.kite.trade/instruments?exchange=NFO&tradingsymbol=${symbol}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.accessToken}`,
          'X-Kite-Version': '3',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Zerodha ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[Zerodha] OC fetch failed:', (err as Error).message);
      return null;
    }
  }

  async fetchFuturesData(symbol: string) {
    try {
      const url = `https://api.kite.trade/quote?i=NFO:${symbol}FUT`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `token ${this.apiKey}:${this.accessToken}`,
          'X-Kite-Version': '3',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Zerodha ${res.status}`);
      const data = await res.json();
      return data?.data || null;
    } catch (err) {
      console.error('[Zerodha] Futures fetch failed:', (err as Error).message);
      return null;
    }
  }
}

// ---- Upstox Provider (OAuth-based) ----
// Uses the dynamic OAuth token from the connect flow instead of a static env var.
// Calls /v2/option/chain for option chain and /v2/market-quote/ohlc for futures.

class UpstoxProvider implements OIProvider {
  name = 'upstox';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  isAvailable() {
    return !!this.accessToken;
  }

  /**
   * Fetch option chain from Upstox /v2/option/chain.
   * Returns the raw `data` array from Upstox response.
   * Each item has: strike_price, expiry_date, option_type, open_interest,
   *   change_in_oi, volume, last_price, iv, change, buy_quantity, sell_quantity, etc.
   */
  async fetchOptionChain(symbol: string, expiry?: string) {
    try {
      // Upstox option chain needs the underlying instrument key.
      // For NSE F&O, format: NSE_INDEX|Nifty 50 or NSE_FO|<symbol>
      // But the /v2/option/chain endpoint accepts a simpler format.
      const { toInstrumentKey } = await import('./instrument-keys');
      const instrumentKey = toInstrumentKey(symbol);
      if (!instrumentKey) {
        console.error(`[Upstox OI] No instrument key for ${symbol}`);
        return null;
      }

      let url = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}`;
      if (expiry) {
        url += `&expiry_date=${encodeURIComponent(expiry)}`;
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
          'x-api-version': '2.0',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (res.status === 401) {
        console.error('[Upstox OI] Token expired (401)');
        return null;
      }
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error(`[Upstox OI] Option chain ${res.status}: ${errText}`);
        return null;
      }
      const json = await res.json();
      return json?.data || null;
    } catch (err) {
      console.error('[Upstox OI] Option chain fetch failed:', (err as Error).message);
      return null;
    }
  }

  /**
   * Fetch futures OI data from Upstox /v2/market-quote/ohlc.
   * Returns the raw quote data for futures contracts.
   */
  async fetchFuturesData(symbol: string) {
    try {
      // Try multiple futures expiry patterns
      const { toInstrumentKey } = await import('./instrument-keys');

      // For futures, we need the specific futures instrument keys
      // Common patterns: NIFTY24AUGFUT, BANKNIFTY24AUGFUT
      const now = new Date();
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const yy = String(now.getFullYear()).slice(-2);
      const mm = monthNames[now.getMonth()];
      const nextMM = monthNames[(now.getMonth() + 1) % 12];
      const nextYY = now.getMonth() === 11 ? String(now.getFullYear() + 1).slice(-2) : yy;
      const farMM = monthNames[(now.getMonth() + 2) % 12];
      const farYY = now.getMonth() >= 10 ? String(now.getFullYear() + 1).slice(-2) : yy;

      const futuresKeys: string[] = [];
      for (const [m, y] of [[mm, yy], [nextMM, nextYY], [farMM, farYY]]) {
        futuresKeys.push(`NSE_FO|${symbol.toUpperCase()}${y}${m}FUT`);
      }

      // Also try index-style keys for NIFTY/BANKNIFTY
      const INDEX_FUT_MAP: Record<string, string[]> = {
        'NIFTY': ['NSE_INDEX|Nifty 50'],
        'BANKNIFTY': ['NSE_INDEX|Nifty Bank'],
        'FINNIFTY': ['NSE_INDEX|Nifty Fin Service'],
      };

      const allKeys = [...futuresKeys];
      const idxKeys = INDEX_FUT_MAP[symbol.toUpperCase()];
      if (idxKeys) allKeys.push(...idxKeys);

      const data = await this.fetchBatchQuotes(allKeys);
      return data;
    } catch (err) {
      console.error('[Upstox OI] Futures fetch failed:', (err as Error).message);
      return null;
    }
  }

  /** Batch fetch quotes from Upstox /v2/market-quote/ohlc */
  private async fetchBatchQuotes(instrumentKeys: string[]): Promise<Record<string, any> | null> {
    try {
      const BATCH = 50;
      const allData: Record<string, any> = {};

      for (let i = 0; i < instrumentKeys.length; i += BATCH) {
        const batch = instrumentKeys.slice(i, i + BATCH);
        const keysStr = batch.join(',');
        const url = `https://api.upstox.com/v2/market-quote/ohlc?instrument_key=${encodeURIComponent(keysStr)}`;

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json',
            'x-api-version': '2.0',
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) continue;
        const json = await res.json();
        const data = json?.data;
        if (!data) continue;

        if (typeof data === 'object' && !Array.isArray(data)) {
          Object.assign(allData, data);
        } else if (Array.isArray(data)) {
          for (const item of data) {
            if (item.instrument_key) allData[item.instrument_key] = item;
          }
        }
      }

      return Object.keys(allData).length > 0 ? allData : null;
    } catch (err) {
      console.error('[Upstox OI] Batch quotes failed:', (err as Error).message);
      return null;
    }
  }
}

// ---- Mock Provider ----

class MockProvider implements OIProvider {
  name = 'mock';
  isAvailable() { return true; }

  async fetchOptionChain() { return null; }
  async fetchFuturesData() { return null; }
}