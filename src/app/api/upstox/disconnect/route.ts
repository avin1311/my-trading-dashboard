import { NextResponse } from 'next/server';
import { disconnectUpstox } from '@/lib/upstox-client';
import { getWSManager } from '@/lib/upstox-ws-manager';

export async function POST() {
  // Destroy the WebSocket connection first
  const mgr = getWSManager();
  mgr.destroy();

  // Then clear the stored token
  disconnectUpstox();

  console.log('[Upstox] Disconnected — WS destroyed and token cleared');
  return NextResponse.json({ disconnected: true });
}
