import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getUpstoxToken } from '@/lib/upstox-client';
import { ensureWSConnected, getWSManager } from '@/lib/upstox-ws-manager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upstox/callback?code=xxx&state=upstox_oauth
 *
 * Upstox redirects here after user authorizes. We exchange the code
 * for an access_token, store it server-side, kick off the WebSocket,
 * and redirect back to the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');

  // Determine the frontend base URL from the request headers or env
  const forwarded = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = forwarded || request.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  if (error) {
    console.error('[Upstox] OAuth error:', error, errorDesc);
    return NextResponse.redirect(new URL(`/?upstox=error_${error}&detail=${encodeURIComponent(errorDesc || '')}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/?upstox=error_no_code', baseUrl));
  }

  if (state !== 'upstox_oauth') {
    console.warn('[Upstox] State mismatch, but proceeding anyway');
  }

  const tokenData = await exchangeCodeForToken(code);

  if (!tokenData?.access_token) {
    console.error('[Upstox] Token exchange returned no access_token');
    return NextResponse.redirect(new URL('/?upstox=error_token_exchange', baseUrl));
  }

  // Verify token is stored
  const token = getUpstoxToken();
  console.log(`[Upstox] Token stored successfully, expires in ${tokenData.expires_in || 86400}s`);

  // Kick off the WebSocket connection now that we have a token
  ensureWSConnected();

  // Log WS status for debugging
  setTimeout(() => {
    const mgr = getWSManager();
    console.log(`[Upstox] WS status after connect: connected=${mgr.connected}, authorized=${mgr.authorized}`);
  }, 3000);

  return NextResponse.redirect(new URL('/?upstox=connected', baseUrl));
}
