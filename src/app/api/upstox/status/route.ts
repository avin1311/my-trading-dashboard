import { NextResponse } from 'next/server';
import { isUpstoxConnected, fetchUserProfile } from '@/lib/upstox-client';

export async function GET() {
  const connected = isUpstoxConnected();

  let profile: any = null;
  if (connected) {
    profile = await fetchUserProfile();
  }

  return NextResponse.json({
    connected,
    user: profile ? {
      name: profile.user_name || profile.name || '',
      userId: profile.user_id || '',
      exchange: profile.exchanges || [],
      products: profile.products || [],
    } : null,
  });
}
