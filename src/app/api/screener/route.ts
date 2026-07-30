import { NextRequest, NextResponse } from "next/server";
import { getScreenerData } from "@/lib/market-data";
import { generateSignals, DEFAULT_PARAMS, type StrategyParams } from "@/lib/trading-strategy";
import { stockList } from "@/lib/stock-list";
import { db } from "@/lib/db";

// Cache screener results for 5 minutes
let screenerCache: { data: any; timestamp: number; params: string } | null = null;
const SCREENER_TTL = 5 * 60_000;

const BATCH_SIZE = 3;        // 3 stocks at a time (1 API call each = 3 concurrent)
const BATCH_DELAY_MS = 800;   // 800ms between batches to avoid Yahoo rate limiting
const PER_STOCK_TIMEOUT = 12000; // 12s per stock

// GET /api/screener?signal=BUY&sector=Banking&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Saved screeners sub-endpoint
  if (searchParams.get('action') === 'list_saved') {
    try {
      const saved = await db.savedScreener.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json({ saved: saved.map(s => ({ id: s.id, name: s.name, filters: JSON.parse(s.filters), createdAt: s.createdAt })) });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
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

  // Get equities to scan
  let equities = stockList.equities;
  if (sectorFilter && sectorFilter !== "all") {
    equities = equities.filter((e: any) => e.sec === sectorFilter);
  }

  console.log(`[Screener] Starting scan of ${equities.length} stocks (1 API call each, batch=${BATCH_SIZE}, delay=${BATCH_DELAY_MS}ms)...`);

  // Scan in small batches with delays to avoid Yahoo rate limiting
  const results: any[] = [];
  let scanned = 0;
  let failed = 0;
  const totalBatches = Math.ceil(equities.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < equities.length; batchIdx += BATCH_SIZE) {
    const batch = equities.slice(batchIdx, batchIdx + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (eq: any) => {
        try {
          const result = await Promise.race([
            getScreenerData(eq.s, 100),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), PER_STOCK_TIMEOUT)),
          ]);

          if (!result) return null;

          const signals = generateSignals(result.historical, params);
          const latest = signals.length > 0 ? signals[signals.length - 1] : null;

          return {
            symbol: eq.s,
            name: eq.n,
            sector: eq.sec,
            price: result.price,
            change: result.change,
            changePct: result.changePct,
            volume: result.volume,
            marketCap: (result as any)._marketCap || 0,
            pe: (result as any)._pe ?? null,
            signal: latest?.signal || "HOLD",
            rsi: latest?.rsi || null,
            macdHistogram: latest?.macdHistogram || null,
            supertrendDir: latest?.supertrendDir || 0,
            signalReason: latest?.reason || "",
            lastDate: result.historical[result.historical.length - 1]?.date,
          };
        } catch {
          return null;
        }
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

    // Delay between batches to avoid Yahoo rate limiting (skip delay after last batch)
    const currentBatch = Math.floor(batchIdx / BATCH_SIZE) + 1;
    if (currentBatch < totalBatches) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[Screener] Done: ${results.length}/${scanned} successful, ${failed} failed`);

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
    dataSource: "yahoo_finance_realtime",
  };

  screenerCache = { data: response, timestamp: Date.now(), params: cacheKey };

  if (exportFormat === 'csv') return csvResponse(final);
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
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
    return NextResponse.json({ error: e.message }, { status: 500 });
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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function csvResponse(results: any[]): NextResponse {
  const headers = ['Symbol', 'Name', 'Sector', 'Price', 'Change%', 'RSI', 'Signal', 'Volume', 'Market Cap', 'P/E', 'Reason'];
  const rows = results.map(r => [
    r.symbol, r.name, r.sector, r.price, r.changePct?.toFixed(2),
    r.rsi?.toFixed(1) || '', r.signal, r.volume, r.marketCap, r.pe?.toFixed(1) || '', r.signalReason
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="screener-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}