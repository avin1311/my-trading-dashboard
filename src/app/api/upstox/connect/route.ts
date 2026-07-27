import { NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/upstox-client';

export async function GET() {
  const url = getAuthUrl();
  // Redirect the user's browser to Upstox OAuth login page
  return NextResponse.redirect(url);
}
