// NSE Stock data generator with realistic OHLCV data for Indian stocks

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
}

export const NSE_STOCKS: StockInfo[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 2950, volatility: 0.018 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", basePrice: 4150, volatility: 0.015 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", basePrice: 1680, volatility: 0.016 },
  { symbol: "INFY", name: "Infosys", sector: "IT", basePrice: 1580, volatility: 0.019 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", basePrice: 1280, volatility: 0.017 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", basePrice: 2580, volatility: 0.012 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 825, volatility: 0.022 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", basePrice: 1620, volatility: 0.020 },
  { symbol: "ITC", name: "ITC Limited", sector: "FMCG", basePrice: 465, volatility: 0.014 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", basePrice: 1790, volatility: 0.017 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", basePrice: 3650, volatility: 0.018 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", basePrice: 1175, volatility: 0.019 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", basePrice: 950, volatility: 0.025 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", basePrice: 530, volatility: 0.020 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", basePrice: 1780, volatility: 0.018 },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals", basePrice: 155, volatility: 0.026 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", basePrice: 3200, volatility: 0.030 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", basePrice: 12450, volatility: 0.016 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT", basePrice: 1750, volatility: 0.019 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance", basePrice: 7350, volatility: 0.022 },
];

// Seeded random number generator for consistent data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export function generateStockData(
  stock: StockInfo,
  days: number = 200
): OHLCV[] {
  const rand = seededRandom(
    stock.symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) + 42
  );

  const data: OHLCV[] = [];
  let price = stock.basePrice * (0.85 + rand() * 0.15);
  let trend = 0;
  let trendDuration = 0;

  const startDate = new Date("2025-10-01");

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    // Skip weekends (NSE is closed on Sat/Sun)
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

    // Trend changes
    if (trendDuration <= 0) {
      trend = (rand() - 0.48) * stock.volatility;
      trendDuration = Math.floor(3 + rand() * 12);
    }
    trendDuration--;

    // Intraday movement
    const dailyReturn = trend + (rand() - 0.5) * stock.volatility * 0.8;

    const open = price;
    const close = price * (1 + dailyReturn);
    const high = Math.max(open, close) * (1 + rand() * stock.volatility * 0.5);
    const low = Math.min(open, close) * (1 - rand() * stock.volatility * 0.5);

    // Round to 2 decimal places (NSE tick)
    const roundedOpen = Math.round(open * 100) / 100;
    const roundedClose = Math.round(close * 100) / 100;
    const roundedHigh = Math.round(high * 100) / 100;
    const roundedLow = Math.round(low * 100) / 100;

    // Volume with some randomness (in lakhs)
    const baseVolume = 500000 + rand() * 2000000;
    const volume = Math.round(baseVolume * (1 + Math.abs(dailyReturn) * 15));

    const dateStr = currentDate.toISOString().split("T")[0];

    data.push({
      date: dateStr,
      open: roundedOpen,
      high: roundedHigh,
      low: roundedLow,
      close: roundedClose,
      volume,
    });

    price = roundedClose;
  }

  return data;
}