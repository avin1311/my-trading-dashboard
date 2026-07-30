import { NextRequest, NextResponse } from "next/server";
import { stockList } from "@/lib/stock-list";
import { getLiveQuote } from "@/lib/market-data";
import type { OIStrikeData, OptionChainData, FuturesOIData, FuturesContract } from "@/lib/types";
import {
  fetchIndexOptionChain,
  fetchStockOptionChain,
  fetchFuturesData,
  isIndexSymbol,
  type NSEOptionChainResponse,
} from "@/lib/nse-option-chain";
import { isUpstoxConnected, getUpstoxToken } from "@/lib/upstox-client";

// ==================== LIVE PRICE FETCH (Yahoo fallback) ====================
// When NSE option chain API is blocked (403), we need a real spot price
// for mock data generation. This uses the Yahoo chart API but only
// extracts the current price - very fast, no heavy parsing.
const YAHOO_INDEX_MAP: Record<string, string> = {
  'NIFTY': '^NSEI',
  'BANKNIFTY': '^NSEBANK',
  'FINNIFTY': 'NIFTY_FIN_SERVICE.NS',
  'NIFTYIT': '^CNXIT',
  'NIFTYNXT50': '^NSMIDCP',
  'MIDCPNIFTY': '^NSMIDCP',
  'NIFTYBANK': '^NSEBANK',
  'NIFTYFIN': 'NIFTY_FIN_SERVICE.NS',
};

const spotPriceCache = new Map<string, { price: number; ts: number }>();
const SPOT_TTL = 30_000; // 30s cache

async function getQuickSpotPrice(nseSymbol: string): Promise<number | undefined> {
  const cached = spotPriceCache.get(nseSymbol);
  if (cached && Date.now() - cached.ts < SPOT_TTL) return cached.price;

  try {
    const yahooSym = YAHOO_INDEX_MAP[nseSymbol.toUpperCase()] || `${nseSymbol.toUpperCase()}.NS`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?range=1d&interval=5m`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (price && price > 0) {
      spotPriceCache.set(nseSymbol, { price, ts: Date.now() });
      return price;
    }
  } catch (err) {
    console.warn(`[OI] Quick price fetch failed for ${nseSymbol}:`, (err as Error).message);
  }
  return undefined;
}

// ==================== MOCK DATA GENERATORS ====================

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function getExpiryDates(): string[] {
  const expiries: string[] = [];
  const now = new Date();
  for (let m = 0; m < 4; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() + m + 1, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    if (m === 0 && d <= now) continue;
    expiries.push(d.toISOString().split('T')[0]);
  }
  if (expiries.length === 0) {
    const d = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    while (d.getDay() !== 4) d.setDate(d.getDate() - 1);
    expiries.push(d.toISOString().split('T')[0]);
  }
  return expiries;
}

async function generateOptionChain(underlying: string, expiry?: string, liveSpotPrice?: number): Promise<OptionChainData> {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  // Use live spot price if provided (from Yahoo), otherwise try Yahoo ourselves,
  // and only fall back to stale bp as absolute last resort
  let spotPrice = liveSpotPrice;
  if (!spotPrice) {
    spotPrice = await getQuickSpotPrice(underlying);
  }
  if (!spotPrice) {
    spotPrice = base?.bp || 24580;
    console.warn(`[OI] Using stale bp=${spotPrice} for ${underlying} (no live price available)`);
  } else {
    console.log(`[OI] Using live spot price=${spotPrice} for ${underlying}`);
  }

  const expiryDates = getExpiryDates();
  const currentExpiry = expiry || expiryDates[0] || '';

  const step = spotPrice > 30000 ? 100 : spotPrice > 10000 ? 50 : spotPrice > 1000 ? 20 : spotPrice > 100 ? 5 : 1;
  const atmStrike = Math.round(spotPrice / step) * step;
  const numStrikes = 15;

  const seed = underlying.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seededRandom(seed + new Date().getDate());

  const strikes: OIStrikeData[] = [];
  let totalCallOI = 0, totalPutOI = 0;
  let totalCallOIChg = 0, totalPutOIChg = 0;

  const isIndex = !stockList.equities.some((e: any) => e.s === underlying);
  const baseOI = isIndex ? 5000000 : 500000;

  for (let i = -numStrikes; i <= numStrikes; i++) {
    const strike = atmStrike + i * step;
    if (strike <= 0) continue;

    const distFromATM = Math.abs(strike - spotPrice) / spotPrice;
    const isITMCall = strike < spotPrice;
    const isITMPut = strike > spotPrice;

    const callOIFactor = Math.exp(-distFromATM * 8) * (isITMCall ? 2.5 : 0.6) * (0.7 + rng() * 0.6);
    const putOIFactor = Math.exp(-distFromATM * 8) * (isITMPut ? 2.8 : 0.5) * (0.7 + rng() * 0.6);

    const callOI = Math.round(baseOI * callOIFactor);
    const putOI = Math.round(baseOI * putOIFactor);

    const callOIBase = rng() > 0.4 ? 1 : -1;
    const putOIBase = rng() > 0.4 ? 1 : -1;
    const callOIChg = Math.round(callOI * (rng() * 0.15) * callOIBase);
    const putOIChg = Math.round(putOI * (rng() * 0.15) * putOIBase);

    totalCallOI += callOI;
    totalPutOI += putOI;
    totalCallOIChg += callOIChg;
    totalPutOIChg += putOIChg;

    const callVolume = Math.round(Math.abs(callOIChg) * (0.5 + rng() * 1.5));
    const putVolume = Math.round(Math.abs(putOIChg) * (0.5 + rng() * 1.5));

    const baseIV = isIndex ? 12 : 20;
    const callIV = baseIV + distFromATM * 60 + (rng() - 0.5) * 4;
    const putIV = baseIV + distFromATM * 55 + (rng() - 0.5) * 4;

    const callIntrinsic = Math.max(0, spotPrice - strike);
    const putIntrinsic = Math.max(0, strike - spotPrice);
    const timeValue = spotPrice * baseIV / 100 * Math.sqrt(30 / 365) * Math.exp(-distFromATM * 3);
    const callLTP = Math.max(0.05, callIntrinsic + timeValue * (0.8 + rng() * 0.4));
    const putLTP = Math.max(0.05, putIntrinsic + timeValue * (0.8 + rng() * 0.4));

    const callChg = (rng() - 0.5) * callLTP * 0.15;
    const putChg = (rng() - 0.5) * putLTP * 0.15;

    strikes.push({
      strikePrice: strike,
      callOI, callOIChg, callVolume,
      callIV: Math.round(callIV * 100) / 100,
      callLTP: Math.round(callLTP * 100) / 100,
      callChg: Math.round(callChg * 100) / 100,
      putOI, putOIChg, putVolume,
      putIV: Math.round(putIV * 100) / 100,
      putLTP: Math.round(putLTP * 100) / 100,
      putChg: Math.round(putChg * 100) / 100,
    });
  }

  let maxPain = atmStrike;
  let minPainValue = Infinity;
  for (const s of strikes) {
    let painValue = 0;
    for (const s2 of strikes) {
      if (s2.strikePrice < s.strikePrice) painValue += s2.callOI * (s.strikePrice - s2.strikePrice);
      if (s2.strikePrice > s.strikePrice) painValue += s2.putOI * (s2.strikePrice - s.strikePrice);
    }
    if (painValue < minPainValue) {
      minPainValue = painValue;
      maxPain = s.strikePrice;
    }
  }

  const pcr = totalPutOI > 0 ? totalCallOI / totalPutOI : 0;

  return {
    underlying,
    spotPrice,
    expiryDates,
    currentExpiry,
    strikes,
    totalCallOI,
    totalPutOI,
    totalCallOIChg,
    totalPutOIChg,
    maxPain,
    pcr: Math.round(pcr * 1000) / 1000,
    dataSource: 'mock',
  };
}

async function generateFuturesOI(underlying: string, clientSpotPrice?: number): Promise<FuturesOIData> {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  // Priority: client-provided Upstox LTP > Yahoo > stale bp
  let spotPrice: number = clientSpotPrice || await getQuickSpotPrice(underlying) || base?.bp || 24580;
  const name = base?.n || underlying;
  const lotSize = base?.ls || 25;

  const seed = underlying.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 999;
  const rng = seededRandom(seed + new Date().getDate());

  const expiryDates = getExpiryDates();

  const isIndex = !stockList.equities.some((e: any) => e.s === underlying);
  const baseOI = isIndex ? 15000000 : 1500000;
  const baseVolume = isIndex ? 800000 : 80000;

  function makeContract(expiryIdx: number): FuturesContract {
    const premium = spotPrice * (0.001 + rng() * 0.005) * (expiryIdx + 1);
    const futPrice = spotPrice + premium;
    const change = (rng() - 0.45) * spotPrice * 0.01;
    const open = futPrice - change * (0.3 + rng() * 1.4);
    const high = Math.max(futPrice, open) + rng() * spotPrice * 0.005;
    const low = Math.min(futPrice, open) - rng() * spotPrice * 0.005;
    const oi = Math.round(baseOI * (1 - expiryIdx * 0.35) * (0.7 + rng() * 0.6));
    const oiChg = Math.round(oi * (rng() - 0.35) * 0.12);
    const volume = Math.round(baseVolume * (1 - expiryIdx * 0.4) * (0.5 + rng()));
    const value = volume * futPrice * lotSize;

    return {
      expiry: expiryDates[expiryIdx] || expiryDates[expiryDates.length - 1],
      lastPrice: Math.round(futPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round((change / (futPrice - change)) * 10000) / 100,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      oi,
      oiChg,
      oiChgPct: oi > 0 ? Math.round((oiChg / oi) * 10000) / 100 : 0,
      volume,
      value: Math.round(value),
    };
  }

  const currentMonth = makeContract(0);
  const nextMonth = makeContract(1);
  const farMonth = expiryDates.length > 2 ? makeContract(2) : null;

  const basis = currentMonth.lastPrice - spotPrice;
  const basisPct = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

  return {
    symbol: underlying,
    name,
    currentMonth,
    nextMonth,
    farMonth,
    basis: Math.round(basis * 100) / 100,
    basisPct: Math.round(basisPct * 100) / 100,
  };
}

// ==================== NSE PARSERS ====================

function parseNSEOptionChain(nseData: NSEOptionChainResponse, underlying: string, expiryFilter?: string): OptionChainData {
  const records = nseData.records;
  const spotPrice = records.underlyingValue;
  const allExpiryDates = [...new Set(records.data.map(d => d.expiryDate))].sort();
  const currentExpiry = expiryFilter || allExpiryDates[0] || '';

  // Filter data for selected expiry
  const filteredData = records.data.filter(d => d.expiryDate === currentExpiry);

  // Group by strike price
  const strikeMap = new Map<number, OIStrikeData>();

  for (const d of filteredData) {
    const sp = d.strikePrice;
    if (sp <= 0) continue;

    let entry = strikeMap.get(sp);
    if (!entry) {
      entry = {
        strikePrice: sp,
        callOI: 0, callOIChg: 0, callVolume: 0, callIV: 0, callLTP: 0, callChg: 0,
        putOI: 0, putOIChg: 0, putVolume: 0, putIV: 0, putLTP: 0, putChg: 0,
      };
      strikeMap.set(sp, entry);
    }

    if (d.CE) {
      entry.callOI += d.CE.openInterest || 0;
      entry.callOIChg += d.CE.changeinOpenInterest || 0;
      entry.callVolume += d.CE.totalTradedVolume || 0;
      entry.callIV = d.CE.impliedVolatility || 0;
      entry.callLTP = d.CE.lastPrice || 0;
      entry.callChg = d.CE.change || 0;
    }
    if (d.PE) {
      entry.putOI += d.PE.openInterest || 0;
      entry.putOIChg += d.PE.changeinOpenInterest || 0;
      entry.putVolume += d.PE.totalTradedVolume || 0;
      entry.putIV = d.PE.impliedVolatility || 0;
      entry.putLTP = d.PE.lastPrice || 0;
      entry.putChg = d.PE.change || 0;
    }
  }

  // Sort by strike price
  const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strikePrice - b.strikePrice);

  let totalCallOI = 0, totalPutOI = 0, totalCallOIChg = 0, totalPutOIChg = 0;
  for (const s of strikes) {
    totalCallOI += s.callOI;
    totalPutOI += s.putOI;
    totalCallOIChg += s.callOIChg;
    totalPutOIChg += s.putOIChg;
  }

  // Calculate max pain
  let maxPain = 0;
  let minPainValue = Infinity;
  for (const s of strikes) {
    let painValue = 0;
    for (const s2 of strikes) {
      if (s2.strikePrice < s.strikePrice) painValue += s2.callOI * (s.strikePrice - s2.strikePrice);
      if (s2.strikePrice > s.strikePrice) painValue += s2.putOI * (s2.strikePrice - s.strikePrice);
    }
    if (painValue < minPainValue) {
      minPainValue = painValue;
      maxPain = s.strikePrice;
    }
  }

  const pcr = totalPutOI > 0 ? totalCallOI / totalPutOI : 0;

  return {
    underlying,
    spotPrice,
    expiryDates: allExpiryDates,
    currentExpiry,
    strikes,
    totalCallOI,
    totalPutOI,
    totalCallOIChg,
    totalPutOIChg,
    maxPain,
    pcr: Math.round(pcr * 1000) / 1000,
    dataSource: 'nse_live',
  };
}

async function parseNSEFutures(nseData: NSEOptionChainResponse, underlying: string): Promise<FuturesOIData> {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const name = base?.n || underlying;
  const lotSize = base?.ls || 25;
  const spotPrice = nseData.records.underlyingValue;

  // Get unique expiry dates with their latest data point
  const expiryMap = new Map<string, any[]>();
  for (const d of nseData.records.data) {
    const exp = d.expiryDate;
    if (!expiryMap.has(exp)) expiryMap.set(exp, []);
    expiryMap.get(exp)!.push(d);
  }

  const sortedExpiries = [...expiryMap.keys()].sort();

  function makeContractFromNSE(expiry: string, data: any[]): FuturesContract {
    // Use CE data if available, fallback to PE
    const sampleCE = data.find(d => d.CE)?.CE;
    const samplePE = data.find(d => d.PE)?.PE;
    const sample = sampleCE || samplePE;

    // Aggregate OI and volume from all strikes for this expiry
    let totalOI = 0, totalOIChg = 0, totalVolume = 0;
    for (const d of data) {
      if (d.CE) {
        totalOI += d.CE.openInterest || 0;
        totalOIChg += d.CE.changeinOpenInterest || 0;
        totalVolume += d.CE.totalTradedVolume || 0;
      }
      if (d.PE) {
        totalOI += d.PE.openInterest || 0;
        totalOIChg += d.PE.changeinOpenInterest || 0;
        totalVolume += d.PE.totalTradedVolume || 0;
      }
    }

    // Derive futures price from spot + premium estimate
    const monthsToExpiry = Math.max(0.5, (new Date(expiry).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000));
    const premiumPct = 0.001 * monthsToExpiry; // ~0.1% per month annualized
    const futPrice = spotPrice * (1 + premiumPct);

    return {
      expiry,
      lastPrice: Math.round(futPrice * 100) / 100,
      change: Math.round((futPrice - spotPrice) * 100) / 100,
      changePct: Math.round(premiumPct * 10000) / 100,
      open: Math.round((futPrice - (sample?.change || 0)) * 100) / 100,
      high: Math.round(futPrice * 1.002 * 100) / 100,
      low: Math.round(futPrice * 0.998 * 100) / 100,
      oi: totalOI,
      oiChg: totalOIChg,
      oiChgPct: totalOI > 0 ? Math.round((totalOIChg / totalOI) * 10000) / 100 : 0,
      volume: totalVolume,
      value: Math.round(totalVolume * futPrice * lotSize),
    };
  }

  const currentMonth = sortedExpiries[0] ? makeContractFromNSE(sortedExpiries[0], expiryMap.get(sortedExpiries[0])!) : null;
  const nextMonth = sortedExpiries[1] ? makeContractFromNSE(sortedExpiries[1], expiryMap.get(sortedExpiries[1])!) : null;
  const farMonth = sortedExpiries[2] ? makeContractFromNSE(sortedExpiries[2], expiryMap.get(sortedExpiries[2])!) : null;

  if (!currentMonth) {
    return await generateFuturesOI(underlying);
  }

  const basis = currentMonth.lastPrice - spotPrice;
  const basisPct = spotPrice > 0 ? (basis / spotPrice) * 100 : 0;

  return {
    symbol: underlying,
    name,
    currentMonth,
    nextMonth: nextMonth || {
      expiry: '', lastPrice: 0, change: 0, changePct: 0, open: 0, high: 0, low: 0,
      oi: 0, oiChg: 0, oiChgPct: 0, volume: 0, value: 0,
    },
    farMonth,
    basis: Math.round(basis * 100) / 100,
    basisPct: Math.round(basisPct * 100) / 100,
  };
}

// ==================== UPSTOX OPTION CHAIN PARSER ====================

/**
 * Parse the raw Upstox /v2/option/chain response into our OptionChainData format.
 * Upstox response is an array of items, each representing one CE or PE contract:
 *   { strike_price, expiry_date, option_type, open_interest, change_in_oi,
 *     volume, last_price, iv, change, buy_quantity, sell_quantity, ... }
 */
function parseUpstoxOptionChain(
  rawData: any[],
  underlying: string,
  expiryFilter?: string,
  liveSpotPrice?: number,
): OptionChainData | null {
  if (!rawData || rawData.length === 0) {
    console.warn('[OI] Upstox option chain returned empty data');
    return null;
  }

  // Get unique expiry dates
  const allExpiryDates = [...new Set(rawData.map((d: any) => d.expiry_date))].sort();
  const currentExpiry = expiryFilter || allExpiryDates[0] || '';

  // Filter for selected expiry
  const filteredData = rawData.filter((d: any) => d.expiry_date === currentExpiry);
  if (filteredData.length === 0) {
    console.warn(`[OI] No Upstox data for expiry ${currentExpiry}`);
    return null;
  }

  // Group by strike price
  const strikeMap = new Map<number, OIStrikeData>();

  for (const d of filteredData) {
    const sp = parseFloat(d.strike_price);
    if (!sp || sp <= 0) continue;

    let entry = strikeMap.get(sp);
    if (!entry) {
      entry = {
        strikePrice: sp,
        callOI: 0, callOIChg: 0, callVolume: 0, callIV: 0, callLTP: 0, callChg: 0,
        putOI: 0, putOIChg: 0, putVolume: 0, putIV: 0, putLTP: 0, putChg: 0,
      };
      strikeMap.set(sp, entry);
    }

    const isCE = (d.option_type || '').toUpperCase() === 'CE';
    const oi = parseInt(d.open_interest || d.oi, 10) || 0;
    const oiChg = parseInt(d.change_in_open_interest || d.change_in_oi || d.oi_change, 10) || 0;
    const vol = parseInt(d.volume || d.traded_volume, 10) || 0;
    const iv = parseFloat(d.implied_volatility || d.iv) || 0;
    const ltp = parseFloat(d.last_price || d.ltp) || 0;
    const chg = parseFloat(d.change || d.net_change) || 0;

    if (isCE) {
      entry.callOI += oi;
      entry.callOIChg += oiChg;
      entry.callVolume += vol;
      entry.callIV = iv;
      entry.callLTP = ltp;
      entry.callChg = chg;
    } else {
      entry.putOI += oi;
      entry.putOIChg += oiChg;
      entry.putVolume += vol;
      entry.putIV = iv;
      entry.putLTP = ltp;
      entry.putChg = chg;
    }
  }

  // Sort by strike price
  const strikes = Array.from(strikeMap.values()).sort((a, b) => a.strikePrice - b.strikePrice);
  if (strikes.length === 0) return null;

  // Calculate totals
  let totalCallOI = 0, totalPutOI = 0, totalCallOIChg = 0, totalPutOIChg = 0;
  for (const s of strikes) {
    totalCallOI += s.callOI;
    totalPutOI += s.putOI;
    totalCallOIChg += s.callOIChg;
    totalPutOIChg += s.putOIChg;
  }

  // Calculate max pain
  let maxPain = 0;
  let minPainValue = Infinity;
  for (const s of strikes) {
    let painValue = 0;
    for (const s2 of strikes) {
      if (s2.strikePrice < s.strikePrice) painValue += s2.callOI * (s.strikePrice - s2.strikePrice);
      if (s2.strikePrice > s.strikePrice) painValue += s2.putOI * (s2.strikePrice - s.strikePrice);
    }
    if (painValue < minPainValue) {
      minPainValue = painValue;
      maxPain = s.strikePrice;
    }
  }

  const pcr = totalPutOI > 0 ? totalCallOI / totalPutOI : 0;

  // Spot price: use live Upstox tick if provided, otherwise estimate from ATM
  let spotPrice = liveSpotPrice || 0;
  if (!spotPrice) {
    // Find ATM: strike closest to where CE LTP is smallest (closest to ATM)
    let minCallLTP = Infinity;
    for (const s of strikes) {
      if (s.callLTP > 0 && s.callLTP < minCallLTP) {
        minCallLTP = s.callLTP;
        spotPrice = s.strikePrice;
      }
    }
  }

  return {
    underlying,
    spotPrice,
    expiryDates: allExpiryDates,
    currentExpiry,
    strikes,
    totalCallOI,
    totalPutOI,
    totalCallOIChg,
    totalPutOIChg,
    maxPain,
    pcr: Math.round(pcr * 1000) / 1000,
    dataSource: 'upstox_live',
  };
}

/**
 * Fetch Upstox option chain data directly using the OAuth token.
 */
async function fetchUpstoxOptionChainDirect(
  symbol: string,
  expiry?: string,
  liveSpotPrice?: number,
): Promise<OptionChainData | null> {
  const token = getUpstoxToken();
  if (!token) return null;

  try {
    const { toInstrumentKey } = await import('@/lib/instrument-keys');
    const instrumentKey = toInstrumentKey(symbol);
    if (!instrumentKey) {
      console.warn(`[OI] No instrument key for Upstox OC: ${symbol}`);
      return null;
    }

    let url = `https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}`;
    if (expiry) {
      url += `&expiry_date=${encodeURIComponent(expiry)}`;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'x-api-version': '2.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
      console.warn('[OI] Upstox token expired for option chain');
      return null;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[OI] Upstox option chain ${res.status}: ${errText}`);
      return null;
    }

    const json = await res.json();
    const rawData = json?.data;
    // Handle both array and nested object responses
    let contracts: any[] | null = null;
    if (Array.isArray(rawData)) {
      contracts = rawData;
    } else if (rawData && typeof rawData === 'object') {
      // Might be { options: [...], underlying_price: ... } or similar
      contracts = rawData.options || rawData.contracts || rawData.chain || null;
      // Try to use underlying_price from the response
      if (rawData.underlying_price && !liveSpotPrice) {
        liveSpotPrice = parseFloat(rawData.underlying_price) || undefined;
      }
    }

    if (!contracts || contracts.length === 0) {
      // Log first item keys for debugging
      if (rawData) {
        const sample = Array.isArray(rawData) ? rawData[0] : Object.values(rawData)[0];
        if (sample && typeof sample === 'object') {
          console.log(`[OI] Upstox OC sample keys:`, Object.keys(sample));
        }
      }
      console.warn(`[OI] Upstox option chain: empty or invalid data for ${symbol}`);
      return null;
    }

    console.log(`[OI] Upstox option chain: got ${contracts.length} contracts for ${symbol}`);
    return parseUpstoxOptionChain(contracts, symbol, expiry || undefined, liveSpotPrice);
  } catch (err) {
    console.error(`[OI] Upstox option chain fetch error:`, (err as Error).message);
    return null;
  }
}

// ==================== MAIN ROUTE ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const underlying = searchParams.get('underlying') || 'NIFTY';
  const type = searchParams.get('type') || 'both';
  const expiry = searchParams.get('expiry') || '';
  const source = searchParams.get('source') || 'auto';
  const liveSpotOverride = searchParams.get('spot'); // Client passes Upstox LTP

  const allUnderlyings = stockList.optionUnderlyings;
  const cacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

  // Parse client-provided spot price (from Upstox live tick)
  const clientSpotPrice = liveSpotOverride ? parseFloat(liveSpotOverride) : NaN;
  const validClientSpot = clientSpotPrice > 0 ? clientSpotPrice : undefined;

  // ---- DATA SOURCE PRIORITY ----
  // 1. If Upstox is connected and source != 'nse' and source != 'mock' -> try Upstox first
  // 2. If source == 'nse' or Upstox fails -> try NSE direct
  // 3. If NSE fails -> mock with live spot price

  const upstoxConnected = isUpstoxConnected();
  let upstoxOptionResult: OptionChainData | null = null;

  // --- TRY UPSTOX FIRST (when connected) ---
  if (upstoxConnected && source !== 'nse' && source !== 'mock') {
    console.log(`[OI] Upstox connected, trying option chain API for ${underlying}...`);
    if (type === 'option' || type === 'both') {
      upstoxOptionResult = await fetchUpstoxOptionChainDirect(
        underlying, expiry || undefined, validClientSpot
      );
    }

    if (upstoxOptionResult) {
      // Upstox option chain data succeeded
      if (type === 'option') {
        return NextResponse.json({
          ...upstoxOptionResult,
          underlyings: allUnderlyings,
          lastUpdated: new Date().toISOString(),
        }, { headers: cacheHeaders });
      }

      // For 'both': return Upstox options + mock futures
      if (type === 'both') {
        const futuresData = await generateFuturesOI(underlying, upstoxOptionResult.spotPrice || validClientSpot);
        return NextResponse.json({
          option: upstoxOptionResult,
          futures: futuresData,
          underlyings: allUnderlyings,
          lastUpdated: new Date().toISOString(),
        }, { headers: cacheHeaders });
      }
    } else {
      console.warn(`[OI] Upstox option chain failed for ${underlying}, falling back`);
    }
  }

  // --- TRY NSE DIRECT ---
  if (source === 'nse' || source === 'auto' || !upstoxConnected) {
    try {
      const nseData = isIndexSymbol(underlying)
        ? await fetchIndexOptionChain(underlying)
        : await fetchStockOptionChain(underlying);

      if (nseData) {
        const optionResult = parseNSEOptionChain(nseData, underlying, expiry || undefined);
        const futuresResult = await parseNSEFutures(nseData, underlying);

        if (type === 'option') {
          return NextResponse.json({
            ...optionResult,
            underlyings: allUnderlyings,
            lastUpdated: new Date().toISOString(),
          }, { headers: cacheHeaders });
        }

        if (type === 'futures') {
          return NextResponse.json({
            ...futuresResult,
            underlyings: allUnderlyings,
            lastUpdated: new Date().toISOString(),
          }, { headers: cacheHeaders });
        }

        // Both
        return NextResponse.json({
          option: optionResult,
          futures: futuresResult,
          underlyings: allUnderlyings,
          lastUpdated: new Date().toISOString(),
        }, { headers: cacheHeaders });
      }

      console.warn(`[OI] NSE data unavailable for ${underlying}, falling back to mock`);
    } catch (err) {
      console.error(`[OI] NSE fetch error for ${underlying}:`, (err as Error).message);
    }
  }

  // --- MOCK FALLBACK ---
  // Use client-provided Upstox spot price if available,
  // then try Yahoo, then stale bp as last resort
  if (type === 'option') {
    const data = await generateOptionChain(underlying, expiry || undefined, validClientSpot);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
      lastUpdated: new Date().toISOString(),
    }, { headers: cacheHeaders });
  }

  if (type === 'futures') {
    const data = await generateFuturesOI(underlying, validClientSpot);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
      lastUpdated: new Date().toISOString(),
    }, { headers: cacheHeaders });
  }

  // Both (mock)
  const [optionData, futuresData] = await Promise.all([
    generateOptionChain(underlying, expiry || undefined, validClientSpot),
    generateFuturesOI(underlying, validClientSpot),
  ]);
  return NextResponse.json({
    option: optionData,
    futures: futuresData,
    underlyings: allUnderlyings,
    lastUpdated: new Date().toISOString(),
  }, { headers: cacheHeaders });
}
