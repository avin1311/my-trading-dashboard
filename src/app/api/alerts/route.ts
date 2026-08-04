import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isUpstoxConnected, fetchUpstoxLiveQuotes } from '@/lib/upstox-client';
import { getLiveQuote } from "@/lib/market-data";
import { requireWriteAuth } from '@/lib/api-auth';

// GET /api/alerts — list all alerts (with live price check)
export async function GET() {
  try {
    const alerts = await db.priceAlert.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Enrich active alerts with live prices
    const activeAlerts = alerts.filter(a => a.active && !a.triggered);
    if (activeAlerts.length > 0) {
      const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
      const priceMap = new Map<string, number>();

      // Try Upstox batch quote first
      if (isUpstoxConnected()) {
        try {
          const upstoxQuotes = await fetchUpstoxLiveQuotes(symbols);
          for (const [sym, q] of upstoxQuotes) {
            if (q.ltp > 0) priceMap.set(sym, q.ltp);
          }
        } catch {}
      }

      // Fallback: Yahoo Finance for symbols not covered
      for (const sym of symbols) {
        if (priceMap.has(sym)) continue;
        try {
          const quote = await getLiveQuote(sym);
          if (quote?.price) priceMap.set(sym, quote.price);
        } catch {}
      }

      // Check alerts and auto-trigger (skip recently created to avoid instant trigger)
      const triggeredAlerts: any[] = [];
      for (const alert of activeAlerts) {
        const currentPrice = priceMap.get(alert.symbol);
        if (!currentPrice) continue;

        // Grace period: don't trigger alerts created in the last 60 seconds
        const ageMs = Date.now() - new Date(alert.createdAt).getTime();
        if (ageMs < 60_000) continue;

        const triggered =
          (alert.condition === 'above' && currentPrice >= alert.targetPrice) ||
          (alert.condition === 'below' && currentPrice <= alert.targetPrice);

        if (triggered) {
          await db.priceAlert.update({
            where: { id: alert.id },
            data: { triggered: true, triggeredAt: new Date(), triggeredPrice: currentPrice },
          });
          triggeredAlerts.push({
            ...alert,
            triggered: true,
            triggeredAt: new Date().toISOString(),
            triggeredPrice: currentPrice,
            currentPrice,
          });
        }
      }

      // Re-fetch to get updated state
      const updatedAlerts = await db.priceAlert.findMany({ orderBy: { createdAt: 'desc' } });

      // Enrich all alerts with current price
      const enriched = updatedAlerts.map(a => ({
        ...a,
        currentPrice: priceMap.get(a.symbol) || null,
      }));

      return NextResponse.json({ alerts: enriched, justTriggered: triggeredAlerts });
    }

    return NextResponse.json({ alerts, justTriggered: [] });
  } catch (e: any) {
    console.error('[alerts]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/alerts — create alert
export async function POST(request: NextRequest) {
  const auth = requireWriteAuth(request);
  if (!auth.authorized) return auth.error!;
  try {
    const { symbol, name, condition, targetPrice, note } = await request.json();
    if (!symbol || !condition || !targetPrice) {
      return NextResponse.json({ error: 'symbol, condition, targetPrice required' }, { status: 400 });
    }
    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json({ error: 'condition must be above or below' }, { status: 400 });
    }
    const alert = await db.priceAlert.create({
      data: {
        symbol: symbol.toUpperCase(),
        name: name || symbol,
        condition,
        targetPrice: Number(targetPrice),
        note: note || '',
      },
    });
    return NextResponse.json({ alert });
  } catch (e: any) {
    console.error('[alerts]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/alerts?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = requireWriteAuth(request);
  if (!auth.authorized) return auth.error!;
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!/^[a-zA-Z0-9_-]{1,30}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }
    await db.priceAlert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    console.error('[alerts]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/alerts — mark triggered or toggle active
export async function PATCH(request: NextRequest) {
  const auth = requireWriteAuth(request);
  if (!auth.authorized) return auth.error!;
  try {
    const { id, triggered, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!/^[a-zA-Z0-9_-]{1,30}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 });
    }
    const update: any = {};
    if (typeof triggered === 'boolean') {
      update.triggered = triggered;
      update.triggeredAt = triggered ? new Date() : null;
      update.triggeredPrice = null;
    }
    if (typeof active === 'boolean') update.active = active;
    const alert = await db.priceAlert.update({ where: { id }, data: update });
    return NextResponse.json({ alert });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    console.error('[alerts]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
