import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, isUpstoxConnected } from '@/lib/upstox-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upstox/connect
 *
 * Redirects the user to Upstox OAuth login page.
 * If already connected, redirect back to dashboard instead of re-authenticating.
 * This prevents the redirect loop when browser replays a stale /connect request
 * after a server restart (in-memory token is lost but browser caches the URL).
 */
export async function GET(request: NextRequest) {
  // Build base URL from request headers (supports reverse proxy / non-localhost)
  const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'localhost:3000').split(',').map(h => h.trim());
  const forwarded = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const rawHost = forwarded || request.headers.get('host') || 'localhost:3000';
  const host = ALLOWED_HOSTS.some(ah => rawHost === ah || rawHost.endsWith(':' + ah) || ah.endsWith('.' + rawHost.split(':')[0])) ? rawHost : 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

  // If we somehow already have a token, skip re-auth
  if (isUpstoxConnected()) {
    return NextResponse.redirect(new URL('/?upstox=connected', baseUrl));
  }

  const apiKey = process.env.UPSTOX_API_KEY;
  if (!apiKey) {
    return NextResponse.redirect(new URL('/?upstox=error_no_api_key', baseUrl));
  }

  const apiSecret = process.env.UPSTOX_API_SECRET;
  if (!apiSecret) {
    return NextResponse.redirect(new URL('/?upstox=error_no_api_secret', baseUrl));
  }

  const url = getAuthUrl();
  console.log('[Upstox] Redirecting to OAuth login...');
  return NextResponse.redirect(url);
}
