import { NextRequest, NextResponse } from "next/server";
import { stockList } from "@/lib/stock-list";
import type { OIStrikeData, OptionChainData, FuturesOIData, FuturesContract } from "@/lib/types";

// Seeded random for consistent data within a session
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
  
  // Base OI magnitudes based on underlying type
   const isIndex = !stockList.equities.some((e: any) => e.s === underlying);
  const baseOI = isIndex ? 5000000 : 500000;
  const baseVolume = isIndex ? 200000 : 20000;
  
  for (let i = -numStrikes; i <= numStrikes; i++) {
    const strike = atmStrike + i * step;
    if (strike <= 0) continue;
    
    const distFromATM = Math.abs(strike - spotPrice) / spotPrice;
    const isITMCall = strike < spotPrice;
    const isITMPut = strike > spotPrice;
    
    // OI distribution: higher near ATM, ITM options have more OI
    const callOIFactor = Math.exp(-distFromATM * 8) * (isITMCall ? 2.5 : 0.6) * (0.7 + rng() * 0.6);
    const putOIFactor = Math.exp(-distFromATM * 8) * (isITMPut ? 2.8 : 0.5) * (0.7 + rng() * 0.6);
    
    const callOI = Math.round(baseOI * callOIFactor);
    const putOI = Math.round(baseOI * putOIFactor);
    
    // OI Change: some strikes building, some unwinding
    const callOIBase = rng() > 0.4 ? 1 : -1;
    const putOIBase = rng() > 0.4 ? 1 : -1;
    const callOIChg = Math.round(callOI * (rng() * 0.15) * callOIBase);
    const putOIChg = Math.round(putOI * (rng() * 0.15) * putOIBase);
    
    totalCallOI += callOI;
    totalPutOI += putOI;
    totalCallOIChg += callOIChg;
    totalPutOIChg += putOIChg;
    
    // Volume typically 30-60% of OI change magnitude
    const callVolume = Math.round(Math.abs(callOIChg) * (0.5 + rng() * 1.5));
    const putVolume = Math.round(Math.abs(putOIChg) * (0.5 + rng() * 1.5));
    
    // IV: smile shape - higher for OTM, lower near ATM
    const baseIV = isIndex ? 12 : 20;
    const callIV = baseIV + distFromATM * 60 + (rng() - 0.5) * 4;
    const putIV = baseIV + distFromATM * 55 + (rng() - 0.5) * 4;
    
    // LTP calculation based on intrinsic + time value
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
  
  // Calculate max pain
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const underlying = searchParams.get('underlying') || 'NIFTY';
  const type = searchParams.get('type') || 'option';
  const expiry = searchParams.get('expiry') || '';
  
  const allUnderlyings = stockList.optionUnderlyings;
  
  if (type === 'option') {
    const data = generateOptionChain(underlying, expiry || undefined);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }
  
  if (type === 'futures') {
    const data = generateFuturesOI(underlying);
    return NextResponse.json({
      ...data,
      underlyings: allUnderlyings,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }
  
  // Both
  const optionData = generateOptionChain(underlying, expiry || undefined);
  const futuresData = generateFuturesOI(underlying);
  return NextResponse.json({
    option: optionData,
    futures: futuresData,
    underlyings: allUnderlyings,
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
}