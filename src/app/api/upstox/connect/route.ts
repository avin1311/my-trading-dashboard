import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/upstox-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upstox/connect
 *
 * Redirects the user to Upstox OAuth login page.
 * Validates that API key is configured before redirecting.
 */
export async function GET(request: NextRequest) {
  // Build base URL from request headers (supports reverse proxy / non-localhost)
  const forwarded = request.headers.get('x-forwarded-host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const host = forwarded || request.headers.get('host') || 'localhost:3000';
  const baseUrl = `${proto}://${host}`;

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
