// ==================== Technical Indicators Library ====================
// Pure computation — no chart library dependencies

export interface OHLCV {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ==================== MOVING AVERAGES ====================

export function SMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

export function EMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      prev = sum / period;
    } else {
      prev = data[i] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

export function WMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const denom = (period * (period + 1)) / 2;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j] * (j - i + period);
    }
    result.push(sum / denom);
  }
  return result;
}

// ==================== BOLLINGER BANDS ====================

export interface BollingerBandsResult {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
}

export function BollingerBands(data: number[], period: number = 20, stdDev: number = 2): BollingerBandsResult {
  const middle = SMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue; }
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) sumSq += Math.pow(data[j] - middle[i]!, 2);
    const std = Math.sqrt(sumSq / period);
    upper.push(middle[i]! + stdDev * std);
    lower.push(middle[i]! - stdDev * std);
  }
  return { upper, middle, lower };
}

// ==================== RSI ====================

export function RSI(data: number[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (data.length < period + 1) return data.map(() => null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) avgGain += change; else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = 0; i < period; i++) result.push(null);
  for (let i = period; i < data.length; i++) {
    if (i === period) {
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    } else {
      const change = data[i] - data[i - 1];
      avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
      const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }
  return result;
}

// ==================== MACD ====================

export interface MACDResult {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

// EMA that produces full-length output aligned with input, skipping null values
function EMASkipNulls(data: (number | null)[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;
  let countSinceSeed = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === null) { result.push(null); continue; }
    if (prev === null) {
      // Collect until we have enough non-null values for SMA seed
      countSinceSeed++;
      if (countSinceSeed >= period) {
        // Collect last `period` non-null values for SMA seed
        const nonNulls: number[] = [];
        for (let j = i; j >= 0 && nonNulls.length < period; j--) {
          if (data[j] !== null) nonNulls.unshift(data[j]!);
        }
        prev = nonNulls.reduce((a, b) => a + b, 0) / nonNulls.length;
        result.push(prev);
      } else {
        result.push(null);
      }
    } else {
      prev = data[i]! * k + prev * (1 - k);
      result.push(prev);
    }
  }
  return result;
}

export function MACD(data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACDResult {
  const fastEMA = EMA(data, fastPeriod);
  const slowEMA = EMA(data, slowPeriod);
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] === null || slowEMA[i] === null) { macdLine.push(null); continue; }
    macdLine.push(fastEMA[i]! - slowEMA[i]!);
  }
  // Compute signal line on FULL-LENGTH macdLine, skipping nulls in EMA calc
  // but returning a full-length array aligned with the input
  const signalLine: (number | null)[] = EMASkipNulls(macdLine, signalPeriod);
  const histogram: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] === null || signalLine[i] === null) { histogram.push(null); continue; }
    histogram.push(macdLine[i]! - signalLine[i]!);
  }
  return { macd: macdLine, signal: signalLine, histogram };
}

// ==================== STOCHASTIC ====================

export interface StochasticResult {
  k: (number | null)[];
  d: (number | null)[];
}

export function Stochastic(highs: number[], lows: number[], closes: number[], kPeriod: number = 14, dPeriod: number = 3): StochasticResult {
  const rawK: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < kPeriod - 1) { rawK.push(null); continue; }
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kPeriod + 1; j <= i; j++) {
      hh = Math.max(hh, highs[j]);
      ll = Math.min(ll, lows[j]);
    }
    const range = hh - ll;
    rawK.push(range === 0 ? 50 : ((closes[i] - ll) / range) * 100);
  }
  const dLine = EMASkipNulls(rawK, dPeriod);
  return { k: rawK, d: dLine };
}

// ==================== SUPERTREND ====================

export interface SupertrendResult {
  values: (number | null)[];
  directions: (number | null)[]; // 1 = up, -1 = down
}

export function Supertrend(highs: number[], lows: number[], closes: number[], period: number = 10, multiplier: number = 3): SupertrendResult {
  const n = closes.length;
  const values: (number | null)[] = [];
  const directions: (number | null)[] = [];
  let prevST: number | null = null;
  let prevDir: number = 1;
  // Wilder's smoothed ATR
  let atr: number | null = null;
  for (let i = 0; i < n; i++) {
    if (i < period) { values.push(null); directions.push(null); continue; }
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - (closes[i - 1] ?? closes[i])), Math.abs(lows[i] - (closes[i - 1] ?? closes[i])));
    if (atr === null) {
      // Seed ATR with simple average of first `period` true ranges
      let sum = 0;
      for (let j = 1; j <= period; j++) {
        sum += Math.max(highs[j] - lows[j], Math.abs(highs[j] - closes[j - 1]), Math.abs(lows[j] - closes[j - 1]));
      }
      atr = sum / period;
    } else {
      atr = (atr * (period - 1) + tr) / period;
    }
    const hl2 = (highs[i] + lows[i]) / 2;
    const upperBand = hl2 + multiplier * atr;
    const lowerBand = hl2 - multiplier * atr;
    let st: number, dir: number;
    if (prevST === null) {
      st = closes[i] > upperBand ? lowerBand : upperBand;
      dir = closes[i] > upperBand ? 1 : -1;
    } else {
      const prevLower = lowerBand > (prevDir === 1 ? prevST : -Infinity) || closes[i - 1] < prevST ? lowerBand : prevST!;
      const prevUpper = upperBand < (prevDir === -1 ? prevST : Infinity) || closes[i - 1] > prevST ? upperBand : prevST!;
      dir = prevDir;
      if (prevDir === 1 && closes[i] < prevST) { dir = -1; st = prevUpper; }
      else if (prevDir === -1 && closes[i] > prevST) { dir = 1; st = prevLower; }
      else { st = prevDir === 1 ? prevLower : prevUpper; }
    }
    prevST = st;
    prevDir = dir;
    values.push(st);
    directions.push(dir);
  }
  return { values, directions };
}

// ==================== FIBONACCI RETRACEMENT ====================

export function FibonacciRetracement(high: number, low: number): { level: number; price: number; label: string }[] {
  const diff = high - low;
  // Standard convention (TradingView): 0% = swing low, 100% = swing high
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const labels = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%'];
  return levels.map((l, i) => ({ level: l, price: low + diff * l, label: labels[i] }));
}

// ==================== HEIKIN-ASHI CONVERSION ====================

export function toHeikinAshi(data: OHLCV[]): OHLCV[] {
  const result: OHLCV[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push({ ...data[i] });
      continue;
    }
    const prev = result[i - 1];
    const haClose = (data[i].open + data[i].high + data[i].low + data[i].close) / 4;
    const haOpen = (prev.open + prev.close) / 2;
    const haHigh = Math.max(data[i].high, haOpen, haClose);
    const haLow = Math.min(data[i].low, haOpen, haClose);
    result.push({ time: data[i].time, open: haOpen, high: haHigh, low: haLow, close: haClose, volume: data[i].volume });
  }
  return result;
}

// ==================== RENKO CONVERSION ====================

export function toRenko(data: OHLCV[], brickSize?: number): OHLCV[] {
  if (data.length === 0) return [];
  const atr = computeATR(data, 14);
  const brick = brickSize || (atr * 0.5);
  if (brick <= 0) return data.slice(-50);
  const bricks: OHLCV[] = [];
  let currentPrice = data[0].close;
  let direction: 'up' | 'down' = 'up';
  for (const candle of data) {
    while (true) {
      if (direction === 'up') {
        if (candle.high >= currentPrice + brick) {
          const open = currentPrice;
          currentPrice += brick;
          bricks.push({ time: candle.time, open, high: currentPrice, low: open, close: currentPrice, volume: candle.volume });
          continue;
        } else if (candle.low <= currentPrice - (brick * 2)) {
          direction = 'down';
          currentPrice -= brick * 2;
          const open = currentPrice + brick;
          bricks.push({ time: candle.time, open, high: open, low: currentPrice, close: currentPrice, volume: candle.volume });
          continue;
        }
      } else {
        if (candle.low <= currentPrice - brick) {
          const open = currentPrice;
          currentPrice -= brick;
          bricks.push({ time: candle.time, open, high: open, low: currentPrice, close: currentPrice, volume: candle.volume });
          continue;
        } else if (candle.high >= currentPrice + (brick * 2)) {
          direction = 'up';
          currentPrice += brick * 2;
          const open = currentPrice - brick;
          bricks.push({ time: candle.time, open, high: currentPrice, low: open, close: currentPrice, volume: candle.volume });
          continue;
        }
      }
      break;
    }
  }
  return bricks.slice(-300);
}

// ==================== ATR HELPER ====================

export function computeATR(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 0;
  let sum = 0;
  for (let i = period; i < data.length; i++) {
    const tr = Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    );
    sum += tr;
  }
  return sum / (data.length - period);
}

// ==================== PATTERN DETECTION ====================

export interface DetectedPattern {
  type: string;
  name: string;
  startIndex: number;
  endIndex: number;
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  description: string;
}

/**
 * Deduplicate patterns by direction: keep only the single highest-confidence
 * pattern per direction (bullish/bearish). H&S and Inv. H&S cannot coexist in
 * the same window — they are opposite formations.
 */
function deduplicatePatterns(patterns: DetectedPattern[]): DetectedPattern[] {
  const byDir: Record<string, DetectedPattern> = {};
  for (const p of patterns) {
    // Round confidence to integer
    p.confidence = Math.round(p.confidence);
    const existing = byDir[p.direction];
    if (!existing || p.confidence > existing.confidence) {
      byDir[p.direction] = p;
    }
  }
  return Object.values(byDir).sort((a, b) => b.confidence - a.confidence);
}

export function detectPatterns(data: OHLCV[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  if (data.length < 20) return patterns;

  // Double Top
  const doubleTop = detectDoubleTop(data);
  if (doubleTop) patterns.push(doubleTop);

  // Double Bottom
  const doubleBottom = detectDoubleBottom(data);
  if (doubleBottom) patterns.push(doubleBottom);

  // Head & Shoulders
  const hs = detectHeadAndShoulders(data);
  if (hs) patterns.push(hs);

  // Inverse Head & Shoulders
  const ihs = detectInvHeadAndShoulders(data);
  if (ihs) patterns.push(ihs);

  // Bullish/Bearish Flags
  const flag = detectFlag(data);
  if (flag) patterns.push(flag);

  // Ascending/Descending Triangle
  const triangle = detectTriangle(data);
  if (triangle) patterns.push(triangle);

  // Round all confidence values to integers and enforce mutual exclusion
  return deduplicatePatterns(patterns);
}

function findSwingHighs(data: OHLCV[], window: number = 3): number[] {
  const indices: number[] = [];
  for (let i = window; i < data.length - window; i++) {
    let isHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (data[j].high > data[i].high) { isHigh = false; break; }
    }
    if (isHigh) indices.push(i);
  }
  return indices;
}

function findSwingLows(data: OHLCV[], window: number = 3): number[] {
  const indices: number[] = [];
  for (let i = window; i < data.length - window; i++) {
    let isLow = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (data[j].low < data[i].low) { isLow = false; break; }
    }
    if (isLow) indices.push(i);
  }
  return indices;
}

function detectDoubleTop(data: OHLCV[]): DetectedPattern | null {
  const highs = findSwingHighs(data, 3);
  for (let i = 0; i < highs.length - 1; i++) {
    const h1 = data[highs[i]].high;
    const h2 = data[highs[i + 1]].high;
    const tolerance = h1 * 0.015;
    if (Math.abs(h1 - h2) < tolerance) {
      const minBetween = Math.min(...data.slice(highs[i], highs[i + 1] + 1).map(d => d.low));
      if (h1 > minBetween * 1.01) {
        return {
          type: 'double_top', name: 'Double Top',
          startIndex: Math.max(0, highs[i] - 3), endIndex: Math.min(data.length - 1, highs[i + 1] + 3),
          direction: 'bearish', confidence: Math.min(95, 70 + (1 - Math.abs(h1 - h2) / tolerance) * 25),
          description: `Double Top at ₹${h1.toFixed(2)} — potential bearish reversal`
        };
      }
    }
  }
  return null;
}

function detectDoubleBottom(data: OHLCV[]): DetectedPattern | null {
  const lows = findSwingLows(data, 3);
  for (let i = 0; i < lows.length - 1; i++) {
    const l1 = data[lows[i]].low;
    const l2 = data[lows[i + 1]].low;
    const tolerance = l1 * 0.015;
    if (Math.abs(l1 - l2) < tolerance) {
      const maxBetween = Math.max(...data.slice(lows[i], lows[i + 1] + 1).map(d => d.high));
      if (l1 < maxBetween * 0.99) {
        return {
          type: 'double_bottom', name: 'Double Bottom',
          startIndex: Math.max(0, lows[i] - 3), endIndex: Math.min(data.length - 1, lows[i + 1] + 3),
          direction: 'bullish', confidence: Math.min(95, 70 + (1 - Math.abs(l1 - l2) / tolerance) * 25),
          description: `Double Bottom at ₹${l1.toFixed(2)} — potential bullish reversal`
        };
      }
    }
  }
  return null;
}

function detectHeadAndShoulders(data: OHLCV[]): DetectedPattern | null {
  const highs = findSwingHighs(data, 3);
  if (highs.length < 3) return null;
  for (let i = 0; i < highs.length - 2; i++) {
    const lH = data[highs[i]].high;
    const hH = data[highs[i + 1]].high;
    const rH = data[highs[i + 2]].high;
    if (hH > lH && hH > rH && Math.abs(lH - rH) < lH * 0.03) {
      return {
        type: 'head_shoulders', name: 'Head & Shoulders',
        startIndex: Math.max(0, highs[i] - 3), endIndex: Math.min(data.length - 1, highs[i + 2] + 3),
        direction: 'bearish', confidence: Math.min(92, 65 + (hH / lH - 1) * 200 + (1 - Math.abs(lH - rH) / (lH * 0.03)) * 20),
        description: `Head & Shoulders — head at ₹${hH.toFixed(2)}, shoulders at ₹${lH.toFixed(2)}`
      };
    }
  }
  return null;
}

function detectInvHeadAndShoulders(data: OHLCV[]): DetectedPattern | null {
  const lows = findSwingLows(data, 3);
  if (lows.length < 3) return null;
  for (let i = 0; i < lows.length - 2; i++) {
    const lL = data[lows[i]].low;
    const hL = data[lows[i + 1]].low;
    const rL = data[lows[i + 2]].low;
    if (hL < lL && hL < rL && Math.abs(lL - rL) < lL * 0.03) {
      return {
        type: 'inv_head_shoulders', name: 'Inv. Head & Shoulders',
        startIndex: Math.max(0, lows[i] - 3), endIndex: Math.min(data.length - 1, lows[i + 2] + 3),
        direction: 'bullish', confidence: Math.min(92, 65 + (lL / hL - 1) * 200 + (1 - Math.abs(lL - rL) / (lL * 0.03)) * 20),
        description: `Inv. Head & Shoulders — head at ₹${hL.toFixed(2)}, shoulders at ₹${lL.toFixed(2)}`
      };
    }
  }
  return null;
}

function detectFlag(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 20) return null;
  const recent = data.slice(-20);
  const pole = data.slice(-30, -20);
  if (pole.length < 5) return null;
  const poleHigh = Math.max(...pole.map(d => d.high));
  const poleLow = Math.min(...pole.map(d => d.low));
  const poleChange = (poleHigh - poleLow) / poleLow;
  const flagHigh = Math.max(...recent.map(d => d.high));
  const flagLow = Math.min(...recent.map(d => d.low));
  const flagRange = (flagHigh - flagLow) / flagLow;
  if (poleChange > 0.03 && flagRange < poleChange * 0.5 && flagRange > 0) {
    return {
      type: 'bullish_flag', name: 'Bullish Flag',
      startIndex: Math.max(0, data.length - 30), endIndex: data.length - 1,
      direction: 'bullish', confidence: Math.min(88, 60 + poleChange * 2000),
      description: `Bullish Flag — pole gain ${(poleChange * 100).toFixed(1)}% with tight consolidation`
    };
  }
  if (poleChange < -0.03 && flagRange < Math.abs(poleChange) * 0.5 && flagRange > 0) {
    return {
      type: 'bearish_flag', name: 'Bearish Flag',
      startIndex: Math.max(0, data.length - 30), endIndex: data.length - 1,
      direction: 'bearish', confidence: Math.min(88, 60 + Math.abs(poleChange) * 2000),
      description: `Bearish Flag — pole drop ${(Math.abs(poleChange) * 100).toFixed(1)}% with tight consolidation`
    };
  }
  return null;
}

function detectTriangle(data: OHLCV[]): DetectedPattern | null {
  if (data.length < 30) return null;
  const recent = data.slice(-30);
  const highs = findSwingHighs(recent, 2);
  const lows = findSwingLows(recent, 2);
  if (highs.length >= 2 && lows.length >= 2) {
    const firstHigh = recent[highs[0]].high;
    const lastHigh = recent[highs[highs.length - 1]].high;
    const firstLow = recent[lows[0]].low;
    const lastLow = recent[lows[lows.length - 1]].low;
    const highsDropping = lastHigh < firstHigh;
    const lowsRising = lastLow > firstLow;
    if (highsDropping && lowsRising) {
      return {
        type: 'symmetric_triangle', name: 'Symmetrical Triangle',
        startIndex: Math.max(0, data.length - 30), endIndex: data.length - 1,
        direction: 'bearish' as const, confidence: 65,
        description: 'Symmetrical Triangle — converging support/resistance, breakout expected'
      };
    }
    if (lowsRising && !highsDropping) {
      return {
        type: 'ascending_triangle', name: 'Ascending Triangle',
        startIndex: Math.max(0, data.length - 30), endIndex: data.length - 1,
        direction: 'bullish', confidence: 70,
        description: 'Ascending Triangle — flat resistance with rising support, bullish bias'
      };
    }
    if (highsDropping && !lowsRising) {
      return {
        type: 'descending_triangle', name: 'Descending Triangle',
        startIndex: Math.max(0, data.length - 30), endIndex: data.length - 1,
        direction: 'bearish', confidence: 70,
        description: 'Descending Triangle — flat support with falling resistance, bearish bias'
      };
    }
  }
  return null;
}

// ==================== VWAP ====================

export function VWAP(data: OHLCV[]): (number | null)[] {
  const result: (number | null)[] = [];
  let cumTPV = 0, cumVol = 0;
  let lastDate = '';
  for (let i = 0; i < data.length; i++) {
    // Reset VWAP at each new trading day (detected by date change or large gap)
    const currentDate = data[i].time ? new Date(data[i].time * 1000).toDateString() : '';
    const prevDate = i > 0 && data[i-1].time ? new Date(data[i-1].time * 1000).toDateString() : '';
    if (i > 0 && currentDate && prevDate && currentDate !== prevDate) {
      cumTPV = 0;
      cumVol = 0;
    }
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    cumTPV += tp * data[i].volume;
    cumVol += data[i].volume;
    result.push(cumVol > 0 ? cumTPV / cumVol : null);
  }
  return result;
}

// ==================== VOLUME PROFILE (price levels) ====================

export function volumeProfile(data: OHLCV[], levels: number = 24): { price: number; volume: number; buyVol: number; sellVol: number }[] {
  if (data.length === 0) return [];
  const minP = Math.min(...data.map(d => d.low));
  const maxP = Math.max(...data.map(d => d.high));
  const step = (maxP - minP) / levels || 1;
  const buckets = Array.from({ length: levels }, (_, i) => ({
    price: minP + step * (i + 0.5),
    volume: 0, buyVol: 0, sellVol: 0
  }));
  for (const d of data) {
    const tp = (d.high + d.low + d.close) / 3;
    const idx = Math.min(levels - 1, Math.max(0, Math.floor((tp - minP) / step)));
    buckets[idx].volume += d.volume;
    if (d.close >= d.open) buckets[idx].buyVol += d.volume;
    else buckets[idx].sellVol += d.volume;
  }
  return buckets;
}
