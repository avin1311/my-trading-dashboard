// Trading Strategy Engine: Supertrend + RSI + MACD Confluence Strategy for NSE Stocks
// Designed for intraday/swing trading on Zerodha (Kite)

import { OHLCV } from "./stock-data";

export type SignalType = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";

export interface StrategySignal {
  date: string;
  close: number;
  signal: SignalType;
  supertrend: number;
  supertrendDir: number; // 1 = bullish, -1 = bearish
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  reason: string;
}

export interface StrategyParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
}

export const DEFAULT_PARAMS: StrategyParams = {
  supertrendPeriod: 10,
  supertrendMultiplier: 3,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
};

// ==================== INDICATORS ====================

function calculateATR(data: OHLCV[], period: number): number[] {
  const trueRanges: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
    } else {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trueRanges.push(tr);
    }
  }

  const atr: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += trueRanges[j];
      atr.push(sum / period);
    } else {
      atr.push((atr[i - 1] * (period - 1) + trueRanges[i]) / period);
    }
  }

  return atr;
}

function calculateSupertrend(
  data: OHLCV[],
  period: number,
  multiplier: number
): { supertrend: number[]; direction: number[] } {
  const atr = calculateATR(data, period);
  const supertrend: number[] = [];
  const direction: number[] = [];

  let upperBand = 0;
  let lowerBand = 0;
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevSupertrend = 0;
  let prevDirection = 1;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      supertrend.push(NaN);
      direction.push(0);
      continue;
    }

    const hl2 = (data[i].high + data[i].low) / 2;

    let newUpperBand = hl2 + multiplier * atr[i];
    let newLowerBand = hl2 - multiplier * atr[i];

    if (i === period) {
      upperBand = newUpperBand;
      lowerBand = newLowerBand;
    } else {
      // Adjust bands
      upperBand =
        newUpperBand < prevUpperBand ||
        data[i - 1].close > prevUpperBand
          ? newUpperBand
          : prevUpperBand;

      lowerBand =
        newLowerBand > prevLowerBand ||
        data[i - 1].close < prevLowerBand
          ? newLowerBand
          : prevLowerBand;
    }

    // Direction
    let dir: number;
    if (prevSupertrend === prevUpperBand) {
      dir = data[i].close > upperBand ? 1 : -1;
    } else {
      dir = data[i].close < lowerBand ? -1 : 1;
    }

    const st = dir === 1 ? lowerBand : upperBand;

    supertrend.push(Math.round(st * 100) / 100);
    direction.push(dir);

    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    prevSupertrend = st;
    prevDirection = dir;
  }

  return { supertrend, direction };
}

function calculateEMA(values: number[], period: number): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);

  // Find first valid index
  let firstValid = -1;
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(values[i])) { firstValid = i; break; }
  }
  if (firstValid === -1) return values.map(() => NaN);

  // Find 'period' consecutive valid values for seed
  let seedEnd = -1;
  let validCount = 0;
  for (let i = firstValid; i < values.length; i++) {
    if (!isNaN(values[i])) {
      validCount++;
      if (validCount >= period) { seedEnd = i; break; }
    } else {
      validCount = 0;
    }
  }
  if (seedEnd === -1) return values.map(() => NaN);

  const seedStart = seedEnd - period + 1;

  for (let i = 0; i < values.length; i++) {
    if (i < seedStart) {
      ema.push(NaN);
    } else if (i === seedStart) {
      let sum = 0;
      for (let j = seedStart; j <= seedEnd; j++) sum += values[j];
      ema.push(sum / period);
    } else {
      if (isNaN(values[i]) || isNaN(ema[i - 1])) {
        ema.push(NaN);
      } else {
        ema.push(values[i] * k + ema[i - 1] * (1 - k));
      }
    }
  }

  return ema;
}

function calculateRSI(closes: number[], period: number): number[] {
  const rsi: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  let initialized = false;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      rsi.push(NaN);
      continue;
    }

    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (!initialized) {
      // Seed: simple average of first `period` changes
      let gains = 0, losses = 0;
      for (let j = 1; j <= period; j++) {
        const c = closes[j] - closes[j - 1];
        if (c > 0) gains += c; else losses -= c;
      }
      avgGain = gains / period;
      avgLoss = losses / period;
      initialized = true;
    } else {
      // Wilder's smoothing: maintains absolute magnitude
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgLoss === 0 ? 999 : avgGain / avgLoss;
    const rsiVal = 100 - 100 / (1 + rs);
    rsi.push(Math.round(Math.min(100, Math.max(0, rsiVal)) * 100) / 100);
  }

  return rsi;
}

function calculateMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(
        Math.round((fastEMA[i] - slowEMA[i]) * 100) / 100
      );
    }
  }

  // Signal line: EMA of MACD line (full-length, handles NaN)
  const signalLineFull = calculateEMA(macdLine, signalPeriod);

  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLineFull[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(
        Math.round((macdLine[i] - signalLineFull[i]) * 100) / 100
      );
    }
  }

  return {
    macd: macdLine,
    signal: signalLineFull,
    histogram,
  };
}

// ==================== SIGNAL GENERATION ====================

export function generateSignals(
  data: OHLCV[],
  params: StrategyParams = DEFAULT_PARAMS
): StrategySignal[] {
  const closes = data.map((d) => d.close);
  const { supertrend, direction } = calculateSupertrend(
    data,
    params.supertrendPeriod,
    params.supertrendMultiplier
  );
  const rsi = calculateRSI(closes, params.rsiPeriod);
  const macdResult = calculateMACD(
    closes,
    params.macdFast,
    params.macdSlow,
    params.macdSignal
  );

  const signals: StrategySignal[] = [];

  for (let i = 0; i < data.length; i++) {
    if (
      isNaN(supertrend[i]) ||
      isNaN(rsi[i]) ||
      isNaN(macdResult.macd[i]) ||
      isNaN(macdResult.signal[i])
    ) {
      continue;
    }

    const stBullish = direction[i] === 1;
    const rsiBullish = rsi[i] > 50;
    const rsiOverbought = rsi[i] > params.rsiOverbought;
    const rsiOversold = rsi[i] < params.rsiOversold;
    const macdBullish = macdResult.macd[i] > macdResult.signal[i];
    const macdCrossUp =
      i > 0 &&
      !isNaN(macdResult.macd[i - 1]) &&
      macdResult.macd[i - 1] <= macdResult.signal[i - 1] &&
      macdResult.macd[i] > macdResult.signal[i];
    const macdCrossDown =
      i > 0 &&
      !isNaN(macdResult.macd[i - 1]) &&
      macdResult.macd[i - 1] >= macdResult.signal[i - 1] &&
      macdResult.macd[i] < macdResult.signal[i];

    const stCrossUp =
      i > 0 && direction[i - 1] === -1 && direction[i] === 1;
    const stCrossDown =
      i > 0 && direction[i - 1] === 1 && direction[i] === -1;

    let signal: SignalType = "HOLD";
    let reason = "";

    const bullishCount = [stBullish, rsiBullish, macdBullish].filter(Boolean).length;
    const bearishCount = 3 - bullishCount;

    // Strong signals on crossovers
    if (stCrossUp && macdBullish && rsiBullish) {
      signal = "STRONG_BUY";
      reason = "Supertrend crossover + MACD bullish + RSI above 50";
    } else if (stCrossDown && !macdBullish && !rsiBullish) {
      signal = "STRONG_SELL";
      reason = "Supertrend crossover down + MACD bearish + RSI below 50";
    } else if (stBullish && macdCrossUp) {
      signal = "BUY";
      reason = "Supertrend bullish + MACD bullish crossover";
    } else if (!stBullish && macdCrossDown) {
      signal = "SELL";
      reason = "Supertrend bearish + MACD bearish crossover";
    } else if (stBullish && rsiOversold) {
      signal = "BUY";
      reason = "Supertrend bullish + RSI oversold (potential reversal)";
    } else if (!stBullish && rsiOverbought) {
      signal = "SELL";
      reason = "Supertrend bearish + RSI overbought (potential reversal)";
    } else if (bullishCount >= 3) {
      signal = "BUY";
      reason = "All indicators bullish (Supertrend + RSI + MACD)";
    } else if (bearishCount >= 3) {
      signal = "SELL";
      reason = "All indicators bearish (Supertrend + RSI + MACD)";
    } else if (bullishCount >= 2) {
      // HOLD band: 2/3 bullish is not enough for a BUY — wait for full confluence
      signal = "HOLD";
      reason = `${bullishCount} of 3 indicators bullish — below buy threshold`;
    } else if (bearishCount >= 2) {
      // HOLD band: 2/3 bearish is not enough for a SELL — wait for full confluence
      signal = "HOLD";
      reason = `${bearishCount} of 3 indicators bearish — below sell threshold`;
    } else {
      reason = "Mixed signals, wait for confirmation";
    }

    signals.push({
      date: data[i].date,
      close: data[i].close,
      signal,
      supertrend: supertrend[i],
      supertrendDir: direction[i],
      rsi: rsi[i],
      macd: macdResult.macd[i],
      macdSignal: macdResult.signal[i],
      macdHistogram: macdResult.histogram[i],
      reason,
    });
  }

  return signals;
}

// ==================== BACKTESTING ====================

export interface BacktestResult {
  totalReturn: number;
  totalReturnPct: number;       // compounded: ∏(1+rᵢ) − 1
  totalReturnPctArithmetic: number; // Σrᵢ (for reference)
  winRate: number;               // e.g. 46.15 not 46
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;         // on strategy equity curve
  profitFactor: number;
  benchmarkReturnPct: number;     // buy-and-hold over same window
  alphaPct: number;                // strategy − benchmark
  trades: TradeRecord[];
  note?: string;                  // e.g. "13 trades — insufficient for confidence"
}

export interface TradeRecord {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  type: "LONG" | "SHORT";
  pnl: number;
  pnlPct: number;
  signal: SignalType;
}

export function runBacktest(
  data: OHLCV[],
  signals: StrategySignal[]
): BacktestResult {
  const trades: TradeRecord[] = [];
  let inTrade = false;
  let entryPrice = 0;
  let entryDate = "";
  let entrySignal: SignalType = "BUY";

  const signalMap = new Map(signals.map((s) => [s.date, s]));

  for (let i = 0; i < data.length; i++) {
    const sig = signalMap.get(data[i].date);
    if (!sig) continue;

    if (!inTrade) {
      if (sig.signal === "STRONG_BUY" || sig.signal === "BUY") {
        inTrade = true;
        entryPrice = data[i].close;
        entryDate = data[i].date;
        entrySignal = sig.signal;
      }
    } else {
      if (sig.signal === "STRONG_SELL" || sig.signal === "SELL") {
        const pnl = data[i].close - entryPrice;
        const pnlPct = (pnl / entryPrice) * 100;
        trades.push({
          entryDate,
          exitDate: data[i].date,
          entryPrice,
          exitPrice: data[i].close,
          type: "LONG",
          pnl: Math.round(pnl * 100) / 100,
          pnlPct: Math.round(pnlPct * 100) / 100,
          signal: entrySignal,
        });
        inTrade = false;
      }
    }
  }

  // Close any open trade at last price
  if (inTrade && data.length > 0) {
    const lastData = data[data.length - 1];
    const pnl = lastData.close - entryPrice;
    const pnlPct = (pnl / entryPrice) * 100;
    trades.push({
      entryDate,
      exitDate: lastData.date,
      entryPrice,
      exitPrice: lastData.close,
      type: "LONG",
      pnl: Math.round(pnl * 100) / 100,
      pnlPct: Math.round(pnlPct * 100) / 100,
      signal: entrySignal,
    });
  }

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl <= 0);
  const totalWin = winningTrades.reduce((s, t) => s + t.pnlPct, 0);
  const totalLoss = Math.abs(losingTrades.reduce((s, t) => s + t.pnlPct, 0));

  // Compounded return: ∏(1+rᵢ) − 1
  let compoundedEquity = 1;
  for (const trade of trades) {
    compoundedEquity *= (1 + trade.pnlPct / 100);
  }
  const totalReturnPctCompounded = Math.round((compoundedEquity - 1) * 10000) / 100;
  const totalReturnPctArithmetic = Math.round(trades.reduce((s, t) => s + t.pnlPct, 0) * 100) / 100;

  // Max drawdown on EQUITY CURVE (not price)
  let maxDrawdown = 0;
  let peak = 1;
  compoundedEquity = 1;
  for (const trade of trades) {
    compoundedEquity *= (1 + trade.pnlPct / 100);
    if (compoundedEquity > peak) peak = compoundedEquity;
    const dd = (peak - compoundedEquity) / peak * 100;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  // Benchmark: buy-and-hold return over the STRATEGY's active window (not the full data window)
  const benchmarkReturnPct = (trades.length > 0)
    ? Math.round(((data[data.length - 1].close - trades[0].entryPrice) / trades[0].entryPrice) * 10000) / 100
    : 0;
  const alphaPct = Math.round((totalReturnPctCompounded - benchmarkReturnPct) * 100) / 100;

  // Win rate: show as X of Y (Z.ZZ%)
  const winRate = trades.length > 0
    ? Math.round((winningTrades.length / trades.length) * 10000) / 100
    : 0;

  // Note for statistical significance
  const note = trades.length < 30
    ? `${trades.length} trade${trades.length !== 1 ? 's' : ''} — insufficient for statistical confidence`
    : undefined;

  return {
    totalReturn: trades.reduce((s, t) => s + t.pnl, 0),
    totalReturnPct: totalReturnPctCompounded,
    totalReturnPctArithmetic,
    winRate,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWinPct: winningTrades.length > 0
      ? Math.round((totalWin / winningTrades.length) * 100) / 100
      : 0,
    avgLossPct: losingTrades.length > 0
      ? Math.round((totalLoss / losingTrades.length) * 100) / 100
      : 0,
    maxDrawdownPct: Math.round(maxDrawdown * 100) / 100,
    profitFactor: totalLoss > 0 ? Math.round((totalWin / totalLoss) * 100) / 100 : totalWin > 0 ? 999 : 0,
    benchmarkReturnPct,
    alphaPct,
    trades: trades.slice(-20),
    note,
  };
}
