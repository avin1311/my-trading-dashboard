import { NextRequest, NextResponse } from "next/server";
import stockData from "@/lib/stock-list.json";

// GET /api/stocks?type=equity|index|option
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "equity";
  const search = searchParams.get("search") || "";
  const sector = searchParams.get("sector") || "";
  const underlying = searchParams.get("underlying") || "";
  const expiry = searchParams.get("expiry") || "";

  if (type === "equity") {
    let instruments = stockData.equities;
    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter(s => s.s.toLowerCase().includes(q) || s.n.toLowerCase().includes(q));
    }
    if (sector && sector !== "all") {
      instruments = instruments.filter(s => s.sec === sector);
    }
    const stats = { totalEquities: stockData.equities.length, totalIndices: stockData.indices.length, optionUnderlyings: stockData.optionUnderlyings.length };
    const sectors = [...new Set(stockData.equities.map(s => s.sec))];
    return NextResponse.json({ instruments, stats, sectors: sectors.sort() });
  }

  if (type === "index") {
    let instruments = stockData.indices;
    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter(s => s.s.toLowerCase().includes(q) || s.n.toLowerCase().includes(q));
    }
    return NextResponse.json({ instruments, stats: { totalIndices: stockData.indices.length } });
  }

  if (type === "option") {
    const underlyings = stockData.optionUnderlyings;
    const allOptions = underlying ? generateOptionsChain(underlying) : [];
    const expiryDates = [...new Set(allOptions.map(o => o.expiry).filter(Boolean))].sort();
    let instruments = allOptions;
    if (expiry) {
      instruments = instruments.filter(o => o.expiry === expiry);
    }
    return NextResponse.json({ instruments, underlyings, expiryDates, stats: { optionUnderlyings: underlyings.length } });
  }

  return NextResponse.json({
    instruments: [...stockData.equities, ...stockData.indices],
    stats: { totalEquities: stockData.equities.length, totalIndices: stockData.indices.length, optionUnderlyings: stockData.optionUnderlyings.length },
    sectors: [...new Set(stockData.equities.map(s => s.sec))].sort(),
  });
}

