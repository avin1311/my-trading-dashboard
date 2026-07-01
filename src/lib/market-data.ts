// Real-time market data service using Yahoo Finance API
// Provides live quotes, historical data, and fundamentals for NSE instruments

import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Map NSE symbols to Yahoo Finance format
// NSE equities: SYMBOL.NS, NSE indices: ^SYMBOL
const YAHOO_SYMBOL_MAP: Record<string, string> = {
  // Indices
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  NIFTYIT: "^CNXIT",
  NIFTYNXT50: "^NSMIDCP", // Approximate
  NIFTYFIN: "^CNXFIN",
  NIFTYMIDCAP: "^CNXMIDCAP", // Approximate
  NIFTYSMLCAP: "^CNXSC", // Approximate
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

// F&O stocks with their sectors for peer comparison
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
  "Power": ["NTPC", "POWERGRID", "TATAPOWER", "ADANIGREEN", "ADANIENSOL", "SUZLON"],
  "Volatility Index": ["INDIAVIX"],
  Index: ["NIFTY", "BANKNIFTY"],
};

export interface LiveQuote {
  // Identity
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
  volumeRatio: number; // volume / avgVolume

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

  // Moving Averages
  fiftyDMA: number | null;
  twoHundredDMA: number | null;
  percentAbove50DMA: number | null;
  percentAbove200DMA: number | null;

  // Fundamentals
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

function getYahooSymbol(nseSymbol: string): string {
  // Check direct map first (for indices)
  if (YAHOO_SYMBOL_MAP[nseSymbol]) return YAHOO_SYMBOL_MAP[nseSymbol];

  // Equity symbols: append .NS
  if (!nseSymbol.includes(".")) return `${nseSymbol}.NS`;
  return nseSymbol;
}

export async function getLiveQuote(nseSymbol: string): Promise<LiveQuote> {
  const yahooSymbol = getYahooSymbol(nseSymbol);
  const q = await yf.quote(yahooSymbol);
  const isIndex = yahooSymbol.startsWith("^");
  const price = q.regularMarketPrice || 0;

  return {
    symbol: nseSymbol,
    name: q.shortName || nseSymbol,
    longName: q.longName || q.shortName || nseSymbol,
    sector: q.sector || "",
    industry: q.industry || "",
    exchange: q.exchange || "NSE",
    currency: q.currency || "INR",
    type: isIndex ? "index" : "equity",

    price,
    change: q.regularMarketChange || 0,
    changePct: q.regularMarketChangePercent || 0,
    prevClose: q.regularMarketPreviousClose || 0,
    open: q.regularMarketOpen || 0,
    dayHigh: q.regularMarketDayHigh || 0,
    dayLow: q.regularMarketDayLow || 0,

    volume: q.regularMarketVolume || 0,
    avgVolume: q.averageDailyVolume3Month || 0,
    volumeRatio: q.averageDailyVolume3Month
      ? (q.regularMarketVolume || 0) / q.averageDailyVolume3Month
      : 0,

    marketCap: q.marketCap || 0,
    pe: q.trailingPE ?? null,
    forwardPE: q.forwardPE ?? null,
    pb: q.priceToBook ?? null,
    eps: q.epsTrailingTwelveMonths ?? null,
    bookValue: q.bookValue ?? null,
    dividendYield: q.dividendYield != null ? q.dividendYield * 100 : null,
    payoutRatio: q.payoutRatio ?? null,

    high52w: q.fiftyTwoWeekHigh || 0,
    low52w: q.fiftyTwoWeekLow || 0,
    percentFrom52wHigh: q.fiftyTwoWeekHigh
      ? ((price - q.fiftyTwoWeekHigh) / q.fiftyTwoWeekHigh) * 100
      : 0,
    percentFrom52wLow: q.fiftyTwoWeekLow
      ? ((price - q.fiftyTwoWeekLow) / q.fiftyTwoWeekLow) * 100
      : 0,

    fiftyDMA: q.fiftyDayAverage ?? null,
    twoHundredDMA: q.twoHundredDayAverage ?? null,
    percentAbove50DMA: q.fiftyDayAverage
      ? ((price - q.fiftyDayAverage) / q.fiftyDayAverage) * 100
      : null,
    percentAbove200DMA: q.twoHundredDayAverage
      ? ((price - q.twoHundredDayAverage) / q.twoHundredDayAverage) * 100
      : null,

    beta: q.beta ?? null,
    roe: q.returnOnEquity != null ? q.returnOnEquity * 100 : null,
    roa: q.returnOnAssets != null ? q.returnOnAssets * 100 : null,
    debtToEquity: q.debtToEquity ?? null,
    revenueGrowth: q.revenueGrowth != null ? q.revenueGrowth * 100 : null,
    profitMargins: q.profitMargins != null ? q.profitMargins * 100 : null,
    operatingMargins: q.operatingMargins != null ? q.operatingMargins * 100 : null,
    currentRatio: q.currentRatio ?? null,
    totalRevenue: q.totalRevenue ?? null,
    ebitda: q.ebitda ?? null,
    grossProfits: q.grossProfits ?? null,
    freeCashflow: q.freeCashflow ?? null,

    recommendation: q.recommendationKey || null,
    targetHigh: q.targetHighPrice ?? null,
    targetLow: q.targetLowPrice ?? null,
    targetMean: q.targetMeanPrice ?? null,
    targetMedian: q.targetMedianPrice ?? null,
    analysts: q.numberOfAnalystOpinions ?? null,

    instHolding: q.heldPercentInstitutions != null ? q.heldPercentInstitutions * 100 : null,
    insiderHolding: q.heldPercentInsiders != null ? q.heldPercentInsiders * 100 : null,

    marketState: q.marketState || "UNKNOWN",
    lastUpdated: new Date().toISOString(),
  };
}

export async function getHistoricalData(
  nseSymbol: string,
  days: number = 200
): Promise<HistoricalDataPoint[]> {
  const yahooSymbol = getYahooSymbol(nseSymbol);
  const period1 = new Date();
  period1.setDate(period1.getDate() - Math.ceil(days * 1.5));

  const result = await yf.chart(yahooSymbol, {
    period1: period1.toISOString().split("T")[0],
    interval: "1d",
  });

  return (result.quotes || [])
    .filter((q) => q.close != null && q.volume != null)
    .map((q) => ({
      date: q.date.toISOString().split("T")[0],
      open: Math.round(q.open * 100) / 100,
      high: Math.round(q.high * 100) / 100,
      low: Math.round(q.low * 100) / 100,
      close: Math.round(q.close * 100) / 100,
      volume: q.volume || 0,
    }))
    .slice(-days);
}

export async function getSectorPeers(
  nseSymbol: string,
  sector: string
): Promise<PeerData[]> {
  // Find peer symbols for the sector
  let peerSymbols: string[] = [];
  for (const [sec, symbols] of Object.entries(SECTOR_PEERS)) {
    if (
      sector.toLowerCase().includes(sec.toLowerCase()) ||
      sec.toLowerCase().includes(sector.toLowerCase())
    ) {
      peerSymbols = symbols.filter((s) => s !== nseSymbol).slice(0, 12);
      break;
    }
  }

  // Fallback: use same-sector stocks from our list
  if (peerSymbols.length < 3) {
    return [];
  }

  // Fetch quotes for peers in parallel (batch of 5 at a time)
  const allPeers: PeerData[] = [];
  for (let i = 0; i < peerSymbols.length; i += 5) {
    const batch = peerSymbols.slice(i, i + 5);
    const quotes = await Promise.allSettled(
      batch.map((s) => yf.quote(getYahooSymbol(s)))
    );
    for (let j = 0; j < quotes.length; j++) {
      if (quotes[j].status === "fulfilled") {
        const q = quotes[j].value;
        allPeers.push({
          symbol: peerSymbols[i + j],
          name: q.shortName || peerSymbols[i + j],
          price: q.regularMarketPrice || 0,
          changePct: q.regularMarketChangePercent || 0,
          marketCap: q.marketCap || 0,
          pe: q.trailingPE ?? null,
          pb: q.priceToBook ?? null,
          divYield: q.dividendYield != null ? q.dividendYield * 100 : null,
          roe: q.returnOnEquity != null ? q.returnOnEquity * 100 : null,
          revenueGrowth: q.revenueGrowth != null ? q.revenueGrowth * 100 : null,
        });
      }
    }
  }

  return allPeers;
}

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

  // Get top gainers/losers from a subset of Nifty 50
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

  const sorted = [...validQuotes].sort(
    (a, b) => b.changePct - a.changePct
  );
  const topGainers = sorted.slice(0, 5);
  const topLosers = sorted.slice(-5).reverse();

  return { nifty50, bankNifty, niftyIT, indiaVix, topGainers, topLosers };
}