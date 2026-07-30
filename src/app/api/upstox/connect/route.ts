import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/upstox-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/upstox/connect
 *
 * Redirects the user to Upstox OAuth login page.
 * Validates that API key is configured before redirecting.
 */
export async function GET() {
  const apiKey = process.env.UPSTOX_API_KEY;
  if (!apiKey) {
    return NextResponse.redirect(new URL('/?upstox=error_no_api_key', 'http://localhost:3000'));
  }

  const apiSecret = process.env.UPSTOX_API_SECRET;
  if (!apiSecret) {
    return NextResponse.redirect(new URL('/?upstox=error_no_api_secret', 'http://localhost:3000'));
  }

  const url = getAuthUrl();
  console.log('[Upstox] Redirecting to OAuth login...');
  return NextResponse.redirect(url);
}
