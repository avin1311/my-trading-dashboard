import { NextRequest, NextResponse } from "next/server";
import { stockList } from "@/lib/stock-list";
import type { OIStrikeData, OptionChainData, FuturesOIData, FuturesContract } from "@/lib/types";
import {
  fetchIndexOptionChain,
  fetchStockOptionChain,
  fetchFuturesData,
  isIndexSymbol,
  type NSEOptionChainResponse,
} from "@/lib/nse-option-chain";
import {
  isUpstoxConnected,
  fetchUpstoxOptionChain,
  fetchUpstoxFuturesQuote,
  findSpotInstrumentKey,
  getFuturesExpiries,
} from "@/lib/upstox-client";

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

function generateOptionChain(underlying: string, expiry?: string): OptionChainData {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const spotPrice = base?.bp || 24580;
  
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

function generateFuturesOI(underlying: string): FuturesOIData {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const spotPrice = base?.bp || 24580;
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

function parseNSEFutures(nseData: NSEOptionChainResponse, underlying: string): FuturesOIData {
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
    return generateFuturesOI(underlying);
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

// ==================== UPSTOX PARSERS ====================

function parseUpstoxOptionChain(
  data: { strikes: Map<number, { CE: any; PE: any }>; expiryDates: string[]; spotPrice: number },
  underlying: string,
  expiryFilter?: string
): OptionChainData {
  const { strikes: strikeMap, expiryDates: allExpiryDates, spotPrice } = data;
  const currentExpiry = expiryFilter || allExpiryDates[0] || '';

  const strikes: OIStrikeData[] = [];
  let totalCallOI = 0, totalPutOI = 0;
  let totalCallOIChg = 0, totalPutOIChg = 0;

  for (const [strikePrice, { CE, PE }] of strikeMap) {
    if (strikePrice <= 0) continue;

    strikes.push({
      strikePrice,
      callOI: CE?.open_interest || 0,
      callOIChg: CE?.change_in_open_interest || CE?.day_change || 0,
      callVolume: CE?.volume || CE?.total_buy_quantity || 0,
      callIV: CE?.iv || 0,
      callLTP: CE?.last_price || CE?.ohlc?.close || 0,
      callChg: CE?.change || 0,
      putOI: PE?.open_interest || 0,
      putOIChg: PE?.change_in_open_interest || PE?.day_change || 0,
      putVolume: PE?.volume || PE?.total_buy_quantity || 0,
      putIV: PE?.iv || 0,
      putLTP: PE?.last_price || PE?.ohlc?.close || 0,
      putChg: PE?.change || 0,
    });

    totalCallOI += CE?.open_interest || 0;
    totalPutOI += PE?.open_interest || 0;
    totalCallOIChg += CE?.change_in_open_interest || CE?.day_change || 0;
    totalPutOIChg += PE?.change_in_open_interest || PE?.day_change || 0;
  }

  // Sort by strike price
  strikes.sort((a, b) => a.strikePrice - b.strikePrice);

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
    dataSource: 'upstox_live',
  };
}

async function parseUpstoxFutures(underlying: string): Promise<FuturesOIData | null> {
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const name = base?.n || underlying;
  const lotSize = base?.ls || 25;

  const futuresExpiries = await getFuturesExpiries(underlying);
  if (futuresExpiries.length === 0) return null;

  async function makeContract(exp: string): Promise<FuturesContract | null> {
    const quote = await fetchUpstoxFuturesQuote(underlying, exp);
    if (!quote) return null;
    return {
      expiry: exp,
      lastPrice: quote.last_price || 0,
      change: quote.change || 0,
      changePct: quote.change_percent || 0,
      open: quote.ohlc?.open || 0,
      high: quote.ohlc?.high || 0,
      low: quote.ohlc?.low || 0,
      oi: quote.open_interest || 0,
      oiChg: quote.change_in_open_interest || 0,
      oiChgPct: quote.open_interest > 0
        ? Math.round(((quote.change_in_open_interest || 0) / quote.open_interest) * 10000) / 100
        : 0,
      volume: quote.volume || 0,
      value: Math.round((quote.volume || 0) * (quote.last_price || 0) * lotSize),
    };
  }

  const currentMonth = await makeContract(futuresExpiries[0]);
  const nextMonth = futuresExpiries[1] ? await makeContract(futuresExpiries[1]) : null;
  const farMonth = futuresExpiries[2] ? await makeContract(futuresExpiries[2]) : null;

  if (!currentMonth) return null;

  // Get spot price for basis calculation
  let spotPrice = 0;
  const spotKey = await findSpotInstrumentKey(underlying);
  if (spotKey) {
    const { getUpstoxToken } = await import('@/lib/upstox-client');
    const token = getUpstoxToken();
    if (token) {
      try {
        const res = await fetch(`https://api.upstox.com/v2/market-quote/ohlc?instrument_key=${encodeURIComponent(spotKey)}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'x-api-version': '2.0' },
          signal: AbortSignal.timeout(10000),
        });
        const json = await res.json();
        const d = json.data;
        if (d) {
          const q = Array.isArray(d) ? d[0] : Object.values(d)[0] as any;
          spotPrice = q?.last_price || q?.ohlc?.close || 0;
        }
      } catch {}
    }
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

// ==================== MAIN ROUTE ====================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const underlying = searchParams.get('underlying') || 'NIFTY';
  const type = searchParams.get('type') || 'both';
  const expiry = searchParams.get('expiry') || '';
  const source = searchParams.get('source') || 'auto';

  const allUnderlyings = stockList.optionUnderlyings;
  const cacheHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' };

  // === DATA SOURCE PRIORITY: Upstox (if connected) → NSE → Mock ===

  // 1. Try Upstox (if connected and source is not 'mock')
  if (isUpstoxConnected() && source !== 'mock') {
    try {
      console.log(`[OI] Trying Upstox for ${underlying}...`);
      const upstoxData = await fetchUpstoxOptionChain(underlying, expiry || undefined);

      if (upstoxData) {
        const optionResult = parseUpstoxOptionChain(upstoxData, underlying, expiry || undefined);

        let futuresResult: FuturesOIData | null = null;
        if (type !== 'option') {
          futuresResult = await parseUpstoxFutures(underlying);
        }

        if (type === 'option') {
          return NextResponse.json({
            ...optionResult,
            underlyings: allUnderlyings,
            lastUpdated: new Date().toISOString(),
          }, { headers: cacheHeaders });
        }

        if (type === 'futures') {
          const fData = futuresResult || generateFuturesOI(underlying);
          return NextResponse.json({
            ...fData,
            underlyings: allUnderlyings,
            lastUpdated: new Date().toISOString(),
          }, { headers: cacheHeaders });
        }

        return NextResponse.json({
          option: optionResult,
          futures: futuresResult || generateFuturesOI(underlying),
          underlyings: allUnderlyings,
          lastUpdated: new Date().toISOString(),
        }, { headers: cacheHeaders });
      }

      console.warn(`[OI] Upstox data unavailable for ${underlying}, trying NSE...`);
    } catch (err) {
      console.error(`[OI] Upstox fetch error for ${underlying}:`, (err as Error).message);
    }
  }

  // 2. Try NSE (if source is not 'mock' and source is not 'upstox')
  if (source !== 'mock' && source !== 'upstox') {
    try {
      const nseData = isIndexSymbol(underlying)
        ? await fetchIndexOptionChain(underlying)
        : await fetchStockOptionChain(underlying);

      if (nseData) {
        const optionResult = parseNSEOptionChain(nseData, underlying, expiry || undefined);
        const futuresResult = parseNSEFutures(nseData, underlying);

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

  // 3. Mock fallback
  if (type === 'option') {
    const data = generateOptionChain(underlying, expiry || undefined);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
      lastUpdated: new Date().toISOString(),
    }, { headers: cacheHeaders });
  }

  if (type === 'futures') {
    const data = generateFuturesOI(underlying);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
      lastUpdated: new Date().toISOString(),
    }, { headers: cacheHeaders });
  }

  // Both (mock)
  const optionData = generateOptionChain(underlying, expiry || undefined);
  const futuresData = generateFuturesOI(underlying);
  return NextResponse.json({
    option: optionData,
    futures: futuresData,
    underlyings: allUnderlyings,
    lastUpdated: new Date().toISOString(),
  }, { headers: cacheHeaders });
}