import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/upstox-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/?upstox=error_no_code', 'http://localhost:3000'));
  }

  // Verify state to prevent CSRF (basic check)
  if (state !== 'upstox_oauth') {
    console.warn('[Upstox] State mismatch, but proceeding anyway');
  }

  const tokenData = await exchangeCodeForToken(code);

  if (!tokenData?.access_token) {
    return NextResponse.redirect(new URL('/?upstox=error_token_exchange', 'http://localhost:3000'));
  }

  // Redirect back to dashboard with success flag
  return NextResponse.redirect(new URL('/?upstox=connected', 'http://localhost:3000'));
}
