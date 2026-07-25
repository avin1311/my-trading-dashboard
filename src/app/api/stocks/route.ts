import { NextRequest, NextResponse } from "next/server";
import { stockList } from "@/lib/stock-list";

// ==================== OPTIONS CHAIN GENERATOR ====================
function generateOptionsChain(underlying: string): Array<{
  symbol: string; name: string; type: string; underlying: string;
  strikePrice: number; optionType: string; expiry: string; lotSize: number;
}> {
  // Get base price from equities/indices, or use a default
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const basePrice = base?.bp || 1000;
  const lotSize = base?.ls || 1;

  // Find lot size from option underlyings lookup
  const eqLot = stockList.equities.find((e: any) => e.s === underlying);
  const idxLot = stockList.indices.find((i: any) => i.s === underlying);
  const actualLot = eqLot?.ls || idxLot?.ls || lotSize;

  // Calculate next 3 monthly expiries (last Thursday of each month)
  const expiries: string[] = [];
  const now = new Date();
  for (let m = 0; m < 3; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m + 1, 0); // last day of month
    // Find last Thursday
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    // If the last Thursday is in the past for current month, skip to next
    if (m === 0 && d <= now) continue;
    expiries.push(d.toISOString().split('T')[0]);
  }
  // Ensure at least 1 expiry
  if (expiries.length === 0) {
    const d = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    expiries.push(d.toISOString().split('T')[0]);
  }

  const options: Array<{
    symbol: string; name: string; type: string; underlying: string;
    strikePrice: number; optionType: string; expiry: string; lotSize: number;
  }> = [];

  // Generate strikes around ATM (±10%)
  const step = basePrice > 10000 ? 100 : basePrice > 1000 ? 50 : basePrice > 100 ? 5 : 1;
  const atmStrike = Math.round(basePrice / step) * step;
  const numStrikes = 12;

  for (const expiry of expiries) {
    for (let i = -numStrikes; i <= numStrikes; i++) {
      const strike = atmStrike + i * step;
      if (strike <= 0) continue;
      options.push({
        symbol: `${underlying}${expiry.replace(/-/g, '')}${strike}CE`,
        name: `${underlying} ${strike} CE`,
        type: "option", underlying,
        strikePrice: strike, optionType: "CE", expiry, lotSize: actualLot,
      });
      options.push({
        symbol: `${underlying}${expiry.replace(/-/g, '')}${strike}PE`,
        name: `${underlying} ${strike} PE`,
        type: "option", underlying,
        strikePrice: strike, optionType: "PE", expiry, lotSize: actualLot,
      });
    }
  }

  return options;
}

// GET /api/stocks?type=equity|index|option
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "equity";
  const search = searchParams.get("search") || "";
  const sector = searchParams.get("sector") || "";
  const underlying = searchParams.get("underlying") || "";
  const expiry = searchParams.get("expiry") || "";

  if (type === "equity") {
    let instruments = stockList.equities;
    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter((s: any) => s.s.toLowerCase().includes(q) || s.n.toLowerCase().includes(q));
    }
    if (sector && sector !== "all") {
      instruments = instruments.filter((s: any) => s.sec === sector);
    }
    const mapped = instruments.map((s: any) => ({
      symbol: s.s, name: s.n, sector: s.sec,
      basePrice: s.bp, volatility: s.v, lotSize: s.ls, type: 'equity' as const,
    }));
    const stats = { totalEquities: stockList.equities.length, totalIndices: stockList.indices.length, optionUnderlyings: stockList.optionUnderlyings.length };
    const sectors = [...new Set(stockList.equities.map((s: any) => s.sec))];
    return NextResponse.json({ instruments: mapped, stats, sectors: sectors.sort() }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  if (type === "index") {
    let instruments = stockList.indices;
    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter((s: any) => s.s.toLowerCase().includes(q) || s.n.toLowerCase().includes(q));
    }
    const mapped = instruments.map((s: any) => ({
      symbol: s.s, name: s.n, sector: s.sec || 'Index',
      basePrice: s.bp || 0, volatility: s.v || 0, lotSize: s.ls || 1, type: 'index' as const,
    }));
    return NextResponse.json({ instruments: mapped, stats: { totalIndices: stockList.indices.length } }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  if (type === "option") {
    const underlyings = stockList.optionUnderlyings;
    const allOptions = underlying ? generateOptionsChain(underlying) : [];
    const expiryDates = [...new Set(allOptions.map(o => o.expiry).filter(Boolean))].sort();
    let instruments = allOptions;
    if (expiry) {
      instruments = instruments.filter(o => o.expiry === expiry);
    }
    return NextResponse.json({ instruments, underlyings, expiryDates, stats: { optionUnderlyings: underlyings.length } }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  const allMapped = [...stockList.equities, ...stockList.indices].map((s: any) => ({
    symbol: s.s, name: s.n, sector: s.sec || '',
    basePrice: s.bp || 0, volatility: s.v || 0, lotSize: s.ls || 1, type: s.ls ? 'equity' : 'index' as const,
  }));
  return NextResponse.json({
    instruments: allMapped,
    stats: { totalEquities: stockList.equities.length, totalIndices: stockList.indices.length, optionUnderlyings: stockList.optionUnderlyings.length },
    sectors: [...new Set(stockList.equities.map((s: any) => s.sec))].sort(),
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
}