import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote, getHistoricalData } from "@/lib/market-data";
import { generateSignals, DEFAULT_PARAMS, type StrategyParams } from "@/lib/trading-strategy";
import { stockList } from "@/lib/stock-list";
import { db } from "@/lib/db";

// Cache screener results for 10 minutes (longer TTL for 1000+ stocks)
let screenerCache: { data: any; timestamp: number; params: string } | null = null;
let screenerInProgress = false; // Prevent concurrent screener scans
const SCREENER_TTL = 10 * 60_000;

const PER_STOCK_TIMEOUT = 12_000; // 12s per stock
const BATCH_SIZE = 8; // 8 concurrent stocks per batch
const INTER_BATCH_DELAY_MS = 250; // 250ms pause between batches to avoid Yahoo rate limits
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// GET /api/screener?signal=BUY&sector=Banking&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Saved screeners sub-endpoint
  if (searchParams.get('action') === 'list_saved') {
    try {
      const saved = await db.savedScreener.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ saved: saved.map(s => ({ id: s.id, name: s.name, filters: JSON.parse(s.filters), createdAt: s.createdAt })) });
    } catch (e: any) {
      console.error('[screener]', e);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  const signalFilter = searchParams.get("signal") || "";
  const sectorFilter = searchParams.get("sector") || "";
  const rawLimit = Number(searchParams.get("limit"));
  const limit = rawLimit === 0 ? 99999 : Math.min(rawLimit || 50, 100);
  const exportFormat = searchParams.get('export') || ''; // 'csv'

  const params: StrategyParams = {
    supertrendPeriod: Number(searchParams.get("supertrendPeriod")) || DEFAULT_PARAMS.supertrendPeriod,
    supertrendMultiplier: Number(searchParams.get("supertrendMultiplier")) || DEFAULT_PARAMS.supertrendMultiplier,
    rsiPeriod: Number(searchParams.get("rsiPeriod")) || DEFAULT_PARAMS.rsiPeriod,
    rsiOverbought: Number(searchParams.get("rsiOverbought")) || DEFAULT_PARAMS.rsiOverbought,
    rsiOversold: Number(searchParams.get("rsiOversold")) || DEFAULT_PARAMS.rsiOversold,
    macdFast: Number(searchParams.get("macdFast")) || DEFAULT_PARAMS.macdFast,
    macdSlow: Number(searchParams.get("macdSlow")) || DEFAULT_PARAMS.macdSlow,
    macdSignal: Number(searchParams.get("macdSignal")) || DEFAULT_PARAMS.macdSignal,
  };

  const cacheKey = `${signalFilter}_${sectorFilter}_${limit}_${JSON.stringify(params)}`;

  // Return cached if fresh
  if (screenerCache && screenerCache.params === cacheKey && Date.now() - screenerCache.timestamp < SCREENER_TTL) {
    const resp = { ...screenerCache.data, cached: true };
    if (exportFormat === 'csv') return csvResponse(resp.results);
    return NextResponse.json(resp, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  // Prevent concurrent screener scans — return stale cache if scan is in progress
  if (screenerInProgress) {
    if (screenerCache) {
      return NextResponse.json({ ...screenerCache.data, stale: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
    }
    return NextResponse.json({ error: 'Screener scan already in progress', status: 429 });
  }
  screenerInProgress = true;

  try {
  // Get equities to scan
  let equities = stockList.equities as readonly any[];
  if (sectorFilter && sectorFilter !== "all") {
    equities = equities.filter((e: any) => e.sec === sectorFilter);
  }

  const totalToScan = equities.length;
  console.log(`[Screener] Starting scan of ${totalToScan} stocks (batch=${BATCH_SIZE}, delay=${INTER_BATCH_DELAY_MS}ms)...`);

  // Scan in optimized batches
  const results: any[] = [];
  let scanned = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < equities.length; i += BATCH_SIZE) {
    const batch = equities.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (eq: any) => {
        return scanStockWithRetry(eq, params);
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
      } else {
        failed++;
      }
    }
    scanned += batch.length;

    // Progress log every 50 stocks
    if (scanned % 50 === 0 || scanned === totalToScan) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Screener] Progress: ${scanned}/${totalToScan} (${results.length} ok, ${failed} fail) — ${elapsed}s`);
    }

    // Inter-batch delay to avoid Yahoo rate limits (skip after last batch)
    if (i + BATCH_SIZE < equities.length) {
      await sleep(INTER_BATCH_DELAY_MS);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Screener] Done: ${results.length}/${scanned} successful, ${failed} failed — ${totalTime}s`);

  // Apply signal filter
  let filtered = results;
  if (signalFilter && signalFilter !== "ALL") {
    if (signalFilter === "BULLISH") {
      filtered = results.filter(r => r.signal === "STRONG_BUY" || r.signal === "BUY");
    } else if (signalFilter === "BEARISH") {
      filtered = results.filter(r => r.signal === "STRONG_SELL" || r.signal === "SELL");
    } else {
      filtered = results.filter(r => r.signal === signalFilter);
    }
  }

  // Sort by signal strength then changePct
  const signalOrder: Record<string, number> = { STRONG_BUY: 5, BUY: 4, HOLD: 3, SELL: 2, STRONG_SELL: 1 };
  filtered.sort((a, b) => (signalOrder[b.signal] || 3) - (signalOrder[a.signal] || 3) || b.changePct - a.changePct);

  const final = filtered.slice(0, limit);

  // Count signals
  const signalCounts = { STRONG_BUY: 0, BUY: 0, HOLD: 0, SELL: 0, STRONG_SELL: 0 };
  for (const r of results) {
    if (r.signal in signalCounts) signalCounts[r.signal as keyof typeof signalCounts]++;
  }

  const response = {
    results: final,
    signalCounts,
    totalScanned: equities.length,
    totalMatched: filtered.length,
    scanTime: new Date().toISOString(),
    scanDurationSec: Number(totalTime),
    dataSource: "yahoo_finance_realtime",
  };

  screenerCache = { data: response, timestamp: Date.now(), params: cacheKey };

  if (exportFormat === 'csv') return csvResponse(final);
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  } finally {
    screenerInProgress = false;
  }
}

// ==================== HELPER FUNCTIONS ====================

async function scanStockWithRetry(eq: any, params: StrategyParams, attempt = 0): Promise<any> {
  try {
    const result = await Promise.race([
      (async () => {
        const [quote, histData] = await Promise.all([
          getLiveQuote(eq.s).catch(() => null),
          getHistoricalData(eq.s, 100).catch(() => []),
        ]);

        if (!quote || histData.length < 50) return null;

        const signals = generateSignals(histData, params);
        const latest = signals.length > 0 ? signals[signals.length - 1] : null;

        return {
          symbol: eq.s,
          name: eq.n,
          sector: eq.sec,
          price: quote.price,
          change: quote.change,
          changePct: quote.changePct,
          volume: quote.volume,
          marketCap: quote.marketCap,
          pe: quote.pe,
          signal: latest?.signal || "HOLD",
          rsi: latest?.rsi || null,
          macdHistogram: latest?.macdHistogram || null,
          supertrendDir: latest?.supertrendDir || 0,
          signalReason: latest?.reason || "",
          lastDate: histData[histData.length - 1]?.date,
        };
      })(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PER_STOCK_TIMEOUT)),
    ]);
    return result;
  } catch (err: any) {
    // Retry on rate-limit or timeout errors
    const msg = (err?.message || '').toLowerCase();
    const isRetryable = msg.includes('429') || msg.includes('rate') || msg.includes('timeout') || msg.includes('econnreset');
    if (isRetryable && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return scanStockWithRetry(eq, params, attempt + 1);
    }
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// POST /api/screener — save a screener preset
export async function POST(request: NextRequest) {
  try {
    const { name, filters } = await request.json();
    if (!name || !filters) {
      return NextResponse.json({ error: 'name and filters required' }, { status: 400 });
    }
    const saved = await db.savedScreener.create({
      data: { name, filters: JSON.stringify(filters) },
    });
    return NextResponse.json({ saved: { id: saved.id, name: saved.name, filters: JSON.parse(saved.filters), createdAt: saved.createdAt } });
  } catch (e: any) {
    console.error('[screener]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/screener?id=xxx — delete a saved screener
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.savedScreener.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[screener]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function csvSafe(val: string | number | null | undefined): string {
  if (val == null) return '""';
  const s = String(val);
  // Prevent formula injection in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s.replace(/"/g, '""') + '"';
  return '"' + s.replace(/"/g, '""') + '"';
}

function csvResponse(results: any[]): NextResponse {
  const headers = ['Symbol', 'Name', 'Sector', 'Price', 'Change%', 'RSI', 'Signal', 'Volume', 'Market Cap', 'P/E', 'Reason'];
  const rows = results.map(r => [
    csvSafe(r.symbol), csvSafe(r.name), csvSafe(r.sector), csvSafe(r.price), csvSafe(r.changePct?.toFixed(2)),
    csvSafe(r.rsi?.toFixed(1) || ''), csvSafe(r.signal), csvSafe(r.volume), csvSafe(r.marketCap), csvSafe(r.pe?.toFixed(1) || ''), csvSafe(r.signalReason)
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="screener-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
