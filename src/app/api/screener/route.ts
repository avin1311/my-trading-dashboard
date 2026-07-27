import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote, getHistoricalData } from "@/lib/market-data";
import { generateSignals, DEFAULT_PARAMS, type StrategyParams } from "@/lib/trading-strategy";
import { stockList } from "@/lib/stock-list";

// Cache screener results for 5 minutes
let screenerCache: { data: any[]; timestamp: number; params: string } | null = null;
const SCREENER_TTL = 5 * 60_000;

// GET /api/screener?signal=BUY&sector=Banking&limit=20
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const signalFilter = searchParams.get("signal") || "";
  const sectorFilter = searchParams.get("sector") || "";
  const rawLimit = Number(searchParams.get("limit"));
  const limit = rawLimit === 0 ? 99999 : Math.min(rawLimit || 50, 100);

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
    return NextResponse.json({ ...screenerCache.data, cached: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  // Get equities to scan
  let equities = stockList.equities;
  if (sectorFilter && sectorFilter !== "all") {
    equities = equities.filter((e: any) => e.sec === sectorFilter);
  }

  // Scan in batches of 5 (parallel but rate-limited)
  const results: any[] = [];
  const batchSize = 5;

  for (let i = 0; i < equities.length; i += batchSize) {
    const batch = equities.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (eq: any) => {
        try {
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
        } catch {
          return null;
        }
      })
    );

    for (const r of batchResults) {
      if (r.status === "fulfilled" && r.value) {
        results.push(r.value);
      }
    }
  }

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
  return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
}