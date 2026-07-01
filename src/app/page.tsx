'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, Bar, Cell,
} from 'recharts';
import {
  TrendingUp, ArrowUp, ArrowDown, Activity, BarChart3, Target, Trophy,
  TrendingDown, AlertTriangle, Zap, Shield, Flame, Settings2,
  RefreshCw, Search, X, Layers, BarChart2, GitBranch,
  DollarSign, Percent, Users, Building2, Radio, Eye,
  CircleDot, Gauge, ChevronRight, Wallet, LineChart as LineChartIcon, PieChartIcon,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ==================== TYPES ====================
interface StockInfo { symbol: string; name: string; sector: string; basePrice: number; volatility: number; type: 'equity' | 'index' | 'option'; underlying?: string; strikePrice?: number; optionType?: 'CE' | 'PE'; expiry?: string; lotSize?: number; }
interface OHLCV { date: string; open: number; high: number; low: number; close: number; volume: number; }
type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
interface StrategySignal { date: string; close: number; signal: SignalType; supertrend: number; supertrendDir: number; rsi: number; macd: number; macdSignal: number; macdHistogram: number; reason: string; }
interface TradeRecord { entryDate: string; exitDate: string; entryPrice: number; exitPrice: number; type: 'LONG' | 'SHORT'; pnl: number; pnlPct: number; signal: SignalType; }
interface BacktestResult { totalReturn: number; totalReturnPct: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number; avgWinPct: number; avgLossPct: number; maxDrawdownPct: number; profitFactor: number; trades: TradeRecord[]; }
interface StrategyParams { supertrendPeriod: number; supertrendMultiplier: number; rsiPeriod: number; rsiOverbought: number; rsiOversold: number; macdFast: number; macdSlow: number; macdSignal: number; }
interface ChartDataPoint { date: string; open: number; high: number; low: number; close: number; volume: number; supertrend: number | null; supertrendDir: number | null; rsi: number | null; macd: number | null; macdSignal: number | null; macdHistogram: number | null; signal: SignalType | null; }
interface LiveQuote { symbol: string; name: string; longName: string; sector: string; industry: string; exchange: string; currency: string; type: 'equity' | 'index'; price: number; change: number; changePct: number; prevClose: number; open: number; dayHigh: number; dayLow: number; volume: number; avgVolume: number; volumeRatio: number; marketCap: number; pe: number | null; forwardPE: number | null; pb: number | null; eps: number | null; bookValue: number | null; dividendYield: number | null; payoutRatio: number | null; high52w: number; low52w: number; percentFrom52wHigh: number; percentFrom52wLow: number; fiftyDMA: number | null; twoHundredDMA: number | null; percentAbove50DMA: number | null; percentAbove200DMA: number | null; beta: number | null; roe: number | null; roa: number | null; debtToEquity: number | null; revenueGrowth: number | null; profitMargins: number | null; operatingMargins: number | null; currentRatio: number | null; totalRevenue: number | null; ebitda: number | null; grossProfits: number | null; freeCashflow: number | null; recommendation: string | null; targetHigh: number | null; targetLow: number | null; targetMean: number | null; targetMedian: number | null; analysts: number | null; instHolding: number | null; insiderHolding: number | null; marketState: string; lastUpdated: string; }
interface PeerData { symbol: string; name: string; price: number; changePct: number; marketCap: number; pe: number | null; pb: number | null; divYield: number | null; roe: number | null; revenueGrowth: number | null; }
interface StocksResponse { instruments: StockInfo[]; stats?: { totalEquities: number; totalIndices: number; optionUnderlyings: number }; sectors?: string[]; underlyings?: string[]; expiryDates?: string[]; }
interface MarketOverview { nifty50: LiveQuote; bankNifty: LiveQuote; niftyIT: LiveQuote; indiaVix: LiveQuote; topGainers: LiveQuote[]; topLosers: LiveQuote[]; }

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
function formatDate(d: string): string { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
function formatExpiry(d: string): string { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function getSignalColor(s: SignalType): string { return { STRONG_BUY: 'text-emerald-400', BUY: 'text-green-400', HOLD: 'text-amber-400', SELL: 'text-orange-400', STRONG_SELL: 'text-red-400' }[s]; }
function getSignalBg(s: SignalType): string { return { STRONG_BUY: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400', BUY: 'bg-green-500/20 border-green-500/40 text-green-400', HOLD: 'bg-amber-500/20 border-amber-500/40 text-amber-400', SELL: 'bg-orange-500/20 border-orange-500/40 text-orange-400', STRONG_SELL: 'bg-red-500/20 border-red-500/40 text-red-400' }[s]; }
function getSignalIcon(s: SignalType): string { return { STRONG_BUY: '⬆⬆', BUY: '⬆', HOLD: '⏸', SELL: '⬇', STRONG_SELL: '⬇⬇' }[s]; }
function getTypeBadgeColor(t: string): string { return { equity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', index: 'bg-purple-500/15 text-purple-400 border-purple-500/30', CE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', PE: 'bg-red-500/15 text-red-400 border-red-500/30' }[t] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'; }

// ==================== MARKET BAR ITEM ====================
function MarketBarItem({ label, quote, accent }: { label: string; quote: LiveQuote | null; accent?: string }) {
  if (!quote) return <div className="flex flex-col items-center px-3 py-1.5"><span className="text-[10px] text-slate-500 font-medium">{label}</span><Skeleton className="h-3.5 w-16 bg-slate-800 mt-0.5" /></div>;
  const isUp = quote.changePct >= 0;
  return (
    <div className="flex flex-col items-center px-3 py-1.5">
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-slate-200 font-mono">{quote.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      <span className={`text-[10px] font-semibold font-mono ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>{isUp ? '+' : ''}{quote.changePct.toFixed(2)}%</span>
    </div>
  );
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
  const [lastDate, setLastDate] = useState<string>('');
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [deepTab, setDeepTab] = useState('fundamentals');

  // Fetch instruments + market overview
  useEffect(() => {
    Promise.all([
      fetch('/api/stocks?type=equity').then(r => r.json()),
      fetch('/api/stocks?type=index').then(r => r.json()),
      fetch('/api/stocks?type=option').then(r => r.json()),
      fetch('/api/quote?overview=true').then(r => r.json()).catch(() => null),
    ]).then(([eq, idx, opt, ov]: [StocksResponse, StocksResponse, StocksResponse, MarketOverview | null]) => {
      setEquities(eq.instruments || []);
      setIndices(idx.instruments || []);
      setSectors(eq.sectors || []);
      setStats(eq.stats || { totalEquities: 0, totalIndices: 0, optionUnderlyings: 0 });
      setOptionUnderlyings(opt.underlyings || []);
      if (ov) setOverview(ov);
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

  // Fetch signals
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
      setLastDate(data.lastDate || '');
    } catch (err) { console.error('Failed:', err); } finally { setLoading(false); setRecalculating(false); }
  }, []);

  // Fetch live quote
  const fetchQuote = useCallback(async (symbol: string) => {
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/quote?symbol=${symbol}&peers=true`);
      const data = await res.json();
      if (data.quote) { setLiveQuote(data.quote); setPeers(data.peers || []); }
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

  const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
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

  const q = liveQuote;
  const isLive = dataSource === 'yahoo_finance' || dataSource === 'yahoo_finance_realtime';

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ===== STICKY MARKET BAR ===== */}
      <div className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto px-4">
          {/* Top ribbon: market indices */}
          <div className="flex items-center justify-between py-1.5 border-b border-slate-800/50">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <MarketBarItem label="NIFTY 50" quote={overview?.nifty50 ?? null} />
              <div className="w-px h-8 bg-slate-800 mx-1" />
              <MarketBarItem label="BANK NIFTY" quote={overview?.bankNifty ?? null} />
              <div className="w-px h-8 bg-slate-800 mx-1" />
              <MarketBarItem label="NIFTY IT" quote={overview?.niftyIT ?? null} />
              <div className="w-px h-8 bg-slate-800 mx-1" />
              <MarketBarItem label="INDIA VIX" quote={overview?.indiaVix ?? null} />
            </div>
            {isLive && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1 shrink-0">
                <CircleDot className="w-2 h-2" /> LIVE
              </Badge>
            )}
          </div>
          {/* Second row: branding + selector */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate">NSE Analytics</h1>
                <div className="text-[10px] text-slate-500 hidden sm:block">Supertrend + RSI + MACD Confluence Strategy</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lastDate && <span className="text-[10px] text-slate-500 font-mono hidden md:inline">Data: {formatDate(lastDate)}</span>}
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-8" onClick={() => { fetchQuote(selectedSymbol); fetchData(selectedSymbol, params); }} disabled={quoteLoading || loading}>
                <RefreshCw className={`w-3 h-3 mr-1 ${quoteLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="shrink-0 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white gap-2 h-8 text-xs">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline truncate max-w-[180px]">{q?.name || selectedSymbol}</span>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 ${getTypeBadgeColor(selectedType === 'option' ? stockInfo?.optionType || 'option' : selectedType)}`}>
                      {selectedType === 'option' ? (stockInfo?.optionType || 'OPT') : selectedType.toUpperCase()}
                    </Badge>
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[500px] bg-slate-950 border-slate-800 p-0">
                  <SheetHeader className="px-4 pt-4 pb-0">
                    <SheetTitle className="text-white flex items-center gap-2"><Layers className="w-5 h-5 text-emerald-400" /> Select Instrument</SheetTitle>
                    <SheetDescription className="text-slate-400">100+ equities, 16 indices, F&O options</SheetDescription>
                  </SheetHeader>
                  <Tabs defaultValue="equities" className="mt-3 px-4">
                    <TabsList className="bg-slate-900 w-full border border-slate-800 h-9">
                      <TabsTrigger value="equities" className="flex-1 gap-1 text-[11px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
                        <BarChart2 className="w-3 h-3" /> Equities <Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-300">{stats.totalEquities > 99 ? '100+' : stats.totalEquities}</Badge>
                      </TabsTrigger>
                      <TabsTrigger value="indices" className="flex-1 gap-1 text-[11px] data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400">
                        <TrendingUp className="w-3 h-3" /> Indices
                      </TabsTrigger>
                      <TabsTrigger value="options" className="flex-1 gap-1 text-[11px] data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400">
                        <GitBranch className="w-3 h-3" /> Options
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="equities" className="mt-3">
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <Input placeholder="Search symbol or name..." value={equitySearch} onChange={e => setEquitySearch(e.target.value)} className="pl-9 h-8 bg-slate-900 border-slate-700 text-slate-200 placeholder:text-slate-500 text-xs" />
                          {equitySearch && <button onClick={() => setEquitySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3 h-3" /></button>}
                        </div>
                        <Select value={selectedSector} onValueChange={setSelectedSector}>
                          <SelectTrigger className="h-7 bg-slate-900 border-slate-700 text-slate-300 text-[11px] w-full"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="all">All Sectors</SelectItem>
                            {sectors.map(s => <SelectItem key={s} value={s} className="text-slate-200 text-xs">{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <div className="text-[10px] text-slate-500 px-1">{filteredEquities.length} instruments</div>
                        <ScrollArea className="h-[calc(100vh-340px)] min-h-[250px]">
                          <div className="space-y-0.5 pr-2">
                            {filteredEquities.map(s => (
                              <button key={s.symbol} onClick={() => handleSelectInstrument(s.symbol, 'equity')} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-slate-800/70 ${selectedSymbol === s.symbol ? 'bg-emerald-500/10 border border-emerald-500/20' : 'border border-transparent'}`}>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5"><span className="font-semibold text-xs text-emerald-400">{s.symbol}</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-700 text-slate-400">EQ</Badge></div>
                                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{s.name}</div>
                                </div>
                                <Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-700 text-slate-500 shrink-0">{s.sector}</Badge>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </TabsContent>
                    <TabsContent value="indices" className="mt-3">
                      <ScrollArea className="h-[calc(100vh-280px)] min-h-[250px]">
                        <div className="space-y-1 pr-2">
                          {indices.map(idx => (
                            <button key={idx.symbol} onClick={() => handleSelectInstrument(idx.symbol, 'index')} className={`w-full flex items-center justify-between px-2.5 py-2.5 rounded-lg text-left transition-colors hover:bg-slate-800/70 ${selectedSymbol === idx.symbol ? 'bg-purple-500/10 border border-purple-500/20' : 'border border-transparent'}`}>
                              <div><div className="flex items-center gap-1.5"><span className="font-semibold text-xs text-purple-400">{idx.symbol}</span><Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-700 text-slate-400">IDX</Badge></div><div className="text-[10px] text-slate-400 mt-0.5">{idx.name}</div></div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="options" className="mt-3">
                      <div className="space-y-2">
                        <Select value={selectedUnderlying} onValueChange={setSelectedUnderlying}>
                          <SelectTrigger className="h-8 bg-slate-900 border-slate-700 text-slate-200 text-xs"><SelectValue placeholder="Select underlying..." /></SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-700 max-h-[200px]">
                            {optionUnderlyings.map(u => <SelectItem key={u} value={u} className="text-slate-200">{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {expiryDates.length > 0 && (
                          <Select value={selectedExpiry} onValueChange={setSelectedExpiry}>
                            <SelectTrigger className="h-7 bg-slate-900 border-slate-700 text-slate-300 text-[11px]"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                              {expiryDates.map(e => <SelectItem key={e} value={e} className="text-slate-200 text-xs">{formatExpiry(e)}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        )}
                        {optionsLoading ? <div className="text-center py-10"><RefreshCw className="w-5 h-5 animate-spin text-amber-400 mx-auto" /></div> : optionsChain.length > 0 ? (
                          <ScrollArea className="h-[calc(100vh-400px)] min-h-[200px]">
                            <div className="rounded-lg border border-slate-800 overflow-hidden">
                              <Table><TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50">
                                <TableHead className="text-slate-400 text-[9px] p-1 text-right">CE LTP</TableHead>
                                <TableHead className="text-slate-400 text-[9px] p-1 text-center">Strike</TableHead>
                                <TableHead className="text-slate-400 text-[9px] p-1 text-left">PE LTP</TableHead>
                              </TableRow></TableHeader>
                              <TableBody>{optionsChainGrouped.map(row => {
                                const isATM = row.strike === atmStrike;
                                return (
                                  <TableRow key={row.strike} className={`border-slate-800 hover:bg-slate-800/50 ${isATM ? 'bg-amber-500/5' : ''}`}>
                                    <TableCell className="p-1 text-right cursor-pointer" onClick={() => row.ce && handleSelectInstrument(row.ce.symbol, 'option')}>
                                      {row.ce ? <span className="text-emerald-400 text-[11px] font-medium">{formatINR(row.ce.basePrice)}</span> : <span className="text-slate-600 text-[11px]">-</span>}
                                    </TableCell>
                                    <TableCell className="p-1 text-center"><span className={`text-[11px] font-bold ${isATM ? 'text-amber-400' : 'text-slate-300'}`}>{row.strike}{isATM && <span className="ml-0.5 text-[8px] text-amber-500">ATM</span>}</span></TableCell>
                                    <TableCell className="p-1 text-left cursor-pointer" onClick={() => row.pe && handleSelectInstrument(row.pe.symbol, 'option')}>
                                      {row.pe ? <span className="text-red-400 text-[11px] font-medium">{formatINR(row.pe.basePrice)}</span> : <span className="text-slate-600 text-[11px]">-</span>}
                                    </TableCell>
                                  </TableRow>);
                              })}</TableBody></Table>
                            </div>
                          </ScrollArea>
                        ) : <div className="text-center py-14 text-slate-500 text-xs"><GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-700" />Select an underlying</div>}
                      </div>
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 max-w-[1800px] mx-auto w-full px-3 sm:px-5 py-4 space-y-3">

        {/* Row 1: PRICE HERO + FUNDAMENTALS */}
        {quoteLoading && !q ? <QuoteHeroSkeleton /> : q && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* LEFT: Price Card (5/12) */}
            <Card className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800/50 border-slate-700/50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={`text-[9px] px-1.5 font-semibold ${getTypeBadgeColor(q.type)}`}>{q.type.toUpperCase()}</Badge>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-600 text-slate-400">{q.exchange}</Badge>
                {q.marketState === 'REGULAR' && <span className="flex items-center gap-1 text-[9px] text-emerald-400"><CircleDot className="w-1.5 h-1.5" /> Open</span>}
                {isLive && <Badge className="text-[8px] bg-blue-500/15 text-blue-400 border-blue-500/30">LIVE DATA</Badge>}
              </div>
              <h2 className="text-lg font-bold text-white">{q.name}</h2>
              <p className="text-[10px] text-slate-400">{q.sector}{q.industry ? ' · ' + q.industry : ''}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white font-mono">{formatINR(q.price)}</span>
                <div className="flex items-center gap-1">
                  {displayChange >= 0 ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className={`text-sm font-semibold font-mono ${displayChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} ({displayChangePct >= 0 ? '+' : ''}{displayChangePct.toFixed(2)}%)
                  </span>
                </div>
              </div>
              {/* Day range */}
              <div className="mt-3">
                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5"><span>L: {formatINR(q.dayLow)}</span><span>H: {formatINR(q.dayHigh)}</span></div>
                <div className="relative h-1 bg-slate-800 rounded-full">
                  <div className="absolute h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 rounded-full" style={{ left: '0%', width: '100%' }} />
                  <div className="absolute h-2.5 w-0.5 bg-white rounded-full -top-[3px]" style={{ left: `${((q.price - q.dayLow) / (q.dayHigh - q.dayLow)) * 100}%` }} />
                </div>
              </div>
              {/* OHLCV */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div><div className="text-[9px] text-slate-500">Open</div><div className="text-[11px] font-medium text-slate-200 font-mono">{formatINR(q.open)}</div></div>
                <div><div className="text-[9px] text-slate-500">High</div><div className="text-[11px] font-medium text-slate-200 font-mono">{formatINR(q.dayHigh)}</div></div>
                <div><div className="text-[9px] text-slate-500">Low</div><div className="text-[11px] font-medium text-slate-200 font-mono">{formatINR(q.dayLow)}</div></div>
                <div><div className="text-[9px] text-slate-500">Prev Cl</div><div className="text-[11px] font-medium text-slate-200 font-mono">{formatINR(q.prevClose)}</div></div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px]">
                <div><span className="text-slate-500">Vol</span> <span className="text-slate-200 font-mono">{formatVol(q.volume)}</span></div>
                <div><span className="text-slate-500">Avg Vol</span> <span className="text-slate-200 font-mono">{formatVol(q.avgVolume)}</span></div>
                <Tooltip><TooltipTrigger><Badge variant="outline" className={`text-[9px] px-1 ${q.volumeRatio > 1.5 ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-slate-600 text-slate-400'}`}>{q.volumeRatio.toFixed(2)}x</Badge></TooltipTrigger><TooltipContent className="text-[10px]">Volume / Avg Daily Volume</TooltipContent></Tooltip>
              </div>
              {/* 52W */}
              <div className="mt-2 pt-2 border-t border-slate-800">
                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                  <span>52W Low: {formatINR(q.low52w)}</span>
                  <span className={q.percentFrom52wLow >= 0 ? 'text-emerald-400' : 'text-red-400'}>{q.percentFrom52wLow >= 0 ? '+' : ''}{q.percentFrom52wLow.toFixed(1)}%</span>
                  <span>52W High: {formatINR(q.high52w)}</span>
                </div>
                <div className="relative h-1.5 bg-slate-800 rounded-full">
                  <div className="absolute h-full bg-gradient-to-r from-red-500/60 via-amber-500/60 to-emerald-500/60 rounded-full" style={{ left: `${Math.max(0, Math.min(95, (q.high52w - q.low52w > 0 ? (q.price - q.low52w) / (q.high52w - q.low52w) : 0.5) * 100))}%`, right: '0' }} />
                  <div className="absolute h-2.5 w-0.5 bg-white rounded-full -top-[2px]" style={{ left: `${(q.high52w - q.low52w > 0 ? (q.price - q.low52w) / (q.high52w - q.low52w) : 0.5) * 100}%` }} />
                </div>
              </div>
            </Card>

            {/* RIGHT: KPI Grid (7/12) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KPICard icon={<DollarSign className="w-3 h-3" />} label="Market Cap" value={q.marketCap ? formatNum(q.marketCap) : '-'} sub="₹" color="text-blue-400" />
              <KPICard icon={<Target className="w-3 h-3" />} label="P/E" value={q.pe?.toFixed(2) || '-'} sub={q.forwardPE ? `Fwd: ${q.forwardPE.toFixed(2)}` : ''} color={q.pe && q.pe > 50 ? 'text-red-400' : q.pe && q.pe > 30 ? 'text-amber-400' : 'text-emerald-400'} />
              <KPICard icon={<Building2 className="w-3 h-3" />} label="P/B" value={q.pb?.toFixed(2) || '-'} sub={q.bookValue ? `BV: ${formatINR(q.bookValue)}` : ''} color={q.pb && q.pb > 5 ? 'text-red-400' : 'text-blue-400'} />
              <KPICard icon={<Percent className="w-3 h-3" />} label="Div Yield" value={q.dividendYield?.toFixed(2) + '%' || '-'} sub={q.payoutRatio ? `Payout: ${(q.payoutRatio * 100).toFixed(0)}%` : ''} color="text-emerald-400" />
              <KPICard icon={<Activity className="w-3 h-3" />} label="EPS (TTM)" value={q.eps ? formatINR(q.eps) : '-'} color="text-cyan-400" />
              <KPICard icon={<Gauge className="w-3 h-3" />} label="ROE" value={q.roe?.toFixed(1) + '%' || '-'} sub={q.roa ? `ROA: ${q.roa.toFixed(1)}%` : ''} color={q.roe && q.roe > 15 ? 'text-emerald-400' : 'text-amber-400'} />
              <KPICard icon={<TrendingDown className="w-3 h-3" />} label="D/E Ratio" value={q.debtToEquity?.toFixed(2) || '-'} sub={q.currentRatio ? `CR: ${q.currentRatio.toFixed(2)}` : ''} color={q.debtToEquity && q.debtToEquity > 1 ? 'text-red-400' : 'text-emerald-400'} />
              <KPICard icon={<Zap className="w-3 h-3" />} label="Rev Growth" value={q.revenueGrowth?.toFixed(1) + '%' || '-'} sub={q.profitMargins ? `Margin: ${(q.profitMargins * 100).toFixed(1)}%` : ''} color={q.revenueGrowth && q.revenueGrowth > 0 ? 'text-emerald-400' : 'text-red-400'} />
              {/* Technical Position */}
              <Card className="col-span-2 bg-slate-900 border-slate-800 p-3">
                <div className="text-[9px] text-slate-500 font-medium mb-1.5 flex items-center gap-1"><Radio className="w-2.5 h-2.5" /> Technical Position (DMA)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-md px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400">50 DMA</span>
                    <span className={`text-[11px] font-bold font-mono ${q.percentAbove50DMA !== null ? (q.percentAbove50DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {q.fiftyDMA ? formatINR(q.fiftyDMA) : '-'}
                      {q.percentAbove50DMA !== null && <span className="ml-1 text-[9px]">({q.percentAbove50DMA >= 0 ? '+' : ''}{q.percentAbove50DMA.toFixed(1)}%)</span>}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/50 rounded-md px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400">200 DMA</span>
                    <span className={`text-[11px] font-bold font-mono ${q.percentAbove200DMA !== null ? (q.percentAbove200DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                      {q.twoHundredDMA ? formatINR(q.twoHundredDMA) : '-'}
                      {q.percentAbove200DMA !== null && <span className="ml-1 text-[9px]">({q.percentAbove200DMA >= 0 ? '+' : ''}{q.percentAbove200DMA.toFixed(1)}%)</span>}
                    </span>
                  </div>
                </div>
              </Card>
              {/* Analyst Consensus */}
              <Card className="col-span-2 bg-slate-900 border-slate-800 p-3">
                <div className="text-[9px] text-slate-500 font-medium mb-1.5 flex items-center gap-1"><Eye className="w-2.5 h-2.5" /> Analyst Consensus</div>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-bold ${q.recommendation === 'strong_buy' || q.recommendation === 'buy' ? 'text-emerald-400' : q.recommendation === 'sell' || q.recommendation === 'strong_sell' ? 'text-red-400' : 'text-amber-400'}`}>
                    {q.recommendation ? q.recommendation.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                  </div>
                  {q.analysts && <Badge variant="outline" className="text-[8px] border-slate-600 text-slate-400">{q.analysts} analysts</Badge>}
                </div>
                {q.targetMean && (
                  <div className="mt-1.5">
                    <div className="flex justify-between text-[9px] mb-0.5">
                      <span className="text-slate-500">Current: {formatINR(q.price)}</span>
                      <span className="text-emerald-400">Target: {formatINR(q.targetMean)} ({((q.targetMean - q.price) / q.price * 100).toFixed(1)}% upside)</span>
                    </div>
                    <Progress value={Math.min(100, (q.price / q.targetMean) * 100)} className="h-1 bg-slate-800" />
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* Row 2: PRICE CHART */}
        {loading ? <DashboardSkeleton /> : !loading && (
          <>
            <Card className="bg-slate-900 border-slate-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-300">Price Chart with Supertrend</span>
                  {latestData && <span className="text-white font-semibold text-sm font-mono ml-1">{formatINR(latestData.close)}</span>}
                  {lastDate && <span className="text-[9px] text-slate-500 font-mono">({formatDate(lastDate)})</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800" disabled={!canSlideRight} onClick={() => setChartOffset(p => Math.max(0, p - 50))}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="rotate-180"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white hover:bg-slate-800" disabled={!canSlideLeft} onClick={() => setChartOffset(p => p + 50)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </Button>
                </div>
              </div>
              <div className="h-[300px] sm:h-[380px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={visibleData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs><linearGradient id="pGB" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} axisLine={{ stroke: '#334155' }} tickLine={false} interval={Math.floor(visibleData.length / 8)} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#475569' }} tickFormatter={(v: number) => '₹' + v.toLocaleString('en-IN')} axisLine={{ stroke: '#334155' }} tickLine={false} width={70} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="supertrend" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="Supertrend" connectNulls={false} strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="close" stroke="#e2e8f0" strokeWidth={1.5} fill="url(#pGB)" name="Close" isAnimationActive={false} />
                    {visibleData.map((d, idx) => {
                      if (d.signal === 'STRONG_BUY' || d.signal === 'BUY') return <ReferenceDot key={`b-${idx}`} x={d.date} y={d.close} r={4} fill="#10b981" stroke="#064e3b" strokeWidth={1} shape={<g><polygon points={`${0},${6} ${-4},${-4} ${4},${-4}`} fill="#10b981" stroke="#064e3b" strokeWidth={1} /></g>} />;
                      if (d.signal === 'STRONG_SELL' || d.signal === 'SELL') return <ReferenceDot key={`s-${idx}`} x={d.date} y={d.close} r={4} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} shape={<g><polygon points={`${0},${-6} ${-4},${4} ${4},${4}`} fill="#ef4444" stroke="#7f1d1d" strokeWidth={1} /></g>} />;
                      return null;
                    })}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Row 3: INDICATOR PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* RSI */}
              <Card className="bg-slate-900 border-slate-800 p-3">
                <div className="text-[10px] text-slate-500 font-medium mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> RSI ({params.rsiPeriod})</div>
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" /><circle cx="50" cy="50" r="42" fill="none" stroke={currentRSI < 30 || currentRSI > 70 ? '#ef4444' : '#10b981'} strokeWidth="8" strokeDasharray={`${(currentRSI / 100) * 264} 264`} strokeLinecap="round" /></svg>
                    <div className="absolute inset-0 flex items-center justify-center"><span className={`text-sm font-bold ${currentRSI < 30 || currentRSI > 70 ? 'text-red-400' : 'text-emerald-400'}`}>{currentRSI.toFixed(1)}</span></div>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div><span className="text-slate-500">Zone:</span> <span className={currentRSI < 30 ? 'text-red-400' : currentRSI > 70 ? 'text-red-400' : 'text-emerald-400'}>{currentRSI < 30 ? 'Oversold' : currentRSI > 70 ? 'Overbought' : 'Neutral'}</span></div>
                    <div><span className="text-slate-500">OB:</span> <span className="text-slate-300">{params.rsiOverbought}</span> <span className="text-slate-600">OS:</span> <span className="text-slate-300">{params.rsiOversold}</span></div>
                  </div>
                </div>
              </Card>
              {/* MACD */}
              <Card className="bg-slate-900 border-slate-800 p-3">
                <div className="text-[10px] text-slate-500 font-medium mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3" /> MACD ({params.macdFast},{params.macdSlow},{params.macdSignal})</div>
                <div className="h-[70px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={visibleData.slice(-50)} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                      <Bar dataKey="macdHistogram" name="Histogram">{visibleData.slice(-50).map((d, i) => <Cell key={i} fill={d.macdHistogram !== null && d.macdHistogram >= 0 ? '#10b981' : '#ef4444'} opacity={0.7} />)}</Bar>
                      <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.2} dot={false} name="MACD" connectNulls={false} />
                      <Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1.2} dot={false} name="Signal" connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-1"><span>MACD: <span className={latestSignal?.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}>{latestSignal?.macd?.toFixed(2) ?? '-'}</span></span><span>Sig: <span className={latestSignal?.macdSignal >= 0 ? 'text-emerald-400' : 'text-red-400'}>{latestSignal?.macdSignal?.toFixed(2) ?? '-'}</span></span></div>
              </Card>
              {/* Supertrend */}
              <Card className="bg-slate-900 border-slate-800 p-3">
                <div className="text-[10px] text-slate-500 font-medium mb-2 flex items-center gap-1"><Target className="w-3 h-3" /> Supertrend ({params.supertrendPeriod},{params.supertrendMultiplier})</div>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${currentSTDir === 1 ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
                    <div className="text-center">{currentSTDir === 1 ? <TrendingUp className="w-5 h-5 mx-auto text-emerald-400" /> : <TrendingDown className="w-5 h-5 mx-auto text-red-400" />}<span className={`text-[9px] font-medium ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{currentSTDir === 1 ? 'Bullish' : 'Bearish'}</span></div>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div><span className="text-slate-500">Value:</span> <span className={`font-medium font-mono ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{formatINR(currentSTValue)}</span></div>
                    <div><span className="text-slate-500">Period:</span> <span className="text-slate-300">{params.supertrendPeriod}</span> <span className="text-slate-600">Mult:</span> <span className="text-slate-300">{params.supertrendMultiplier}</span></div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Row 4: LATEST SIGNAL */}
            {latestSignal && (
              <Card className={`border p-4 ${{ STRONG_BUY: 'bg-emerald-950/40 border-emerald-500/30', BUY: 'bg-green-950/40 border-green-500/30', HOLD: 'bg-amber-950/30 border-amber-500/30', SELL: 'bg-orange-950/30 border-orange-500/30', STRONG_SELL: 'bg-red-950/40 border-red-500/30' }[latestSignal.signal]}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl border-2 ${getSignalBg(latestSignal.signal)}`}><span className="text-xl">{getSignalIcon(latestSignal.signal)}</span></div>
                    <div>
                      <div className="text-[10px] text-slate-400">Latest Signal</div>
                      <div className={`text-xl font-bold ${getSignalColor(latestSignal.signal)}`}>{latestSignal.signal.replace('_', ' ')}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 max-w-sm">{latestSignal.reason}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Price</div>
                    <div className="text-xl font-bold text-white font-mono">{formatINR(latestSignal.close)}</div>
                    <div className={`text-xs font-medium font-mono ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{priceChange >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Row 5: POWER BI COMPREHENSIVE PANELS */}
            {q && q.type === 'equity' && (
              <Card className="bg-slate-900 border-slate-800 p-4">
                <Tabs value={deepTab} onValueChange={setDeepTab}>
                  <TabsList className="bg-slate-950 border border-slate-800 h-8 mb-3 w-full overflow-x-auto">
                    <TabsTrigger value="fundamentals" className="text-[10px] gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"><Target className="w-3 h-3" />Fundamentals</TabsTrigger>
                    <TabsTrigger value="financials" className="text-[10px] gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"><Wallet className="w-3 h-3" />Financials</TabsTrigger>
                    <TabsTrigger value="ownership" className="text-[10px] gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"><Users className="w-3 h-3" />Ownership</TabsTrigger>
                    <TabsTrigger value="peers" className="text-[10px] gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"><PieChartIcon className="w-3 h-3" />Peers</TabsTrigger>
                    <TabsTrigger value="technical" className="text-[10px] gap-1 data-[state=active]:bg-slate-800 data-[state=active]:text-emerald-400"><LineChartIcon className="w-3 h-3" />Technical</TabsTrigger>
                  </TabsList>

                  {/* Tab A: Fundamentals */}
                  <TabsContent value="fundamentals" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Valuation</div>
                        <div className="space-y-1.5">
                          <FundRow label="P/E Ratio" value={q.pe?.toFixed(2)} color={q.pe && q.pe > 50 ? 'text-red-400' : q.pe && q.pe > 30 ? 'text-amber-400' : 'text-emerald-400'} />
                          <FundRow label="Forward P/E" value={q.forwardPE?.toFixed(2)} />
                          <FundRow label="P/B Ratio" value={q.pb?.toFixed(2)} color={q.pb && q.pb > 5 ? 'text-red-400' : 'text-slate-200'} />
                          <FundRow label="EPS (TTM)" value={q.eps ? formatINR(q.eps) : null} />
                          <FundRow label="Book Value" value={q.bookValue ? formatINR(q.bookValue) : null} />
                          <FundRow label="Div Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : null} color={q.dividendYield && q.dividendYield > 2 ? 'text-emerald-400' : 'text-slate-200'} />
                          <FundRow label="Payout Ratio" value={q.payoutRatio ? (q.payoutRatio * 100).toFixed(1) + '%' : null} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Profitability</div>
                        <div className="space-y-1.5">
                          <FundRow label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : null} color={q.roe && q.roe > 15 ? 'text-emerald-400' : 'text-amber-400'} />
                          <FundRow label="ROA" value={q.roa ? q.roa.toFixed(1) + '%' : null} color={q.roa && q.roa > 8 ? 'text-emerald-400' : 'text-slate-200'} />
                          <FundRow label="Profit Margin" value={q.profitMargins ? (q.profitMargins * 100).toFixed(1) + '%' : null} color={q.profitMargins && q.profitMargins > 0.1 ? 'text-emerald-400' : q.profitMargins && q.profitMargins < 0 ? 'text-red-400' : 'text-slate-200'} />
                          <FundRow label="Operating Margin" value={q.operatingMargins ? (q.operatingMargins * 100).toFixed(1) + '%' : null} color={q.operatingMargins && q.operatingMargins > 0.15 ? 'text-emerald-400' : 'text-slate-200'} />
                          <FundRow label="EBITDA Margin" value={q.ebitda && q.totalRevenue ? ((q.ebitda / q.totalRevenue) * 100).toFixed(1) + '%' : null} />
                          <FundRow label="Beta" value={q.beta?.toFixed(2)} color={q.beta && q.beta > 1.2 ? 'text-amber-400' : 'text-slate-200'} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Financial Health</div>
                        <div className="space-y-1.5">
                          <FundRow label="Debt/Equity" value={q.debtToEquity?.toFixed(2)} color={q.debtToEquity && q.debtToEquity > 1 ? 'text-red-400' : q.debtToEquity && q.debtToEquity > 0.5 ? 'text-amber-400' : 'text-emerald-400'} />
                          <FundRow label="Current Ratio" value={q.currentRatio?.toFixed(2)} color={q.currentRatio && q.currentRatio > 1.5 ? 'text-emerald-400' : q.currentRatio && q.currentRatio < 1 ? 'text-red-400' : 'text-slate-200'} />
                          <FundRow label="Total Revenue" value={q.totalRevenue ? formatNum(q.totalRevenue) : null} color="text-blue-400" />
                          <FundRow label="EBITDA" value={q.ebitda ? formatNum(q.ebitda) : null} color="text-blue-400" />
                          <FundRow label="Gross Profits" value={q.grossProfits ? formatNum(q.grossProfits) : null} />
                          <FundRow label="Free Cashflow" value={q.freeCashflow ? formatNum(q.freeCashflow) : null} color={q.freeCashflow && q.freeCashflow > 0 ? 'text-emerald-400' : 'text-red-400'} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab B: Financials */}
                  <TabsContent value="financials" className="mt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">Total Revenue</div>
                        <div className="text-sm font-bold text-blue-400 font-mono mt-1">{q.totalRevenue ? formatNum(q.totalRevenue) : '-'}</div>
                        {q.revenueGrowth !== null && <div className={`text-[10px] mt-0.5 ${q.revenueGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{q.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(q.revenueGrowth).toFixed(1)}% YoY</div>}
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">EBITDA</div>
                        <div className="text-sm font-bold text-cyan-400 font-mono mt-1">{q.ebitda ? formatNum(q.ebitda) : '-'}</div>
                        {q.ebitda && q.totalRevenue && <div className="text-[10px] text-slate-400 mt-0.5">{((q.ebitda / q.totalRevenue) * 100).toFixed(1)}% margin</div>}
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">Gross Profit</div>
                        <div className="text-sm font-bold text-slate-200 font-mono mt-1">{q.grossProfits ? formatNum(q.grossProfits) : '-'}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">Free Cashflow</div>
                        <div className={`text-sm font-bold font-mono mt-1 ${q.freeCashflow && q.freeCashflow > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{q.freeCashflow ? formatNum(q.freeCashflow) : '-'}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">Profit Margin</div>
                        <div className={`text-sm font-bold font-mono mt-1 ${q.profitMargins && q.profitMargins > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{q.profitMargins ? (q.profitMargins * 100).toFixed(1) + '%' : '-'}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500">Revenue Growth</div>
                        <div className={`text-sm font-bold font-mono mt-1 ${q.revenueGrowth && q.revenueGrowth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{q.revenueGrowth !== null ? q.revenueGrowth.toFixed(1) + '%' : '-'}</div>
                      </div>
                    </div>
                    {/* Revenue vs EBITDA visual */}
                    {q.totalRevenue && q.ebitda && (
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[10px] text-slate-500 mb-2">Revenue vs EBITDA</div>
                        <div className="flex items-end gap-3 h-20">
                          <div className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-[10px] text-blue-400 font-mono mb-1">{formatNum(q.totalRevenue)}</span>
                            <div className="w-full bg-blue-500/30 rounded-t" style={{ height: '100%' }} />
                            <span className="text-[9px] text-slate-500 mt-1">Revenue</span>
                          </div>
                          {q.grossProfits && (
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span className="text-[10px] text-cyan-400 font-mono mb-1">{formatNum(q.grossProfits)}</span>
                              <div className="w-full bg-cyan-500/30 rounded-t" style={{ height: `${Math.min(100, (Math.abs(q.grossProfits) / q.totalRevenue) * 100)}%` }} />
                              <span className="text-[9px] text-slate-500 mt-1">Gross Profit</span>
                            </div>
                          )}
                          <div className="flex-1 flex flex-col items-center justify-end h-full">
                            <span className="text-[10px] text-emerald-400 font-mono mb-1">{formatNum(q.ebitda)}</span>
                            <div className="w-full bg-emerald-500/30 rounded-t" style={{ height: `${Math.min(100, (Math.abs(q.ebitda) / q.totalRevenue) * 100)}%` }} />
                            <span className="text-[9px] text-slate-500 mt-1">EBITDA</span>
                          </div>
                          {q.freeCashflow && (
                            <div className="flex-1 flex flex-col items-center justify-end h-full">
                              <span className={`text-[10px] font-mono mb-1 ${q.freeCashflow > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatNum(q.freeCashflow)}</span>
                              <div className={`w-full rounded-t ${q.freeCashflow > 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} style={{ height: `${Math.min(100, (Math.abs(q.freeCashflow) / q.totalRevenue) * 100)}%` }} />
                              <span className="text-[9px] text-slate-500 mt-1">FCF</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  {/* Tab C: Ownership & Analysts */}
                  <TabsContent value="ownership" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Ownership Structure</div>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] mb-1"><span className="text-slate-400">Institutional Holding</span><span className="font-mono text-slate-200">{q.instHolding ? q.instHolding.toFixed(1) + '%' : 'N/A'}</span></div>
                            {q.instHolding && <Progress value={Math.min(100, q.instHolding)} className="h-1.5 bg-slate-800" />}
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1"><span className="text-slate-400">Insider Holding</span><span className="font-mono text-slate-200">{q.insiderHolding ? q.insiderHolding.toFixed(1) + '%' : 'N/A'}</span></div>
                            {q.insiderHolding && <Progress value={Math.min(100, q.insiderHolding)} className="h-1.5 bg-slate-800" />}
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] mb-1"><span className="text-slate-400">Public / Others</span><span className="font-mono text-slate-200">{q.instHolding != null && q.insiderHolding != null ? Math.max(0, 100 - q.instHolding - q.insiderHolding).toFixed(1) + '%' : 'N/A'}</span></div>
                            {q.instHolding != null && q.insiderHolding != null && <Progress value={Math.max(0, Math.min(100, 100 - q.instHolding - q.insiderHolding))} className="h-1.5 bg-slate-800" />}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Analyst Coverage</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-slate-950 rounded-lg p-3 border border-slate-800">
                            <span className="text-[10px] text-slate-400">Recommendation</span>
                            <div className={`text-sm font-bold ${q.recommendation === 'strong_buy' || q.recommendation === 'buy' ? 'text-emerald-400' : q.recommendation === 'sell' || q.recommendation === 'strong_sell' ? 'text-red-400' : 'text-amber-400'}`}>
                              {q.recommendation ? q.recommendation.replace(/_/g, ' ').toUpperCase() : 'N/A'}
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-slate-950 rounded-lg px-3 py-2 border border-slate-800">
                            <span className="text-[10px] text-slate-400">Number of Analysts</span>
                            <span className="text-xs font-mono text-slate-200">{q.analysts ?? 'N/A'}</span>
                          </div>
                        </div>
                        {q.targetMean && (
                          <div className="mt-3 bg-slate-950 rounded-lg p-3 border border-slate-800">
                            <div className="text-[10px] text-slate-500 mb-2">Target Price Range</div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div><div className="text-[9px] text-slate-500">Low</div><div className="text-[11px] font-bold text-red-400 font-mono">{formatINR(q.targetLow!)}</div></div>
                              <div><div className="text-[9px] text-slate-500">Median</div><div className="text-[11px] font-bold text-slate-200 font-mono">{formatINR(q.targetMedian!)}</div></div>
                              <div><div className="text-[9px] text-slate-500">Mean</div><div className="text-[11px] font-bold text-white font-mono">{formatINR(q.targetMean)}</div></div>
                              <div><div className="text-[9px] text-slate-500">High</div><div className="text-[11px] font-bold text-emerald-400 font-mono">{formatINR(q.targetHigh!)}</div></div>
                            </div>
                            <div className="mt-2 relative h-2 bg-slate-800 rounded-full">
                              <div className="absolute h-full bg-gradient-to-r from-red-500/40 via-amber-500/40 to-emerald-500/40 rounded-full" style={{ left: '5%', width: '90%' }} />
                              <div className="absolute h-3 w-0.5 bg-white rounded-full -top-[2px]" style={{ left: `${q.targetHigh && q.targetLow ? Math.max(5, Math.min(95, ((q.price - q.targetLow) / (q.targetHigh - q.targetLow)) * 100)) : 50}%` }} />
                            </div>
                            <div className="text-center text-[9px] text-slate-400 mt-1">Current: <span className="text-white font-mono">{formatINR(q.price)}</span> · Upside: <span className="text-emerald-400 font-mono">{((q.targetMean - q.price) / q.price * 100).toFixed(1)}%</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  {/* Tab D: Peer Comparison */}
                  <TabsContent value="peers" className="mt-0">
                    {peers.length > 0 ? (
                      <ScrollArea className="max-h-[350px]">
                        <div className="overflow-x-auto rounded-md border border-slate-800">
                          <Table><TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50 bg-slate-950/50">
                            <TableHead className="text-slate-400 text-[9px]">Symbol</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right">Price</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right">Chg %</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right hidden sm:table-cell">MCap</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right">P/E</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right hidden md:table-cell">P/B</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right">ROE</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right hidden lg:table-cell">Div Yield</TableHead>
                            <TableHead className="text-slate-400 text-[9px] text-right hidden lg:table-cell">Rev Growth</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>{peers.map(p => (
                            <TableRow key={p.symbol} className={`border-slate-800 hover:bg-slate-800/50 cursor-pointer ${p.symbol === selectedSymbol ? 'bg-emerald-500/5' : ''}`} onClick={() => handleSelectInstrument(p.symbol, 'equity')}>
                              <TableCell className="text-[11px]"><span className="text-emerald-400 font-medium">{p.symbol}</span><span className="text-[9px] text-slate-500 ml-1.5 hidden xl:inline">{p.name}</span></TableCell>
                              <TableCell className="text-[11px] text-right font-mono">{formatINR(p.price)}</TableCell>
                              <TableCell className={`text-[11px] text-right font-semibold font-mono ${p.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(2)}%</TableCell>
                              <TableCell className="text-[11px] text-right text-slate-300 font-mono hidden sm:table-cell">{formatNum(p.marketCap)}</TableCell>
                              <TableCell className="text-[11px] text-right font-mono">{p.pe?.toFixed(1) || '-'}</TableCell>
                              <TableCell className="text-[11px] text-right font-mono hidden md:table-cell">{p.pb?.toFixed(1) || '-'}</TableCell>
                              <TableCell className="text-[11px] text-right font-mono">{p.roe?.toFixed(1) + '%' || '-'}</TableCell>
                              <TableCell className="text-[11px] text-right font-mono hidden lg:table-cell">{p.divYield?.toFixed(1) + '%' || '-'}</TableCell>
                              <TableCell className={`text-[11px] text-right font-mono hidden lg:table-cell ${p.revenueGrowth && p.revenueGrowth > 0 ? 'text-emerald-400' : 'text-red-400'}`}>{p.revenueGrowth?.toFixed(1) + '%' || '-'}</TableCell>
                            </TableRow>
                          ))}</TableBody></Table>
                        </div>
                      </ScrollArea>
                    ) : <div className="text-center py-12 text-slate-500 text-xs">No peer data available</div>}
                  </TabsContent>

                  {/* Tab E: Technical Analysis */}
                  <TabsContent value="technical" className="mt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">50 DMA Position</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold font-mono ${q.percentAbove50DMA !== null ? (q.percentAbove50DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                            {q.fiftyDMA ? formatINR(q.fiftyDMA) : '-'}
                          </span>
                          {q.percentAbove50DMA !== null && (
                            <Badge variant="outline" className={`text-[9px] ${q.percentAbove50DMA >= 0 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
                              {q.percentAbove50DMA >= 0 ? '+' : ''}{q.percentAbove50DMA.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <Progress value={q.percentAbove50DMA !== null ? 50 + q.percentAbove50DMA : 50} className="h-1.5 bg-slate-800 mt-2" />
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">200 DMA Position</div>
                        <div className="flex items-center justify-between">
                          <span className={`text-lg font-bold font-mono ${q.percentAbove200DMA !== null ? (q.percentAbove200DMA >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-slate-500'}`}>
                            {q.twoHundredDMA ? formatINR(q.twoHundredDMA) : '-'}
                          </span>
                          {q.percentAbove200DMA !== null && (
                            <Badge variant="outline" className={`text-[9px] ${q.percentAbove200DMA >= 0 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 'border-red-500/40 text-red-400 bg-red-500/10'}`}>
                              {q.percentAbove200DMA >= 0 ? '+' : ''}{q.percentAbove200DMA.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        <Progress value={q.percentAbove200DMA !== null ? 50 + q.percentAbove200DMA : 50} className="h-1.5 bg-slate-800 mt-2" />
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">52 Week Range</div>
                        <div className="flex justify-between text-[10px] mb-1"><span className="text-red-400 font-mono">{formatINR(q.low52w)}</span><span className="text-emerald-400 font-mono">{formatINR(q.high52w)}</span></div>
                        <div className="relative h-1.5 bg-slate-800 rounded-full">
                          <div className="absolute h-full bg-gradient-to-r from-red-500/50 to-emerald-500/50 rounded-full" style={{ left: '0%', width: '100%' }} />
                          <div className="absolute h-2.5 w-0.5 bg-white rounded-full -top-[2px]" style={{ left: `${(q.high52w - q.low52w > 0 ? (q.price - q.low52w) / (q.high52w - q.low52w) : 0.5) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] mt-1">
                          <span className={q.percentFrom52wLow >= 0 ? 'text-emerald-400' : 'text-red-400'}>{q.percentFrom52wLow >= 0 ? '+' : ''}{q.percentFrom52wLow.toFixed(1)}% from Low</span>
                          <span className={q.percentFrom52wHigh >= 0 ? 'text-emerald-400' : 'text-red-400'}>{q.percentFrom52wHigh >= 0 ? '+' : ''}{q.percentFrom52wHigh.toFixed(1)}% from High</span>
                        </div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">Beta</div>
                        <div className={`text-lg font-bold font-mono ${q.beta && q.beta > 1.2 ? 'text-amber-400' : 'text-slate-200'}`}>{q.beta?.toFixed(2) || 'N/A'}</div>
                        <div className="text-[9px] text-slate-500 mt-1">{q.beta && q.beta > 1 ? 'Higher volatility than market' : q.beta && q.beta < 1 ? 'Lower volatility than market' : ''}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">Volume Ratio</div>
                        <div className={`text-lg font-bold font-mono ${q.volumeRatio > 1.5 ? 'text-amber-400' : 'text-slate-200'}`}>{q.volumeRatio.toFixed(2)}x</div>
                        <div className="text-[9px] text-slate-500 mt-1">{q.volumeRatio > 1.5 ? 'Above average volume' : q.volumeRatio < 0.5 ? 'Below average volume' : 'Normal volume'}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                        <div className="text-[9px] text-slate-500 mb-2">Supertrend Signal</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentSTDir === 1 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                            {currentSTDir === 1 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                          </div>
                          <div>
                            <div className={`text-xs font-bold ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>{currentSTDir === 1 ? 'BULLISH' : 'BEARISH'}</div>
                            <div className="text-[9px] text-slate-500 font-mono">ST: {formatINR(currentSTValue)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </Card>
        )}

            {/* Row 6: BACKTEST RESULTS */}
            {backtest && (
              <>
                <div className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-slate-400" /><h2 className="text-xs font-semibold text-slate-300">Backtest Results</h2></div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-2">
                  <MetricCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Total Return" value={`${backtest.totalReturnPct >= 0 ? '+' : ''}${backtest.totalReturnPct.toFixed(2)}%`} color={backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <MetricCard icon={<Trophy className="w-3.5 h-3.5" />} label="Win Rate" value={`${backtest.winRate.toFixed(1)}%`} color={backtest.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'} />
                  <MetricCard icon={<Activity className="w-3.5 h-3.5" />} label="Total Trades" value={String(backtest.totalTrades)} color="text-slate-200" />
                  <MetricCard icon={<Zap className="w-3.5 h-3.5" />} label="Profit Factor" value={backtest.profitFactor.toFixed(2)} color={backtest.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400'} />
                  <MetricCard icon={<TrendingUp className="w-3.5 h-3.5" />} label="Winning" value={String(backtest.winningTrades)} color="text-emerald-400" />
                  <MetricCard icon={<Flame className="w-3.5 h-3.5" />} label="Losing" value={String(backtest.losingTrades)} color="text-red-400" />
                  <MetricCard icon={<ArrowUp className="w-3.5 h-3.5" />} label="Avg Win" value={`+${backtest.avgWinPct.toFixed(2)}%`} color="text-emerald-400" />
                  <MetricCard icon={<ArrowDown className="w-3.5 h-3.5" />} label="Avg Loss" value={`${backtest.avgLossPct.toFixed(2)}%`} color="text-red-400" />
                  <MetricCard icon={<AlertTriangle className="w-3.5 h-3.5" />} label="Max Drawdown" value={`-${backtest.maxDrawdownPct.toFixed(2)}%`} color={backtest.maxDrawdownPct > 10 ? 'text-red-400' : 'text-amber-400'} />
                </div>
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-3"><Shield className="w-3.5 h-3.5 text-slate-400" /> Trade History ({backtest.trades.length})</div>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-slate-800">
                    <Table><TableHeader><TableRow className="border-slate-800 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 text-[9px]">Entry</TableHead>
                      <TableHead className="text-slate-400 text-[9px]">Exit</TableHead>
                      <TableHead className="text-slate-400 text-[9px] text-right">Entry ₹</TableHead>
                      <TableHead className="text-slate-400 text-[9px] text-right">Exit ₹</TableHead>
                      <TableHead className="text-slate-400 text-[9px] text-right">P&L %</TableHead>
                      <TableHead className="text-slate-400 text-[9px]">Signal</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{backtest.trades.map((t, i) => (
                      <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                        <TableCell className="text-slate-300 text-[10px] font-mono">{formatDate(t.entryDate)}</TableCell>
                        <TableCell className="text-slate-300 text-[10px] font-mono">{formatDate(t.exitDate)}</TableCell>
                        <TableCell className="text-slate-300 text-[10px] text-right font-mono">{formatINR(t.entryPrice)}</TableCell>
                        <TableCell className="text-slate-300 text-[10px] text-right font-mono">{formatINR(t.exitPrice)}</TableCell>
                        <TableCell className={`text-[10px] text-right font-semibold font-mono ${t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(2)}%</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[8px] px-1 py-0 ${getSignalBg(t.signal)}`}>{t.signal}</Badge></TableCell>
                      </TableRow>
                    ))}{backtest.trades.length === 0 && <TableRow className="border-slate-800"><TableCell className="text-slate-500 text-center py-6 text-xs" colSpan={6}>No trades generated</TableCell></TableRow>}</TableBody></Table>
                  </div>
                </Card>
              </>
            )}

            {/* Row 7: STRATEGY PARAMETERS */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="params" className="border-slate-800">
                <AccordionTrigger className="text-xs font-medium text-slate-300 hover:no-underline py-3">
                  <div className="flex items-center gap-2"><Settings2 className="w-3.5 h-3.5 text-slate-400" /> Strategy Parameters {recalculating && <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />}</div>
                </AccordionTrigger>
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
                    <Button onClick={handleApplyParams} disabled={recalculating} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">{recalculating ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Apply & Recalculate</Button>
                    <Button variant="ghost" onClick={() => setParams({ ...DEFAULT_PARAMS })} className="text-slate-400 hover:text-white h-8 text-xs">Reset Defaults</Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3">
          <p className="text-[10px] text-slate-600 text-center leading-relaxed">
            Data sourced from Yahoo Finance. Strategy signals are for educational purposes only. Not financial advice. Always do your own research before trading.
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
    <Card className="bg-slate-900 border-slate-800 p-3 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-slate-500">{icon}<span className="text-[9px] font-medium">{label}</span></div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
      {sub && <div className="text-[9px] text-slate-500">{sub}</div>}
    </Card>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400">{icon}<span className="text-[10px] font-medium">{label}</span></div>
      <div className={`text-base font-bold font-mono ${color}`}>{value}</div>
    </div>
  );
}

function FundRow({ label, value, color }: { label: string; value: string | null | undefined; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-800/50 last:border-0">
      <span className="text-[10px] text-slate-400">{label}</span>
      <span className={`text-[11px] font-mono font-medium ${color || 'text-slate-200'}`}>{value || 'N/A'}</span>
    </div>
  );
}

function ParamSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between"><label className="text-[10px] text-slate-400 font-medium">{label}</label><Input type="number" value={value} min={min} max={max} step={step} onChange={e => onChange(Number(e.target.value))} className="w-14 h-6 text-[10px] text-right bg-slate-800 border-slate-700 text-slate-200" /></div>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="py-0.5" />
      <div className="flex justify-between text-[9px] text-slate-600"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

function QuoteHeroSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
      <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-4"><Skeleton className="h-3 w-24 mb-2 bg-slate-800" /><Skeleton className="h-6 w-40 mb-1.5 bg-slate-800" /><Skeleton className="h-3 w-48 mb-4 bg-slate-800" /><Skeleton className="h-8 w-32 mb-3 bg-slate-800" /><Skeleton className="h-20 w-full bg-slate-800 rounded" /></div>
      <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3"><Skeleton className="h-2.5 w-14 mb-1.5 bg-slate-800" /><Skeleton className="h-4 w-10 bg-slate-800" /></div>)}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4"><Skeleton className="h-4 w-40 mb-3 bg-slate-800" /><Skeleton className="h-[300px] w-full bg-slate-800 rounded" /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[1, 2, 3].map(i => <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3"><Skeleton className="h-3 w-24 mb-2 bg-slate-800" /><Skeleton className="h-16 w-full bg-slate-800 rounded" /></div>)}</div>
    </div>
  );
}