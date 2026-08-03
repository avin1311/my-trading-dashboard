import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getLiveQuote } from "@/lib/market-data";
import { isUpstoxConnected, fetchUpstoxLiveQuotes } from '@/lib/upstox-client';

// GET /api/portfolio — list holdings with live P&L + trade journal
export async function GET() {
  try {
    const holdings = await db.holding.findMany({ orderBy: { addedAt: 'desc' } });
    const trades = await db.tradeJournal.findMany({ orderBy: { tradedAt: 'desc' } });

    if (holdings.length === 0) {
      return NextResponse.json({ holdings: [], totals: { totalInvested: 0, totalCurrent: 0, totalPnl: 0, totalPnlPct: 0, totalDayPnl: 0 }, trades });
    }

    const symbols = holdings.map(h => h.symbol);
    const priceMap = new Map<string, { price: number; change: number }>();

    // Try Upstox batch quote first for live data
    if (isUpstoxConnected()) {
      try {
        const upstoxQuotes = await fetchUpstoxLiveQuotes(symbols);
        for (const [sym, q] of upstoxQuotes) {
          if (q.ltp > 0) priceMap.set(sym, { price: q.ltp, change: q.change });
        }
      } catch {}
    }

    // Fallback: Yahoo Finance for symbols not covered by Upstox
    const missingSymbols = symbols.filter(s => !priceMap.has(s));
    for (const sym of missingSymbols) {
      try {
        const quote = await getLiveQuote(sym);
        if (quote?.price) priceMap.set(sym, { price: quote.price, change: quote.change || 0 });
      } catch {}
    }

    // Enrich holdings
    const enriched: any[] = holdings.map(h => {
      const pd = priceMap.get(h.symbol) || { price: 0, change: 0 };
      const invested = h.qty * h.avgPrice;
      const currentValue = h.qty * pd.price;
      const pnl = currentValue - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
      const dayPnl = h.qty * pd.change;
      return {
        ...h,
        currentPrice: pd.price,
        dayChange: pd.change,
        invested,
        currentValue,
        pnl,
        pnlPct: Math.round(pnlPct * 100) / 100,
        dayPnl: Math.round(dayPnl * 100) / 100,
      };
    });

    // Totals
    const totalInvested = enriched.reduce((s, h) => s + h.invested, 0);
    const totalCurrent = enriched.reduce((s, h) => s + h.currentValue, 0);
    const totalPnl = totalCurrent - totalInvested;
    const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
    const totalDayPnl = enriched.reduce((s, h) => s + h.dayPnl, 0);

    return NextResponse.json({
      holdings: enriched,
      totals: { totalInvested, totalCurrent, totalPnl, totalPnlPct: Math.round(totalPnlPct * 100) / 100, totalDayPnl },
      trades,
    });
  } catch (e: any) {
    console.error('[portfolio]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/portfolio — add holding OR add trade journal entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Trade journal entry
    if (body._type === 'trade') {
      const { symbol, name, type, qty, price, pnl, note } = body;
      if (!symbol || !type || !qty || !price) {
        return NextResponse.json({ error: 'symbol, type, qty, price required' }, { status: 400 });
      }
      const trade = await db.tradeJournal.create({
        data: {
          symbol: symbol.toUpperCase(),
          name: name || symbol,
          type: type.toUpperCase(),
          qty: Number(qty),
          price: Number(price),
          pnl: pnl != null ? Number(pnl) : null,
          note: note || '',
        },
      });
      return NextResponse.json({ trade });
    }

    // Holding
    const { symbol, name, qty, avgPrice, sector } = body;
    if (!symbol || !qty || !avgPrice) {
      return NextResponse.json({ error: 'symbol, qty, avgPrice required' }, { status: 400 });
    }
    const qtyNum = Number(qty);
    const priceNum = Number(avgPrice);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      return NextResponse.json({ error: 'qty must be a positive number' }, { status: 400 });
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'avgPrice must be a non-negative number' }, { status: 400 });
    }
    const holding = await db.holding.create({
      data: { symbol: symbol.toUpperCase(), name: name || symbol, qty: qtyNum, avgPrice: priceNum, sector: sector || '' },
    });
    return NextResponse.json({ holding });
  } catch (e: any) {
    console.error('[portfolio]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/portfolio?id=xxx&type=holding|trade
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type') || 'holding';
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    if (type === 'trade') {
      await db.tradeJournal.delete({ where: { id } });
    } else {
      await db.holding.delete({ where: { id } });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[portfolio]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
    console.error('[portfolio]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
