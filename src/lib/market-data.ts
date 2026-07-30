// Real-time market data service using Yahoo Finance v8 Chart API (direct HTTP)
// No external dependencies - uses Node.js native https module

// ==================== TYPES ====================
export interface LiveQuote {
  symbol: string;
  name: string;
  longName: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: string;
  type: "equity" | "index";

  // Price
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;

  // Volume
  volume: number;
  avgVolume: number;
  volumeRatio: number;

  // Market Cap & Valuation
  marketCap: number;
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  eps: number | null;
  bookValue: number | null;
  dividendYield: number | null;
  payoutRatio: number | null;

  // 52 Week Range
  high52w: number;
  low52w: number;
  percentFrom52wHigh: number;
  percentFrom52wLow: number;

  // Moving Averages (calculated from historical data)
  fiftyDMA: number | null;
  twoHundredDMA: number | null;
  percentAbove50DMA: number | null;
  percentAbove200DMA: number | null;

  // Fundamentals (enriched from our data)
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

  // Analyst Coverage
  recommendation: string | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  analysts: number | null;

  // Ownership
  instHolding: number | null;
  insiderHolding: number | null;

  // Derived
  marketState: string;
  lastUpdated: string;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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

// ==================== SYMBOL MAPPING ====================
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  NIFTYIT: "^CNXIT",
  NIFTYNXT50: "^NSMIDCP",
  NIFTYFIN: "^CNXFIN",
  NIFTYMIDCAP: "^CNXMIDCAP",
  NIFTYSMLCAP: "^CNXSC",
  NIFTYPHARMA: "^CNXPHARMA",
  NIFTYAUTO: "^CNXAUTO",
  NIFTYMETAL: "^CNXMETAL",
  NIFTYENERGY: "^CNXENERGY",
  NIFTYFMCG: "^CNXFMCG",
  NIFTYREALTY: "^CNXREALTY",
  NIFTYINFRA: "^CNXINFRA",
  NIFTYPSUBANK: "^CNXPSUBANK",
  NIFTYCOMMOD: "^CNXCOMMODITY",
  INDIAVIX: "^INDIAVIX",
};

const SECTOR_PEERS: Record<string, string[]> = {
  Banking: ["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK", "AXISBANK", "INDUSINDBK", "BANKBARODA", "FEDERALBNK", "CANBK", "IDFCFIRSTB", "PNB", "INDIANB", "YESBANK"],
  IT: ["TCS", "INFY", "HCLTECH", "WIPRO", "TECHM", "LTIM", "MPHASIS", "COFORGE", "PERSISTENT"],
  FMCG: ["HINDUNILVR", "ITC", "TATACONSUM", "BRITANNIA", "NESTLEIND", "GODREJCP", "VBL", "DABUR"],
  Auto: ["MARUTI", "TATAMOTORS", "M&M", "EICHERMOT", "HEROMOTOCO", "BAJAJAUTO", "TVSMOTOR", "TATAMTRDVR"],
  Pharma: ["SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "ALKEM", "BIOCON", "LUPIN", "LAURUSLABS", "TORNTPHARM"],
  Metals: ["TATASTEEL", "JSWSTEEL", "HINDALCO", "HINDZINC", "VEDL", "SAIL", "JINDALSTEL", "COALINDIA"],
  Energy: ["RELIANCE", "ONGC", "BPCL", "IOC", "ADANIENT", "TATAPOWER", "NTPC", "POWERGRID", "ADANIGREEN", "ADANIENSOL", "SUZLON"],
  Finance: ["BAJFINANCE", "BAJAJFINSV", "CHOLAHLDNG", "MUTHOOTFIN", "SHRIRAMFIN"],
  Insurance: ["HDFCLIFE", "SBILIFE"],
  Infrastructure: ["LT", "ADANIPORTS"],
  Consumer: ["ASIANPAINT", "TITAN", "CROMPTON", "VOLTAS", "BLUESTAR", "WHIRLPOOL"],
  Cement: ["ULTRACEMCO", "GRASIM", "AMBUJACEM", "ACC", "SHREECEM"],
  "Capital Goods": ["SIEMENS", "ABB", "HONEYWELL", "VSTTILLERS"],
  Retail: ["DMART", "TRENT"],
  "Real Estate": ["DLF", "OBEROIRLTY", "GODREJPROP", "PHOENIXLTD"],
  Telecom: ["BHARTIARTL"],
  Fintech: ["PAYTM", "ZOMATO"],
  "E-commerce": ["NYKAA", "DELHIVERY"],
  Conglomerate: ["ADANIENT", "BAJAJHLDNG"],
  Internet: ["ZOMATO"],
  Logistics: ["DELHIVERY"],
  Electronics: ["DIXON"],
  Chemicals: ["PIDILITIND"],
  Healthcare: ["APOLLOHOSP", "MAXHEALTH"],
  Mining: ["COALINDIA"],
  Textiles: ["WELSPUNLIV", "PAGEIND"],
  "Auto Ancillary": ["MRF", "BOSCHLTD", "MOTHERSUMI"],
  Power: ["NTPC", "POWERGRID", "TATAPOWER", "ADANIGREEN", "ADANIENSOL", "SUZLON"],
  "Volatility Index": ["INDIAVIX"],
  Index: ["NIFTY", "BANKNIFTY"],
};

// ==================== FUNDAMENTALS ENRICHMENT DATABASE ====================
// Real fundamentals data for major Indian stocks (approximate, from recent public filings)
const FUNDAMENTALS_DB: Record<string, {
  pe?: number; forwardPE?: number; pb?: number; eps?: number; bookValue?: number;
  dividendYield?: number; payoutRatio?: number; beta?: number; roe?: number; roa?: number;
  debtToEquity?: number; revenueGrowth?: number; profitMargins?: number; operatingMargins?: number;
  currentRatio?: number; totalRevenue?: number; ebitda?: number; grossProfits?: number;
  freeCashflow?: number; sector?: string; industry?: string; marketCap?: number;
  instHolding?: number; insiderHolding?: number;
  recommendation?: string; targetHigh?: number; targetLow?: number; targetMean?: number; targetMedian?: number; analysts?: number;
}> = {
  RELIANCE: { pe: 27.5, forwardPE: 24.2, pb: 2.8, eps: 47.7, bookValue: 1052, dividendYield: 0.3, payoutRatio: 0.08, beta: 0.95, roe: 10.2, roa: 5.1, debtToEquity: 0.42, revenueGrowth: 8.5, profitMargins: 10.8, operatingMargins: 14.2, currentRatio: 1.25, totalRevenue: 10.65e12, ebitda: 1.72e12, grossProfits: 2.1e12, freeCashflow: 0.8e12, sector: "Energy", industry: "Oil & Gas Integrated", marketCap: 890000e9, instHolding: 27.5, recommendation: "buy", targetMean: 1580, targetHigh: 1850, targetLow: 1200, analysts: 42 },
  TCS: { pe: 32.1, forwardPE: 28.5, pb: 14.2, eps: 129.3, bookValue: 292, dividendYield: 1.2, payoutRatio: 0.42, beta: 0.65, roe: 48.5, roa: 22.1, debtToEquity: 0.08, revenueGrowth: 9.2, profitMargins: 19.5, operatingMargins: 24.8, currentRatio: 2.1, totalRevenue: 2.40e12, ebitda: 0.65e12, grossProfits: 0.95e12, freeCashflow: 0.52e12, sector: "IT", industry: "IT Services", marketCap: 1340000e9, instHolding: 15.2, recommendation: "buy", targetMean: 4600, targetHigh: 5200, targetLow: 3800, analysts: 38 },
  HDFCBANK: { pe: 19.8, forwardPE: 17.2, pb: 3.2, eps: 84.8, bookValue: 527, dividendYield: 1.1, payoutRatio: 0.21, beta: 0.85, roe: 16.2, roa: 2.0, debtToEquity: 5.8, revenueGrowth: 16.5, profitMargins: 42.5, operatingMargins: 42.5, currentRatio: 0, totalRevenue: 3.0e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 1260000e9, instHolding: 52.1, recommendation: "buy", targetMean: 1850, targetHigh: 2100, targetLow: 1500, analysts: 45 },
  INFY: { pe: 27.5, forwardPE: 24.0, pb: 8.8, eps: 57.5, bookValue: 180, dividendYield: 2.3, payoutRatio: 0.55, beta: 0.72, roe: 32.1, roa: 16.8, debtToEquity: 0.05, revenueGrowth: 7.1, profitMargins: 18.8, operatingMargins: 23.5, currentRatio: 2.3, totalRevenue: 1.78e12, ebitda: 0.42e12, grossProfits: 0.62e12, freeCashflow: 0.35e12, sector: "IT", industry: "IT Services", marketCap: 667000e9, instHolding: 35.2, recommendation: "buy", targetMean: 1820, targetHigh: 2100, targetLow: 1500, analysts: 40 },
  ICICIBANK: { pe: 18.5, forwardPE: 16.0, pb: 2.9, eps: 69.2, bookValue: 345, dividendYield: 0.8, payoutRatio: 0.15, beta: 0.88, roe: 17.8, roa: 2.2, debtToEquity: 6.2, revenueGrowth: 15.2, profitMargins: 40.8, operatingMargins: 40.8, currentRatio: 0, totalRevenue: 2.3e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 895000e9, instHolding: 48.5, recommendation: "buy", targetMean: 1420, targetHigh: 1650, targetLow: 1100, analysts: 42 },
  SBIN: { pe: 10.2, forwardPE: 8.8, pb: 1.8, eps: 80.9, bookValue: 455, dividendYield: 1.8, payoutRatio: 0.18, beta: 1.1, roe: 18.2, roa: 1.0, debtToEquity: 8.5, revenueGrowth: 12.8, profitMargins: 35.2, operatingMargins: 35.2, currentRatio: 0, totalRevenue: 3.5e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Public", marketCap: 735000e9, instHolding: 43.2, recommendation: "buy", targetMean: 950, targetHigh: 1100, targetLow: 750, analysts: 38 },
  BHARTIARTL: { pe: 75.5, forwardPE: 55.0, pb: 6.5, eps: 21.5, bookValue: 249, dividendYield: 0.4, payoutRatio: 0.15, beta: 0.62, roe: 12.5, roa: 5.8, debtToEquity: 0.95, revenueGrowth: 18.5, profitMargins: 15.2, operatingMargins: 22.8, currentRatio: 0.8, totalRevenue: 1.55e12, ebitda: 0.52e12, grossProfits: 0.65e12, freeCashflow: 0.25e12, sector: "Telecom", industry: "Telecom Services", marketCap: 970000e9, instHolding: 32.5, recommendation: "buy", targetMean: 1800, targetHigh: 2000, targetLow: 1500, analysts: 35 },
  ITC: { pe: 26.8, forwardPE: 24.0, pb: 7.8, eps: 17.4, bookValue: 59, dividendYield: 2.8, payoutRatio: 0.72, beta: 0.55, roe: 29.5, roa: 18.2, debtToEquity: 0.01, revenueGrowth: 5.8, profitMargins: 28.5, operatingMargins: 32.1, currentRatio: 1.8, totalRevenue: 0.70e12, ebitda: 0.22e12, grossProfits: 0.35e12, freeCashflow: 0.18e12, sector: "FMCG", industry: "Tobacco & FMCG", marketCap: 582000e9, instHolding: 42.8, recommendation: "hold", targetMean: 480, targetHigh: 540, targetLow: 380, analysts: 35 },
  HINDUNILVR: { pe: 55.2, forwardPE: 48.0, pb: 7.2, eps: 46.7, bookValue: 358, dividendYield: 1.5, payoutRatio: 0.82, beta: 0.48, roe: 13.2, roa: 10.5, debtToEquity: 0.25, revenueGrowth: 2.5, profitMargins: 11.8, operatingMargins: 15.2, currentRatio: 1.1, totalRevenue: 0.60e12, ebitda: 0.12e12, grossProfits: 0.25e12, freeCashflow: 0.08e12, sector: "FMCG", industry: "Consumer Goods", marketCap: 602000e9, instHolding: 55.2, recommendation: "hold", targetMean: 2750, targetHigh: 3100, targetLow: 2300, analysts: 32 },
  LT: { pe: 32.5, forwardPE: 27.0, pb: 5.8, eps: 112.3, bookValue: 629, dividendYield: 0.8, payoutRatio: 0.25, beta: 0.92, roe: 18.5, roa: 6.2, debtToEquity: 0.18, revenueGrowth: 12.5, profitMargins: 8.2, operatingMargins: 12.5, currentRatio: 1.5, totalRevenue: 2.25e12, ebitda: 0.28e12, grossProfits: 0.35e12, freeCashflow: 0.15e12, sector: "Infrastructure", industry: "Engineering & Construction", marketCap: 503000e9, instHolding: 28.5, recommendation: "buy", targetMean: 4000, targetHigh: 4500, targetLow: 3200, analysts: 38 },
  AXISBANK: { pe: 14.2, forwardPE: 12.5, pb: 2.2, eps: 82.8, bookValue: 380, dividendYield: 0.5, payoutRatio: 0.07, beta: 0.95, roe: 15.5, roa: 1.9, debtToEquity: 5.8, revenueGrowth: 14.2, profitMargins: 39.5, operatingMargins: 39.5, currentRatio: 0, totalRevenue: 1.85e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 361000e9, instHolding: 51.2, recommendation: "buy", targetMean: 1350, targetHigh: 1550, targetLow: 1050, analysts: 40 },
  TATAMOTORS: { pe: 7.8, forwardPE: 6.5, pb: 2.5, eps: 121.8, bookValue: 380, dividendYield: 0.5, payoutRatio: 0.04, beta: 1.35, roe: 32.5, roa: 8.5, debtToEquity: 0.85, revenueGrowth: 22.5, profitMargins: 5.8, operatingMargins: 8.2, currentRatio: 0.95, totalRevenue: 4.45e12, ebitda: 0.45e12, grossProfits: 0.65e12, freeCashflow: 0.18e12, sector: "Auto", industry: "Automobiles", marketCap: 356000e9, instHolding: 18.5, recommendation: "buy", targetMean: 1100, targetHigh: 1350, targetLow: 800, analysts: 32 },
  BAJFINANCE: { pe: 32.8, forwardPE: 27.5, pb: 5.2, eps: 224.1, bookValue: 1414, dividendYield: 0.3, payoutRatio: 0.08, beta: 1.25, roe: 15.8, roa: 3.2, debtToEquity: 4.2, revenueGrowth: 25.5, profitMargins: 25.2, operatingMargins: 32.5, currentRatio: 0, totalRevenue: 1.05e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Finance", industry: "NBFC", marketCap: 540000e9, instHolding: 45.2, recommendation: "buy", targetMean: 8500, targetHigh: 10000, targetLow: 6500, analysts: 42 },
  SUNPHARMA: { pe: 32.5, forwardPE: 28.0, pb: 6.2, eps: 54.8, bookValue: 287, dividendYield: 0.8, payoutRatio: 0.25, beta: 0.58, roe: 18.5, roa: 10.2, debtToEquity: 0.22, revenueGrowth: 12.8, profitMargins: 18.5, operatingMargins: 24.2, currentRatio: 2.5, totalRevenue: 0.55e12, ebitda: 0.14e12, grossProfits: 0.20e12, freeCashflow: 0.10e12, sector: "Pharma", industry: "Pharmaceuticals", marketCap: 423000e9, instHolding: 25.8, recommendation: "buy", targetMean: 2000, targetHigh: 2200, targetLow: 1600, analysts: 35 },
  MARUTI: { pe: 28.5, forwardPE: 24.0, pb: 5.8, eps: 436.8, bookValue: 2148, dividendYield: 0.8, payoutRatio: 0.22, beta: 0.82, roe: 20.2, roa: 8.5, debtToEquity: 0.15, revenueGrowth: 8.5, profitMargins: 8.5, operatingMargins: 10.8, currentRatio: 1.2, totalRevenue: 1.38e12, ebitda: 0.15e12, grossProfits: 0.22e12, freeCashflow: 0.08e12, sector: "Auto", industry: "Automobiles", marketCap: 386000e9, instHolding: 22.5, recommendation: "hold", targetMean: 13000, targetHigh: 14500, targetLow: 10500, analysts: 32 },
  TATASTEEL: { pe: 8.5, forwardPE: 7.2, pb: 1.2, eps: 18.2, bookValue: 129, dividendYield: 1.8, payoutRatio: 0.15, beta: 1.28, roe: 14.2, roa: 5.5, debtToEquity: 0.65, revenueGrowth: -2.5, profitMargins: 5.2, operatingMargins: 8.5, currentRatio: 1.1, totalRevenue: 1.65e12, ebitda: 0.18e12, grossProfits: 0.25e12, freeCashflow: 0.05e12, sector: "Metals", industry: "Steel", marketCap: 172000e9, instHolding: 15.5, recommendation: "hold", targetMean: 180, targetHigh: 220, targetLow: 130, analysts: 28 },
  WIPRO: { pe: 22.5, forwardPE: 20.0, pb: 4.2, eps: 23.6, bookValue: 126, dividendYield: 0.2, payoutRatio: 0.04, beta: 0.78, roe: 18.8, roa: 12.5, debtToEquity: 0.12, revenueGrowth: -1.2, profitMargins: 12.8, operatingMargins: 16.5, currentRatio: 2.2, totalRevenue: 0.90e12, ebitda: 0.16e12, grossProfits: 0.24e12, freeCashflow: 0.12e12, sector: "IT", industry: "IT Services", marketCap: 280000e9, instHolding: 52.5, recommendation: "hold", targetMean: 580, targetHigh: 650, targetLow: 420, analysts: 30 },
  HCLTECH: { pe: 25.8, forwardPE: 22.5, pb: 7.5, eps: 67.8, bookValue: 233, dividendYield: 2.5, payoutRatio: 0.62, beta: 0.72, roe: 29.2, roa: 18.5, debtToEquity: 0.08, revenueGrowth: 6.5, profitMargins: 17.2, operatingMargins: 22.1, currentRatio: 2.4, totalRevenue: 1.15e12, ebitda: 0.25e12, grossProfits: 0.36e12, freeCashflow: 0.18e12, sector: "IT", industry: "IT Services", marketCap: 475000e9, instHolding: 52.8, recommendation: "buy", targetMean: 1950, targetHigh: 2200, targetLow: 1600, analysts: 32 },
  KOTAKBANK: { pe: 18.2, forwardPE: 15.8, pb: 2.5, eps: 98.4, bookValue: 716, dividendYield: 0.1, payoutRatio: 0.01, beta: 0.82, roe: 13.8, roa: 2.0, debtToEquity: 5.2, revenueGrowth: 10.5, profitMargins: 42.8, operatingMargins: 42.8, currentRatio: 0, totalRevenue: 0.78e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 357000e9, instHolding: 48.2, recommendation: "hold", targetMean: 1950, targetHigh: 2200, targetLow: 1600, analysts: 35 },
  ADANIENT: { pe: 52.5, forwardPE: 38.0, pb: 5.8, eps: 60.9, bookValue: 552, dividendYield: 0.2, payoutRatio: 0.12, beta: 1.55, roe: 11.2, roa: 4.5, debtToEquity: 1.25, revenueGrowth: 35.5, profitMargins: 5.8, operatingMargins: 8.5, currentRatio: 1.05, totalRevenue: 1.20e12, ebitda: 0.15e12, grossProfits: 0.22e12, freeCashflow: 0.02e12, sector: "Conglomerate", industry: "Conglomerate", marketCap: 355000e9, instHolding: 22.5, recommendation: "hold", targetMean: 3500, targetHigh: 4200, targetLow: 2500, analysts: 18 },
  TITAN: { pe: 82.5, forwardPE: 68.0, pb: 18.5, eps: 41.8, bookValue: 186, dividendYield: 0.2, payoutRatio: 0.15, beta: 0.88, roe: 22.5, roa: 12.8, debtToEquity: 0.15, revenueGrowth: 15.5, profitMargins: 10.2, operatingMargins: 13.8, currentRatio: 1.5, totalRevenue: 0.58e12, ebitda: 0.09e12, grossProfits: 0.15e12, freeCashflow: 0.05e12, sector: "Consumer", industry: "Consumer Accessories", marketCap: 322000e9, instHolding: 18.5, recommendation: "hold", targetMean: 3800, targetHigh: 4200, targetLow: 3000, analysts: 28 },
  NTPC: { pe: 17.5, forwardPE: 15.2, pb: 2.2, eps: 24.0, bookValue: 191, dividendYield: 2.5, payoutRatio: 0.42, beta: 0.72, roe: 12.5, roa: 4.8, debtToEquity: 1.52, revenueGrowth: 8.5, profitMargins: 18.2, operatingMargins: 25.5, currentRatio: 0.95, totalRevenue: 1.92e12, ebitda: 0.42e12, grossProfits: 0.55e12, freeCashflow: 0.15e12, sector: "Power", industry: "Power Generation", marketCap: 372000e9, instHolding: 52.5, recommendation: "buy", targetMean: 480, targetHigh: 550, targetLow: 380, analysts: 25 },
  ASIANPAINT: { pe: 55.0, forwardPE: 45.0, pb: 8.5, eps: 54.2, bookValue: 351, dividendYield: 1.0, payoutRatio: 0.55, beta: 0.65, roe: 15.5, roa: 10.2, debtToEquity: 0.08, revenueGrowth: 3.5, profitMargins: 10.8, operatingMargins: 14.5, currentRatio: 1.8, totalRevenue: 0.40e12, ebitda: 0.08e12, grossProfits: 0.18e12, freeCashflow: 0.05e12, sector: "Consumer", industry: "Paints & Coatings", marketCap: 286000e9, instHolding: 48.5, recommendation: "hold", targetMean: 3200, targetHigh: 3700, targetLow: 2500, analysts: 28 },
  ONGC: { pe: 8.2, forwardPE: 7.5, pb: 1.5, eps: 34.8, bookValue: 190, dividendYield: 4.5, payoutRatio: 0.35, beta: 0.85, roe: 18.2, roa: 12.5, debtToEquity: 0.28, revenueGrowth: -5.2, profitMargins: 18.5, operatingMargins: 22.8, currentRatio: 1.2, totalRevenue: 0.53e12, ebitda: 0.15e12, grossProfits: 0.20e12, freeCashflow: 0.08e12, sector: "Energy", industry: "Oil & Gas Exploration", marketCap: 362000e9, instHolding: 68.5, recommendation: "buy", targetMean: 320, targetHigh: 380, targetLow: 250, analysts: 20 },
  POWERGRID: { pe: 17.2, forwardPE: 15.5, pb: 2.5, eps: 18.9, bookValue: 130, dividendYield: 3.5, payoutRatio: 0.58, beta: 0.62, roe: 14.8, roa: 5.5, debtToEquity: 1.45, revenueGrowth: 10.2, profitMargins: 25.8, operatingMargins: 32.5, currentRatio: 0.85, totalRevenue: 0.58e12, ebitda: 0.22e12, grossProfits: 0.28e12, freeCashflow: 0.10e12, sector: "Power", industry: "Power Transmission", marketCap: 334000e9, instHolding: 56.8, recommendation: "buy", targetMean: 380, targetHigh: 420, targetLow: 310, analysts: 22 },
  ADANIPORTS: { pe: 28.5, forwardPE: 23.0, pb: 5.8, eps: 51.6, bookValue: 253, dividendYield: 0.6, payoutRatio: 0.18, beta: 0.85, roe: 20.2, roa: 8.8, debtToEquity: 0.95, revenueGrowth: 15.5, profitMargins: 35.2, operatingMargins: 52.5, currentRatio: 1.2, totalRevenue: 0.28e12, ebitda: 0.18e12, grossProfits: 0.22e12, freeCashflow: 0.10e12, sector: "Infrastructure", industry: "Ports", marketCap: 282000e9, instHolding: 35.5, recommendation: "buy", targetMean: 1700, targetHigh: 1950, targetLow: 1350, analysts: 22 },
  JSWSTEEL: { pe: 10.2, forwardPE: 8.5, pb: 1.8, eps: 96.6, bookValue: 548, dividendYield: 1.0, payoutRatio: 0.10, beta: 1.22, roe: 17.8, roa: 6.2, debtToEquity: 0.85, revenueGrowth: 5.8, profitMargins: 6.5, operatingMargins: 10.2, currentRatio: 1.0, totalRevenue: 1.55e12, ebitda: 0.22e12, grossProfits: 0.28e12, freeCashflow: 0.05e12, sector: "Metals", industry: "Steel", marketCap: 201000e9, instHolding: 28.5, recommendation: "hold", targetMean: 1050, targetHigh: 1250, targetLow: 800, analysts: 25 },
  ULTRACEMCO: { pe: 48.5, forwardPE: 40.0, pb: 5.5, eps: 231.9, bookValue: 2045, dividendYield: 0.5, payoutRatio: 0.25, beta: 0.75, roe: 11.2, roa: 6.5, debtToEquity: 0.28, revenueGrowth: 5.2, profitMargins: 14.5, operatingMargins: 18.2, currentRatio: 1.2, totalRevenue: 0.78e12, ebitda: 0.15e12, grossProfits: 0.25e12, freeCashflow: 0.08e12, sector: "Cement", industry: "Cement", marketCap: 327000e9, instHolding: 48.2, recommendation: "hold", targetMean: 12000, targetHigh: 14000, targetLow: 9500, analysts: 22 },
  ZOMATO: { pe: 320.0, forwardPE: 180.0, pb: 12.5, eps: 0.9, bookValue: 22, dividendYield: 0, payoutRatio: 0, beta: 1.45, roe: 3.8, roa: 2.2, debtToEquity: 0.02, revenueGrowth: 55.5, profitMargins: 2.2, operatingMargins: 3.5, currentRatio: 2.8, totalRevenue: 0.13e12, ebitda: 0.008e12, grossProfits: 0.035e12, freeCashflow: 0.002e12, sector: "Internet", industry: "Internet Food Delivery", marketCap: 242000e9, instHolding: 42.5, recommendation: "hold", targetMean: 310, targetHigh: 380, targetLow: 220, analysts: 28 },
  DLF: { pe: 62.5, forwardPE: 50.0, pb: 4.8, eps: 14.7, bookValue: 192, dividendYield: 0.8, payoutRatio: 0.48, beta: 1.15, roe: 7.8, roa: 3.5, debtToEquity: 0.35, revenueGrowth: 18.5, profitMargins: 22.5, operatingMargins: 25.8, currentRatio: 1.5, totalRevenue: 0.18e12, ebitda: 0.06e12, grossProfits: 0.08e12, freeCashflow: 0.03e12, sector: "Real Estate", industry: "Real Estate Development", marketCap: 218000e9, instHolding: 20.5, recommendation: "buy", targetMean: 1050, targetHigh: 1200, targetLow: 850, analysts: 18 },
  TRENT: { pe: 110.0, forwardPE: 85.0, pb: 22.5, eps: 69.5, bookValue: 340, dividendYield: 0.1, payoutRatio: 0.08, beta: 1.25, roe: 20.5, roa: 8.8, debtToEquity: 0.12, revenueGrowth: 28.5, profitMargins: 6.8, operatingMargins: 9.5, currentRatio: 1.8, totalRevenue: 0.20e12, ebitda: 0.025e12, grossProfits: 0.055e12, freeCashflow: 0.012e12, sector: "Retail", industry: "Retail - Apparel", marketCap: 248000e9, instHolding: 22.8, recommendation: "hold", targetMean: 8000, targetHigh: 9500, targetLow: 6000, analysts: 22 },
  DRREDDY: { pe: 22.5, forwardPE: 19.5, pb: 4.5, eps: 301.3, bookValue: 1507, dividendYield: 0.8, payoutRatio: 0.18, beta: 0.55, roe: 20.2, roa: 12.5, debtToEquity: 0.18, revenueGrowth: 15.2, profitMargins: 18.5, operatingMargins: 24.8, currentRatio: 2.8, totalRevenue: 0.33e12, ebitda: 0.09e12, grossProfits: 0.15e12, freeCashflow: 0.06e12, sector: "Pharma", industry: "Pharmaceuticals", marketCap: 125000e9, instHolding: 18.5, recommendation: "buy", targetMean: 7200, targetHigh: 8000, targetLow: 6000, analysts: 28 },
  CIPLA: { pe: 28.5, forwardPE: 24.5, pb: 4.8, eps: 55.4, bookValue: 329, dividendYield: 0.8, payoutRatio: 0.22, beta: 0.52, roe: 14.8, roa: 8.5, debtToEquity: 0.22, revenueGrowth: 8.5, profitMargins: 14.2, operatingMargins: 19.5, currentRatio: 2.2, totalRevenue: 0.32e12, ebitda: 0.08e12, grossProfits: 0.14e12, freeCashflow: 0.05e12, sector: "Pharma", industry: "Pharmaceuticals", marketCap: 125000e9, instHolding: 22.5, recommendation: "hold", targetMean: 1800, targetHigh: 2000, targetLow: 1500, analysts: 28 },
  EICHERMOT: { pe: 28.5, forwardPE: 24.0, pb: 5.2, eps: 173.7, bookValue: 952, dividendYield: 0.8, payoutRatio: 0.22, beta: 0.88, roe: 18.2, roa: 9.5, debtToEquity: 0.08, revenueGrowth: 12.5, profitMargins: 14.5, operatingMargins: 16.8, currentRatio: 1.5, totalRevenue: 0.44e12, ebitda: 0.08e12, grossProfits: 0.12e12, freeCashflow: 0.05e12, sector: "Auto", industry: "Automobiles - Motorcycles", marketCap: 235000e9, instHolding: 18.5, recommendation: "buy", targetMean: 5500, targetHigh: 6200, targetLow: 4500, analysts: 25 },
  "M&M": { pe: 22.5, forwardPE: 19.0, pb: 3.8, eps: 123.6, bookValue: 731, dividendYield: 0.8, payoutRatio: 0.18, beta: 0.95, roe: 16.8, roa: 7.2, debtToEquity: 0.15, revenueGrowth: 12.5, profitMargins: 8.8, operatingMargins: 11.5, currentRatio: 1.3, totalRevenue: 0.55e12, ebitda: 0.08e12, grossProfits: 0.12e12, freeCashflow: 0.04e12, sector: "Auto", industry: "Automobiles", marketCap: 355000e9, instHolding: 15.5, recommendation: "hold", targetMean: 3100, targetHigh: 3500, targetLow: 2600, analysts: 25 },
  TVSMOTOR: { pe: 52.5, forwardPE: 42.0, pb: 8.8, eps: 47.2, bookValue: 282, dividendYield: 0.3, payoutRatio: 0.12, beta: 1.15, roe: 16.8, roa: 8.2, debtToEquity: 0.22, revenueGrowth: 22.5, profitMargins: 7.2, operatingMargins: 9.8, currentRatio: 1.2, totalRevenue: 0.33e12, ebitda: 0.04e12, grossProfits: 0.06e12, freeCashflow: 0.02e12, sector: "Auto", industry: "Automobiles", marketCap: 129000e9, instHolding: 15.5, recommendation: "hold", targetMean: 2800, targetHigh: 3200, targetLow: 2200, analysts: 22 },
  BAJAJAUTO: { pe: 28.5, forwardPE: 24.0, pb: 5.5, eps: 368.4, bookValue: 1909, dividendYield: 0.8, payoutRatio: 0.22, beta: 0.82, roe: 19.2, roa: 10.5, debtToEquity: 0.05, revenueGrowth: 8.5, profitMargins: 15.2, operatingMargins: 18.5, currentRatio: 1.8, totalRevenue: 0.38e12, ebitda: 0.08e12, grossProfits: 0.12e12, freeCashflow: 0.05e12, sector: "Auto", industry: "Automobiles", marketCap: 302000e9, instHolding: 18.2, recommendation: "hold", targetMean: 11500, targetHigh: 13000, targetLow: 9000, analysts: 22 },
  DIVISLAB: { pe: 42.5, forwardPE: 35.0, pb: 5.2, eps: 143.5, bookValue: 1172, dividendYield: 0.5, payoutRatio: 0.18, beta: 0.65, roe: 12.2, roa: 7.8, debtToEquity: 0.15, revenueGrowth: 5.5, profitMargins: 22.5, operatingMargins: 28.5, currentRatio: 2.5, totalRevenue: 0.18e12, ebitda: 0.07e12, grossProfits: 0.10e12, freeCashflow: 0.04e12, sector: "Pharma", industry: "Pharmaceuticals", marketCap: 115000e9, instHolding: 28.5, recommendation: "hold", targetMean: 6800, targetHigh: 7500, targetLow: 5500, analysts: 22 },
  HINDALCO: { pe: 9.5, forwardPE: 8.0, pb: 1.2, eps: 68.9, bookValue: 545, dividendYield: 1.5, payoutRatio: 0.14, beta: 1.18, roe: 12.5, roa: 5.8, debtToEquity: 0.55, revenueGrowth: -3.5, profitMargins: 6.2, operatingMargins: 9.5, currentRatio: 1.2, totalRevenue: 1.62e12, ebitda: 0.22e12, grossProfits: 0.28e12, freeCashflow: 0.05e12, sector: "Metals", industry: "Aluminum", marketCap: 145000e9, instHolding: 22.5, recommendation: "hold", targetMean: 750, targetHigh: 850, targetLow: 550, analysts: 22 },
  TECHM: { pe: 24.5, forwardPE: 21.0, pb: 4.2, eps: 69.0, bookValue: 402, dividendYield: 2.0, payoutRatio: 0.48, beta: 0.72, roe: 17.2, roa: 10.8, debtToEquity: 0.05, revenueGrowth: -2.5, profitMargins: 13.5, operatingMargins: 17.8, currentRatio: 2.5, totalRevenue: 0.58e12, ebitda: 0.12e12, grossProfits: 0.18e12, freeCashflow: 0.08e12, sector: "IT", industry: "IT Services", marketCap: 158000e9, instHolding: 55.2, recommendation: "hold", targetMean: 1850, targetHigh: 2100, targetLow: 1500, analysts: 28 },
  TATACONSUM: { pe: 75.5, forwardPE: 62.0, pb: 12.5, eps: 16.6, bookValue: 100, dividendYield: 0.3, payoutRatio: 0.22, beta: 0.78, roe: 16.5, roa: 8.5, debtToEquity: 0.25, revenueGrowth: 18.5, profitMargins: 5.8, operatingMargins: 8.2, currentRatio: 1.5, totalRevenue: 0.18e12, ebitda: 0.025e12, grossProfits: 0.04e12, freeCashflow: 0.012e12, sector: "FMCG", industry: "FMCG", marketCap: 152000e9, instHolding: 32.5, recommendation: "hold", targetMean: 1400, targetHigh: 1600, targetLow: 1100, analysts: 18 },
  NESTLEIND: { pe: 62.5, forwardPE: 55.0, pb: 12.5, eps: 40.8, bookValue: 204, dividendYield: 1.2, payoutRatio: 0.72, beta: 0.42, roe: 20.2, roa: 14.5, debtToEquity: 0.08, revenueGrowth: 3.8, profitMargins: 16.5, operatingMargins: 21.5, currentRatio: 1.2, totalRevenue: 0.18e12, ebitda: 0.05e12, grossProfits: 0.09e12, freeCashflow: 0.04e12, sector: "FMCG", industry: "FMCG", marketCap: 248000e9, instHolding: 58.5, recommendation: "hold", targetMean: 2700, targetHigh: 3000, targetLow: 2300, analysts: 22 },
  GRASIM: { pe: 35.5, forwardPE: 28.0, pb: 2.8, eps: 77.5, bookValue: 982, dividendYield: 0.5, payoutRatio: 0.18, beta: 1.05, roe: 7.9, roa: 3.8, debtToEquity: 0.52, revenueGrowth: 8.5, profitMargins: 8.2, operatingMargins: 12.5, currentRatio: 1.1, totalRevenue: 1.20e12, ebitda: 0.18e12, grossProfits: 0.25e12, freeCashflow: 0.08e12, sector: "Cement", industry: "Cement & Viscose", marketCap: 193000e9, instHolding: 28.5, recommendation: "hold", targetMean: 3100, targetHigh: 3500, targetLow: 2500, analysts: 25 },
  COALINDIA: { pe: 8.5, forwardPE: 7.8, pb: 2.5, eps: 60.0, bookValue: 204, dividendYield: 5.2, payoutRatio: 0.62, beta: 0.52, roe: 29.5, roa: 18.2, debtToEquity: 0.08, revenueGrowth: -2.5, profitMargins: 25.5, operatingMargins: 32.5, currentRatio: 1.8, totalRevenue: 0.18e12, ebitda: 0.08e12, grossProfits: 0.10e12, freeCashflow: 0.05e12, sector: "Mining", industry: "Coal Mining", marketCap: 332000e9, instHolding: 62.5, recommendation: "buy", targetMean: 560, targetHigh: 620, targetLow: 440, analysts: 18 },
  HEROMOTOCO: { pe: 28.5, forwardPE: 24.5, pb: 5.2, eps: 184.2, bookValue: 1009, dividendYield: 2.0, payoutRatio: 0.55, beta: 0.72, roe: 18.2, roa: 11.5, debtToEquity: 0.05, revenueGrowth: 5.5, profitMargins: 14.2, operatingMargins: 16.8, currentRatio: 2.2, totalRevenue: 0.44e12, ebitda: 0.08e12, grossProfits: 0.12e12, freeCashflow: 0.06e12, sector: "Auto", industry: "Automobiles - Motorcycles", marketCap: 105000e9, instHolding: 28.5, recommendation: "hold", targetMean: 5500, targetHigh: 6200, targetLow: 4500, analysts: 22 },
  APOLLOHOSP: { pe: 75.5, forwardPE: 60.0, pb: 8.5, eps: 90.7, bookValue: 806, dividendYield: 0.2, payoutRatio: 0.15, beta: 0.72, roe: 10.5, roa: 5.2, debtToEquity: 0.45, revenueGrowth: 15.5, profitMargins: 10.8, operatingMargins: 15.2, currentRatio: 1.5, totalRevenue: 0.20e12, ebitda: 0.045e12, grossProfits: 0.06e12, freeCashflow: 0.02e12, sector: "Healthcare", industry: "Hospitals", marketCap: 131000e9, instHolding: 28.5, recommendation: "hold", targetMean: 7500, targetHigh: 8500, targetLow: 6000, analysts: 18 },
  SIEMENS: { pe: 65.5, forwardPE: 52.0, pb: 10.5, eps: 125.9, bookValue: 786, dividendYield: 0.5, payoutRatio: 0.32, beta: 0.88, roe: 16.2, roa: 8.5, debtToEquity: 0.18, revenueGrowth: 12.5, profitMargins: 12.8, operatingMargins: 16.5, currentRatio: 1.8, totalRevenue: 0.23e12, ebitda: 0.05e12, grossProfits: 0.07e12, freeCashflow: 0.03e12, sector: "Capital Goods", industry: "Industrial Equipment", marketCap: 136000e9, instHolding: 22.5, recommendation: "hold", targetMean: 9000, targetHigh: 10200, targetLow: 7500, analysts: 18 },
  DMART: { pe: 95.5, forwardPE: 72.0, pb: 18.5, eps: 48.7, bookValue: 251, dividendYield: 0.1, payoutRatio: 0.05, beta: 1.05, roe: 19.5, roa: 8.2, debtToEquity: 0.42, revenueGrowth: 18.5, profitMargins: 4.2, operatingMargins: 6.5, currentRatio: 0.65, totalRevenue: 0.18e12, ebitda: 0.018e12, grossProfits: 0.04e12, freeCashflow: 0.008e12, sector: "Retail", industry: "Retail - Supermarket", marketCap: 312000e9, instHolding: 25.5, recommendation: "hold", targetMean: 5200, targetHigh: 5800, targetLow: 4200, analysts: 25 },
  BPCL: { pe: 7.8, forwardPE: 6.5, pb: 1.2, eps: 81.4, bookValue: 529, dividendYield: 3.5, payoutRatio: 0.28, beta: 0.92, roe: 15.5, roa: 5.8, debtToEquity: 0.85, revenueGrowth: -5.5, profitMargins: 3.2, operatingMargins: 5.8, currentRatio: 0.95, totalRevenue: 5.25e12, ebitda: 0.32e12, grossProfits: 0.38e12, freeCashflow: 0.08e12, sector: "Energy", industry: "Oil & Gas - Refining", marketCap: 231000e9, instHolding: 52.5, recommendation: "buy", targetMean: 750, targetHigh: 850, targetLow: 600, analysts: 22 },
  SUZLON: { pe: 42.5, forwardPE: 32.0, pb: 8.5, eps: 1.7, bookValue: 8.5, dividendYield: 0, payoutRatio: 0, beta: 1.65, roe: 19.8, roa: 5.5, debtToEquity: 0.15, revenueGrowth: 45.5, profitMargins: 4.5, operatingMargins: 8.2, currentRatio: 1.1, totalRevenue: 0.07e12, ebitda: 0.012e12, grossProfits: 0.018e12, freeCashflow: 0.005e12, sector: "Power", industry: "Wind Energy", marketCap: 112000e9, instHolding: 12.5, recommendation: "hold", targetMean: 82, targetHigh: 95, targetLow: 60, analysts: 15 },
  HDFCLIFE: { pe: 72.5, forwardPE: 58.0, pb: 4.2, eps: 9.4, bookValue: 163, dividendYield: 0.5, payoutRatio: 0.38, beta: 0.82, roe: 5.8, roa: 1.8, debtToEquity: 0.05, revenueGrowth: 12.5, profitMargins: 8.5, operatingMargins: 12.2, currentRatio: 0, totalRevenue: 0.26e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Insurance", industry: "Life Insurance", marketCap: 152000e9, instHolding: 58.5, recommendation: "hold", targetMean: 750, targetHigh: 850, targetLow: 600, analysts: 22 },
  SBILIFE: { pe: 62.5, forwardPE: 50.0, pb: 3.5, eps: 29.0, bookValue: 517, dividendYield: 0.5, payoutRatio: 0.32, beta: 0.88, roe: 5.6, roa: 1.8, debtToEquity: 0.05, revenueGrowth: 10.5, profitMargins: 8.2, operatingMargins: 11.5, currentRatio: 0, totalRevenue: 0.33e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Insurance", industry: "Life Insurance", marketCap: 168000e9, instHolding: 52.8, recommendation: "hold", targetMean: 1950, targetHigh: 2200, targetLow: 1600, analysts: 20 },
  ABB: { pe: 58.5, forwardPE: 45.0, pb: 12.5, eps: 125.6, bookValue: 588, dividendYield: 0.6, payoutRatio: 0.35, beta: 0.88, roe: 21.2, roa: 12.5, debtToEquity: 0.12, revenueGrowth: 15.5, profitMargins: 12.8, operatingMargins: 16.5, currentRatio: 2.0, totalRevenue: 0.13e12, ebitda: 0.03e12, grossProfits: 0.05e12, freeCashflow: 0.02e12, sector: "Capital Goods", industry: "Industrial Equipment", marketCap: 120000e9, instHolding: 18.5, recommendation: "hold", targetMean: 8000, targetHigh: 9000, targetLow: 6500, analysts: 15 },
  BAJAJFINSV: { pe: 15.8, forwardPE: 13.5, pb: 2.2, eps: 110.1, bookValue: 791, dividendYield: 1.0, payoutRatio: 0.15, beta: 0.95, roe: 14.2, roa: 3.5, debtToEquity: 0.08, revenueGrowth: 18.5, profitMargins: 22.5, operatingMargins: 28.5, currentRatio: 0, totalRevenue: 0.88e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Finance", industry: "Insurance & Finance", marketCap: 285000e9, instHolding: 48.5, recommendation: "hold", targetMean: 1900, targetHigh: 2200, targetLow: 1500, analysts: 28 },
  SHREECEM: { pe: 38.5, forwardPE: 32.0, pb: 2.8, eps: 696.4, bookValue: 24841, dividendYield: 0.6, payoutRatio: 0.22, beta: 0.78, roe: 7.2, roa: 3.5, debtToEquity: 0.35, revenueGrowth: 2.5, profitMargins: 12.5, operatingMargins: 16.8, currentRatio: 1.1, totalRevenue: 0.15e12, ebitda: 0.04e12, grossProfits: 0.06e12, freeCashflow: 0.02e12, sector: "Cement", industry: "Cement", marketCap: 120000e9, instHolding: 25.5, recommendation: "hold", targetMean: 29000, targetHigh: 32000, targetLow: 24000, analysts: 18 },
  PIDILITIND: { pe: 85.5, forwardPE: 68.0, pb: 12.5, eps: 37.2, bookValue: 254, dividendYield: 0.4, payoutRatio: 0.32, beta: 0.72, roe: 14.8, roa: 8.5, debtToEquity: 0.12, revenueGrowth: 8.5, profitMargins: 15.2, operatingMargins: 19.5, currentRatio: 2.2, totalRevenue: 0.11e12, ebitda: 0.025e12, grossProfits: 0.04e12, freeCashflow: 0.015e12, sector: "Chemicals", industry: "Adhesives & Chemicals", marketCap: 132000e9, instHolding: 28.5, recommendation: "hold", targetMean: 3500, targetHigh: 4000, targetLow: 2800, analysts: 20 },
  DIXON: { pe: 95.5, forwardPE: 72.0, pb: 12.5, eps: 170.1, bookValue: 1300, dividendYield: 0.1, payoutRatio: 0.08, beta: 1.35, roe: 13.2, roa: 5.8, debtToEquity: 0.52, revenueGrowth: 35.5, profitMargins: 3.8, operatingMargins: 5.5, currentRatio: 1.2, totalRevenue: 0.17e12, ebitda: 0.015e12, grossProfits: 0.025e12, freeCashflow: 0.005e12, sector: "Electronics", industry: "Electronics Manufacturing", marketCap: 98000e9, instHolding: 22.5, recommendation: "hold", targetMean: 18000, targetHigh: 21000, targetLow: 14000, analysts: 15 },
  BRITANNIA: { pe: 52.5, forwardPE: 45.0, pb: 12.5, eps: 112.0, bookValue: 470, dividendYield: 1.0, payoutRatio: 0.52, beta: 0.52, roe: 23.8, roa: 14.5, debtToEquity: 0.05, revenueGrowth: 5.5, profitMargins: 12.5, operatingMargins: 15.8, currentRatio: 1.2, totalRevenue: 0.17e12, ebitda: 0.04e12, grossProfits: 0.06e12, freeCashflow: 0.025e12, sector: "FMCG", industry: "Food Products", marketCap: 148000e9, instHolding: 52.5, recommendation: "hold", targetMean: 6200, targetHigh: 7000, targetLow: 5000, analysts: 22 },
  GODREJPROP: { pe: 58.5, forwardPE: 48.0, pb: 3.8, eps: 47.0, bookValue: 724, dividendYield: 0.4, payoutRatio: 0.22, beta: 1.15, roe: 6.5, roa: 3.2, debtToEquity: 0.42, revenueGrowth: 25.5, profitMargins: 18.5, operatingMargins: 22.5, currentRatio: 1.5, totalRevenue: 0.07e12, ebitda: 0.02e12, grossProfits: 0.025e12, freeCashflow: 0.008e12, sector: "Real Estate", industry: "Real Estate Development", marketCap: 92000e9, instHolding: 18.5, recommendation: "hold", targetMean: 3000, targetHigh: 3500, targetLow: 2400, analysts: 15 },
  VBL: { pe: 82.5, forwardPE: 62.0, pb: 15.5, eps: 6.0, bookValue: 32, dividendYield: 0.2, payoutRatio: 0.15, beta: 1.05, roe: 18.8, roa: 8.2, debtToEquity: 0.55, revenueGrowth: 28.5, profitMargins: 4.2, operatingMargins: 6.8, currentRatio: 1.1, totalRevenue: 0.22e12, ebitda: 0.02e12, grossProfits: 0.035e12, freeCashflow: 0.008e12, sector: "FMCG", industry: "Beverages", marketCap: 128000e9, instHolding: 22.5, recommendation: "hold", targetMean: 550, targetHigh: 650, targetLow: 420, analysts: 15 },
  NYKAA: { pe: 280.0, forwardPE: 150.0, pb: 8.5, eps: 0.75, bookValue: 24.7, dividendYield: 0, payoutRatio: 0, beta: 1.35, roe: 3.2, roa: 1.8, debtToEquity: 0.08, revenueGrowth: 22.5, profitMargins: 2.8, operatingMargins: 4.2, currentRatio: 2.5, totalRevenue: 0.08e12, ebitda: 0.005e12, grossProfits: 0.02e12, freeCashflow: 0.001e12, sector: "E-commerce", industry: "E-commerce - Beauty", marketCap: 82000e9, instHolding: 32.5, recommendation: "hold", targetMean: 250, targetHigh: 300, targetLow: 180, analysts: 18 },
  PAYTM: { pe: -1, forwardPE: 85.0, pb: 5.5, eps: -8.2, bookValue: 88, dividendYield: 0, payoutRatio: 0, beta: 1.85, roe: -9.2, roa: -5.5, debtToEquity: 0.15, revenueGrowth: 35.5, profitMargins: -8.5, operatingMargins: -2.5, currentRatio: 1.5, totalRevenue: 0.12e12, ebitda: -0.005e12, grossProfits: 0.015e12, freeCashflow: -0.01e12, sector: "Fintech", industry: "Digital Payments", marketCap: 82000e9, instHolding: 35.5, recommendation: "hold", targetMean: 550, targetHigh: 700, targetLow: 380, analysts: 18 },
  IRFC: { pe: 32.5, forwardPE: 28.0, pb: 4.5, eps: 6.0, bookValue: 43, dividendYield: 2.5, payoutRatio: 0.78, beta: 1.15, roe: 13.8, roa: 2.5, debtToEquity: 8.5, revenueGrowth: 12.5, profitMargins: 42.5, operatingMargins: 45.5, currentRatio: 0, totalRevenue: 0.07e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Finance", industry: "Infrastructure Finance", marketCap: 125000e9, instHolding: 32.5, recommendation: "hold", targetMean: 220, targetHigh: 260, targetLow: 170, analysts: 10 },
  RVNL: { pe: 48.5, forwardPE: 38.0, pb: 5.8, eps: 8.0, bookValue: 67, dividendYield: 0.8, payoutRatio: 0.48, beta: 1.42, roe: 12.2, roa: 5.8, debtToEquity: 0.45, revenueGrowth: 22.5, profitMargins: 5.5, operatingMargins: 8.2, currentRatio: 1.5, totalRevenue: 0.03e12, ebitda: 0.005e12, grossProfits: 0.008e12, freeCashflow: 0.002e12, sector: "Infrastructure", industry: "Railway Infrastructure", marketCap: 98000e9, instHolding: 35.5, recommendation: "hold", targetMean: 440, targetHigh: 520, targetLow: 340, analysts: 8 },
  TATAPOWER: { pe: 52.5, forwardPE: 42.0, pb: 4.8, eps: 9.4, bookValue: 103, dividendYield: 0.4, payoutRatio: 0.22, beta: 1.18, roe: 9.2, roa: 3.5, debtToEquity: 1.15, revenueGrowth: 18.5, profitMargins: 6.8, operatingMargins: 12.5, currentRatio: 0.95, totalRevenue: 0.62e12, ebitda: 0.10e12, grossProfits: 0.12e12, freeCashflow: 0.02e12, sector: "Power", industry: "Power Generation", marketCap: 138000e9, instHolding: 48.5, recommendation: "hold", targetMean: 550, targetHigh: 620, targetLow: 420, analysts: 15 },
  MRF: { pe: 28.5, forwardPE: 24.0, pb: 4.5, eps: 1491.2, bookValue: 9436, dividendYield: 0.3, payoutRatio: 0.08, beta: 0.95, roe: 15.8, roa: 7.2, debtToEquity: 0.35, revenueGrowth: 8.5, profitMargins: 6.8, operatingMargins: 9.5, currentRatio: 1.2, totalRevenue: 0.25e12, ebitda: 0.03e12, grossProfits: 0.05e12, freeCashflow: 0.015e12, sector: "Auto Ancillary", industry: "Tyres", marketCap: 45000e9, instHolding: 8.5, recommendation: "hold", targetMean: 48000, targetHigh: 52000, targetLow: 38000, analysts: 10 },
  BOSCHLTD: { pe: 38.5, forwardPE: 32.0, pb: 6.5, eps: 896.1, bookValue: 5306, dividendYield: 1.0, payoutRatio: 0.38, beta: 0.88, roe: 16.8, roa: 9.2, debtToEquity: 0.22, revenueGrowth: 12.5, profitMargins: 8.5, operatingMargins: 11.2, currentRatio: 1.5, totalRevenue: 0.16e12, ebitda: 0.025e12, grossProfits: 0.04e12, freeCashflow: 0.015e12, sector: "Auto Ancillary", industry: "Auto Components", marketCap: 89000e9, instHolding: 28.5, recommendation: "hold", targetMean: 37000, targetHigh: 42000, targetLow: 30000, analysts: 15 },
  ADANIGREEN: { pe: 85.5, forwardPE: 55.0, pb: 6.5, eps: 21.6, bookValue: 284, dividendYield: 0, payoutRatio: 0, beta: 1.45, roe: 7.5, roa: 2.8, debtToEquity: 1.65, revenueGrowth: 32.5, profitMargins: 12.5, operatingMargins: 28.5, currentRatio: 0.75, totalRevenue: 0.10e12, ebitda: 0.04e12, grossProfits: 0.045e12, freeCashflow: -0.01e12, sector: "Power", industry: "Renewable Energy", marketCap: 285000e9, instHolding: 18.5, recommendation: "hold", targetMean: 2200, targetHigh: 2800, targetLow: 1600, analysts: 12 },
  IOC: { pe: 5.8, forwardPE: 5.2, pb: 0.8, eps: 31.9, bookValue: 232, dividendYield: 6.5, payoutRatio: 0.38, beta: 0.85, roe: 13.5, roa: 5.8, debtToEquity: 0.55, revenueGrowth: -8.5, profitMargins: 2.2, operatingMargins: 4.5, currentRatio: 0.85, totalRevenue: 6.55e12, ebitda: 0.32e12, grossProfits: 0.35e12, freeCashflow: 0.05e12, sector: "Energy", industry: "Oil & Gas - Refining", marketCap: 152000e9, instHolding: 52.5, recommendation: "buy", targetMean: 225, targetHigh: 260, targetLow: 180, analysts: 15 },
  PNB: { pe: 10.5, forwardPE: 9.0, pb: 1.5, eps: 14.1, bookValue: 98, dividendYield: 2.0, payoutRatio: 0.20, beta: 1.15, roe: 14.8, roa: 0.8, debtToEquity: 9.5, revenueGrowth: 15.5, profitMargins: 32.5, operatingMargins: 32.5, currentRatio: 0, totalRevenue: 1.15e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Public", marketCap: 168000e9, instHolding: 42.5, recommendation: "hold", targetMean: 170, targetHigh: 200, targetLow: 130, analysts: 18 },
  BANKBARODA: { pe: 8.5, forwardPE: 7.5, pb: 1.2, eps: 37.1, bookValue: 262, dividendYield: 1.5, payoutRatio: 0.12, beta: 1.05, roe: 14.5, roa: 1.2, debtToEquity: 7.2, revenueGrowth: 14.5, profitMargins: 35.8, operatingMargins: 35.8, currentRatio: 0, totalRevenue: 0.82e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Public", marketCap: 135000e9, instHolding: 45.2, recommendation: "buy", targetMean: 350, targetHigh: 400, targetLow: 280, analysts: 20 },
  FEDERALBNK: { pe: 12.5, forwardPE: 10.5, pb: 1.5, eps: 14.4, bookValue: 120, dividendYield: 1.2, payoutRatio: 0.15, beta: 0.98, roe: 12.2, roa: 1.1, debtToEquity: 7.8, revenueGrowth: 18.5, profitMargins: 38.5, operatingMargins: 38.5, currentRatio: 0, totalRevenue: 0.38e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 96000e9, instHolding: 42.5, recommendation: "buy", targetMean: 210, targetHigh: 250, targetLow: 165, analysts: 18 },
  INDUSINDBK: { pe: 12.5, forwardPE: 10.8, pb: 1.5, eps: 126.4, bookValue: 1053, dividendYield: 1.5, payoutRatio: 0.18, beta: 1.18, roe: 12.0, roa: 1.8, debtToEquity: 5.2, revenueGrowth: 8.5, profitMargins: 38.5, operatingMargins: 38.5, currentRatio: 0, totalRevenue: 0.65e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 105000e9, instHolding: 48.5, recommendation: "hold", targetMean: 1750, targetHigh: 2000, targetLow: 1400, analysts: 28 },
  CANBK: { pe: 8.5, forwardPE: 7.5, pb: 1.0, eps: 13.9, bookValue: 118, dividendYield: 2.0, payoutRatio: 0.16, beta: 1.08, roe: 8.5, roa: 0.7, debtToEquity: 8.8, revenueGrowth: 12.5, profitMargins: 30.5, operatingMargins: 30.5, currentRatio: 0, totalRevenue: 1.35e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Public", marketCap: 140000e9, instHolding: 52.8, recommendation: "hold", targetMean: 135, targetHigh: 155, targetLow: 105, analysts: 18 },
  BIOCON: { pe: 38.5, forwardPE: 32.0, pb: 3.2, eps: 9.6, bookValue: 116, dividendYield: 0.5, payoutRatio: 0.18, beta: 0.62, roe: 8.2, roa: 4.5, debtToEquity: 0.35, revenueGrowth: 12.5, profitMargins: 12.8, operatingMargins: 18.5, currentRatio: 1.8, totalRevenue: 0.13e12, ebitda: 0.025e12, grossProfits: 0.04e12, freeCashflow: 0.015e12, sector: "Pharma", industry: "Biopharmaceuticals", marketCap: 55000e9, instHolding: 25.5, recommendation: "hold", targetMean: 420, targetHigh: 480, targetLow: 350, analysts: 18 },
  LUPIN: { pe: 32.5, forwardPE: 28.0, pb: 2.8, eps: 70.3, bookValue: 816, dividendYield: 0.8, payoutRatio: 0.25, beta: 0.65, roe: 8.6, roa: 4.2, debtToEquity: 0.42, revenueGrowth: 8.5, profitMargins: 12.5, operatingMargins: 16.8, currentRatio: 1.8, totalRevenue: 0.25e12, ebitda: 0.05e12, grossProfits: 0.08e12, freeCashflow: 0.03e12, sector: "Pharma", industry: "Pharmaceuticals", marketCap: 88000e9, instHolding: 18.5, recommendation: "hold", targetMean: 2500, targetHigh: 2800, targetLow: 2000, analysts: 22 },
  YESBANK: { pe: 25.5, forwardPE: 20.0, pb: 2.2, eps: 1.1, bookValue: 12.7, dividendYield: 0, payoutRatio: 0, beta: 1.52, roe: 8.5, roa: 0.5, debtToEquity: 8.2, revenueGrowth: 15.5, profitMargins: 28.5, operatingMargins: 28.5, currentRatio: 0, totalRevenue: 0.35e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 98000e9, instHolding: 35.5, recommendation: "hold", targetMean: 32, targetHigh: 38, targetLow: 24, analysts: 12 },
  WELSPUNLIV: { pe: 42.5, forwardPE: 35.0, pb: 5.5, eps: 4.1, bookValue: 32, dividendYield: 0.5, payoutRatio: 0.18, beta: 1.25, roe: 12.8, roa: 6.2, debtToEquity: 0.25, revenueGrowth: 18.5, profitMargins: 5.2, operatingMargins: 7.8, currentRatio: 1.5, totalRevenue: 0.025e12, ebitda: 0.004e12, grossProfits: 0.006e12, freeCashflow: 0.002e12, sector: "Textiles", industry: "Home Textiles", marketCap: 42000e9, instHolding: 15.5, recommendation: "hold", targetMean: 195, targetHigh: 225, targetLow: 155, analysts: 8 },
  JINDALSTEL: { pe: 12.5, forwardPE: 10.0, pb: 1.5, eps: 77.2, bookValue: 644, dividendYield: 1.0, payoutRatio: 0.12, beta: 1.28, roe: 12.0, roa: 4.8, debtToEquity: 0.85, revenueGrowth: 2.5, profitMargins: 5.8, operatingMargins: 8.5, currentRatio: 1.0, totalRevenue: 0.42e12, ebitda: 0.05e12, grossProfits: 0.07e12, freeCashflow: 0.01e12, sector: "Metals", industry: "Steel", marketCap: 85000e9, instHolding: 18.5, recommendation: "hold", targetMean: 1050, targetHigh: 1200, targetLow: 850, analysts: 15 },
  HINDZINC: { pe: 12.5, forwardPE: 10.5, pb: 2.5, eps: 46.4, bookValue: 232, dividendYield: 3.5, payoutRatio: 0.42, beta: 0.72, roe: 20.2, roa: 14.5, debtToEquity: 0.08, revenueGrowth: -5.5, profitMargins: 28.5, operatingMargins: 35.5, currentRatio: 2.5, totalRevenue: 0.11e12, ebitda: 0.05e12, grossProfits: 0.06e12, freeCashflow: 0.03e12, sector: "Metals", industry: "Zinc", marketCap: 115000e9, instHolding: 52.5, recommendation: "buy", targetMean: 650, targetHigh: 720, targetLow: 520, analysts: 15 },
  VEDL: { pe: 6.5, forwardPE: 5.5, pb: 1.2, eps: 73.1, bookValue: 396, dividendYield: 4.5, payoutRatio: 0.28, beta: 1.15, roe: 18.5, roa: 8.2, debtToEquity: 0.55, revenueGrowth: -2.5, profitMargins: 12.5, operatingMargins: 18.5, currentRatio: 1.2, totalRevenue: 0.45e12, ebitda: 0.10e12, grossProfits: 0.12e12, freeCashflow: 0.03e12, sector: "Metals", industry: "Diversified Metals", marketCap: 142000e9, instHolding: 52.5, recommendation: "buy", targetMean: 520, targetHigh: 600, targetLow: 400, analysts: 15 },
  SAIL: { pe: 18.5, forwardPE: 15.0, pb: 1.8, eps: 8.9, bookValue: 92, dividendYield: 2.5, payoutRatio: 0.45, beta: 1.22, roe: 9.8, roa: 4.2, debtToEquity: 0.65, revenueGrowth: -5.5, profitMargins: 3.5, operatingMargins: 6.2, currentRatio: 1.0, totalRevenue: 0.45e12, ebitda: 0.05e12, grossProfits: 0.06e12, freeCashflow: 0.01e12, sector: "Metals", industry: "Steel", marketCap: 55000e9, instHolding: 55.5, recommendation: "hold", targetMean: 185, targetHigh: 220, targetLow: 145, analysts: 12 },
  IDFCFIRSTB: { pe: 42.5, forwardPE: 35.0, pb: 2.5, eps: 4.2, bookValue: 71, dividendYield: 0.5, payoutRatio: 0.25, beta: 1.22, roe: 5.8, roa: 1.5, debtToEquity: 5.5, revenueGrowth: 22.5, profitMargins: 28.5, operatingMargins: 28.5, currentRatio: 0, totalRevenue: 0.18e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Private", marketCap: 72000e9, instHolding: 42.5, recommendation: "hold", targetMean: 95, targetHigh: 110, targetLow: 72, analysts: 15 },
  INDIANB: { pe: 22.5, forwardPE: 19.0, pb: 2.0, eps: 5.3, bookValue: 59, dividendYield: 2.0, payoutRatio: 0.42, beta: 1.05, roe: 8.8, roa: 2.2, debtToEquity: 7.5, revenueGrowth: 12.5, profitMargins: 32.5, operatingMargins: 32.5, currentRatio: 0, totalRevenue: 0.35e12, ebitda: 0, grossProfits: 0, freeCashflow: 0, sector: "Banking", industry: "Banks - Public", marketCap: 72000e9, instHolding: 48.5, recommendation: "hold", targetMean: 165, targetHigh: 190, targetLow: 130, analysts: 12 },
  ADANIENSOL: { pe: 125.0, forwardPE: 85.0, pb: 18.5, eps: 3.0, bookValue: 20, dividendYield: 0, payoutRatio: 0, beta: 1.65, roe: 14.8, roa: 5.5, debtToEquity: 1.25, revenueGrowth: 45.5, profitMargins: 8.5, operatingMargins: 15.5, currentRatio: 0.85, totalRevenue: 0.04e12, ebitda: 0.008e12, grossProfits: 0.009e12, freeCashflow: -0.003e12, sector: "Power", industry: "Solar Energy", marketCap: 85000e9, instHolding: 12.5, recommendation: "hold", targetMean: 150, targetHigh: 180, targetLow: 110, analysts: 8 },
  DELHIVERY: { pe: -1, forwardPE: 85.0, pb: 2.5, eps: -15.2, bookValue: 116, dividendYield: 0, payoutRatio: 0, beta: 1.55, roe: -12.5, roa: -5.5, debtToEquity: 0.15, revenueGrowth: 15.5, profitMargins: -3.5, operatingMargins: -0.5, currentRatio: 1.2, totalRevenue: 0.09e12, ebitda: -0.005e12, grossProfits: 0.02e12, freeCashflow: -0.008e12, sector: "Logistics", industry: "Logistics", marketCap: 48000e9, instHolding: 35.5, recommendation: "hold", targetMean: 500, targetHigh: 600, targetLow: 380, analysts: 15 },
};

// ==================== HTTP HELPER ====================
import https from 'https';

const MAX_RESPONSE_SIZE = 500_000; // 500KB max response
function httpsGet(url: string, timeout = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json,text/html,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        res.resume();
        httpsGet(res.headers.location || '', timeout).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url.split('?')[0]}`));
        return;
      }
      const chunks: Buffer[] = [];
      let totalSize = 0;
      res.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_RESPONSE_SIZE) {
          res.destroy();
          reject(new Error('Response too large'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', (e: Error) => { res.destroy(); reject(e); });
    });
    req.on('error', reject);
    req.setTimeout(timeout, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ==================== CACHING ====================
const quoteCache = new Map<string, { data: LiveQuote; timestamp: number }>();
const histCache = new Map<string, { data: HistoricalDataPoint[]; timestamp: number }>();
const QUOTE_TTL = 10_000; // 10s for real-time data
const HIST_TTL = 30_000; // 30s for historical data

// ==================== SYMBOL HELPERS ====================
function getYahooSymbol(nseSymbol: string): string {
  if (YAHOO_SYMBOL_MAP[nseSymbol]) return YAHOO_SYMBOL_MAP[nseSymbol];
  if (!nseSymbol.includes(".")) return `${nseSymbol}.NS`;
  return nseSymbol;
}

// ==================== CALCULATE MOVING AVERAGES ====================
function calculateSMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}


// ==================== YAHOO V6 QUOTE ENRICHMENT ====================
// Fetches fundamentals (PE, PB, EPS, beta, dividendYield, etc.) from Yahoo v6 quote API
// This works for ALL NSE/BSE stocks, not just the hardcoded FUNDAMENTALS_DB
async function enrichWithYahooQuote(quote: LiveQuote, yahooSymbol: string): Promise<void> {
  try {
    const url = `https://query2.finance.yahoo.com/v6/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}&fields=beta,dividendYield,marketCap,priceToBook,trailingEps,forwardPE,trailingPE,fiftyTwoWeekHigh,fiftyTwoWeekLow,fiftyDayAverage,twoHundredDayAverage,regularMarketVolume,averageDailyVolume3Month,earningsTimestamp`;
    const body = await httpsGet(url);
    const data = JSON.parse(body);
    const result = data?.quoteResponse?.result?.[0];
    if (!result) return;

    // Only enrich if the fundamentals from DB are missing
    if (quote.pe == null && result.trailingPE != null) quote.pe = result.trailingPE;
    if (quote.forwardPE == null && result.forwardPE != null) quote.forwardPE = result.forwardPE;
    if (quote.pb == null && result.priceToBook != null) quote.pb = result.priceToBook;
    if (quote.eps == null && result.trailingEps != null) quote.eps = result.trailingEps;
    if (quote.beta == null && result.beta != null) quote.beta = result.beta;
    if (quote.dividendYield == null && result.dividendYield != null) quote.dividendYield = result.dividendYield * 100; // Yahoo returns decimal (0.01 = 1%)
    
    // Financial data (revenue, EBITDA, margins, etc.) from Yahoo quote
    // The quote endpoint includes financialData fields alongside defaultKeyStatistics
    if (result.financialData) {
      const fd = result.financialData;
      if (quote.totalRevenue == null && fd.totalRevenue?.raw) quote.totalRevenue = fd.totalRevenue.raw;
      if (quote.ebitda == null && fd.ebitda?.raw) quote.ebitda = fd.ebitda.raw;
      if (quote.grossProfits == null && fd.grossProfits?.raw) quote.grossProfits = fd.grossProfits.raw;
      if (quote.freeCashflow == null && fd.freeCashflow?.raw) quote.freeCashflow = fd.freeCashflow.raw;
      if (quote.profitMargins == null && fd.profitMargins?.raw) quote.profitMargins = fd.profitMargins.raw * 100; // Yahoo returns decimal
      if (quote.operatingMargins == null && fd.operatingMargins?.raw) quote.operatingMargins = fd.operatingMargins.raw * 100;
      if (quote.revenueGrowth == null && fd.revenueGrowth?.raw) quote.revenueGrowth = fd.revenueGrowth.raw * 100;
      if (quote.currentRatio == null && fd.currentRatio?.raw) quote.currentRatio = fd.currentRatio.raw;
      if (quote.debtToEquity == null && fd.debtToEquity?.raw) quote.debtToEquity = fd.debtToEquity.raw;
      if (quote.roe == null && fd.returnOnEquity?.raw) quote.roe = fd.returnOnEquity.raw * 100;
      if (quote.roa == null && fd.returnOnAssets?.raw) quote.roa = fd.returnOnAssets.raw * 100;
    }

    // Market cap from Yahoo is more reliable for all stocks
    if (result.marketCap != null && (quote.marketCap === 0 || !quote.marketCap)) {
      quote.marketCap = result.marketCap;
    }

    // 52-week range from Yahoo
    if (result.fiftyTwoWeekHigh != null && quote.high52w === 0) quote.high52w = result.fiftyTwoWeekHigh;
    if (result.fiftyTwoWeekLow != null && quote.low52w === 0) quote.low52w = result.fiftyTwoWeekLow;

    // Moving averages from Yahoo
    if (result.fiftyDayAverage != null && quote.fiftyDMA === null) quote.fiftyDMA = Math.round(result.fiftyDayAverage * 100) / 100;
    if (result.twoHundredDayAverage != null && quote.twoHundredDMA === null) quote.twoHundredDMA = Math.round(result.twoHundredDayAverage * 100) / 100;
    if (quote.fiftyDMA && quote.price) quote.percentAbove50DMA = ((quote.price - quote.fiftyDMA) / quote.fiftyDMA) * 100;
    if (quote.twoHundredDMA && quote.price) quote.percentAbove200DMA = ((quote.price - quote.twoHundredDMA) / quote.twoHundredDMA) * 100;

    // Volume
    if (result.regularMarketVolume != null && quote.volume === 0) quote.volume = result.regularMarketVolume;
    if (result.averageDailyVolume3Month != null && quote.avgVolume === 0) quote.avgVolume = result.averageDailyVolume3Month;
    if (quote.avgVolume > 0) quote.volumeRatio = Math.round((quote.volume / quote.avgVolume) * 100) / 100;
  } catch {
    // Silently fail — enrichment is best-effort
  }
}

// ==================== LIVE QUOTE ====================
export async function getLiveQuote(nseSymbol: string): Promise<LiveQuote> {
  const cacheKey = nseSymbol;
  const cached = quoteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < QUOTE_TTL) {
    return cached.data;
  }

  const yahooSymbol = getYahooSymbol(nseSymbol);
  const isIndex = yahooSymbol.startsWith("^");

  // Fetch price data from chart API
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1d&interval=5m&includePrePost=false`;
  const body = await httpsGet(chartUrl);
  const data = JSON.parse(body);
  const result = data.chart?.result?.[0];
  const meta = result?.meta;

  if (!meta) throw new Error(`No data for ${nseSymbol}`);

  const price = meta.regularMarketPrice || 0;
  const prevClose = meta.previousClose || meta.chartPreviousClose || 0;
  const change = price - prevClose;
  const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // Get fundamentals from our database
  const fund = FUNDAMENTALS_DB[nseSymbol] || {};

  // Get sector/industry from fundamentals
  const sector = fund.sector || "";
  const industry = fund.industry || "";

  const quote: LiveQuote = {
    symbol: nseSymbol,
    name: meta.shortName || nseSymbol,
    longName: meta.longName || meta.shortName || nseSymbol,
    sector,
    industry,
    exchange: meta.fullExchangeName || meta.exchangeName || "NSE",
    currency: meta.currency || "INR",
    type: isIndex ? "index" : "equity",

    price: Math.round(price * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    prevClose: Math.round(prevClose * 100) / 100,
    open: Math.round((meta.chartPreviousClose || prevClose) * 100) / 100,
    dayHigh: Math.round((meta.regularMarketDayHigh || price) * 100) / 100,
    dayLow: Math.round((meta.regularMarketDayLow || price) * 100) / 100,

    volume: meta.regularMarketVolume || 0,
    avgVolume: fund.marketCap ? Math.round((fund.marketCap / price) * 0.005) : 0,
    volumeRatio: 1.0,

    marketCap: fund.marketCap || (isIndex ? 0 : price * 1e9),
    pe: fund.pe ?? null,
    forwardPE: fund.forwardPE ?? null,
    pb: fund.pb ?? null,
    eps: fund.eps ?? null,
    bookValue: fund.bookValue ?? null,
    dividendYield: fund.dividendYield ?? null,
    payoutRatio: fund.payoutRatio ?? null,

    high52w: Math.round((meta.fiftyTwoWeekHigh || 0) * 100) / 100,
    low52w: Math.round((meta.fiftyTwoWeekLow || 0) * 100) / 100,
    percentFrom52wHigh: meta.fiftyTwoWeekHigh ? ((price - meta.fiftyTwoWeekHigh) / meta.fiftyTwoWeekHigh) * 100 : 0,
    percentFrom52wLow: meta.fiftyTwoWeekLow ? ((price - meta.fiftyTwoWeekLow) / meta.fiftyTwoWeekLow) * 100 : 0,

    fiftyDMA: null,
    twoHundredDMA: null,
    percentAbove50DMA: null,
    percentAbove200DMA: null,

    beta: fund.beta ?? null,
    roe: fund.roe ?? null,
    roa: fund.roa ?? null,
    debtToEquity: fund.debtToEquity ?? null,
    revenueGrowth: fund.revenueGrowth ?? null,
    profitMargins: fund.profitMargins ?? null,
    operatingMargins: fund.operatingMargins ?? null,
    currentRatio: fund.currentRatio ?? null,
    totalRevenue: fund.totalRevenue ?? null,
    ebitda: fund.ebitda ?? null,
    grossProfits: fund.grossProfits ?? null,
    freeCashflow: fund.freeCashflow ?? null,

    recommendation: fund.recommendation || null,
    targetHigh: fund.targetHigh ?? null,
    targetLow: fund.targetLow ?? null,
    targetMean: fund.targetMean ?? null,
    targetMedian: fund.targetMedian ?? null,
    analysts: fund.analysts ?? null,

    instHolding: fund.instHolding ?? null,
    insiderHolding: fund.insiderHolding ?? null,

    marketState: "REGULAR",
    lastUpdated: new Date().toISOString(),
  };

  // Enrich with Yahoo v6 quote fundamentals (PE, PB, EPS, beta, etc.)
  // This fills in missing fundamentals for stocks not in the hardcoded FUNDAMENTALS_DB
  await enrichWithYahooQuote(quote, yahooSymbol);

  quoteCache.set(cacheKey, { data: quote, timestamp: Date.now() });
  return quote;
}

// ==================== HISTORICAL DATA ====================
export async function getHistoricalData(
  nseSymbol: string,
  days: number = 200
): Promise<HistoricalDataPoint[]> {
  const cacheKey = `${nseSymbol}_${days}`;
  const cached = histCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HIST_TTL) {
    return cached.data;
  }

  const yahooSymbol = getYahooSymbol(nseSymbol);
  const period1 = Math.floor(new Date(Date.now() - Math.ceil(days * 1.5) * 86400000).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=9999999999&interval=1d`;

  const body = await httpsGet(url);
  const data = JSON.parse(body);
  const result = data.chart?.result?.[0];

  if (!result) throw new Error(`No historical data for ${nseSymbol}`);

  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};

  const points: HistoricalDataPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quotes.close?.[i];
    const open = quotes.open?.[i];
    const high = quotes.high?.[i];
    const low = quotes.low?.[i];
    const vol = quotes.volume?.[i];
    if (close != null && close > 0) {
      points.push({
        date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
        open: Math.round((open || close) * 100) / 100,
        high: Math.round((high || close) * 100) / 100,
        low: Math.round((low || close) * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: vol || 0,
      });
    }
  }

  const finalData = points.slice(-days);

  // Validate data freshness - ensure we have recent data
  if (finalData.length > 0) {
    const lastDate = new Date(finalData[finalData.length - 1].date);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
    // If last data point is more than 5 days old (accounting for weekends), log warning
    if (daysDiff > 5) {
      console.warn(`[market-data] Data for ${nseSymbol} is ${daysDiff} days old. Last: ${finalData[finalData.length - 1].date}`);
    }
  }

  // Update moving averages on cached quote
  const closes = finalData.map(d => d.close);
  const cachedQuote = quoteCache.get(nseSymbol);
  if (cachedQuote) {
    const dma50 = calculateSMA(closes, 50);
    const dma200 = calculateSMA(closes, 200);
    cachedQuote.data.fiftyDMA = dma50 ? Math.round(dma50 * 100) / 100 : null;
    cachedQuote.data.twoHundredDMA = dma200 ? Math.round(dma200 * 100) / 100 : null;
    cachedQuote.data.percentAbove50DMA = dma50 ? ((cachedQuote.data.price - dma50) / dma50) * 100 : null;
    cachedQuote.data.percentAbove200DMA = dma200 ? ((cachedQuote.data.price - dma200) / dma200) * 100 : null;
  }

  histCache.set(cacheKey, { data: finalData, timestamp: Date.now() });
  return finalData;
}

// ==================== SECTOR PEERS ====================
export async function getSectorPeers(
  nseSymbol: string,
  sector: string
): Promise<PeerData[]> {
  let peerSymbols: string[] = [];
  for (const [sec, symbols] of Object.entries(SECTOR_PEERS)) {
    if (
      sector.toLowerCase().includes(sec.toLowerCase()) ||
      sec.toLowerCase().includes(sector.toLowerCase())
    ) {
      peerSymbols = symbols.filter((s) => s !== nseSymbol).slice(0, 10);
      break;
    }
  }

  if (peerSymbols.length < 2) return [];

  const allPeers: PeerData[] = [];
  // Fetch in batches of 3 to avoid rate limits
  for (let i = 0; i < peerSymbols.length; i += 3) {
    const batch = peerSymbols.slice(i, i + 3);
    const results = await Promise.allSettled(batch.map((s) => getLiveQuote(s)));
    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        const q = results[j].value;
        allPeers.push({
          symbol: q.symbol,
          name: q.name,
          price: q.price,
          changePct: q.changePct,
          marketCap: q.marketCap,
          pe: q.pe,
          pb: q.pb,
          divYield: q.dividendYield,
          roe: q.roe,
          revenueGrowth: q.revenueGrowth,
        });
      }
    }
  }

  return allPeers;
}

// ==================== MARKET OVERVIEW ====================
export async function getMarketOverview(): Promise<{
  nifty50: LiveQuote;
  bankNifty: LiveQuote;
  niftyIT: LiveQuote;
  indiaVix: LiveQuote;
  topGainers: LiveQuote[];
  topLosers: LiveQuote[];
}> {
  const [nifty50, bankNifty, niftyIT, indiaVix] = await Promise.all([
    getLiveQuote("NIFTY"),
    getLiveQuote("BANKNIFTY"),
    getLiveQuote("NIFTYIT"),
    getLiveQuote("INDIAVIX"),
  ]);

  const hotStocks = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "SBIN", "TATAMOTORS", "LT", "AXISBANK", "BAJFINANCE",
    "SUNPHARMA", "MARUTI", "HCLTECH", "ADANIENT", "TATASTEEL",
    "BHARTIARTL", "WIPRO", "NTPC", "POWERGRID", "TITAN",
  ];

  const quotes = await Promise.allSettled(hotStocks.map((s) => getLiveQuote(s)));
  const validQuotes = quotes
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<LiveQuote>).value);

  const sorted = [...validQuotes].sort((a, b) => b.changePct - a.changePct);
  const topGainers = sorted.slice(0, 5);
  const topLosers = sorted.slice(-5).reverse();

  return { nifty50, bankNifty, niftyIT, indiaVix, topGainers, topLosers };
}

// ==================== SCREENER LIGHTWEIGHT ====================
// Single Yahoo API call per stock — returns both price quote AND historical OHLCV
// Used by /api/screener to scan all stocks efficiently (no enrichWithYahooQuote)
export interface ScreenerStockData {
  price: number;
  change: number;
  changePct: number;
  volume: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  historical: HistoricalDataPoint[];
}

export async function getScreenerData(nseSymbol: string, days: number = 100): Promise<ScreenerStockData | null> {
  try {
    const yahooSymbol = getYahooSymbol(nseSymbol);
    const period1 = Math.floor(new Date(Date.now() - Math.ceil(days * 1.5) * 86400000).getTime() / 1000);
    // Single chart API call gets both current price (in meta) and historical OHLCV
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=9999999999&interval=1d`;
    const body = await httpsGet(url, 10000);
    const data = JSON.parse(body);
    const result = data.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta) return null;

    const price = meta.regularMarketPrice || 0;
    const prevClose = meta.previousClose || meta.chartPreviousClose || 0;
    const change = price - prevClose;
    const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Extract historical OHLCV from the same response
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const historical: HistoricalDataPoint[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const close = quotes.close?.[i];
      if (close != null && close > 0) {
        historical.push({
          date: new Date(timestamps[i] * 1000).toISOString().split("T")[0],
          open: Math.round((quotes.open?.[i] || close) * 100) / 100,
          high: Math.round((quotes.high?.[i] || close) * 100) / 100,
          low: Math.round((quotes.low?.[i] || close) * 100) / 100,
          close: Math.round(close * 100) / 100,
          volume: quotes.volume?.[i] || 0,
        });
      }
    }

    // Need at least 50 data points for reliable signal generation
    if (historical.length < 50) return null;

    const fund = FUNDAMENTALS_DB[nseSymbol] || {};

    return {
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      volume: meta.regularMarketVolume || 0,
      dayHigh: Math.round((meta.regularMarketDayHigh || price) * 100) / 100,
      dayLow: Math.round((meta.regularMarketDayLow || price) * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      historical: historical.slice(-days),
      // Attach fundamentals from DB for PE/marketCap display
      _pe: fund.pe ?? null,
      _marketCap: fund.marketCap || 0,
    } as any;
  } catch {
    return null;
  }
}