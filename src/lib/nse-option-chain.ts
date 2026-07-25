// NSE India Public API Client for Option Chain Data
// No API key required - uses cookie-based session from nseindia.com

const NSE_BASE = 'https://www.nseindia.com';
const COOKIE_CACHE_TTL = 4 * 60 * 1000; // 4 minutes
const DATA_CACHE_TTL = 15 * 1000; // 15 seconds per symbol
const REQUEST_TIMEOUT = 12000; // 12 seconds
const INDEX_SYMBOLS = new Set(['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'NIFTYNXT50', 'MIDCPNIFTY', 'NIFTY50TR']);

// ---- Types ----
interface NSECookieCache {
  cookies: string;
  fetchedAt: number;
}

interface NSEFilteredData {
  strikePrice: number;
  expiryDate: string;
  underlyingValue: number;
  CE?: {
    openInterest: number;
    changeinOpenInterest: number;
    totalTradedVolume: number;
    impliedVolatility: number;
    lastPrice: number;
    change: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
  };
  PE?: {
    openInterest: number;
    changeinOpenInterest: number;
    totalTradedVolume: number;
    impliedVolatility: number;
    lastPrice: number;
    change: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
  };
}

interface NSEOptionChainResponse {
  records: {
    data: NSEFilteredData[];
    strikePrices: number[];
    expiryDates: string[];
    underlyingValue: number;
  };
  filtered: {
    data: NSEFilteredData[];
    strikePrices: number[];
    expiryDates: string[];
  };
}

interface NSEFuturesResponse {
  records: {
    data: Array<{
      expiryDate: string;
      lastPrice: number;
      change: number;
      pChange: number;
      open: number;
      high: number;
      low: number;
      marketLOTS: number;
      openInterest: number;
      changeinOpenInterest: number;
      totalTradedVolume: number;
      turnoverInLakhs: number;
    }>;
  };
}

// ---- Cookie Manager ----
let cookieCache: NSECookieCache | null = null;

async function getNSCookies(): Promise<string | null> {
  // Return cached cookies if fresh
  if (cookieCache && Date.now() - cookieCache.fetchedAt < COOKIE_CACHE_TTL) {
    return cookieCache.cookies;
  }

  try {
    const res = await fetch(NSE_BASE + '/option-chain', {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    const setCookies = res.headers.getSetCookie?.() || [];
    // Also check raw headers for cookie
    const allCookies: string[] = [];
    for (const c of setCookies) {
      const match = c.match(/^([^=]+)=([^;]+)/);
      if (match) allCookies.push(`${match[1]}=${match[2]}`);
    }

    if (allCookies.length > 0) {
      cookieCache = { cookies: allCookies.join('; '), fetchedAt: Date.now() };
      return cookieCache.cookies;
    }

    // If no set-cookie headers, try using the response headers directly
    // Some environments forward cookies differently
    const rawHeaders = res.headers.get('set-cookie');
    if (rawHeaders) {
      cookieCache = { cookies: rawHeaders.split(';')[0], fetchedAt: Date.now() };
      return cookieCache.cookies;
    }

    return null;
  } catch (err) {
    console.error('[NSE] Cookie fetch failed:', (err as Error).message);
    return null;
  }
}

// ---- Data Cache ----
const dataCache = new Map<string, { data: any; fetchedAt: number }>();

function getCachedData(key: string): any | null {
  const entry = dataCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < DATA_CACHE_TTL) {
    return entry.data;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  dataCache.set(key, { data, fetchedAt: Date.now() });
  // Cleanup old entries
  if (dataCache.size > 50) {
    const now = Date.now();
    for (const [k, v] of dataCache) {
      if (now - v.fetchedAt > 60000) dataCache.delete(k);
    }
  }
}

// ---- Rate Limiter ----
const recentRequests = new Map<string, number>();
const MIN_REQUEST_INTERVAL = 1500; // 1.5s between requests to same endpoint

function waitForRateLimit(key: string): void {
  const last = recentRequests.get(key);
  if (last && Date.now() - last < MIN_REQUEST_INTERVAL) {
    // This is synchronous - the actual delay is handled via sleep in the caller
  }
  recentRequests.set(key, Date.now());
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---- Core Fetch Functions ----

export function isIndexSymbol(symbol: string): boolean {
  return INDEX_SYMBOLS.has(symbol.toUpperCase());
}

export async function fetchIndexOptionChain(symbol: string): Promise<NSEOptionChainResponse | null> {
  const cacheKey = `idx_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  waitForRateLimit(cacheKey);
  const lastReq = recentRequests.get(cacheKey) || 0;
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastReq));
  if (wait > 0) await sleep(wait);

  const cookies = await getNSCookies();
  if (!cookies) {
    console.warn('[NSE] No cookies available, attempting request without cookies');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `${NSE_BASE}/option-chain`,
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cookies) headers['Cookie'] = cookies;

  try {
    const url = `${NSE_BASE}/api/option-chain-indices?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers,
    });

    if (!res.ok) {
      console.error(`[NSE] Index OC response ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    if (data?.records?.data?.length > 0) {
      setCachedData(cacheKey, data);
      return data;
    }
    console.warn(`[NSE] Empty index OC data for ${symbol}`);
    return null;
  } catch (err) {
    console.error(`[NSE] Index OC fetch failed for ${symbol}:`, (err as Error).message);
    return null;
  }
}

export async function fetchStockOptionChain(symbol: string): Promise<NSEOptionChainResponse | null> {
  const cacheKey = `stk_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  waitForRateLimit(cacheKey);
  const lastReq = recentRequests.get(cacheKey) || 0;
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastReq));
  if (wait > 0) await sleep(wait);

  const cookies = await getNSCookies();
  if (!cookies) {
    console.warn('[NSE] No cookies available, attempting request without cookies');
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `${NSE_BASE}/option-chain`,
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cookies) headers['Cookie'] = cookies;

  try {
    const url = `${NSE_BASE}/api/option-chain-equities?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers,
    });

    if (!res.ok) {
      console.error(`[NSE] Stock OC response ${res.status} for ${symbol}`);
      return null;
    }

    const data = await res.json();
    if (data?.records?.data?.length > 0) {
      setCachedData(cacheKey, data);
      return data;
    }
    console.warn(`[NSE] Empty stock OC data for ${symbol}`);
    return null;
  } catch (err) {
    console.error(`[NSE] Stock OC fetch failed for ${symbol}:`, (err as Error).message);
    return null;
  }
}

export async function fetchFuturesData(symbol: string): Promise<NSEFuturesResponse | null> {
  const cacheKey = `fut_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  waitForRateLimit(cacheKey);
  const lastReq = recentRequests.get(cacheKey) || 0;
  const wait = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastReq));
  if (wait > 0) await sleep(wait);

  const cookies = await getNSCookies();
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `${NSE_BASE}/market-data/live-equity-market`,
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cookies) headers['Cookie'] = cookies;

  try {
    // NSE futures API - works for both indices and stocks
    const url = `${NSE_BASE}/api/option-chain-indices?symbol=${encodeURIComponent(symbol.toUpperCase())}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers,
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.records?.data?.length > 0) {
      setCachedData(cacheKey, data);
      return data as NSEFuturesResponse;
    }
    return null;
  } catch (err) {
    console.error(`[NSE] Futures fetch failed for ${symbol}:`, (err as Error).message);
    return null;
  }
}

export type { NSEOptionChainResponse, NSEFilteredData, NSEFuturesResponse };
