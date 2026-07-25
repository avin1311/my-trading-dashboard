// NSE India Public API Client for Option Chain Data
// No API key required - uses cookie-based session from nseindia.com
//
// IMPORTANT: NSE may block server-side requests with 403. The system gracefully
// falls back to mock data. For guaranteed live data, use a broker API.

const NSE_BASE = 'https://www.nseindia.com';
const COOKIE_CACHE_TTL = 4 * 60 * 1000;
const DATA_CACHE_TTL = 15 * 1000;
const REQUEST_TIMEOUT = 12000;
const INDEX_SYMBOLS = new Set([
  'NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'NIFTYNXT50',
  'MIDCPNIFTY', 'NIFTY50TR', 'NIFTYMIDCAP50', 'NIFTYBANK',
]);

// ---- Types ----
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

// ---- Browser-like UA ----
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8';
const ACCEPT_LANG = 'en-US,en;q=0.9,en-IN;q=0.8';

// ---- Cookie Manager ----
const cookieJar = new Map<string, string>();
let cookieFetchedAt = 0;

function extractCookies(res: Response): void {
  const setCookies = res.headers.getSetCookie?.() || [];
  for (const c of setCookies) {
    const m = c.match(/^([^=]+)=([^;]+)/);
    if (m) cookieJar.set(m[1], m[2]);
  }
}

function buildCookieString(): string {
  return [...cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function refreshCookies(): Promise<boolean> {
  try {
    // Step 1: Landing page
    const r1 = await fetch(NSE_BASE + '/', {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        'User-Agent': UA, 'Accept': ACCEPT, 'Accept-Language': ACCEPT_LANG,
        'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    });
    extractCookies(r1);

    // Step 2: Option chain page
    const cs = buildCookieString();
    const r2 = await fetch(NSE_BASE + '/option-chain', {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      headers: {
        'User-Agent': UA, 'Accept': ACCEPT, 'Accept-Language': ACCEPT_LANG,
        'Referer': NSE_BASE + '/', ...(cs ? { 'Cookie': cs } : {}),
        'sec-fetch-dest': 'document', 'sec-fetch-mode': 'navigate', 'sec-fetch-site': 'same-origin',
      },
      redirect: 'follow',
    });
    extractCookies(r2);

    cookieFetchedAt = Date.now();
    return cookieJar.size > 0;
  } catch (err) {
    console.error('[NSE] Cookie refresh failed:', (err as Error).message);
    return false;
  }
}

async function getCookiesOrRefresh(): Promise<string> {
  if (cookieJar.size > 0 && Date.now() - cookieFetchedAt < COOKIE_CACHE_TTL) {
    return buildCookieString();
  }
  const ok = await refreshCookies();
  return ok ? buildCookieString() : '';
}

// ---- Data Cache ----
const dataCache = new Map<string, { data: NSEOptionChainResponse; fetchedAt: number }>();

function getCachedData(key: string): NSEOptionChainResponse | null {
  const entry = dataCache.get(key);
  if (entry && Date.now() - entry.fetchedAt < DATA_CACHE_TTL) return entry.data;
  return null;
}

function setCachedData(key: string, data: NSEOptionChainResponse) {
  dataCache.set(key, { data, fetchedAt: Date.now() });
  if (dataCache.size > 50) {
    const now = Date.now();
    for (const [k, v] of dataCache) {
      if (now - v.fetchedAt > 60000) dataCache.delete(k);
    }
  }
}

// ---- Rate Limiter ----
const recentRequests = new Map<string, number>();
const MIN_INTERVAL = 1500;

async function rateLimitWait(key: string): Promise<void> {
  const last = recentRequests.get(key);
  if (last) {
    const wait = MIN_INTERVAL - (Date.now() - last);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }
  recentRequests.set(key, Date.now());
}

// ---- Core Fetch ----
async function nseFetch(symbol: string, isIndex: boolean): Promise<NSEOptionChainResponse | null> {
  const cacheKey = `${isIndex ? 'i' : 's'}_${symbol}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  await rateLimitWait(cacheKey);

  const cookies = await getCookiesOrRefresh();
  const path = isIndex ? 'option-chain-indices' : 'option-chain-equities';
  const url = `${NSE_BASE}/api/${path}?symbol=${encodeURIComponent(symbol.toUpperCase())}`;

  const headers: Record<string, string> = {
    'User-Agent': UA,
    'Accept': '*/*',
    'Accept-Language': ACCEPT_LANG,
    'Referer': `${NSE_BASE}/option-chain`,
    'X-Requested-With': 'XMLHttpRequest',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
  };
  if (cookies) headers['Cookie'] = cookies;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT), headers });

    if (res.status === 403 || res.status === 401) {
      // Retry once with fresh cookies
      console.warn(`[NSE] ${res.status} for ${symbol}, retrying with fresh cookies...`);
      cookieJar.clear();
      const ok = await refreshCookies();
      if (!ok) return null;
      headers['Cookie'] = buildCookieString();
      const r2 = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT), headers });
      if (!r2.ok) {
        console.error(`[NSE] Retry also ${r2.status} for ${symbol}`);
        return null;
      }
      const d2 = await r2.json();
      if (d2?.records?.data?.length > 0) { setCachedData(cacheKey, d2); return d2; }
      return null;
    }

    if (!res.ok) { console.error(`[NSE] ${res.status} for ${symbol}`); return null; }

    const data = await res.json();
    if (data?.records?.data?.length > 0) { setCachedData(cacheKey, data); return data; }
    return null;
  } catch (err) {
    console.error(`[NSE] Error ${symbol}:`, (err as Error).message);
    return null;
  }
}

// ---- Public API ----
export function isIndexSymbol(symbol: string): boolean {
  return INDEX_SYMBOLS.has(symbol.toUpperCase());
}

export async function fetchIndexOptionChain(symbol: string): Promise<NSEOptionChainResponse | null> {
  return nseFetch(symbol, true);
}

export async function fetchStockOptionChain(symbol: string): Promise<NSEOptionChainResponse | null> {
  return nseFetch(symbol, false);
}

export async function fetchFuturesData(symbol: string): Promise<NSEOptionChainResponse | null> {
  return isIndexSymbol(symbol) ? fetchIndexOptionChain(symbol) : fetchStockOptionChain(symbol);
}

export type { NSEOptionChainResponse, NSEFilteredData };