// Pluggable Broker API Infrastructure
// Supports: NSE Direct (free, may 403), Zerodha Kite, Upstox
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
      const apiKey = process.env.UPSTOX_API_KEY;
      const accessToken = process.env.UPSTOX_ACCESS_TOKEN;
      if (apiKey && accessToken) return new UpstoxProvider(apiKey, accessToken);
      console.warn('[OI] Upstox configured but UPSTOX_API_KEY or UPSTOX_ACCESS_TOKEN missing, falling back to NSE');
      break;
    }
    case 'mock':
      return new MockProvider();
  }

  // Default: NSE
  return new NSEProvider();
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

// ---- Upstox Provider ----

class UpstoxProvider implements OIProvider {
  name = 'upstox';
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
      const url = `https://api.upstox.com/v2/option/chain?instrument_key=NSE_FO:${symbol}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Upstox ${res.status}`);
      const data = await res.json();
      return data?.data || null;
    } catch (err) {
      console.error('[Upstox] OC fetch failed:', (err as Error).message);
      return null;
    }
  }

  async fetchFuturesData(symbol: string) {
    try {
      const url = `https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_FO:${symbol}FUT`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Upstox ${res.status}`);
      const data = await res.json();
      return data?.data || null;
    } catch (err) {
      console.error('[Upstox] Futures fetch failed:', (err as Error).message);
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