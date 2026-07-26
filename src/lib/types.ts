export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
  type: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface StrategySignal {
  date: string;
  close: number;
  signal: SignalType;
  supertrend: number;
  supertrendDir: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  reason: string;
}

export interface TradeRecord {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  type: string;
  pnl: number;
  pnlPct: number;
  signal: SignalType;
}

export interface BacktestResult {
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  trades: TradeRecord[];
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

export interface ChartDataPoint extends OHLCV {
  supertrend: number | null;
  supertrendDir: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  signal: SignalType | null;
}

export interface LiveQuote {
  symbol: string;
  name: string;
  longName: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: string;
  type: string;
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  marketCap: number;
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  eps: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;
  high52w: number;
  low52w: number;
  percentFrom52wHigh: number;
  percentFrom52wLow: number;
  fiftyDMA: number | null;
  twoHundredDMA: number | null;
  percentAbove50DMA: number | null;
  percentAbove200DMA: number | null;
  beta: number | null;
  roe: number | null;
  roa: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  profitMargins: number | null;
  operatingMargins: number | null;
  currentRatio: number | null;
  totalRevenue: number | null;
  ebitda: number | null;
  grossProfits: number | null;
  freeCashflow: number | null;
  recommendation: string | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  analysts: number | null;
  instHolding: number | null;
}

export interface PeerData {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  pe: number | null;
  pb: number | null;
  divYield: number | null;
  roe: number | null;
  revenueGrowth: number | null;
}

export interface StockDetail {
  quote: LiveQuote;
  technicals: Record<string, any>;
  performance: Record<string, number | null>;
  ownership: Record<string, number | null>;
  financials: Record<string, number | null>;
  peers: PeerData[] | null;
  dataPoints: number;
  lastDate: string | null;
}

export interface MarketOverview {
  nifty50: LiveQuote;
  bankNifty: LiveQuote;
  niftyIT: LiveQuote;
  indiaVix: LiveQuote;
  topGainers?: LiveQuote[];
  topLosers?: LiveQuote[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  marketCap: number;
  pe: number | null;
  signal: string;
  rsi: number | null;
  macdHistogram: number | null;
  supertrendDir: number;
  signalReason: string;
  lastDate: string;
}

export interface SavePoint {
  id: number;
  label: string;
  time: string;
  detail: string;
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

// ==================== OPEN INTEREST TYPES ====================
export interface OIStrikeData {
  strikePrice: number;
  callOI: number;
  callOIChg: number;
  callVolume: number;
  callIV: number;
  callLTP: number;
  callChg: number;
  putOI: number;
  putOIChg: number;
  putVolume: number;
  putIV: number;
  putLTP: number;
  putChg: number;
}

export interface OptionChainData {
  underlying: string;
  spotPrice: number;
  expiryDates: string[];
  currentExpiry: string;
  strikes: OIStrikeData[];
  totalCallOI: number;
  totalPutOI: number;
  totalCallOIChg: number;
  totalPutOIChg: number;
  maxPain: number;
  pcr: number;
  dataSource?: 'nse_live' | 'upstox_live' | 'mock';
}

export interface FuturesOIData {
  symbol: string;
  name: string;
  currentMonth: FuturesContract;
  nextMonth: FuturesContract;
  farMonth: FuturesContract | null;
  basis: number;
  basisPct: number;
}

export interface FuturesContract {
  expiry: string;
  lastPrice: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  oi: number;
  oiChg: number;
  oiChgPct: number;
  volume: number;
  value: number;
}