// NSE Complete Stock & Options Data
// Data sourced from Yahoo Finance via market-data.ts
// This file provides the stock catalog (static list of instruments)

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
  type: "equity" | "index" | "option";
  underlying?: string;
  strikePrice?: number;
  optionType?: "CE" | "PE";
  expiry?: string;
  lotSize?: number;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ==================== EQUITIES ====================
export const ALL_EQUITIES: StockInfo[] = [
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy", basePrice: 2950, volatility: 0.018, lotSize: 250 },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "IT", basePrice: 4150, volatility: 0.015, lotSize: 150 },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Banking", basePrice: 1680, volatility: 0.016, lotSize: 550 },
  { symbol: "INFY", name: "Infosys", sector: "IT", basePrice: 1580, volatility: 0.019, lotSize: 600 },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Banking", basePrice: 1280, volatility: 0.017, lotSize: 700 },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", basePrice: 2580, volatility: 0.012, lotSize: 300 },
  { symbol: "SBIN", name: "State Bank of India", sector: "Banking", basePrice: 825, volatility: 0.022, lotSize: 750 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", basePrice: 1620, volatility: 0.020, lotSize: 475 },
  { symbol: "ITC", name: "ITC Limited", sector: "IT", basePrice: 530, volatility: 0.020, lotSize: 1500 },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", basePrice: 1790, volatility: 0.017, lotSize: 400 },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Infrastructure", basePrice: 3650, volatility: 0.018, lotSize: 150 },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Banking", basePrice: 1175, volatility: 0.019, lotSize: 900 },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Auto", basePrice: 950, volatility: 0.025, lotSize: 550 },
  { symbol: "WIPRO", name: "Wipro", sector: "IT", basePrice: 530, volatility: 0.020, lotSize: 1500 },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", basePrice: 1780, volatility: 0.018, lotSize: 700 },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals", basePrice: 155, volatility: 0.026, lotSize: 3000 },
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", basePrice: 3200, volatility: 0.030, lotSize: 250 },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Auto", basePrice: 12450, volatility: 0.016, lotSize: 50 },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "IT", basePrice: 1750, volatility: 0.019, lotSize: 500 },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Finance", basePrice: 7350, volatility: 0.022, lotSize: 125 },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer", basePrice: 2980, volatility: 0.017, lotSize: 200 },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp", sector: "Energy", basePrice: 285, volatility: 0.023, lotSize: 1800 },
  { symbol: "TITAN", name: "Nestle India", sector: "FMCG", basePrice: 2550, volatility: 0.013, lotSize: 50 },
  { symbol: "NTPC", name: "NTPC Limited", sector: "Power", basePrice: 420, volatility: 0.021, lotSize: 1500 },
  { symbol: "POWERGRID", name: "Power Grid Corp", sector: "Power", basePrice: 325, volatility: 0.018, lotSize: 2500 },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG", basePrice: 1250, volatility: 0.016, lotSize: 575 },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Consumer", basePrice: 495, volatility: 0.024, lotSize: 1400 },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals", basePrice: 655, volatility: 0.025, lotSize: 1350 },
  { symbol: "DIVISLAB", name: "Divi's Laboratories", sector: "Pharma", basePrice: 6100, volatility: 0.020, lotSize: 700 },
  { symbol: "DRREDDY", name: "Dr. Reddy's Labs", sector: "Pharma", basePrice: 6780, volatility: 0.019, lotSize: 125 },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Finance", basePrice: 1740, volatility: 0.021, lotSize: 125 },
  { symbol: "CIPLA", name: "Cipla", sector: "Pharma", basePrice: 1580, volatility: 0.017, lotSize: 500 },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Auto", basePrice: 4950, volatility: 0.020, lotSize: 150 },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Cement", basePrice: 2750, volatility: 0.019, lotSize: 300 },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto", basePrice: 5250, volatility: 0.018, lotSize: 100 },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", basePrice: 6850, volatility: 0.020, lotSize: 50 },
  { symbol: "BPCL", name: "Bharat Petroleum", sector: "Energy", basePrice: 635, volatility: 0.022, lotSize: 900 },
  { symbol: "BRITANNIA", name: "Britannia Industries", sector: "FMCG", basePrice: 5880, volatility: 0.014, lotSize: 50 },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Insurance", basePrice: 685, volatility: 0.018, lotSize: 700 },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking", basePrice: 82, volatility: 0.025, lotSize: 10000 },
  { symbol: "IOC", name: "Indian Oil Corp", sector: "Energy", basePrice: 185, volatility: 0.020, lotSize: 3000 },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals", basePrice: 985, volatility: 0.024, lotSize: 600 },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Auto", basePrice: 2780, volatility: 0.021, lotSize: 250 },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Insurance", basePrice: 1810, volatility: 0.018, lotSize: 350 },
  { symbol: "TRENT", name: "Trent Limited", sector: "Retail", basePrice: 7650, volatility: 0.024, lotSize: 125 },
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Infrastructure", basePrice: 1470, volatility: 0.020, lotSize: 500 },
  { symbol: "COALINDIA", name: "Coal India", sector: "Mining", basePrice: 510, volatility: 0.021, lotSize: 1600 },
  { symbol: "WELSPUNLIV", name: "Welspun Living", sector: "Textiles", basePrice: 175, volatility: 0.028, lotSize: 4000 },
  { symbol: "ZOMATO", name: "Zomato", sector: "Internet", basePrice: 285, volatility: 0.030, lotSize: 500 },
  { symbol: "PAYTM", name: "One97 Communications", sector: "Fintech", basePrice: 485, volatility: 0.035, lotSize: 1100 },
  { symbol: "IRFC", name: "Indian Railway Finance", sector: "Finance", basePrice: 195, volatility: 0.026, lotSize: 5000 },
  { symbol: "RVNL", name: "Rail Vikas Nigam", sector: "Infrastructure", basePrice: 390, volatility: 0.032, lotSize: 3000 },
  { symbol: "TATAPOWER", name: "Tata Power", sector: "Power", basePrice: 495, volatility: 0.024, lotSize: 3000 },
  { symbol: "DIXON", name: "Dixon Technologies", sector: "Electronics", basePrice: 16250, volatility: 0.032, lotSize: 25 },
  { symbol: "BAJAJAUTO", name: "Bajaj Auto", sector: "Auto", basePrice: 10500, volatility: 0.018, lotSize: 75 },
  { symbol: "PIDILITIND", name: "IDFC First Bank", sector: "Banking", basePrice: 82, volatility: 0.025, lotSize: 10000 },
  { symbol: "ADANIGREEN", name: "Adani Green Energy", sector: "Power", basePrice: 1850, volatility: 0.030, lotSize: 500 },
  { symbol: "NYKAA", name: "FSN E-Commerce (Nykaa)", sector: "E-commerce", basePrice: 210, volatility: 0.030, lotSize: 2700 },
  { symbol: "DLF", name: "DLF Limited", sector: "Real Estate", basePrice: 920, volatility: 0.024, lotSize: 750 },
  { symbol: "GODREJPROP", name: "Godrej Properties", sector: "Real Estate", basePrice: 2750, volatility: 0.025, lotSize: 250 },
  { symbol: "SIEMENS", name: "Siemens India", sector: "Capital Goods", basePrice: 8250, volatility: 0.021, lotSize: 75 },
  { symbol: "ABB", name: "ABB India", sector: "Capital Goods", basePrice: 7350, volatility: 0.020, lotSize: 75 },
  { symbol: "TVSMOTOR", name: "TVS Motor Company", sector: "Auto", basePrice: 2480, volatility: 0.022, lotSize: 300 },
  { symbol: "MRF", name: "MRF Tyres", sector: "Auto Ancillary", basePrice: 42500, volatility: 0.019, lotSize: 10 },
  { symbol: "BOSCHLTD", name: "Bosch Ltd", sector: "Auto Ancillary", basePrice: 34500, volatility: 0.018, lotSize: 15 },
  { symbol: "VBL", name: "Varun Beverages", sector: "FMCG", basePrice: 495, volatility: 0.025, lotSize: 1000 },
  { symbol: "LAURUSLABS", name: "Laurus Labs", sector: "Pharma", basePrice: 590, volatility: 0.026, lotSize: 1500 },
  { symbol: "PERSISTENT", name: "Persistent Systems", sector: "IT", basePrice: 6800, volatility: 0.021, lotSize: 100 },
  },
];

// ==================== NSE INDICES ====================
export const ALL_INDICES: StockInfo[] = [
  { symbol: "NIFTY", name: "NIFTY 50", sector: "Index", basePrice: 24580, volatility: 0.012, lotSize: 25 },
  { symbol: "BANKNIFTY", name: "NIFTY BANK", sector: "Index", basePrice: 52800, volatility: 0.015, lotSize: 15 },
  { symbol: "NIFTYIT", name: "NIFTY IT", sector: "Index", basePrice: 38500, volatility: 0.016, lotSize: 50 },
  { symbol: "NIFTYNXT50", name: "NIFTY NEXT 50", sector: "Index", basePrice: 62450, volatility: 0.014, lotSize: 25 },
  { symbol: "NIFTYFIN", name: "NIFTY FINANCIAL SERVICES", sector: "Index", basePrice: 24300, volatility: 0.014, lotSize: 25 },
  { symbol: "NIFTYMIDCAP", name: "NIFTY MIDCAP 100", sector: "Index", basePrice: 58200, volatility: 0.015, lotSize: 50 },
  { symbol: "NIFTYSMLCAP", name: "NIFTY SMALLCAP 100", sector: "Index", basePrice: 18400, volatility: 0.016, lotSize: 50 },
  { symbol: "NIFTYPHARMA", name: "NIFTY PHARMA", sector: "Index", basePrice: 19700, volatility: 0.015, lotSize: 50 },
  { symbol: "NIFTYAUTO", name: "NIFTY AUTO", sector: "Index", basePrice: 23200, volatility: 0.016, lotSize: 50 },
  { symbol: "NIFTYMETAL", name: "NIFTY METAL", sector: "Index", basePrice: 9850, volatility: 0.018, lotSize: 50 },
  { symbol: "NIFTYENERGY", name: "NIFTY ENERGY", sector: "Index", basePrice: 32500, volatility: 0.016, lotSize: 50 },
  { symbol: "NIFTYFMCG", name: "NIFTY FMCG", sector: "Index", basePrice: 57800, volatility: 0.011, lotSize: 50 },
  { symbol: "NIFTYREALTY", name: "NIFTY REALTY", sector: "Index", basePrice: 920, volatility: 0.020, lotSize: 50 },
  { symbol: "NIFTYINFRA", name: "NIFTY INFRASTRUCTURE", sector: "Index", basePrice: 7850, volatility: 0.015, lotSize: 50 },
  { symbol: "NIFTYPSUBANK", name: "NIFTY PSE BANK", sector: "Index", basePrice: 6150, volatility: 0.018, lotSize: 50 },
  { symbol: "NIFTYCOMMOD", name: "NIFTY COMMODITIES", sector: "Index", basePrice: 12500, volatility: 0.016, lotSize: 50 },
  { symbol: "INDIAVIX", name: "INDIA VIX", sector: "Index", basePrice: 14.5, volatility: 0.040, lotSize: 1 },
];

// ==================== OPTION UNDERLYINGS ====================
export const OPTION_UNDERLYINGS: string[] = [
  "NIFTY","BANKNIFTY","NIFTYIT","NIFTYFIN","NIFTYNXT50",
  "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","SBIN",
  "TATAMOTORS","AXISBANK","BAJFINANCE","KOTAKBANK","HINDUNILVR","ITC","LT","BHARTIARTL",
  "MARUTI","HCLTECH","ADANIENT","ASIANPAINT","ONGC","TITAN","M&M","HINDALCO",
  "SUNPHARMA","DRREDDY","BAJAJFINSV","CIPLA","EICHERMOT","GRASIM","HEROMOTOCO",
  "BPCL","ADANIPORTS","COALINDIA","DLF","GODREJPROP","PHOENIXLTD","ADANIENSOL","TATAMTRDVR","MOTHERSUMI",
  "NIFTYREALTY","NIFTYFMCG","NIFTYMIDCAP","NIFTYSMLCAP","NIFTYPHARMA","NIFTYAUTO","NIFTYMETAL","NIFTYENERGY","TATACONSUM","TECHM","HINDALCO","VEDL","SAIL","PNB","BANKBARODA","FEDERALBNK","CANBK","IDFCFIRSTB","HONEYWELL","GODREJCP","ALKEM","CROMPTON","VOLTAS","BLUESTAR","WHIRLPOOL","PAGEIND","VSTTILLERS","LTIM","MPHASIS","DELHIVERY","OBEROIRLTY","PHOENIXLTD","ADANIENSOL",
];

export function getEquities() { return ALL_EQUITIES; }
export function getIndices() { return ALL_INDICES; }
export function getSectors() {
  return [...new Set(ALL_EQUITIES.map(s => s.sector))].sort();
}

// Export the OHLCV type
export type { OHLCV } from "./stock-list";