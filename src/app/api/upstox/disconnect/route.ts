import { NextResponse } from 'next/server';
import { disconnectUpstox } from '@/lib/upstox-client';

export async function POST() {
  disconnectUpstox();
  return NextResponse.json({ disconnected: true });
}
