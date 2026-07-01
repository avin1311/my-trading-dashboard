// Real-time stock data fetcher using Yahoo Finance API
// Fetches live prices, changes, and intraday data

interface YahooChartMeta {
  symbol: string;
  regularMarketPrice: number;
  previousClose: number;
  chartPreviousClose: number;
  exchangeName: string;
  currency: string;
  regularMarketTime: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
}

interface YahooChartResult {
  meta: YahooChartMeta;
  timestamp: number[];
  close: number[];
  open: number[];
  high: number[];
  low: number[];
  volume: number[];
}

interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  open: number;
  volume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  lastUpdated: string;
  currency: string;
  intradayData?: { time: number; close: number; volume: number }[];
}

// Cache to avoid hammering Yahoo Finance
const quoteCache = new Map<string, { data: RealtimeQuote; timestamp: number }>();
const CACHE_TTL = 60_000; // 1 minute cache

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const https = require('https');
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res: any) => {
      let data = '';
      res.on('data', (c: string) => (data += c));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Convert NSE symbol to Yahoo Finance symbol
export function toYahooSymbol(nseSymbol: string): string {
  // NIFTY and BANKNIFTY are indices
  if (nseSymbol === 'NIFTY') return '^NSEI';
  if (nseSymbol === 'BANKNIFTY') return '^NSEBANK';
  if (nseSymbol === 'NIFTYIT') return '^CNXIT';
  // Regular stocks
  return nseSymbol.endsWith('.NS') ? nseSymbol : `${nseSymbol}.NS`;
}

export async function fetchRealtimeQuote(nseSymbol: string): Promise<RealtimeQuote | null> {
  const cacheKey = nseSymbol;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const yahooSym = toYahooSymbol(nseSymbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m&includePrePost=false`;
    const body = await httpsGet(url);
    const data = JSON.parse(body);

    if (!data.chart?.result?.[0]) return null;

    const result: YahooChartResult = data.chart.result[0];
    const meta = result.meta;

    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Build intraday data
    const intradayData = (result.timestamp || [])
      .map((t: number, i: number) => ({
        time: t,
        close: result.close?.[i] ?? 0,
        volume: result.volume?.[i] ?? 0,
      }))
      .filter((d: any) => d.close > 0);

    const quote: RealtimeQuote = {
      symbol: nseSymbol,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      previousClose: Math.round((prevClose) * 100) / 100,
      dayHigh: Math.round((meta.regularMarketDayHigh || price) * 100) / 100,
      dayLow: Math.round((meta.regularMarketDayLow || price) * 100) / 100,
      open: Math.round((meta.regularMarketPrice || price) * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      fiftyTwoWeekHigh: Math.round((meta.fiftyTwoWeekHigh || 0) * 100) / 100,
      fiftyTwoWeekLow: Math.round((meta.fiftyTwoWeekLow || 0) * 100) / 100,
      lastUpdated: new Date().toISOString(),
      currency: meta.currency || 'INR',
      intradayData,
    };

    quoteCache.set(cacheKey, { data: quote, timestamp: Date.now() });
    return quote;
  } catch (err) {
    console.error(`Failed to fetch quote for ${nseSymbol}:`, err);
    return null;
  }
}

// Batch fetch for watchlist-style display
export async function fetchBatchQuotes(symbols: string[]): Promise<Map<string, RealtimeQuote>> {
  const results = new Map<string, RealtimeQuote>();
  // Fetch in parallel with concurrency limit
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map((s) => fetchRealtimeQuote(s));
    const responses = await Promise.allSettled(promises);
    responses.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        results.set(batch[idx], r.value);
      }
    });
  }
  return results;
}