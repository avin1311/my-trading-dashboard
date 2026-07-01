import { NextResponse } from "next/server";
import { getHistoricalData, getLiveQuote } from "@/lib/market-data";

// GET /api/stock-data?symbol=RELIANCE&days=200
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const days = Math.min(Math.max(Number(searchParams.get("days")) || 200, 30), 500);

  try {
    const data = await getHistoricalData(symbol, days);
    return NextResponse.json({ stockInfo: { symbol }, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

