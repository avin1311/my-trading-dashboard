import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

// Map of known NSE symbols to display names for better meta titles
const SYMBOL_NAMES: Record<string, string> = {
  RELIANCE: 'Reliance Industries',
  TCS: 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank',
  INFY: 'Infosys',
  ICICIBANK: 'ICICI Bank',
  SBIN: 'State Bank of India',
  TATAMOTORS: 'Tata Motors',
  LT: 'Larsen & Toubro',
  AXISBANK: 'Axis Bank',
  BAJFINANCE: 'Bajaj Finance',
  SUNPHARMA: 'Sun Pharmaceutical',
  MARUTI: 'Maruti Suzuki',
  NIFTY: 'NIFTY 50',
  BANKNIFTY: 'Bank NIFTY',
  NIFTYIT: 'NIFTY IT',
};

type PageProps = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  const name = SYMBOL_NAMES[upper] || upper;
  return {
    title: `${name} (${upper}) - NSE Analytics Dashboard`,
    description: `${name} stock analysis with Supertrend + RSI + MACD confluence signals, backtest results, and fundamentals on NSE Analytics.`,
    openGraph: {
      title: `${name} (${upper}) - NSE Analytics`,
      description: `Trading strategy analysis for ${name} on NSE`,
      type: 'website',
    },
  };
}

export default async function StockPage({ params }: PageProps) {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  // Validate symbol — only allow alphanumeric
  if (!/^[A-Z0-9]+$/i.test(upper)) {
    redirect('/');
  }
  // Redirect to main app with query params
  redirect(`/?symbol=${upper}`);
}
