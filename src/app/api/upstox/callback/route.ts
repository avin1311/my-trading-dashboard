import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/lib/upstox-client';
import { ensureWSConnected } from '@/lib/upstox-ws-manager';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.redirect(new URL('/?upstox=error_no_code', 'http://localhost:3000'));
  }

  if (state !== 'upstox_oauth') {
    console.warn('[Upstox] State mismatch, but proceeding anyway');
  }

  const tokenData = await exchangeCodeForToken(code);

  if (!tokenData?.access_token) {
    return NextResponse.redirect(new URL('/?upstox=error_token_exchange', 'http://localhost:3000'));
  }

  // Kick off the WebSocket connection now that we have a token
  ensureWSConnected();

  return NextResponse.redirect(new URL('/?upstox=connected', 'http://localhost:3000'));
}
