'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, Bar, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, Loader2, ArrowUp, ArrowDown, Activity, BarChart3, Target, Trophy,
  TrendingDown, AlertTriangle, Zap, Shield, Flame, Scale, ChevronDown, Settings2,
  RefreshCw, Search, X, Layers, BarChart2, GitBranch, CalendarDays, Clock,
  DollarSign, Percent, PieChartIcon, Users, Building2, Briefcase, Radio, Eye,
  CircleDot, ArrowRight, Gauge, type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ==================== TYPES ====================
interface StockInfo {
  symbol: string; name: string; sector: string; basePrice: number; volatility: number;
  type: 'equity' | 'index' | 'option'; underlying?: string; strikePrice?: number;
  optionType?: 'CE' | 'PE'; expiry?: string; lotSize?: number;
}
interface OHLCV { date: string; open: number; high: number; low: number; close: number; volume: number; }
type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
interface StrategySignal {
  date: string; close: number; signal: SignalType; supertrend: number; supertrendDir: number;
  rsi: number; macd: number; macdSignal: number; macdHistogram: number; reason: string;
}
interface TradeRecord {
  entryDate: string; exitDate: string; entryPrice: number; exitPrice: number;
  type: 'LONG' | 'SHORT'; pnl: number; pnlPct: number; signal: SignalType;
}
interface BacktestResult {
  totalReturn: number; totalReturnPct: number; winRate: number; totalTrades: number;
  winningTrades: number; losingTrades: number; avgWinPct: number; avgLossPct: number;
  maxDrawdownPct: number; profitFactor: number; trades: TradeRecord[];
}
interface StrategyParams {
  supertrendPeriod: number; supertrendMultiplier: number; rsiPeriod: number;
  rsiOverbought: number; rsiOversold: number; macdFast: number; macdSlow: number; macdSignal: number;
}
interface ChartDataPoint {
  date: string; open: number; high: number; low: number; close: number; volume: number;
  supertrend: number | null; supertrendDir: number | null; rsi: number | null;
  macd: number | null; macdSignal: number | null; macdHistogram: number | null; signal: SignalType | null;
}
interface LiveQuote {
  symbol: string; name: string; longName: string; sector: string; industry: string;
  exchange: string; currency: string; type: 'equity' | 'index';
  price: number; change: number; changePct: number; prevClose: number; open: number;
  dayHigh: number; dayLow: number; volume: number; avgVolume: number; volumeRatio: number;
  marketCap: number; pe: number | null; forwardPE: number | null; pb: number | null;
  eps: number | null; bookValue: number | null; dividendYield: number | null;
  payoutRatio: number | null; high52w: number; low52w: number; percentFrom52wHigh: number;
  percentFrom52wLow: number; fiftyDMA: number | null; twoHundredDMA: number | null;
  percentAbove50DMA: number | null; percentAbove200DMA: number | null; beta: number | null;
  roe: number | null; roa: number | null; debtToEquity: number | null;
  revenueGrowth: number | null; profitMargins: number | null; operatingMargins: number | null;
  currentRatio: number | null; totalRevenue: number | null; ebitda: number | null;
  grossProfits: number | null; freeCashflow: number | null; recommendation: string | null;
  targetHigh: number | null; targetLow: number | null; targetMean: number | null;
  targetMedian: number | null; analysts: number | null; instHolding: number | null;
  insiderHolding: number | null; marketState: string; lastUpdated: string;
}
interface PeerData {
  symbol: string; name: string; price: number; changePct: number; marketCap: number;
  pe: number | null; pb: number | null; divYield: number | null;
  roe: number | null; revenueGrowth: number | null;
}
interface StocksResponse {
  instruments: StockInfo[];
  stats?: { totalEquities: number; totalIndices: number; optionUnderlyings: number };
  sectors?: string[]; underlyings?: string[]; expiryDates?: string[];
}

const DEFAULT_PARAMS: StrategyParams = {
  supertrendPeriod: 10, supertrendMultiplier: 3, rsiPeriod: 14,
  rsiOverbought: 70, rsiOversold: 30, macdFast: 12, macdSlow: 26, macdSignal: 9,
};

// ==================== FORMATTERS ====================
function formatINR(v: number): string {
  if (v >= 1e12) return '₹' + (v / 1e12).toFixed(2) + ' T';
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(2) + ' L';
  return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatNum(v: number): string {
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(2);
}
function formatVol(v: number): string { return formatNum(v); }
function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}
function formatExpiry(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function getSignalColor(s: SignalType): string {
  return { STRONG_BUY: 'text-emerald-400', BUY: 'text-green-400', HOLD: 'text-amber-400', SELL: 'text-orange-400', STRONG_SELL: 'text-red-400' }[s];
}
function getSignalBg(s: SignalType): string {
  return { STRONG_BUY: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400', BUY: 'bg-green-500/20 border-green-500/40 text-green-400', HOLD: 'bg-amber-500/20 border-amber-500/40 text-amber-400', SELL: 'bg-orange-500/20 border-orange-500/40 text-orange-400', STRONG_SELL: 'bg-red-500/20 border-red-500/40 text-red-400' }[s];
}
function getSignalIcon(s: SignalType): string {
  return { STRONG_BUY: '⬆⬆', BUY: '⬆', HOLD: '⏸', SELL: '⬇', STRONG_SELL: '⬇⬇' }[s];
}
function getTypeBadgeColor(t: string): string {
  return { equity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', index: 'bg-purple-500/15 text-purple-400 border-purple-500/30', CE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', PE: 'bg-red-500/15 text-red-400 border-red-500/30' }[t] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
}

// ==================== MAIN COMPONENT ====================
export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [equities, setEquities] = useState<StockInfo[]>([]);
  const [indices, setIndices] = useState<StockInfo[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [stats, setStats] = useState({ totalEquities: 0, totalIndices: 0, optionUnderlyings: 0 });
  const [optionUnderlyings, setOptionUnderlyings] = useState<string[]>([]);
  const [selectedUnderlying, setSelectedUnderlying] = useState<string>('');
  const [expiryDates, setExpiryDates] = useState<string[]>([]);
  const [selectedExpiry, setSelectedExpiry] = useState<string>('');
  const [optionsChain, setOptionsChain] = useState<StockInfo[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [equitySearch, setEquitySearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [selectedType, setSelectedType] = useState<'equity' | 'index' | 'option'>('equity');
  const [loading, setLoading] = useState(true);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [stockData, setStockData] = useState<OHLCV[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [params, setParams] = useState<StrategyParams>({ ...DEFAULT_PARAMS });
  const [chartOffset, setChartOffset] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [liveQuote, setLiveQuote] = useState<LiveQuote | null>(null);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [dataSource, setDataSource] = useState<string>('simulated');

  // Fetch instruments list
  useEffect(() => {
    Promise.all([
      fetch('/api/stocks?type=equity').then(r => r.json()),
      fetch('/api/stocks?type=index').then(r => r.json()),
      fetch('/api/stocks?type=option').then(r => r.json()),
    ]).then(([eq, idx, opt]: StocksResponse[]) => {
      setEquities(eq.instruments || []);
      setIndices(idx.instruments || []);
      setSectors(eq.sectors || []);
      setStats(eq.stats || { totalEquities: 0, totalIndices: 0, optionUnderlyings: 0 });
      setOptionUnderlyings(opt.underlyings || []);
    }).catch(console.error);
  }, []);

  // Fetch options chain
  useEffect(() => {
    if (!selectedUnderlying) return;
    setOptionsLoading(true); setSelectedExpiry(''); setOptionsChain([]);
    fetch(`/api/stocks?type=option&underlying=${selectedUnderlying}`)
      .then(r => r.json()).then((d: StocksResponse) => {
        setExpiryDates(d.expiryDates || []);
        if (d.expiryDates?.length) setSelectedExpiry(d.expiryDates[0]);
        setOptionsLoading(false);
      }).catch(() => setOptionsLoading(false));
  }, [selectedUnderlying]);

  useEffect(() => {
    if (!selectedUnderlying || !selectedExpiry) return;
    setOptionsLoading(true);
    fetch(`/api/stocks?type=option&underlying=${selectedUnderlying}&expiry=${selectedExpiry}`)
      .then(r => r.json()).then((d: StocksResponse) => { setOptionsChain(d.instruments || []); setOptionsLoading(false); })
      .catch(() => setOptionsLoading(false));
  }, [selectedUnderlying, selectedExpiry]);

  // Fetch signals + historical data
  const fetchData = useCallback(async (symbol: string, p: StrategyParams) => {
    setLoading(true); setChartOffset(0);
    try {
      const sp = new URLSearchParams({ symbol, days: '200' });
      for (const [k, v] of Object.entries(p)) sp.append(k, String(v));
      const res = await fetch(`/api/signals?${sp.toString()}`);
      const data = await res.json();
      setStockData(data.stockData || []);
      setSignals(data.signals || []);
      setBacktest(data.backtest || null);
      setStockInfo(data.stockInfo || null);
      setParams(data.params || DEFAULT_PARAMS);
      setDataSource(data.dataSource || 'simulated');
    } catch (err) { console.error('Failed:', err); } finally { setLoading(false); setRecalculating(false); }
  }, []);

  // Fetch live quote
  const fetchQuote = useCallback(async (symbol: string) => {
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/quote?symbol=${symbol}&peers=true`);
      const data = await res.json();
      if (data.quote) {
        setLiveQuote(data.quote);
        setPeers(data.peers || []);
      }
    } catch (err) { console.error('Quote failed:', err); } finally { setQuoteLoading(false); }
  }, []);

  useEffect(() => { fetchData(selectedSymbol, params); }, [selectedSymbol]);
  useEffect(() => { fetchQuote(selectedSymbol); }, [selectedSymbol]);

  // Merge chart data
  const chartData = useMemo(() => {
    const sigMap = new Map(signals.map(s => [s.date, s]));
    return stockData.map(d => {
      const sig = sigMap.get(d.date);
      return { ...d, supertrend: sig?.supertrend ?? null, supertrendDir: sig?.supertrendDir ?? null, rsi: sig?.rsi ?? null, macd: sig?.macd ?? null, macdSignal: sig?.macdSignal ?? null, macdHistogram: sig?.macdHistogram ?? null, signal: sig?.signal ?? null };
    });
  }, [stockData, signals]);

  const visibleData = useMemo(() => {
    const max = 100, end = chartData.length - chartOffset, start = Math.max(0, end - max);
    return chartData.slice(start, end);
  }, [chartData, chartOffset]);

  const canSlideLeft = chartOffset < chartData.length - 100;
  const canSlideRight = chartOffset > 0;
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
  const latestData = stockData.length > 0 ? stockData[stockData.length - 1] : null;
  const prevData = stockData.length > 1 ? stockData[stockData.length - 2] : null;
  const priceChange = latestData && prevData ? latestData.close - prevData.close : 0;
  const priceChangePct = prevData?.close ? (priceChange / prevData.close) * 100 : 0;

  const filteredEquities = useMemo(() => {
    let list = equities;
    if (equitySearch) { const q = equitySearch.toLowerCase(); list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)); }
    if (selectedSector && selectedSector !== 'all') list = list.filter(s => s.sector === selectedSector);
    return list;
  }, [equities, equitySearch, selectedSector]);

  const optionsChainGrouped = useMemo(() => {
    if (!optionsChain.length) return [];
    const m = new Map<number, { strike: number; ce: StockInfo | null; pe: StockInfo | null }>();
    for (const o of optionsChain) { const sp = o.strikePrice!; if (!m.has(sp)) m.set(sp, { strike: sp, ce: null, pe: null }); const e = m.get(sp)!; if (o.optionType === 'CE') e.ce = o; else e.pe = o; }
    return Array.from(m.values()).sort((a, b) => a.strike - b.strike);
  }, [optionsChain]);

  const atmStrike = useMemo(() => {
    if (!optionsChain.length) return 0;
    const u = equities.find(e => e.symbol === selectedUnderlying) || indices.find(i => i.symbol === selectedUnderlying);
    if (!u) return 0; const b = u.basePrice;
    let step: number; if (b > 20000) step = 200; else if (b > 5000) step = 100; else if (b > 1000) step = 50; else if (b > 300) step = 20; else step = 10;
    return Math.round(b / step) * step;
  }, [optionsChain, selectedUnderlying, equities, indices]);

  const handleSelectInstrument = (symbol: string, type: 'equity' | 'index' | 'option') => { setSelectedSymbol(symbol); setSelectedType(type); setSheetOpen(false); };
  const handleParamChange = (k: keyof StrategyParams, v: number) => setParams(p => ({ ...p, [k]: v }));
  const handleApplyParams = () => { setRecalculating(true); fetchData(selectedSymbol, params); };

  const currentRSI = latestSignal?.rsi ?? 0;
  const currentSTDir = latestSignal?.supertrendDir ?? 0;
  const currentSTValue = latestSignal?.supertrend ?? 0;
  const displayPrice = liveQuote?.price || latestData?.close || 0;
  const displayChange = liveQuote?.change || priceChange;
  const displayChangePct = liveQuote?.changePct || priceChangePct;

  const MainChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1.5">{formatDate(d.date)}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
          <span>O: {formatINR(d.open)}</span><span>H: {formatINR(d.high)}</span>
          <span>L: {formatINR(d.low)}</span><span>C: {formatINR(d.close)}</span>
          <span className="col-span-2 text-slate-400">Vol: {formatVol(d.volume)}</span>
          {d.supertrend !== null && <span className="col-span-2">ST: <span className={d.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400'}>{formatINR(d.supertrend)}</span> ({d.supertrendDir === 1 ? 'Bullish' : 'Bearish'})</span>}
          {d.signal && d.signal !== 'HOLD' && <span className={`col-span-2 font-semibold ${getSignalColor(d.signal)}`}>{d.signal.replace('_', ' ')}</span>}
        </div>
      </div>);
  };

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white truncate">NSE Trading Dashboard</h1>
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
                  <span className="hidden sm:inline">Supertrend + RSI + MACD Confluence</span>
                  {liveQuote && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1">
                      <CircleDot className="w-2.5 h-2.5" /> LIVE
                    </Badge>
                  )}
                  {dataSource === 'yahoo_finance_realtime' && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-400">REAL DATA</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs" onClick={() => fetchQuote(selectedSymbol)} disabled={quoteLoading}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${quoteLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>

              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="shrink-0 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline truncate max-w-[200px]">{liveQuote?.name || stockInfo?.symbol || selectedSymbol}</span>
                    <Badge variant="outline" className={`ml-1 text-[10px] px-1.5 py-0 font-semibold ${getTypeBadgeColor(selectedType === 'option' ? stockInfo?.optionType || 'option' : selectedType)}`}>
                      {selectedType === 'option' ? (stockInfo?.optionType || 'OPT') : selectedType.toUpperCase()}
                    </Badge>
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </Button>
                </SheetTrigger>

                <SheetContent side="right" className="w-full sm:w-[500px] bg-slate-950 border-slate-800 p-0">
                  <SheetHeader className="px-4 pt-4 pb-0">
                    <SheetTitle className="text-white flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-400" /> Select Instrument</SheetTitle>
                    <SheetDescription className="text-slate-400">100+ equities, 16 indices, F&O options</SheetDescription>
                  </SheetHeader>
                  <Tabs defaultValue="equities" className="mt-3 px-4">
                    <TabsList className="bg-slate-900 w-full border border-slate-800 h-10">
                      <TabsTrigger value="equities" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                        <BarChart2 className="w-3.5 h-3.5" /> Equities <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-300">{stats.totalEquities > 99 ? '100+' : stats.totalEquities}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="indices" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
                        <TrendingUp className="w-3.5 h-3.5" /> Indices <Badge variant="outline" className="text-[9px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-300">{stats.totalIndices}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="options" className="flex-1 gap-1.5 text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
                        <GitBranch className="w-3.5 h-3.5" /> Options
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="equities" className="mt-3">
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <Input placeholder="Search symbol or name..." value={equitySearch} onChange={e => setEquitySearch(e.target.value)} className="pl-9 h-9 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 text-sm" />
                          {equitySearch && <button onClick={() => setEquitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                        <Select value={selectedSector} onValueChange={setSelectedSector}>
                          <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-slate-300 text-xs w-full"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all">All Sectors</SelectItem>
                            {sectors.map(s => <SelectItem key={s} value={s} className="text-slate-200">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="text-[11px] text-slate-500 px-1">{filteredEquities.length} instruments</div>
                        <ScrollArea className="h-[calc(100vh-360px)] min-h-[300px]">
                          <div className="space-y-0.5 pr-2">
                            {filteredEquities.map(s => (
                              <button key={s.symbol} onClick={() => handleSelectInstrument(s.symbol, 'equity')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:bg-slate-800/70 group ${selectedSymbol === s.symbol ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-emerald-400">{s.symbol}</span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700 text-slate-400">EQ</Badge>
                                    {s.lotSize && <span className="text-[9px] text-slate-600">Lot:{s.lotSize}</span>}
                                  </div>
                                  <div className="text-xs text-slate-400 truncate mt-0.5">{s.name}</div>
                                </div>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-700 text-slate-500 shrink-0">{s.sector}</Badge>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>

                    <TabsContent value="indices" className="mt-3">
                      <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px]">
                        <div className="grid grid-cols-1 gap-1.5 pr-2">
                          {indices.map(idx => (
                            <button key={idx.symbol} onClick={() => handleSelectInstrument(idx.symbol, 'index')} className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors hover:bg-slate-800/70 ${selectedSymbol === idx.symbol ? 'bg-purple-500/10 border border-purple-500/20' : 'border border-transparent'}`}>
                              <div>
                                <div className="flex items-center gap-2"><span className="font-semibold text-sm text-purple-400">{idx.symbol}</span><Badge variant="outline" className="text-[9px] px-1 py-0 border-slate-700 text-slate-400">IDX</Badge></div>
                                <div className="text-xs text-slate-400 mt-0.5">{idx.name}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="options" className="mt-3">
                      <div className="space-y-3">
                        <Select value={selectedUnderlying} onValueChange={setSelectedUnderlying}>
                          <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-slate-200 text-sm"><SelectValue placeholder="Select underlying..." /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700 max-h-[200px]">
                            {optionUnderlyings.map(u => <SelectItem key={u} value={u} className="text-slate-200">{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {expiryDates.length > 0 && (
                          <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                            <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-slate-300 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              {expiryDates.map(e => <SelectItem key={e} value={e} className="text-slate-200">{formatExpiry(e)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {optionsLoading ? <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" /></div> : optionsChain.length > 0 ? (
                          <ScrollArea className="h-[calc(100vh-420px)] min-h-[200px]">
                            <div className="rounded-lg border border-slate-800 overflow-hidden">
                              <Table>
                                <TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50">
                                  <TableHead className="text-slate-400 text-[10px] p-1.5 text-right">CE LTP</TableHead>
                                  <TableHead className="text-slate-400 text-[10px] p-1.5 text-right">OI</TableHead>
                                  <TableHead className="text-slate-400 text-[10px] p-1.5 text-center">Strike</TableHead>
                                  <TableHead className="text-slate-400 text-[10px] p-1.5 text-left">OI</TableHead>
                                  <TableHead className="text-slate-400 text-[10px] p-1.5 text-left">PE LTP</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>{optionsChainGrouped.map(row => {
                                  const isATM = row.strike === atmStrike;
                                  return (
                                    <TableRow key={row.strike} className={`border-slate-800 hover:bg-slate-800/50 ${isATM ? 'bg-amber-500/5' : ''}`}>
                                      <TableCell className="p-1.5 text-right cursor-pointer" onClick={() => row.ce && handleSelectInstrument(row.ce.symbol, 'option')}>
                                        {row.ce ? <span className="text-emerald-400 text-xs font-medium">{formatINR(row.ce.basePrice)}</span> : <span className="text-slate-600 text-xs">-</span>}
                                      </TableCell>
                                      <TableCell className="p-1.5 text-right text-xs text-slate-400">{row.ce ? '—' : '-'}</TableCell>
                                      <TableCell className="p-1.5 text-center"><span className={`text-xs font-bold ${isATM ? 'text-amber-400' : 'text-slate-300'}`}>{row.strike}{isATM && <span className="ml-1 text-[9px] text-amber-500">ATM</span>}</span></TableCell>
                                      <TableCell className="p-1.5 text-left text-xs text-slate-400">-</TableCell>
                                      <TableCell className="p-1.5 text-left cursor-pointer" onClick={() => row.pe && handleSelectInstrument(row.pe.symbol, 'option')}>
                                        {row.pe ? <span className="text-red-400 text-xs font-medium">{formatINR(row.pe.basePrice)}</span> : <span className="text-slate-600 text-xs">-</span>}
                                      </TableCell>
                                    </TableRow>);
                                })}</TableBody>
                              </Table>
                            </div>
                          </ScrollArea>
                        ) : <div className="text-center py-16 text-slate-500 text-sm"><GitBranch className="w-10 h-10 mx-auto mb-3 text-slate-700" />Select an underlying</div>}
                      </div>
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1800px] mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
        {/* ===== LIVE QUOTE HERO ===== */}
        {quoteLoading && !liveQuote ? <QuoteHeroSkeleton /> : liveQuote && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Main Price Card */}
            <Card className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 border-slate-700/50 py-4">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] px-1.5 font-semibold ${getTypeBadgeColor(liveQuote.type)}`}>{liveQuote.type.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400">{liveQuote.exchange}</Badge>
                      {liveQuote.marketState === 'REGULAR' && <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CircleDot className="w-2 h-2" /> Market Open</span>}
                    </div>
                    <h2 className="text-xl font-bold text-white">{liveQuote.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{liveQuote.longName}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{liveQuote.sector} {liveQuote.industry ? '· ' + liveQuote.industry : ''}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-white">{formatINR(liveQuote.price)}</span>
                  <div className="flex items-center gap-1.5">
                    {displayChange >= 0 ? <ArrowUp className="w-4 h-4 text-emerald-400" /> : <ArrowDown className="w-4 h-4 text-red-400" />}
                    <span className={`text-lg font-semibold ${displayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
                {/* Day range bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>Day Low: {formatINR(liveQuote.dayLow)}</span><span>Day High: {formatINR(liveQuote.dayHigh)}</span></div>
                  <div className="relative h-1.5 bg-slate-800 rounded-full">
                    {liveQuote.dayHigh > liveQuote.dayLow && (
                      <div className="absolute h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full" style={{ left: '0%', width: '100%' }} />
                    )}
                    <div className="absolute h-3 w-0.5 bg-white rounded-full -top-[3px] transition-all" style={{ left: `${((liveQuote.price - liveQuote.dayLow) / (liveQuote.dayHigh - liveQuote.dayLow)) * 100}%` }} />
                  </div>
                </div>
                {/* OHLCV */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div><div className="text-[10px] text-slate-500">Open</div><div className="text-xs font-medium text-slate-200">{formatINR(liveQuote.open)}</div></div>
                  <div><div className="text-[10px] text-slate-500">High</div><div className="text-xs font-medium text-slate-200">{formatINR(liveQuote.dayHigh)}</div></div>
                  <div><div className="text-[10px] text-slate-500">Low</div><div className="text-xs font-medium text-slate-200">{formatINR(liveQuote.dayLow)}</div></div>
                  <div><div className="text-[10px] text-slate-500">Prev Close</div><div className="text-xs font-medium text-slate-200">{formatINR(liveQuote.prevClose)}</div></div>
                </div>
                {/* Volume */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
                  <div><span className="text-[10px] text-slate-500">Volume</span><div className="text-xs font-medium text-slate-200">{formatVol(liveQuote.volume)}</div></div>
                  <div><span className="text-[10px] text-slate-500">Avg Vol (3M)</span><div className="text-xs font-medium text-slate-200">{formatVol(liveQuote.avgVolume)}</div></div>
                  <Tooltip><TooltipTrigger><Badge variant="outline" className={`text-[10px] px-1.5 ${liveQuote.volumeRatio > 1.5 ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-slate-600 text-slate-400'}`}>Vol Ratio: {liveQuote.volumeRatio.toFixed(2)}x</Badge></TooltipTrigger><TooltipContent>Volume / Average Daily Volume</TooltipContent></Tooltip>
                </div>
                {/* 52W Range */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>52W Low: {formatINR(liveQuote.low52w)}</span>
                    <span className={liveQuote.percentFrom52wLow >= 0 ? 'text-emerald-400' : 'text-red-400'}>{liveQuote.percentFrom52wLow >= 0 ? '+' : ''}{liveQuote.percentFrom52wLow.toFixed(1)}%</span>
                    <span>52W High: {formatINR(liveQuote.high52w)}</span>
                  </div>
                  <div className="relative h-2 bg-slate-800 rounded-full">
                    <div className="absolute h-full bg-gradient-to-r from-red-500/60 via-amber-500/60 to-emerald-500/60 rounded-full" style={{ left: `${Math.max(0, Math.min(95, (1 - (liveQuote.high52w - liveQuote.low52w > 0 ? (liveQuote.high52w - liveQuote.price) / (liveQuote.high52w - liveQuote.low52w) : 0.5)) * 100))}%`, right: '0' }} />
                    <div className="absolute h-3 w-0.5 bg-white rounded-full -top-[2px] transition-all" style={{ left: `${(liveQuote.high52w - liveQuote.low52w > 0 ? (liveQuote.price - liveQuote.low52w) / (liveQuote.high52w - liveQuote.low52w) : 0.5) * 100}%` }} />
                  </div>
                  <div className="text-right text-[10px] mt-0.5"><span className={liveQuote.percentFrom52wHigh >= 0 ? 'text-emerald-400' : 'text-red-400'}>{liveQuote.percentFrom52wHigh >= 0 ? '+' : ''}{liveQuote.percentFrom52wHigh.toFixed(1)}% from 52W High</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Fundamentals KPI Grid */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard icon={<DollarSign className="w-3.5 h-3.5" />} label="Market Cap" value={liveQuote.marketCap ? formatNum(liveQuote.marketCap) : '-'} sub={liveQuote.type === 'equity' ? '₹' : ''} color="text-blue-400" />
              <KPICard icon={<Target className="w-3.5 h-3.5" />} label="P/E Ratio" value={liveQuote.pe?.toFixed(2) || '-'} sub={liveQuote.forwardPE ? `Fwd: ${liveQuote.forwardPE.toFixed(2)}` : ''} color={liveQuote.pe && liveQuote.pe > 50 ? 'text-red-400' : liveQuote.pe && liveQuote.pe > 30 ? 'text-amber-400' : 'text-emerald-400'} />
              <KPICard icon={<Building2 className="w-3.5 h-3.5" />} label="P/B Ratio" value={liveQuote.pb?.toFixed(2) || '-'} sub={liveQuote.bookValue ? `BV: ${formatINR(liveQuote.bookValue)}` : ''} color={liveQuote.pb && liveQuote.pb > 5 ? 'text-red-400' : 'text-blue-400'} />
              <KPICard icon={<Percent className="w-3.5 h-3.5" />} label="Div Yield" value={liveQuote.dividendYield?.toFixed(2) + '%' || '-'} sub={liveQuote.payoutRatio ? `Payout: ${(liveQuote.payoutRatio * 100).toFixed(0)}%` : ''} color="text-emerald-400" />
              <KPICard icon={<Activity className="w-3.5 h-3.5" />} label="EPS (TTM)" value={liveQuote.eps ? formatINR(liveQuote.eps) : '-'} sub="" color="text-cyan-400" />
              <KPICard icon={<Gauge className="w-3.5 h-3.5" />} label="ROE" value={liveQuote.roe?.toFixed(1) + '%' || '-'} sub={liveQuote.roa ? `ROA: ${liveQuote.roa.toFixed(1)}%` : ''} color={liveQuote.roe && liveQuote.roe > 15 ? 'text-emerald-400' : 'text-amber-400'} />
              <KPICard icon={<TrendingDown className="w-3.5 h-3.5" />} label="D/E Ratio" value={liveQuote.debtToEquity?.toFixed(2) || '-'} sub={liveQuote.currentRatio ? `CR: ${liveQuote.currentRatio.toFixed(2)}` : ''} color={liveQuote.debtToEquity && liveQuote.debtToEquity > 1 ? 'text-red-400' : 'text-emerald-400'} />
              <KPICard icon={<Zap className="w-3.5 h-3.5" />} label="Revenue Growth" value={liveQuote.revenueGrowth?.toFixed(1) + '%' || '-'} sub={liveQuote.profitMargins ? `Margin: ${liveQuote.profitMargins.toFixed(1)}%` : ''} color={liveQuote.revenueGrowth && liveQuote.revenueGrowth > 0 ? 'text-emerald-400' : 'text-red-400'} />

              {/* Technical Position */}
              <Card className="col-span-2 bg-slate-900 border-slate-800 p-3">
                <div className="text-[10px] text-slate-500 font-medium mb-2 flex items-center gap-1"><Radio className="w-3 h-3" /> Technical Position (DMA)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-slate-400">50 DMA</span>
                    <span className={`text-xs font-bold ${liveQuote.percentAbove50DMA !== null ? (liveQuote.percentAbove50DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {liveQuote.fiftyDMA ? formatINR(liveQuote.fiftyDMA) : '-'}
                      {liveQuote.percentAbove50DMA !== null && <span className="ml-1 text-[10px]">({liveQuote.percentAbove50DMA >= 0 ? '+' : ''}{liveQuote.percentAbove50DMA.toFixed(1)}%)</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2">
                    <span className="text-[11px] text-slate-400">200 DMA</span>
                    <span className={`text-xs font-bold ${liveQuote.percentAbove200DMA !== null ? (liveQuote.percentAbove200DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {liveQuote.twoHundredDMA ? formatINR(liveQuote.twoHundredDMA) : '-'}
                      {liveQuote.percentAbove200DMA !== null && <span className="ml-1 text-[10px]">({liveQuote.percentAbove200DMA >= 0 ? '+' : ''}{liveQuote.percentAbove200DMA.toFixed(1)}%)</span>}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Analyst Consensus */}
              <Card className="col-span-2 bg-slate-900 border-slate-800 p-3">
                <div className="text-[10px] text-slate-500 font-medium mb-2 flex items-center gap-1"><Eye className="w-3 h-3" /> Analyst Consensus</div>
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold ${liveQuote.recommendation === 'strong_buy' || liveQuote.recommendation === 'buy' ? 'text-emerald-400' : liveQuote.recommendation === 'sell' || liveQuote.recommendation === 'strong_sell' ? 'text-red-400' : 'text-amber-400'}`}>
                    {liveQuote.recommendation ? liveQuote.recommendation.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                  </div>
                  {liveQuote.analysts && <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-400">{liveQuote.analysts} analysts</Badge>}
                </div>
                {liveQuote.targetMean && (
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-slate-500">Target Low</span><div className="text-xs text-red-400 font-medium">{formatINR(liveQuote.targetLow!)}</div></div>
                    <div><span className="text-slate-500">Target Mean</span><div className="text-xs text-white font-bold">{formatINR(liveQuote.targetMean)}</div></div>
                    <div><span className="text-slate-500">Target High</span><div className="text-xs text-emerald-400 font-medium">{formatINR(liveQuote.targetHigh!)}</div></div>
                  </div>
                )}
                {liveQuote.targetMean && liveQuote.price && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-500">Current: {formatINR(liveQuote.price)}</span>
                      <span className="text-emerald-400">Target: {formatINR(liveQuote.targetMean)} ({((liveQuote.targetMean - liveQuote.price) / liveQuote.price * 100).toFixed(1)}% upside)</span>
                    </div>
                    <Progress value={Math.min(100, (liveQuote.price / liveQuote.targetMean) * 100)} className="h-1.5 bg-slate-800" />
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ===== MAIN CHART ===== */}
        {loading ? <DashboardSkeleton /> : (
          <>
            <Card className="bg-slate-900 border-slate-800 py-4 gap-4">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Price Chart with Supertrend
                    {latestData && <span className="ml-2"><span className="text-white font-semibold text-base">{formatINR(latestData.close)}</span> <span className={`ml-1.5 text-sm font-medium ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{priceChange >= 0 ? '+' : ''}{formatINR(priceChange)} ({priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%)</span></span>}
                    {dataSource === 'yahoo_finance_realtime' && <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/30">LIVE DATA</Badge>}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800" disabled={!canSlideRight} onClick={() => setChartOffset(p => Math.max(0, p - 50))}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-180"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800" disabled={!canSlideLeft} onClick={() => setChartOffset(p => p + 50)}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[350px] sm:h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={visibleData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs><linearGradient id="pGB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} axisLine={{ stroke: '#334155' }} tickLine={false} interval={Math.floor(visibleData.length / 8)} />
                      <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: number) => '₹' + v.toLocaleString('en-IN')} axisLine={{ stroke: '#334155' }} tickLine={false} width={75} />
                      <RechartsTooltip content={<MainChartTooltip />} />
                      <Line type="monotone" dataKey="supertrend" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Supertrend" connectNulls={false} strokeDasharray="4 2" />
                      <Area type="monotone" dataKey="close" stroke="#e2e8f0" strokeWidth={2} fill="url(#pGB)" name="Close" isAnimationActive={false} />
                      {visibleData.map((d, idx) => {
                        if (d.signal === 'STRONG_BUY' || d.signal === 'BUY') return <ReferenceDot key={`b-${idx}`} x={d.date} y={d.close} r={5} fill="#10b981" stroke="#064e3b" strokeWidth={1} shape={<g><polygon points={`${0},${6} ${-5},${-4} ${5},${-4}`} fill="#10b981" stroke="#064e3b" strokeWidth={1} /></g>} />;
                        if (d.signal === 'STRONG_SELL' || d.signal === 'SELL') return <ReferenceDot key={`s-${idx}`} x={d.date} y={d.close} r={5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} shape={<g><polygon points={`${0},${-6} ${-5},${4} ${5},${4}`} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} /></g>} />;
                        return null;
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* INDICATOR PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0"><CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> RSI ({params.rsiPeriod})</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 shrink-0"><svg viewBox="0 0 100 100" className="w-full h-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke={currentRSI < 30 ? '#ef4444' : currentRSI > 70 ? '#ef4444' : '#10b981'} strokeWidth="8" strokeDasharray={`${(currentRSI / 100) * 264} 264`} strokeLinecap="round" /></svg><div className="absolute inset-0 flex items-center justify-center"><span className={`text-lg font-bold ${currentRSI < 30 ? 'text-red-400' : currentRSI > 70 ? 'text-red-400' : 'text-emerald-400'}`}>{currentRSI.toFixed(1)}</span></div></div>
                    <div className="space-y-1.5 text-xs"><div className="flex items-center gap-2"><span className="text-slate-500">Zone:</span><span className={currentRSI < 30 ? 'text-red-400 font-medium' : currentRSI > 70 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>{currentRSI < 30 ? 'Oversold' : currentRSI > 70 ? 'Overbought' : 'Neutral'}</span></div><div className="flex items-center gap-2"><span className="text-slate-500">OB:</span><span className="text-slate-300">{params.rsiOverbought}</span></div><div className="flex items-center gap-2"><span className="text-slate-500">OS:</span><span className="text-slate-300">{params.rsiOversold}</span></div></div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0"><CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> MACD ({params.macdFast},{params.macdSlow},{params.macdSignal})</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-[80px]"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={visibleData.slice(-50)} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}><Bar dataKey="macdHistogram" name="Histogram">{visibleData.slice(-50).map((d, i) => <Cell key={i} fill={d.macdHistogram !== null && d.macdHistogram >= 0 ? '#10b981' : '#ef4444'} opacity={0.7} />)}</Bar><Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" connectNulls={false} /><Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Signal" connectNulls={false} /></ComposedChart></ResponsiveContainer></div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>MACD: <span className={latestSignal?.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}>{latestSignal?.macd?.toFixed(2) ?? '-'}</span></span><span>Sig: <span className={latestSignal?.macdSignal >= 0 ? 'text-emerald-400' : 'text-red-400'}>{latestSignal?.macdSignal?.toFixed(2) ?? '-'}</span></span></div>
                </CardContent>
              </Card>
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0"><CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Supertrend ({params.supertrendPeriod},{params.supertrendMultiplier})</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-20 h-20 rounded-full border-2 ${currentSTDir === 1 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}><div className="text-center">{currentSTDir === 1 ? <TrendingUp className="w-6 h-6 mx-auto text-emerald-400" /> : <TrendingDown className="w-6 h-6 mx-auto text-red-400" />}<span className={`text-[10px] font-medium ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{currentSTDir === 1 ? 'Bullish' : 'Bearish'}</span></div></div>
                    <div className="space-y-1.5 text-xs"><div className="flex items-center gap-2"><span className="text-slate-500">Value:</span><span className={`font-medium ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{formatINR(currentSTValue)}</span></div><div className="flex items-center gap-2"><span className="text-slate-500">Period:</span><span className="text-slate-300">{params.supertrendPeriod}</span></div><div className="flex items-center gap-2"><span className="text-slate-500">Mult:</span><span className="text-slate-300">{params.supertrendMultiplier}</span></div></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SIGNAL CARD */}
            {latestSignal && (
              <Card className={`border py-4 gap-4 ${{ STRONG_BUY: 'bg-emerald-950/40 border-emerald-500/30', BUY: 'bg-green-950/40 border-green-500/30', HOLD: 'bg-amber-950/30 border-amber-500/30', SELL: 'bg-orange-950/30 border-orange-500/30', STRONG_SELL: 'bg-red-950/40 border-red-500/30' }[latestSignal.signal]}`}>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-16 h-16 rounded-xl border-2 ${getSignalBg(latestSignal.signal)}`}><span className="text-2xl">{getSignalIcon(latestSignal.signal)}</span></div>
                    <div><div className="text-xs text-slate-400 mb-0.5">Latest Signal</div><div className={`text-2xl font-bold ${getSignalColor(latestSignal.signal)}`}>{latestSignal.signal.replace('_', ' ')}</div><div className="text-xs text-slate-400 mt-1 max-w-md">{latestSignal.reason}</div></div>
                  </div>
                  <div className="text-right"><div className="text-xs text-slate-400">Current Price</div><div className="text-2xl font-bold text-white">{formatINR(latestSignal.close)}</div><div className={`text-sm font-medium ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{priceChange >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%</div><div className="text-[10px] text-slate-500 mt-1">{formatDate(latestSignal.date)}</div></div>
                </CardContent>
              </Card>
            )}

            {/* PEERS TABLE */}
            {peers.length > 0 && (
              <Card className="bg-slate-900 border-slate-800 py-4 gap-4">
                <CardHeader className="pb-0"><CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" /> Sector Peers Comparison</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-md border border-slate-800">
                    <Table><TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 text-[10px]">Symbol</TableHead>
                      <TableHead className="text-slate-400 text-[10px] text-right">Price</TableHead>
                      <TableHead className="text-slate-400 text-[10px] text-right">Change %</TableHead>
                      <TableHead className="text-slate-400 text-[10px] text-right">MCap</TableHead>
                      <TableHead className="text-slate-400 text-[10px] text-right">P/E</TableHead>
                      <TableHead className="text-slate-400 text-[10px] text-right">ROE</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{peers.map(p => (
                      <TableRow key={p.symbol} className="border-slate-800 hover:bg-slate-800/50 cursor-pointer" onClick={() => handleSelectInstrument(p.symbol, 'equity')}>
                        <TableCell className="text-xs"><span className="text-emerald-400 font-medium">{p.symbol}</span></TableCell>
                        <TableCell className="text-xs text-right font-mono">{formatINR(p.price)}</TableCell>
                        <TableCell className={`text-xs text-right font-semibold ${p.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%</TableCell>
                        <TableCell className="text-xs text-right text-slate-300">{formatNum(p.marketCap)}</TableCell>
                        <TableCell className="text-xs text-right text-slate-300">{p.pe?.toFixed(1) || '-'}</TableCell>
                        <TableCell className="text-xs text-right text-slate-300">{p.roe?.toFixed(1) + '%' || '-'}</TableCell>
                      </TableRow>
                    ))}</TableBody></Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BACKTEST */}
            {backtest && (<>
              <div className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-400" /><h2 className="text-sm font-semibold text-slate-300">Backtest Results</h2></div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Total Return" value={`${backtest.totalReturnPct >= 0 ? '+' : ''}${backtest.totalReturnPct.toFixed(2)}%`} color={backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                <MetricCard icon={<Trophy className="w-4 h-4" />} label="Win Rate" value={`${backtest.winRate.toFixed(1)}%`} color={backtest.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
                <MetricCard icon={<Activity className="w-4 h-4" />} label="Total Trades" value={String(backtest.totalTrades)} color="text-slate-200" />
                <MetricCard icon={<Zap className="w-4 h-4" />} label="Winning" value={String(backtest.winningTrades)} color="text-emerald-400" />
                <MetricCard icon={<Flame className="w-4 h-4" />} label="Losing" value={String(backtest.losingTrades)} color="text-red-400" />
                <MetricCard icon={<ArrowUp className="w-4 h-4" />} label="Avg Win" value={`+${backtest.avgWinPct.toFixed(2)}%`} color="text-emerald-400" />
                <MetricCard icon={<ArrowDown className="w-4 h-4" />} label="Avg Loss" value={`${backtest.avgLossPct.toFixed(2)}%`} color="text-red-400" />
                <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Max Drawdown" value={`-${backtest.maxDrawdownPct.toFixed(2)}%`} color={backtest.maxDrawdownPct > 10 ? 'text-red-400' : 'text-amber-400'} />
              </div>
              <Card className="bg-slate-900 border-slate-800 py-4 gap-4">
                <CardHeader className="pb-0"><CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Trade History (Last {backtest.trades.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="max-h-72 overflow-y-auto rounded-md border border-slate-800">
                    <Table><TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 text-xs">Entry</TableHead><TableHead className="text-slate-400 text-xs">Exit</TableHead><TableHead className="text-slate-400 text-xs text-right">Entry Price</TableHead><TableHead className="text-slate-400 text-xs text-right">Exit Price</TableHead><TableHead className="text-slate-400 text-xs text-right">P&L %</TableHead><TableHead className="text-slate-400 text-xs">Signal</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{backtest.trades.map((t, i) => (
                      <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-slate-300 text-xs font-mono">{formatDate(t.entryDate)}</TableCell>
                        <TableCell className="text-slate-300 text-xs font-mono">{formatDate(t.exitDate)}</TableCell>
                        <TableCell className="text-slate-300 text-xs text-right font-mono">{formatINR(t.entryPrice)}</TableCell>
                        <TableCell className="text-slate-300 text-xs text-right font-mono">{formatINR(t.exitPrice)}</TableCell>
                        <TableCell className={`text-xs text-right font-semibold font-mono ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getSignalBg(t.signal)}`}>{t.signal}</Badge></TableCell>
                      </TableRow>
                    ))}{backtest.trades.length === 0 && <TableRow className="border-slate-800"><TableCell className="text-slate-500 text-center py-8" colSpan={6}>No trades</TableCell></TableRow>}</TableBody></Table>
                  </div>
                </CardContent>
              </Card>
            </>)}

            {/* STRATEGY PARAMETERS */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="params" className="border-slate-800">
                <AccordionTrigger className="text-sm font-medium text-slate-300 hover:no-underline py-3"><div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-slate-400" /> Strategy Parameters {recalculating && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}</div></AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <ParamSlider label="ST Period" value={params.supertrendPeriod} min={5} max={20} step={1} onChange={v => handleParamChange('supertrendPeriod', v)} />
                    <ParamSlider label="ST Multiplier" value={params.supertrendMultiplier} min={1} max={5} step={0.5} onChange={v => handleParamChange('supertrendMultiplier', v)} />
                    <ParamSlider label="RSI Period" value={params.rsiPeriod} min={5} max={30} step={1} onChange={v => handleParamChange('rsiPeriod', v)} />
                    <ParamSlider label="RSI Overbought" value={params.rsiOverbought} min={60} max={90} step={1} onChange={v => handleParamChange('rsiOverbought', v)} />
                    <ParamSlider label="RSI Oversold" value={params.rsiOversold} min={10} max={40} step={1} onChange={v => handleParamChange('rsiOversold', v)} />
                    <ParamSlider label="MACD Fast" value={params.macdFast} min={5} max={20} step={1} onChange={v => handleParamChange('macdFast', v)} />
                    <ParamSlider label="MACD Slow" value={params.macdSlow} min={15} max={40} step={1} onChange={v => handleParamChange('macdSlow', v)} />
                    <ParamSlider label="MACD Signal" value={params.macdSignal} min={3} max={15} step={1} onChange={v => handleParamChange('macdSignal', v)} />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleApplyParams} disabled={recalculating} className="bg-emerald-600 hover:bg-emerald-700 text-white">{recalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Apply & Recalculate</Button>
                    <Button variant="ghost" onClick={() => setParams({ ...DEFAULT_PARAMS })} className="text-slate-400 hover:text-white">Reset</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4">
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Data sourced from Yahoo Finance (real-time). Strategy signals are for educational purposes. Not financial advice. Always do your own research before trading.
          </p>
        </div>
      </footer>
    </div>
    </TooltipProvider>
  );
}

// ==================== SUB-COMPONENTS ====================

function KPICard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card className="bg-slate-900 border-slate-800 p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-500">{icon}<span className="text-[10px] font-medium">{label}</span></div>
      <div className={`text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </Card>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-[11px] font-medium">{label}</span></div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ParamSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between"><label className="text-xs text-slate-400 font-medium">{label}</label><Input type="number" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} className="w-16 h-7 text-xs text-right bg-slate-800 border-slate-700 text-slate-200" /></div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="py-1" />
      <div className="flex justify-between text-[10px] text-slate-600"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function QuoteHeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4"><Skeleton className="h-4 w-32 mb-3 bg-slate-800" /><Skeleton className="h-8 w-48 mb-2 bg-slate-800" /><Skeleton className="h-4 w-64 mb-6 bg-slate-800" /><Skeleton className="h-10 w-40 mb-4 bg-slate-800" /><Skeleton className="h-24 w-full bg-slate-800 rounded" /></div>
      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3"><Skeleton className="h-3 w-16 mb-2 bg-slate-800" /><Skeleton className="h-5 w-12 bg-slate-800" /></div>)}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><Skeleton className="h-6 w-48 mb-4 bg-slate-800" /><Skeleton className="h-[350px] w-full bg-slate-800 rounded-lg" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4"><Skeleton className="h-4 w-32 mb-3 bg-slate-800" /><Skeleton className="h-20 w-full bg-slate-800 rounded-lg" /></div>)}</div>
    </div>
  );
}