// Maps internal NSE symbols to Upstox v2 instrument keys

// Index name mappings: our symbol -> Upstox display name
const INDEX_NAMES: Record<string, string> = {
  NIFTY: 'Nifty 50',
  BANKNIFTY: 'Nifty Bank',
  FINNIFTY: 'Nifty Fin Service',
  NIFTYIT: 'Nifty IT',
  NIFTYNXT50: 'Nifty Next 50',
  MIDCPNIFTY: 'Nifty Midcap 50',
  INDIAVIX: 'India VIX',
  NIFTYFIN: 'Nifty Fin Service',
  NIFTYMIDCAP: 'Nifty Midcap 50',
  NIFTYSMLCAP: 'Nifty Smallcap 50',
  NIFTYPHARMA: 'Nifty Pharma',
  NIFTYAUTO: 'Nifty Auto',
  NIFTYMETAL: 'Nifty Metal',
  NIFTYENERGY: 'Nifty Energy',
  NIFTYFMCG: 'Nifty FMCG',
  NIFTYREALTY: 'Nifty Realty',
  NIFTYINFRA: 'Nifty Infrastructure',
  NIFTYPSUBANK: 'Nifty PSU Bank',
};

/**
 * Convert our internal NSE symbol to an Upstox instrument key.
 * E.g. RELIANCE -> NSE_EQ|RELIANCE
 *       NIFTY    -> NSE_INDEX|Nifty 50
 *       BANKNIFTY -> NSE_INDEX|Nifty Bank
 */
export function toInstrumentKey(symbol: string): string | null {
  const upper = symbol.toUpperCase();

  // Check if it's an index
  if (INDEX_NAMES[upper]) {
    return `NSE_INDEX|${INDEX_NAMES[upper]}`;
  }

  // Default: treat as NSE equity
  return `NSE_EQ|${upper}`;
}

/**
 * Get all instrument keys for a list of symbols
 */
export function toInstrumentKeys(symbols: string[]): string[] {
  const keys: string[] = [];
  for (const s of symbols) {
    const key = toInstrumentKey(s);
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Check if a symbol is an index
 */
export function isIndex(symbol: string): boolean {
  return symbol.toUpperCase() in INDEX_NAMES;
}
