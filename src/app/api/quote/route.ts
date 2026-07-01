import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote, getSectorPeers, getMarketOverview } from "@/lib/market-data";

// GET /api/quote?symbol=RELIANCE&peers=true
// GET /api/quote?overview=true (market overview)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const includePeers = searchParams.get("peers") === "true";
  const marketOverview = searchParams.get("overview") === "true";

  if (marketOverview) {
    try {
      const data = await getMarketOverview();
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json(
        { error: "Failed to fetch market overview: " + err.message },
        { status: 500 }
      );
    }
  }

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  try {
    const quote = await getLiveQuote(symbol);
    let peers = null;

    if (includePeers && quote.sector) {
      try {
        peers = await getSectorPeers(symbol, quote.sector);
      } catch {
        // Peers are optional
      }
    }

    return NextResponse.json({ quote, peers });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch quote: " + err.message },
      { status: 500 }
    );
  }
}---

