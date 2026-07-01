// NSE Comprehensive Stock Data Generator
// Includes: Nifty 50 equities, additional popular stocks, NSE Indices, Options chains

export interface OHLCV {
  date: string; open: number; high: number; low: number; close: number; volume: number;
}

export type InstrumentType = "equity" | "index" | "option";

export interface StockInfo {
  symbol: string; name: string; sector: string; basePrice: number; volatility: number;
  type: InstrumentType; underlying?: string; strikePrice?: number;
  optionType?: "CE" | "PE"; expiry?: string; lotSize?: number;
}

// ==================== NIFTY 50 + POPULAR EQUITIES ====================
const EQUITY_DATA: [string, string, string, number, number, number?][] = [
  ["RELIANCE","Reliance Industries","Energy",2950,0.018,250],
  ["TCS","Tata Consultancy Services","IT",4150,0.015,150],
  ["HDFCBANK","HDFC Bank","Banking",1680,0.016,550],
  ["INFY","Infosys","IT",1580,0.019,600],
  ["ICICIBANK","ICICI Bank","Banking",1280,0.017,700],
  ["HINDUNILVR","Hindustan Unilever","FMCG",2580,0.012,300],
  ["SBIN","State Bank of India","Banking",825,0.022,750],
  ["BHARTIARTL","Bharti Airtel","Telecom",1620,0.020,475],
  ["ITC","ITC Limited","FMCG",465,0.014,1600],
  ["KOTAKBANK","Kotak Mahindra Bank","Banking",1790,0.017,400],
  ["LT","Larsen & Toubro","Infrastructure",3650,0.018,150],
  ["AXISBANK","Axis Bank","Banking",1175,0.019,900],
  ["TATAMOTORS","Tata Motors","Auto",950,0.025,550],
  ["WIPRO","Wipro","IT",530,0.020,1500],
  ["SUNPHARMA","Sun Pharmaceutical","Pharma",1780,0.018,700],
  ["TATASTEEL","Tata Steel","Metals",155,0.026,3000],
  ["ADANIENT","Adani Enterprises","Conglomerate",3200,0.030,250],
  ["MARUTI","Maruti Suzuki","Auto",12450,0.016,50],
  ["HCLTECH","HCL Technologies","IT",1750,0.019,500],
  ["BAJFINANCE","Bajaj Finance","Finance",7350,0.022,125],
  ["ASIANPAINT","Asian Paints","Consumer",2980,0.017,200],
  ["ONGC","Oil & Natural Gas Corp","Energy",285,0.023,1800],
  ["TITAN","Titan Company","Consumer",3450,0.019,175],
  ["NESTLEIND","Nestle India","FMCG",2550,0.013,50],
  ["ULTRACEMCO","UltraTech Cement","Cement",11250,0.017,50],
  ["NTPC","NTPC Limited","Power",420,0.021,1500],
  ["POWERGRID","Power Grid Corp","Power",325,0.018,2500],
  ["TATACONSUM","Tata Consumer Products","FMCG",1250,0.016,575],
  ["TECHM","Tech Mahindra","IT",1690,0.022,700],
  ["HINDALCO","Hindalco Industries","Metals",655,0.025,1350],
  ["DIVISLAB","Divi's Laboratories","Pharma",6100,0.020,50],
  ["DRREDDY","Dr. Reddy's Labs","Pharma",6780,0.019,125],
  ["BAJAJFINSV","Bajaj Finserv","Finance",1740,0.021,125],
  ["CIPLA","Cipla","Pharma",1580,0.017,500],
  ["EICHERMOT","Eicher Motors","Auto",4950,0.020,150],
  ["GRASIM","Grasim Industries","Cement",2750,0.019,300],
  ["HEROMOTOCO","Hero MotoCorp","Auto",5250,0.018,100],
  ["APOLLOHOSP","Apollo Hospitals","Healthcare",6850,0.020,50],
  ["BPCL","Bharat Petroleum","Energy",635,0.022,900],
  ["BRITANNIA","Britannia Industries","FMCG",5880,0.014,50],
  ["HDFCLIFE","HDFC Life Insurance","Insurance",685,0.018,700],
  ["INDUSINDBK","IndusInd Bank","Banking",1580,0.021,300],
  ["IOC","Indian Oil Corp","Energy",185,0.020,3000],
  ["JSWSTEEL","JSW Steel","Metals",985,0.024,600],
  ["M&M","Mahindra & Mahindra","Auto",2780,0.021,250],
  ["SBILIFE","SBI Life Insurance","Insurance",1810,0.018,350],
  ["TRENT","Trent Limited","Retail",7650,0.024,125],
  ["ADANIPORTS","Adani Ports","Infrastructure",1470,0.020,500],
  ["COALINDIA","Coal India","Mining",510,0.021,1600],
  ["WELSPUNLIV","Welspun Living","Textiles",175,0.028,4000],
  ["ZOMATO","Zomato","Internet",285,0.030,500],
  ["PAYTM","One97 Communications","Fintech",485,0.035,1100],
  ["IRFC","Indian Railway Finance","Finance",195,0.026,5000],
  ["RVNL","Rail Vikas Nigam","Infrastructure",390,0.032,3000],
  ["TATAPOWER","Tata Power","Power",495,0.024,3000],
  ["DIXON","Dixon Technologies","Electronics",16250,0.032,25],
  ["BAJAJAUTO","Bajaj Auto","Auto",10500,0.018,75],
  ["PIDILITIND","Pidilite Industries","Chemicals",3180,0.018,300],
  ["DMART","Avenue Supermarts","Retail",4650,0.021,100],
  ["BERGEPAINT","Berger Paints","Consumer",580,0.017,900],
  ["SHREECEM","Shree Cement","Cement",26800,0.019,50],
  ["JINDALSTEL","Jindal Steel","Metals",965,0.027,600],
  ["HINDZINC","Hindustan Zinc","Metals",580,0.022,1200],
  ["VEDL","Vedanta Limited","Metals",475,0.028,1500],
  ["SAIL","Steel Authority India","Metals",165,0.028,3000],
  ["PNB","Punjab National Bank","Banking",148,0.024,6000],
  ["BANKBARODA","Bank of Baroda","Banking",315,0.022,2850],
  ["FEDERALBNK","Federal Bank","Banking",180,0.023,5000],
  ["CANBK","Canara Bank","Banking",118,0.023,4500],
  ["BIOCON","Biocon","Pharma",370,0.023,1500],
  ["LUPIN","Lupin","Pharma",2285,0.020,400],
  ["SUZLON","Suzlon Energy","Power",72,0.035,7500],
  ["YESBANK","YES Bank","Banking",28,0.032,14000],
  ["ADANIGREEN","Adani Green Energy","Power",1850,0.030,500],
  ["NYKAA","FSN E-Commerce (Nykaa)","E-commerce",210,0.030,2700],
  ["DLF","DLF Limited","Real Estate",920,0.024,750],
  ["GODREJPROP","Godrej Properties","Real Estate",2750,0.025,250],
  ["SIEMENS","Siemens India","Capital Goods",8250,0.021,75],
  ["ABB","ABB India","Capital Goods",7350,0.020,75],
  ["TVSMOTOR","TVS Motor Company","Auto",2480,0.022,300],
  ["MRF","MRF Tyres","Auto Ancillary",42500,0.019,10],
  ["BOSCHLTD","Bosch Ltd","Auto Ancillary",34500,0.018,15],
  ["VBL","Varun Beverages","FMCG",495,0.025,1000],
  ["LAURUSLABS","Laurus Labs","Pharma",590,0.026,1500],
  ["PERSISTENT","Persistent Systems","IT",6800,0.021,100],
  ["COFORGE","Coforge","IT",8650,0.022,75],
  ["MUTHOOTFIN","Muthoot Finance","Finance",3850,0.019,100],
  ["AMBUJACEM","Ambuja Cements","Cement",710,0.020,1000],
  ["ACC","ACC Limited","Cement",2580,0.019,350],
  ["TORNTPHARM","Torrent Pharma","Pharma",15500,0.021,50],
  ["MAXHEALTH","Max Healthcare","Healthcare",820,0.022,850],
  ["CHOLAHLDNG","Cholamandalam Investment","Finance",1720,0.021,300],
  ["BAJAJHLDNG","Bajaj Holdings","Conglomerate",8150,0.016,75],
  ["INDIANB","Indian Bank","Banking",590,0.024,900],
  ["IDFCFIRSTB","IDFC First Bank","Banking",82,0.025,10000],
  ["HONEYWELL","Honeywell Automation","Capital Goods",42500,0.018,25],
  ["GODREJCP","Godrej Consumer","FMCG",1620,0.016,400],
  ["ALKEM","Alkem Laboratories","Pharma",6050,0.021,100],
  ["CROMPTON","Crompton Greaves","Consumer",495,0.024,1400],
  ["VOLTAS","Voltas","Consumer",1540,0.022,400],
  ["BLUESTAR","Blue Star","Consumer",1850,0.023,250],
  ["WHIRLPOOL","Whirlpool India","Consumer",1920,0.020,250],
  ["PAGEIND","Page Industries","Textiles",42800,0.019,10],
  ["VSTTILLERS","VST Tillers","Capital Goods",4850,0.023,100],
  ["LTIM","LTIMindtree","IT",6250,0.020,100],
  ["MPHASIS","Mphasis","IT",3150,0.022,300],
  ["DELHIVERY","Delhivery","Logistics",420,0.031,1400],
  ["OBEROIRLTY","Oberoi Realty","Real Estate",1850,0.023,400],
  ["PHOENIXLTD","Phoenix Ltd","Real Estate",6100,0.026,100],
  ["ADANIENSOL","Adani Energy Sol","Power",2150,0.032,400],
  ["TATAMTRDVR","Tata Motors DVR","Auto",640,0.026,850],
  ["MOTHERSUMI","Mother Son Sumi","Auto Ancillary",285,0.027,2000],
];

export const ALL_EQUITIES: StockInfo[] = EQUITY_DATA.map(([symbol, name, sector, basePrice, volatility, lotSize]) => ({
  symbol, name, sector, basePrice, volatility, type: "equity" as const, ...(lotSize ? { lotSize } : {}),
}));

// ==================== NSE INDICES ====================
const INDEX_DATA: [string, string, number, number, number][] = [
  ["NIFTY","NIFTY 50",24580,0.012,25],
  ["BANKNIFTY","NIFTY BANK",52800,0.015,15],
  ["NIFTYIT","NIFTY IT",38500,0.016,50],
  ["NIFTYNXT50","NIFTY NEXT 50",62450,0.014,25],
  ["NIFTYFIN","NIFTY FINANCIAL SERVICES",24300,0.014,25],
  ["NIFTYMIDCAP","NIFTY MIDCAP 100",58200,0.015,50],
  ["NIFTYSMLCAP","NIFTY SMALLCAP 100",18400,0.016,50],
  ["NIFTYPHARMA","NIFTY PHARMA",19700,0.015,50],
  ["NIFTYAUTO","NIFTY AUTO",23200,0.016,50],
  ["NIFTYMETAL","NIFTY METAL",9850,0.018,50],
  ["NIFTYENERGY","NIFTY ENERGY",32500,0.016,50],
  ["NIFTYFMCG","NIFTY FMCG",57800,0.011,50],
  ["NIFTYREALTY","NIFTY REALTY",920,0.020,50],
  ["NIFTYINFRA","NIFTY INFRASTRUCTURE",7850,0.015,50],
  ["NIFTYPSUBANK","NIFTY PSE BANK",6150,0.018,50],
  ["NIFTYCOMMOD","NIFTY COMMODITIES",12500,0.016,50],
  ["INDIAVIX","INDIA VIX",14.5,0.040,1],
];

export const ALL_INDICES: StockInfo[] = INDEX_DATA.map(([symbol, name, basePrice, volatility, lotSize]) => ({
  symbol, name, sector: "Index", basePrice, volatility, type: "index" as const, lotSize,
}));

// Combined list (deduplicated)
const _seen = new Set<string>();
export const UNIQUE_STOCKS: StockInfo[] = [...ALL_EQUITIES, ...ALL_INDICES].filter((s) => {
  if (_seen.has(s.symbol)) return false; _seen.add(s.symbol); return true;
});
// Backward compat alias
export { UNIQUE_STOCKS as NSE_STOCKS };

// ==================== OPTIONS ====================
function getNextExpiryDates(count: number): string[] {
  const dates: string[] = [];
  const today = new Date("2026-06-29");
  let d = new Date(today);
  let found = 0;
  while (found < count) {
    d.setDate(d.getDate() + 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const lastThurs = new Date(lastDay);
    lastThurs.setDate(lastDay.getDate() - ((lastDay.getDay() + 3) % 7));
    if (d.getTime() === lastThurs.getTime() && d > today) { dates.push(d.toISOString().split("T")[0]); found++; }
  }
  return dates;
}
const _EXPIRY_DATES = getNextExpiryDates(3);

function _generateStrikes(basePrice: number): number[] {
  let step: number;
  if (basePrice > 20000) step = 200; else if (basePrice > 5000) step = 100;
  else if (basePrice > 1000) step = 50; else if (basePrice > 300) step = 20; else step = 10;
  const atm = Math.round(basePrice / step) * step;
  return Array.from({ length: 11 }, (_, i) => atm + (i - 5) * step);
}

export function generateOptionsChain(underlyingSymbol: string): StockInfo[] {
  const underlying = UNIQUE_STOCKS.find((s) => s.symbol === underlyingSymbol);
  if (!underlying) return [];
  const options: StockInfo[] = [];
  for (const expiry of _EXPIRY_DATES) {
    for (const strike of _generateStrikes(underlying.basePrice)) {
      for (const ot of ["CE", "PE"] as const) {
        options.push({
          symbol: `${underlyingSymbol}${expiry.replace(/-/g, "")}${strike}${ot}`,
          name: `${underlying.name} ${expiry} ${strike} ${ot}`,
          sector: underlying.sector,
          basePrice: Math.max(0.5, underlying.basePrice * (0.01 + Math.random() * 0.08)),
          volatility: 0.04 + Math.random() * 0.03,
          type: "option", underlying: underlyingSymbol, strikePrice: strike,
          optionType: ot, expiry, lotSize: underlying.lotSize || 1,
        });
      }
    }
  }
  return options;
}

export const OPTION_UNDERLYINGS: string[] = [
  "NIFTY","BANKNIFTY","NIFTYIT","NIFTYFIN","NIFTYNXT50",
  "RELIANCE","TCS","HDFCBANK","INFY","ICICIBANK","SBIN",
  "TATAMOTORS","AXISBANK","BAJFINANCE","KOTAKBANK","HINDUNILVR",
  "ITC","LT","BHARTIARTL","MARUTI","WIPRO","SUNPHARMA",
  "TATASTEEL","ADANIENT","ASIANPAINT","HCLTECH","TITAN","M&M","HINDALCO","TATACONSUM",
];

export function getEquities() { return ALL_EQUITIES; }
export function getIndices() { return ALL_INDICES; }
export function getSectors() { return [...new Set(UNIQUE_STOCKS.map((s) => s.sector))].sort(); }

// ==================== DATA GENERATOR ====================
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

export function generateStockData(stock: StockInfo, days: number = 200): OHLCV[] {
  const rand = seededRandom(stock.symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + 42);
  const data: OHLCV[] = [];
  const endDate = new Date("2026-06-29");
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - Math.ceil(days * 1.5));
  let price = stock.basePrice * (0.90 + rand() * 0.10);
  let trend = 0, trendDuration = 0;

  for (let i = 0; i < days * 2 && data.length < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
    if (currentDate > endDate) break;
    if (trendDuration <= 0) { trend = (rand() - 0.48) * stock.volatility; trendDuration = Math.floor(3 + rand() * 12); }
    trendDuration--;
    const dailyReturn = trend + (rand() - 0.5) * stock.volatility * 0.8;
    const open = price, close = price * (1 + dailyReturn);
    const high = Math.max(open, close) * (1 + rand() * stock.volatility * 0.5);
    const low = Math.min(open, close) * (1 - rand() * stock.volatility * 0.5);
    const baseVolume = stock.type === "index" ? 100000 + rand() * 500000 : 500000 + rand() * 2000000;
    const volume = Math.round(baseVolume * (1 + Math.abs(dailyReturn) * 15));
    data.push({ date: currentDate.toISOString().split("T")[0], open: Math.round(open * 100) / 100, high: Math.round(high * 100) / 100, low: Math.round(low * 100) / 100, close: Math.round(close * 100) / 100, volume });
    price = close;
  }
  // Adjust last 30% to converge to current basePrice
  if (data.length > 0) {
    const adj = stock.basePrice / data[data.length - 1].close;
    const s = Math.floor(data.length * 0.7);
    for (let i = s; i < data.length; i++) {
      const p = (i - s) / (data.length - s);
      const f = 1 + (adj - 1) * p;
      data[i].open = Math.round(data[i].open * f * 100) / 100;
      data[i].high = Math.round(data[i].high * f * 100) / 100;
      data[i].low = Math.round(data[i].low * f * 100) / 100;
      data[i].close = Math.round(data[i].close * f * 100) / 100;
    }
  }
  return data;
}