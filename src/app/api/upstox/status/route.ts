import { NextResponse } from 'next/server';
import { isUpstoxConnected, fetchUserProfile } from '@/lib/upstox-client';
import { getWSManager } from '@/lib/upstox-ws-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upstox/status
 *
 * Returns connection state, WS status, and user profile.
 * Called by the client to detect OAuth connection and by the status poll.
 */
export async function GET() {
  const hasToken = isUpstoxConnected();
  const mgr = getWSManager();

  let profile: any = null;
  if (hasToken) {
    try {
      profile = await fetchUserProfile();
    } catch {
      // Profile fetch failed — token might be expired
    }
  }

  return NextResponse.json({
    // connected = true if we have a valid token (can make REST API calls + OI)
    // The WS connection is a bonus for real-time ticks, not a requirement for "connected"
    connected: hasToken,
    hasToken,
    wsConnected: mgr.connected,
    wsAuthorized: mgr.authorized,
    apiKeyConfigured: !!process.env.UPSTOX_API_KEY,
    apiSecretConfigured: !!process.env.UPSTOX_API_SECRET,
    user: profile ? {
      name: profile.user_name || profile.name || '',
      userId: profile.user_id || '',
      exchange: profile.exchanges || [],
      products: profile.products || [],
    } : null,
  });
}
