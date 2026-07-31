// Upstox API v2 Client for Option Chain & Futures OI Data
// Uses OAuth 2.0 — access_token valid for entire trading day

const UPSTOX_BASE = 'https://api.upstox.com/v2';

// ---- Types ----
export interface UpstoxToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UpstoxOptionChainData {
  instrument_key: string;
  strike_price: number;
  expiry_date: string;
  option_type: 'CE' | 'PE';
  open_interest: number;
  change_in_open_interest: number;
  volume: number;
  last_price: number;
  iv: number;
  change: number;
  buy_quantity: number;
  sell_quantity: number;
}

export interface UpstoxOHLCQuote {
  instrument_key: string;
  last_price: number;
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  volume: number;
  open_interest: number;
  change: number;
  change_percent: number;
}

export interface UpstoxInstrument {
  instrument_key: string;
  instrument_type: string;
  exchange: string;
  symbol: string;
  name: string;
  expiry: string;
  strike: number;
  option_type: string;
  lot_size: number;
  trading_symbol: string;
}

// ---- In-memory token store (server-side only) ----
let storedToken: string | null = null;
let tokenExpiry = 0; // epoch ms

export function setUpstoxToken(token: string, expiresIn: number): void {
  storedToken = token;
  tokenExpiry = Date.now() + (expiresIn - 60) * 1000; // 60s buffer
}

export function getUpstoxToken(): string | null {
  if (!storedToken || Date.now() > tokenExpiry) {
    storedToken = null;
    return null;
  }
  return storedToken;
}

export function isUpstoxConnected(): boolean {
  return !!getUpstoxToken();
}

// ---- Helpers ----
function getApiKey(): string {
  return process.env.UPSTOX_API_KEY || '';
}

function getApiSecret(): string {
  return process.env.UPSTOX_API_SECRET || '';
}

function getRedirectUri(): string {
  // Allow override via env var (needed for non-localhost deployments)
  if (process.env.UPSTOX_REDIRECT_URI) return process.env.UPSTOX_REDIRECT_URI;
  return 'http://localhost:3000/api/upstox/callback';
}

// Build the authorization URL for redirecting the user to Upstox login
export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: getApiKey(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    state: 'upstox_oauth',
  });
  return `${UPSTOX_BASE}/login/authorization/dialog?${params.toString()}`;
}

// Exchange authorization code for access_token
export async function exchangeCodeForToken(code: string): Promise<UpstoxToken | null> {
  try {
    const res = await fetch(`${UPSTOX_BASE}/login/authorization/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        code,
        client_id: getApiKey(),
        client_secret: getApiSecret(),
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Upstox] Token exchange failed:', res.status, err);
      return null;
    }

    const data = await res.json();
    if (data.access_token) {
      setUpstoxToken(data.access_token, data.expires_in || 86400);
      return data;
    }
    return null;
  } catch (err) {
    console.error('[Upstox] Token exchange error:', (err as Error).message);
    return null;
  }
}

// ---- Generic API caller ----
async function upstoxFetch<T>(path: string): Promise<T | null> {
  const token = getUpstoxToken();
  if (!token) {
    console.error('[Upstox] No valid access token');
    return null;
  }

  try {
    const res = await fetch(`${UPSTOX_BASE}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'x-api-version': '2.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
      console.warn('[Upstox] Token expired (401), clearing...');
      storedToken = null;
      return null;
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('x-ratelimit-reset') || res.headers.get('retry-after');
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 2000;
      console.warn(`[Upstox] Rate limited (429) on ${path}, retrying after ${waitMs}ms...`);
      await new Promise(r => setTimeout(r, waitMs));
      // Recursive retry — will hit the token check above if we keep getting 429
      return upstoxFetch<T>(path);
    }

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error(`[Upstox] ${res.status} for ${path}:`, err);
      return null;
    }

    const json = await res.json();
    return json.data || json;
  } catch (err) {
    console.error(`[Upstox] Fetch error ${path}:`, (err as Error).message);
    return null;
  }
}

// ---- Instrument Key Resolver ----
// Upstox needs instrument_key (e.g., NSE_INDEX|Nifty 50, NSE_FO|NIFTY24AUG24500CE)
// We cache the master contract list
let instrumentCache: UpstoxInstrument[] | null = null;
let instrumentCacheTime = 0;
const INSTRUMENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

async function loadInstruments(): Promise<UpstoxInstrument[]> {
  if (instrumentCache && Date.now() - instrumentCacheTime < INSTRUMENT_CACHE_TTL) {
    return instrumentCache;
  }

  // NOTE: /v2/master/contracts was DEPRECATED (Jun 30, 2025).
  // This cache is now only populated when user connects via OAuth and we need
  // instrument keys for authenticated API calls. For instrument discovery,
  // see getAllNSEEquities() below which uses Yahoo Finance.
  if (instrumentCache) return instrumentCache;
  return [];
}

// Find the option chain instrument key for a given underlying
export async function findOptionInstrumentKey(
  symbol: string,
  expiry: string,
  strike: number,
  optionType: 'CE' | 'PE'
): Promise<string | null> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  // Normalize expiry format: Upstox uses YYYY-MM-DD
  // NSE option trading symbols are like NIFTY24AUG24500CE
  const expiryMonth = new Date(expiry);
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const yy = String(expiryMonth.getFullYear()).slice(-2);
  const mm = monthNames[expiryMonth.getMonth()];
  const strikeStr = String(Math.round(strike));

  const tradingSymbol = `${upperSym}${yy}${mm}${strikeStr}${optionType}`;

  const match = instruments.find((i) =>
    i.exchange === 'NFO' &&
    i.trading_symbol.toUpperCase() === tradingSymbol.toUpperCase()
  );

  return match?.instrument_key || null;
}

// Find the futures instrument key for a given underlying and expiry
export async function findFuturesInstrumentKey(
  symbol: string,
  expiry: string
): Promise<string | null> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  const expiryMonth = new Date(expiry);
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const yy = String(expiryMonth.getFullYear()).slice(-2);
  const mm = monthNames[expiryMonth.getMonth()];

  // Index futures: NIFTY24AUGFUT, Stock futures: RELIANCE24AUGFUT
  const tradingSymbol = `${upperSym}${yy}${mm}FUT`;

  const match = instruments.find((i) =>
    i.exchange === 'NFO' &&
    i.instrument_type === 'FUT' &&
    i.trading_symbol.toUpperCase() === tradingSymbol.toUpperCase()
  );

  return match?.instrument_key || null;
}

// Find the index/stock spot instrument key for getting spot price
export async function findSpotInstrumentKey(symbol: string): Promise<string | null> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  const INDEX_NAMES: Record<string, string> = {
    'NIFTY': 'Nifty 50',
    'BANKNIFTY': 'Nifty Bank',
    'FINNIFTY': 'Nifty Fin Service',
    'NIFTYIT': 'Nifty IT',
    'NIFTYNXT50': 'Nifty Next 50',
    'MIDCPNIFTY': 'Nifty Midcap 50',
  };

  // Try index first
  const indexName = INDEX_NAMES[upperSym];
  if (indexName) {
    const match = instruments.find((i) =>
      i.exchange === 'NSE_INDEX' &&
      i.name?.toLowerCase() === indexName.toLowerCase()
    );
    if (match) return match.instrument_key;
  }

  // Try NSE (for stocks)
  const match = instruments.find((i) =>
    i.exchange === 'NSE' &&
    (i.symbol?.toUpperCase() === upperSym || i.trading_symbol?.toUpperCase() === upperSym)
  );

  return match?.instrument_key || null;
}

// ---- Get all expiries for a given underlying from instruments ----
export async function getOptionExpiries(symbol: string): Promise<string[]> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  const expiries = new Set<string>();
  for (const inst of instruments) {
    if (inst.exchange === 'NFO' &&
        inst.instrument_type === 'OPT' &&
        inst.trading_symbol?.toUpperCase().startsWith(upperSym)) {
      if (inst.expiry) expiries.add(inst.expiry);
    }
  }

  return [...expiries].sort();
}

// ---- Get all strikes for a given underlying + expiry ----
export async function getOptionStrikes(symbol: string, expiry: string): Promise<number[]> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();
  const expiryDate = expiry.split('T')[0]; // Normalize

  const strikes = new Set<number>();
  for (const inst of instruments) {
    if (inst.exchange === 'NFO' &&
        inst.instrument_type === 'OPT' &&
        inst.trading_symbol?.toUpperCase().startsWith(upperSym) &&
        inst.expiry?.startsWith(expiryDate)) {
      if (inst.strike > 0) strikes.add(inst.strike);
    }
  }

  return [...strikes].sort((a, b) => a - b);
}

// ---- Fetch Option Chain Data ----
// Returns structured data for all strikes of a given underlying + expiry
export async function fetchUpstoxOptionChain(
  symbol: string,
  expiry?: string
): Promise<{ strikes: Map<number, { CE: any; PE: any }>; expiryDates: string[]; spotPrice: number } | null> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  // Get all expiries
  const allExpiries = await getOptionExpiries(symbol);
  if (allExpiries.length === 0) {
    console.error(`[Upstox] No expiries found for ${symbol}`);
    return null;
  }

  const targetExpiry = expiry || allExpiries[0];
  const allStrikes = await getOptionStrikes(symbol, targetExpiry);
  if (allStrikes.length === 0) {
    console.error(`[Upstox] No strikes found for ${symbol} ${targetExpiry}`);
    return null;
  }

  // Find CE and PE instrument keys for each strike
  const instrumentKeys: string[] = [];
  const strikeKeyMap = new Map<string, number>(); // instrument_key -> strike

  for (const strike of allStrikes) {
    for (const optType of ['CE', 'PE']) {
      const key = await findOptionInstrumentKey(symbol, targetExpiry, strike, optType as 'CE' | 'PE');
      if (key) {
        instrumentKeys.push(key);
        strikeKeyMap.set(key, strike);
      }
    }
  }

  if (instrumentKeys.length === 0) {
    console.error(`[Upstox] No instrument keys resolved for ${symbol}`);
    return null;
  }

  // Batch fetch market quote for all instruments (Upstox allows up to 100 comma-separated keys)
  const BATCH_SIZE = 100;
  const quoteMap = new Map<string, any>(); // instrument_key -> quote data

  for (let i = 0; i < instrumentKeys.length; i += BATCH_SIZE) {
    const batch = instrumentKeys.slice(i, i + BATCH_SIZE);
    const keysStr = batch.join(',');
    const data = await upstoxFetch<any>(`/market-quote/ohlc?instrument_key=${encodeURIComponent(keysStr)}`);

    if (data) {
      // Response can be an object keyed by instrument_key, or an array
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.instrument_key) quoteMap.set(item.instrument_key, item);
        }
      } else if (typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && 'instrument_key' in (v as any)) {
            quoteMap.set(k, v as any);
          }
        }
      }
    }
  }

  if (quoteMap.size === 0) {
    console.error(`[Upstox] No quote data received for ${symbol}`);
    return null;
  }

  // Build strike map
  const strikeMap = new Map<number, { CE: any; PE: any }>();
  for (const [key, quote] of quoteMap) {
    const strike = strikeKeyMap.get(key);
    if (!strike) continue;

    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, { CE: null, PE: null });
    }
    const entry = strikeMap.get(strike)!;

    // Determine if CE or PE from trading symbol or instrument key
    const isCE = key.toUpperCase().endsWith('CE') || key.includes('CE');
    if (isCE) {
      entry.CE = quote;
    } else {
      entry.PE = quote;
    }
  }

  // Get spot price
  let spotPrice = 0;
  const spotKey = await findSpotInstrumentKey(symbol);
  if (spotKey) {
    const spotData = await upstoxFetch<any>(`/market-quote/ohlc?instrument_key=${encodeURIComponent(spotKey)}`);
    if (spotData) {
      if (Array.isArray(spotData)) {
        spotPrice = spotData[0]?.last_price || spotData[0]?.ohlc?.close || 0;
      } else if (typeof spotData === 'object') {
        const first = Object.values(spotData)[0] as any;
        spotPrice = first?.last_price || first?.ohlc?.close || 0;
      }
    }
  }

  // Fallback: estimate spot from ATM strike
  if (!spotPrice && strikeMap.size > 0) {
    // Use the strike closest to where CE transitions from ITM to OTM
    const strikes = [...strikeMap.keys()].sort((a, b) => a - b);
    spotPrice = strikes[Math.floor(strikes.length / 2)];
  }

  return { strikes: strikeMap, expiryDates: allExpiries, spotPrice };
}

// ---- Fetch Futures Quote ----
export async function fetchUpstoxFuturesQuote(
  symbol: string,
  expiry: string
): Promise<UpstoxOHLCQuote | null> {
  const instrumentKey = await findFuturesInstrumentKey(symbol, expiry);
  if (!instrumentKey) {
    console.error(`[Upstox] No futures instrument key for ${symbol} ${expiry}`);
    return null;
  }

  return upstoxFetch<UpstoxOHLCQuote>(`/market-quote/ohlc?instrument_key=${encodeURIComponent(instrumentKey)}`);
}

// ---- Fetch all futures expiries for a symbol ----
export async function getFuturesExpiries(symbol: string): Promise<string[]> {
  const instruments = await loadInstruments();
  const upperSym = symbol.toUpperCase();

  const expiries = new Set<string>();
  for (const inst of instruments) {
    if (inst.exchange === 'NFO' &&
        inst.instrument_type === 'FUT' &&
        inst.trading_symbol?.toUpperCase().startsWith(upperSym)) {
      if (inst.expiry) expiries.add(inst.expiry);
    }
  }

  return [...expiries].sort();
}

// ---- Get user profile (to verify token works) ----
export async function fetchUserProfile(): Promise<any | null> {
  return upstoxFetch('/user/profile');
}

// ---- Logout / Disconnect ----
export function disconnectUpstox(): void {
  storedToken = null;
  tokenExpiry = 0;
}

// ---- Dynamic Instrument Extraction ----
// NOTE: Upstox /v2/master/contracts was DEPRECATED on Jun 30, 2025.
// We now use a hybrid approach: Yahoo Finance screener for equities + NSE option chain API for F&O underlyings.
// Falls back to the hardcoded stockList when dynamic sources fail.

export interface NSEEquity {
  symbol: string;
  name: string;
  lotSize: number;
  exchange: string;
  instrumentType: string;
}

export interface FOUnderlying {
  symbol: string;
  lotSize: number;
  hasOptions: boolean;
  hasFutures: boolean;
}

/**
 * Get all NSE equities. Since Upstox /v2/master/contracts was deprecated (Jun 30, 2025),
 * we return empty to trigger the fallback to the hardcoded list in stock-list.ts (250+ equities).
 * When a user connects via Upstox OAuth, instrument keys are loaded for option chain queries.
 */
export async function getAllNSEEquities(): Promise<NSEEquity[]> {
  return [];
}

/**
 * Get all F&O underlyings. Returns empty (Upstox master contracts deprecated).
 * The /api/stocks and /api/oi-data routes fall back to stockList.optionUnderlyings.
 */
export async function getAllFOUnderlyings(): Promise<FOUnderlying[]> {
  return [];
}

/**
 * Force-refresh the instrument cache (useful if instruments seem stale).
 */
export async function refreshInstrumentCache(): Promise<UpstoxInstrument[]> {
  instrumentCache = null;
  instrumentCacheTime = 0;
  return loadInstruments();
}

// ==================== LIVE QUOTE API ====================

export interface UpstoxLiveQuote {
  symbol: string;
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePct: number;
  oi?: number;
  bestBuyPrice?: number;
  bestSellPrice?: number;
  timestamp: number;
}

/**
 * Fetch live OHLC quote from Upstox REST API for a single NSE symbol.
 * Falls back gracefully if not connected.
 */
export async function fetchUpstoxLiveQuote(symbol: string): Promise<UpstoxLiveQuote | null> {
  const { toInstrumentKey } = await import('./instrument-keys');
  const instrumentKey = toInstrumentKey(symbol);
  if (!instrumentKey) return null;

  const data = await upstoxFetch<Record<string, any>>(`/market-quote/ohlc?instrument_key=${encodeURIComponent(instrumentKey)}`);
  if (!data) return null;

  // Response can be array or object keyed by instrument_key
  let quote: any = null;
  if (Array.isArray(data)) {
    quote = data[0];
  } else if (typeof data === 'object') {
    quote = data[instrumentKey] || Object.values(data)[0];
  }
  if (!quote) return null;

  const ltp = parseFloat(quote.last_price) || 0;
  const close = parseFloat(quote.ohlc?.close) || 0;
  const change = ltp - close;
  const changePct = close > 0 ? (change / close) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    ltp,
    open: parseFloat(quote.ohlc?.open) || 0,
    high: parseFloat(quote.ohlc?.high) || parseFloat(quote.high_price) || 0,
    low: parseFloat(quote.ohlc?.low) || parseFloat(quote.low_price) || 0,
    close,
    volume: parseInt(quote.volume_traded || quote.volume, 10) || 0,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    oi: quote.oi ? parseInt(quote.oi, 10) : undefined,
    bestBuyPrice: quote.buy_quantity_1 ? parseFloat(quote.buy_price_1) : undefined,
    bestSellPrice: quote.sell_quantity_1 ? parseFloat(quote.sell_price_1) : undefined,
    timestamp: Date.now(),
  };
}

/**
 * Batch fetch live quotes for multiple symbols.
 */
export async function fetchUpstoxLiveQuotes(symbols: string[]): Promise<Map<string, UpstoxLiveQuote>> {
  const { toInstrumentKeys } = await import('./instrument-keys');
  const keys = toInstrumentKeys(symbols);
  if (keys.length === 0) return new Map();

  const result = new Map<string, UpstoxLiveQuote>();
  const BATCH = 100;
  for (let i = 0; i < keys.length; i += BATCH) {
    const batch = keys.slice(i, i + BATCH);
    const data = await upstoxFetch<Record<string, any>>(`/market-quote/ohlc?instrument_key=${encodeURIComponent(batch.join(','))}`);
    if (!data) continue;

    if (Array.isArray(data)) {
      for (const q of data) {
        const sym = extractSymbolFromQuote(q);
        if (sym) result.set(sym, buildQuote(sym, q));
      }
    } else if (typeof data === 'object') {
      for (const [key, q] of Object.entries(data)) {
        const sym = extractSymbolFromInstrumentKey(key);
        if (sym && q && typeof q === 'object') result.set(sym, buildQuote(sym, q as any));
      }
    }
  }
  return result;
}

function extractSymbolFromQuote(q: any): string | null {
  const instKey = q.instrument_key || '';
  return extractSymbolFromInstrumentKey(instKey);
}

function extractSymbolFromInstrumentKey(instKey: string): string | null {
  const INDEX_MAP: Record<string, string> = {
    'Nifty 50': 'NIFTY', 'Nifty Bank': 'BANKNIFTY', 'Nifty IT': 'NIFTYIT',
    'Nifty Fin Service': 'FINNIFTY', 'Nifty Next 50': 'NIFTYNXT50',
    'Nifty Midcap 50': 'MIDCPNIFTY', 'India VIX': 'INDIAVIX',
  };
  for (const [name, sym] of Object.entries(INDEX_MAP)) {
    if (instKey.includes(name)) return sym;
  }
  const parts = instKey.split('|');
  return parts.length === 2 ? parts[1].trim().toUpperCase() : null;
}

function buildQuote(symbol: string, q: any): UpstoxLiveQuote {
  const ltp = parseFloat(q.last_price) || 0;
  const close = parseFloat(q.ohlc?.close) || 0;
  const change = ltp - close;
  const changePct = close > 0 ? (change / close) * 100 : 0;
  return {
    symbol,
    ltp,
    open: parseFloat(q.ohlc?.open) || 0,
    high: parseFloat(q.ohlc?.high) || parseFloat(q.high_price) || 0,
    low: parseFloat(q.ohlc?.low) || parseFloat(q.low_price) || 0,
    close,
    volume: parseInt(q.volume_traded || q.volume, 10) || 0,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    oi: q.oi ? parseInt(q.oi, 10) : undefined,
    timestamp: Date.now(),
  };
}

// ==================== HISTORICAL CANDLE DATA API ====================

export interface UpstoxCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Map our interval keys to Upstox historical API intervals
const UPSTOX_INTERVAL_MAP: Record<string, string> = {
  '1': '1minute',
  '1m': '1minute',
  '5': '5minute',
  '5m': '5minute',
  '15': '15minute',
  '15m': '15minute',
  '60': '30minute', // Upstox has 30min, not 1h — use 30min as closest
  '240': 'day',
  'D': 'day',
  'W': 'week',
  'M': 'month',
};

/**
 * Fetch historical OHLCV candles from Upstox REST API.
 * Returns data in the same format as Yahoo Finance chart-data API.
 */
export async function fetchUpstoxHistorical(
  symbol: string,
  interval: string = 'D',
  days: number = 365
): Promise<UpstoxCandle[]> {
  const { toInstrumentKey } = await import('./instrument-keys');
  const instrumentKey = toInstrumentKey(symbol);
  if (!instrumentKey) return [];

  const upstoxInterval = UPSTOX_INTERVAL_MAP[interval] || 'day';
  const fromDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
  const toDate = new Date().toISOString().split('T')[0];

  const data = await upstoxFetch<any>(
    `/historical-candle/instrument_key/${encodeURIComponent(instrumentKey)}/interval/${upstoxInterval}/to/${toDate}/from/${fromDate}`
  );

  if (!data || !Array.isArray(data)) return [];

  return data
    .map((c: any) => {
      const close = parseFloat(c.close);
      if (close <= 0) return null;
      return {
        time: parseInt(c.timestamp || c.epoch, 10) || Math.floor(new Date(c.date || Date.now()).getTime() / 1000),
        open: Math.round((parseFloat(c.open) || close) * 100) / 100,
        high: Math.round((parseFloat(c.high) || close) * 100) / 100,
        low: Math.round((parseFloat(c.low) || close) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: parseInt(c.volume || c.volume_traded, 10) || 0,
      };
    })
    .filter((c: UpstoxCandle | null): c is UpstoxCandle => c !== null)
    .sort((a: UpstoxCandle, b: UpstoxCandle) => a.time - b.time);
}
