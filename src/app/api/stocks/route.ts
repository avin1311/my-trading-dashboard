import { NextRequest, NextResponse } from "next/server";
import { stockList } from "@/lib/stock-list";
import { getAllNSEEquities, getAllFOUnderlyings } from "@/lib/upstox-client";

// Sector map for popular stocks (Upstox master contracts don't provide sectors)
const SECTOR_MAP: Record<string, string> = {
  RELIANCE: "Energy", TCS: "IT", HDFCBANK: "Banking", INFY: "IT", ICICIBANK: "Banking",
  HINDUNILVR: "FMCG", SBIN: "Banking", BHARTIARTL: "Telecom", ITC: "FMCG",
  KOTAKBANK: "Banking", LT: "Infrastructure", AXISBANK: "Banking", TATAMOTORS: "Auto",
  ASIANPAINT: "FMCG", BAJFINANCE: "Financial Services", MARUTI: "Auto", TITAN: "Consumer Durables",
  SUNPHARMA: "Pharma", WIPRO: "IT", HCLTECH: "IT", ULTRACEMCO: "Cement", NESTLEIND: "FMCG",
  NTPC: "Power", POWERGRID: "Power", ONGC: "Energy", TATASTEEL: "Metals",
  JSWSTEEL: "Metals", HINDALCO: "Metals", COALINDIA: "Mining", ADANIENT: "Conglomerate",
  ADANIPORTS: "Infrastructure", TECHM: "IT", BAJAJFINSV: "Financial Services",
  DRREDDY: "Pharma", CIPLA: "Pharma", EICHERMOT: "Auto", MANDM: "Auto",
  HEROMOTOCO: "Auto", BPCL: "Energy", GRASIM: "Cement", INDUSINDBK: "Banking",
  HDFCLIFE: "Insurance", SBILIFE: "Insurance", DIVISLAB: "Pharma", DLF: "Realty",
  ADANIGREEN: "Power", TATACONSUM: "FMCG", BRITANNIA: "FMCG", PIDILITIND: "Chemicals",
  APOLLOHOSP: "Healthcare", BERGEPAINT: "FMCG", TRENT: "Retail", TATAPOWER: "Power",
  TORNTPHARM: "Pharma", TVSMOTOR: "Auto", VEDL: "Metals", VOLTAS: "Consumer Durables",
  ZYDUSLIFE: "Pharma", PNB: "Banking", BANKBARODA: "Banking", CANBK: "Banking",
  UNIONBANK: "Banking", INDIANB: "Banking", FEDERALBNK: "Banking", BANDHANBNK: "Banking",
  IDFCFIRSTB: "Banking", AUBANK: "Banking", RBLBANK: "Banking", YESBANK: "Banking",
  ICICIPRULI: "Insurance", LICHSGFIN: "NBFC", SHRIRAMFIN: "NBFC", RECLTD: "NBFC",
  MUTHOOTFIN: "NBFC", LTIM: "IT", PERSISTENT: "IT", COFORGE: "IT",
  TATAELXSI: "IT", OFSS: "IT", NAUKRI: "Internet", MPHASIS: "IT",
  LUPIN: "Pharma", LAURUSLABS: "Pharma", SYNGENE: "Pharma", WOCKPHARMA: "Pharma",
  ALKEM: "Pharma", AUROPHARMA: "Pharma", BIOCON: "Pharma", AMARAJABAT: "Auto Ancillary",
  APOLLOTYRE: "Auto Ancillary", ASHOKLEY: "Auto", BOSCHLTD: "Auto Ancillary",
  CEATLTD: "Auto Ancillary", ESCORTS: "Auto", EXIDEIND: "Auto Ancillary",
  HINDPETRO: "Energy", GAIL: "Energy", IOC: "Energy", PETRONET: "Energy",
  JSWENERGY: "Power", ADANIPOWER: "Power", IGL: "Energy", NHPC: "Power",
  NATIONALUM: "Metals", NMDC: "Mining", HINDZINC: "Metals", SAIL: "Metals",
  JINDALSTEL: "Metals", JIOFIN: "Financial Services", DIXON: "Electronics",
  BEL: "Defence", HAL: "Defence", ADANITRANS: "Energy", DABUR: "FMCG",
  VBL: "FMCG", UBL: "FMCG", COLPAL: "FMCG", GODREJCP: "FMCG",
  JUBLFOOD: "FMCG", PAGEIND: "Consumer",
  BATAINDIA: "Consumer", DELHIVERY: "Logistics", ZOMATO: "Internet",
  IRCTC: "Services", IRFC: "NBFC", RVNL: "Infrastructure", CONCOR: "Logistics",
  SIEMENS: "Industrial", ABB: "Industrial", CGPOWER: "Industrial", POLYCAB: "Electrical",
  HAVELLS: "Electrical", KEI: "Electrical", CUMMINSIND: "Industrial",
  GODREJPROP: "Realty", OBEROIRLTY: "Realty", NBCC: "Realty", NCC: "Infrastructure",
  ACC: "Cement", AMBUJACEM: "Cement", RAMCOCEM: "Cement", TATACHEM: "Chemicals",
  PEL: "Consumer Durables", WHIRLPOOL: "Consumer Durables", SUNTV: "Media",
  TATAINVEST: "Conglomerate", BALRAMCHIN: "FMCG", SCHAEFFLER: "Auto Ancillary",
  CHALET: "Hotels", MEDPLUS: "Healthcare", SAREGAMA: "Media",
  HAPPSTMNDS: "Consumer", FIVESTAR: "NBFC", EQUITASBNK: "Banking",
  MANAPPURAM: "NBFC", CREDITACC: "NBFC", MAHABANK: "Banking",
  IOB: "Banking", UCOBANK: "Banking", CENTRALBK: "Banking",
  PNBHOUSING: "NBFC", CHOLAFIN: "NBFC", BAJAJHLDNG: "Financial Services",
  NEWINDIA: "Insurance", MGL: "Energy", TORNTPOWER: "Power",
  GUJGASLTD: "Energy", TATAMETALI: "Metals", HINDCOPPER: "Metals",
  MOIL: "Mining", RATNAMANI: "Metals", BHARATFORG: "Auto Ancillary",
  MOTHERSON: "Auto Ancillary", SAMVARDHNA: "Auto Ancillary",
  SUBROS: "Auto Ancillary", BLUESTARCO: "Consumer Durables",
  MRF: "Auto Ancillary", WELCORP: "Textiles", WELSPUNLIV: "Textiles",
  HDFCAMC: "Financial Services", LICI: "Insurance", TATACOMM: "Telecom",
  ENDURANCE: "Auto Ancillary", NHPC: "Power", SJVN: "Power",
  GLAXO: "Pharma", IPCALAB: "Pharma", STRTECH: "Pharma",
  LALPATHLAB: "Healthcare", AARTIDRUG: "Pharma", ORIENTELEC: "Consumer Durables",
  DEEPAKNTR: "Chemicals", SRF: "Chemicals", AARTIIND: "Chemicals",
  CLARIANT: "Chemicals", SOLARINDS: "Chemicals", EIDSPARRY: "Chemicals",
  SCI: "Logistics", BALMERLAW: "Logistics", CASTROLIND: "Auto Ancillary",
  TITAGARH: "Infrastructure", INDIANHOT: "Hotels", EIHOTEL: "Hotels",
  RAYMOND: "Textiles", TRIDENT: "Textiles", SPARC: "Textiles",
  GINNIIFIN: "NBFC", CREDITACC: "NBFC", APTUS: "NBFC",
  IDBI: "Banking", MAHABANK: "Banking", IOB: "Banking",
  UCOBANK: "Banking", CENTRALBK: "Banking", GICRE: "Insurance",
  NIITTECH: "IT", ZENSARTECH: "IT",
  SONATSOFTW: "IT", LATENTVIEW: "IT", NAVNETEDUL: "Consumer",
  KALYANKJIL: "Consumer", SHOPERSTOP: "Retail", VIPIND: "Consumer",
  SAFARI: "Consumer", EASEMYTRIP: "Internet",
  JTECHPLAT: "Internet", JCUPAIBLT: "Diversified",
  NIFTY: "Index", BANKNIFTY: "Index", FINNIFTY: "Index",
  NIFTYIT: "Index", NIFTYNXT50: "Index", MIDCPNIFTY: "Index",
  NIFTYMIDCAP: "Index", NIFTYSMLCAP: "Index", NIFTYPHARMA: "Index",
  NIFTYAUTO: "Index", NIFTYMETAL: "Index", NIFTYENERGY: "Index",
  NIFTYFMCG: "Index", NIFTYREALTY: "Index", NIFTYINFRA: "Index",
  NIFTYPSUBANK: "Index", NIFTYCOMMOD: "Index", INDIAVIX: "Index",
};

// ==================== OPTIONS CHAIN GENERATOR ====================
function generateOptionsChain(underlying: string, lotSizeOverride?: number): Array<{
  symbol: string; name: string; type: string; underlying: string;
  strikePrice: number; optionType: string; expiry: string; lotSize: number;
}> {
  // Get base price from equities/indices, or use a default
  const allInstruments = [...stockList.equities, ...stockList.indices];
  const base = allInstruments.find((s: any) => s.s === underlying);
  const basePrice = base?.bp || 1000;
  const lotSize = lotSizeOverride || base?.ls || 1;

  // Calculate next 3 monthly expiries (last Thursday of each month)
  const expiries: string[] = [];
  const now = new Date();
  for (let m = 0; m < 3; m++) {
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

  const options: Array<{
    symbol: string; name: string; type: string; underlying: string;
    strikePrice: number; optionType: string; expiry: string; lotSize: number;
  }> = [];

  const step = basePrice > 10000 ? 100 : basePrice > 1000 ? 50 : basePrice > 100 ? 5 : 1;
  const atmStrike = Math.round(basePrice / step) * step;
  const numStrikes = 12;

  for (const expiry of expiries) {
    for (let i = -numStrikes; i <= numStrikes; i++) {
      const strike = atmStrike + i * step;
      if (strike <= 0) continue;
      options.push({
        symbol: `${underlying}${expiry.replace(/-/g, '')}${strike}CE`,
        name: `${underlying} ${strike} CE`, type: "option", underlying,
        strikePrice: strike, optionType: "CE", expiry, lotSize,
      });
      options.push({
        symbol: `${underlying}${expiry.replace(/-/g, '')}${strike}PE`,
        name: `${underlying} ${strike} PE`, type: "option", underlying,
        strikePrice: strike, optionType: "PE", expiry, lotSize,
      });
    }
  }

  return options;
}

// ==================== Dynamic equity data with fallback ====================
// Since Upstox /v2/master/contracts was deprecated (Jun 30, 2025),
// getAllNSEEquities() and getAllFOUnderlyings() now return [].
// We always use the fallback hardcoded list (1000+ equities from stock-list.ts).
// The dynamic path is kept for when a future working alternative is found.

const MIN_EQUITY_COUNT = 500; // Minimum expected equities — if dynamic returns fewer, use fallback (we have 1010 offline)

async function getDynamicEquities(): Promise<{ instruments: any[]; sectors: string[]; source: string }> {
  // Build fallback list upfront (used when dynamic source is unavailable or returns too few stocks)
  const buildFallback = () => {
    const fallbackSectors = [...new Set(stockList.equities.map((s: any) => s.sec))].sort();
    return {
      instruments: stockList.equities.map((s: any) => ({
        symbol: s.s, name: s.n, sector: s.sec,
        basePrice: s.bp, volatility: s.v, lotSize: s.ls, type: 'equity' as const,
      })),
      sectors: fallbackSectors,
      source: 'fallback' as const,
    };
  };

  try {
    const [upstoxEquities, foUnderlyings] = await Promise.all([
      getAllNSEEquities(),
      getAllFOUnderlyings(),
    ]);

    // If dynamic source returned no data, use fallback immediately
    if (upstoxEquities.length === 0) {
      console.log(`[Instruments] Dynamic source returned 0 equities, using fallback (${stockList.equities.length} stocks)`);
      return buildFallback();
    }

    // If dynamic source returned suspiciously few stocks, log warning and prefer fallback.
    // This prevents partial results (e.g. 112 out of 250+) from hiding the full list.
    if (upstoxEquities.length < MIN_EQUITY_COUNT) {
      console.warn(`[Instruments] Dynamic source returned only ${upstoxEquities.length} equities (minimum ${MIN_EQUITY_COUNT}), using fallback (${stockList.equities.length} stocks)`);
      return buildFallback();
    }

    // Build a lot-size map from F&O underlyings for those that have F&O
    const foLotMap = new Map<string, number>();
    for (const fo of foUnderlyings) {
      if (fo.lotSize > 0) foLotMap.set(fo.symbol, fo.lotSize);
    }

    // Map dynamic equities to the format expected by frontend
    const instruments = upstoxEquities.map(eq => {
      const symbol = eq.symbol;
      // Try sector from map, then from hardcoded list, then 'Other'
      let sector = SECTOR_MAP[symbol];
      if (!sector) {
        const fallback = stockList.equities.find((s: any) => s.s === symbol);
        sector = fallback?.sec || 'Other';
      }

      return {
        symbol,
        name: eq.name,
        sector,
        basePrice: 0, // Will be fetched live when needed
        volatility: 0.02, // Default estimate
        lotSize: foLotMap.get(symbol) || eq.lotSize || 1,
        type: 'equity' as const,
      };
    });

    // Merge: add any fallback stocks not in the dynamic list (ensures no stock is missing)
    const dynamicSymbols = new Set(instruments.map(i => i.symbol));
    for (const fb of stockList.equities) {
      if (!dynamicSymbols.has((fb as any).s)) {
        instruments.push({
          symbol: (fb as any).s, name: (fb as any).n, sector: (fb as any).sec,
          basePrice: (fb as any).bp, volatility: (fb as any).v, lotSize: (fb as any).ls, type: 'equity' as const,
        });
      }
    }

    const sectors = [...new Set(instruments.map(s => s.sector).filter(Boolean))].sort();

    console.log(`[Instruments] Loaded ${upstoxEquities.length} from exchange + ${instruments.length - upstoxEquities.length} from fallback = ${instruments.length} total equities`);
    return { instruments, sectors, source: 'upstox_dynamic' };
  } catch (err) {
    console.error('[Instruments] Dynamic load failed, using fallback:', (err as Error).message);
    return buildFallback();
  }
}

// GET /api/stocks?type=equity|index|option|fo-underlyings
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "equity";
  const search = searchParams.get("search") || "";
  const sector = searchParams.get("sector") || "";
  const underlying = searchParams.get("underlying") || "";
  const expiry = searchParams.get("expiry") || "";

  if (type === "equity") {
    const { instruments: allInstruments, sectors, source } = await getDynamicEquities();
    let instruments = allInstruments;

    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter((s: any) =>
        s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }
    if (sector && sector !== "all") {
      instruments = instruments.filter((s: any) => s.sector === sector);
    }

    const stats = {
      totalEquities: allInstruments.length,
      totalIndices: stockList.indices.length,
      optionUnderlyings: stockList.optionUnderlyings.length,
      source,
    };

    return NextResponse.json(
      { instruments, stats, sectors, sourceNote: source === 'fallback' ? 'Using offline list (1000+ stocks). Connect Upstox for live instrument discovery.' : 'Live from exchange' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }

  if (type === "index") {
    let instruments = stockList.indices;
    if (search) {
      const q = search.toLowerCase();
      instruments = instruments.filter((s: any) => s.s.toLowerCase().includes(q) || s.n.toLowerCase().includes(q));
    }
    const mapped = instruments.map((s: any) => ({
      symbol: s.s, name: s.n, sector: s.sec || 'Index',
      basePrice: s.bp || 0, volatility: s.v || 0, lotSize: s.ls || 1, type: 'index' as const,
    }));
    return NextResponse.json(
      { instruments: mapped, stats: { totalIndices: stockList.indices.length } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }

  if (type === "option") {
    // Use dynamic F&O underlyings if available, else fallback
    let foList = stockList.optionUnderlyings as string[];
    let lotSizeMap: Record<string, number> = {};

    try {
      const foUnderlyings = await getAllFOUnderlyings();
      if (foUnderlyings.length > 0) {
        foList = foUnderlyings.map(f => f.symbol);
        for (const fo of foUnderlyings) {
          if (fo.lotSize > 0) lotSizeMap[fo.symbol] = fo.lotSize;
        }
      }
    } catch {}

    const allOptions = underlying ? generateOptionsChain(underlying, lotSizeMap[underlying]) : [];
    const expiryDates = [...new Set(allOptions.map(o => o.expiry).filter(Boolean))].sort();
    let instruments = allOptions;
    if (expiry) {
      instruments = instruments.filter(o => o.expiry === expiry);
    }
    return NextResponse.json(
      { instruments, underlyings: foList, expiryDates, stats: { optionUnderlyings: foList.length } },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }

  // Default: return all equities + indices
  const { instruments: dynEquities, sectors, source } = await getDynamicEquities();
  const idxMapped = stockList.indices.map((s: any) => ({
    symbol: s.s, name: s.n, sector: s.sec || '',
    basePrice: s.bp || 0, volatility: s.v || 0, lotSize: s.ls || 1, type: 'index' as const,
  }));

  return NextResponse.json({
    instruments: [...dynEquities, ...idxMapped],
    stats: {
      totalEquities: dynEquities.length,
      totalIndices: stockList.indices.length,
      optionUnderlyings: stockList.optionUnderlyings.length,
      source,
    },
    sectors,
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
}