import { NextResponse } from 'next/server';
import { getUpstoxToken, isUpstoxConnected } from '@/lib/upstox-client';

// GET /api/upstox/token
// Returns the current Upstox access token to the frontend
// so the client can send it to the WS bridge for real-time data.
// The token is session-scoped and expires at end of trading day.
export async function GET() {
  const token = getUpstoxToken();
  return NextResponse.json({
    token: token || null,
    connected: isUpstoxConnected(),
  }, { headers: { 'Cache-Control': 'no-store', 'Pragma': 'no-cache' } });
}
