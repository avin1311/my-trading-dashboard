import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/alerts — list all alerts
export async function GET() {
  try {
    const alerts = await db.priceAlert.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/alerts — create alert
export async function POST(request: NextRequest) {
  try {
    const { symbol, name, condition, targetPrice } = await request.json();
    if (!symbol || !condition || !targetPrice) {
      return NextResponse.json({ error: 'symbol, condition, targetPrice required' }, { status: 400 });
    }
    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json({ error: 'condition must be above or below' }, { status: 400 });
    }
    const alert = await db.priceAlert.create({
      data: { symbol: symbol.toUpperCase(), name: name || symbol, condition, targetPrice: Number(targetPrice) },
    });
    return NextResponse.json({ alert });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/alerts?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await db.priceAlert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/alerts — mark triggered or toggle active
export async function PATCH(request: NextRequest) {
  try {
    const { id, triggered, active } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const update: any = {};
    if (typeof triggered === 'boolean') {
      update.triggered = triggered;
      update.triggeredAt = triggered ? new Date() : null;
    }
    if (typeof active === 'boolean') update.active = active;
    const alert = await db.priceAlert.update({ where: { id }, data: update });
    return NextResponse.json({ alert });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
