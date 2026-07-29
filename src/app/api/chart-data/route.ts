import { NextRequest, NextResponse } from "next/server";

// Yahoo Finance symbol mapping (same as market-data.ts)
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  NIFTY: "^NSEI", BANKNIFTY: "^NSEBANK", NIFTYIT: "^CNXIT",
  NIFTYNXT50: "^NSMIDCP", FINNIFTY: "^CNXFIN", INDIAVIX: "^INDIAVIX",
};

function getYahooSymbol(nseSymbol: string): string {
  return YAHOO_SYMBOL_MAP[nseSymbol.toUpperCase()] || (nseSymbol + ".NS");
}

// Interval mapping from our UI keys to Yahoo Finance intervals
const INTERVAL_MAP: Record<string, { yahoo: string; days: number }> = {
  '1m':  { yahoo: '1m',  days: 7 },
  '5m':  { yahoo: '5m',  days: 30 },
  '15m': { yahoo: '15m', days: 30 },
  '60':  { yahoo: '1h',  days: 30 },
  '240': { yahoo: '1h',  days: 60 },
  'D':   { yahoo: '1d',  days: 365 },
  'W':   { yahoo: '1wk', days: 730 },
  'M':   { yahoo: '1mo', days: 1825 },
};

// Simple cache
const cache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 30_000; // 30s for intraday, 5min for daily+

async function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const https = require('https');
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res: any) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location!).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// GET /api/chart-data?symbol=RELIANCE&interval=D
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || 'D';

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  const cfg = INTERVAL_MAP[interval] || INTERVAL_MAP['D'];
  const cacheKey = `${symbol}_${interval}`;
  const cached = cache.get(cacheKey);
  const ttl = ['1m', '5m', '15m', '60', '240'].includes(interval) ? CACHE_TTL : 300_000;

  if (cached && Date.now() - cached.ts < ttl) {
    return NextResponse.json({ data: cached.data, interval, symbol });
  }

  try {
    const yahooSym = getYahooSymbol(symbol);
    const period1 = Math.floor(Date.now() / 1000 - cfg.days * 86400);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?period1=${period1}&period2=9999999999&interval=${cfg.yahoo}&includePrePost=false`;

    const body = await httpsGet(url);
    const json = JSON.parse(body);
    const result = json.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: 'No data from Yahoo Finance' }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const data: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes.close?.[i];
      if (close == null || close <= 0) continue;
      data.push({
        time: timestamps[i] as number,
        open: Math.round((quotes.open?.[i] || close) * 100) / 100,
        high: Math.round((quotes.high?.[i] || close) * 100) / 100,
        low: Math.round((quotes.low?.[i] || close) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: quotes.volume?.[i] || 0,
      });
    }

    cache.set(cacheKey, { data, ts: Date.now() });

    return NextResponse.json({
      data,
      interval: cfg.yahoo,
      symbol,
      exchange: 'NSE',
      currency: 'INR',
      dataPoints: data.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
