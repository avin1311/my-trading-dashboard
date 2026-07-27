import { NextResponse } from 'next/server';
import { getUpstoxToken } from '@/lib/upstox-client';

/**
 * GET /api/upstox/token
 * Returns the stored Upstox access token (used by the SSE bridge internally).
 * Only exposes a boolean + expiry hint, never the raw token, for client security.
 */
export async function GET() {
  const token = getUpstoxToken();
  return NextResponse.json({
    hasToken: !!token,
    connected: !!token,
  });
}
