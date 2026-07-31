import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stock Screener - NSE Analytics Dashboard',
  description: 'Scan all NSE stocks with Supertrend + RSI + MACD confluence strategy. Filter by signal type, sector, and more.',
  openGraph: {
    title: 'NSE Stock Screener - NSE Analytics',
    description: 'Scan NSE stocks for buy/sell signals using Supertrend + RSI + MACD strategy',
    type: 'website',
  },
};

export default function ScreenerPage() {
  // Redirect to main app with view=screener
  redirect('/?view=screener');
}
