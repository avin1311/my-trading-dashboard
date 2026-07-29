import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLiveQuote } from "@/lib/market-data";

// GET /api/portfolio — list holdings with live P&L
export async function GET() {
  try {
    const holdings = await db.holding.findMany({ orderBy: { addedAt: 'desc' } });
    
    // Fetch live prices for all holdings (max 5 concurrent)
    const enriched: any[] = [];
    for (let i = 0; i < holdings.length; i += 5) {
      const batch = holdings.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (h) => {
          let quote = null;
          try { quote = await getLiveQuote(h.symbol); } catch {}
          const currentPrice = quote?.price || 0;
          const invested = h.qty * h.avgPrice;
          const currentValue = h.qty * currentPrice;
          const pnl = currentValue - invested;
          const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
          const dayChange = quote?.change || 0;
          const dayPnl = h.qty * dayChange;
          return {
            ...h,
            currentPrice,
            name: quote?.name || h.name || h.symbol,
            sector: quote?.sector || h.sector,
            invested,
            currentValue,
            pnl,
            pnlPct,
            dayPnl,
          };
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') enriched.push(r.value);
      }
    }

    // Totals
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalCurrent = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const totalDayPnl = enriched.reduce((s, h) => s + h.dayPnl, 0);

    return NextResponse.json({ holdings: enriched, totals: { totalInvested, totalCurrent, totalPnl, totalPnlPct, totalDayPnl } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/portfolio — add holding
export async function POST(request: NextRequest) {
  try {
    const { symbol, name, qty, avgPrice, sector } = await request.json();
    if (!symbol || !qty || !avgPrice) {
      return NextResponse.json({ error: 'symbol, qty, avgPrice required' }, { status: 400 });
    }
    const holding = await db.holding.create({
      data: { symbol: symbol.toUpperCase(), name: name || symbol, qty: Number(qty), avgPrice: Number(avgPrice), sector: sector || '' },
    });
    return NextResponse.json({ holding });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/portfolio?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.holding.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/portfolio — update holding
export async function PATCH(request: NextRequest) {
  try {
    const { id, qty, avgPrice } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const update: any = {};
    if (qty != null) update.qty = Number(qty);
    if (avgPrice != null) update.avgPrice = Number(avgPrice);
    const holding = await db.holding.update({ where: { id }, data: update });
    return NextResponse.json({ holding });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
