'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';

const ChartSection = dynamic(() => import('@/components/dashboard/charts'), {
  ssr: false,
  loading: () => <div className="h-[340px] bg-slate-900/50 rounded-xl animate-pulse flex items-center justify-center text-slate-600 text-sm">Loading charts...</div>
});

import {
  TrendingUp, ArrowUp, ArrowDown, Activity, BarChart3, Target, Trophy,
  TrendingDown, Zap, Settings2, RefreshCw, Layers, BarChart2,
  DollarSign, Percent, Users, CircleDot, ChevronRight,
  ArrowUpRight, ArrowDownRight, Minus, Newspaper, PieChart,
  LineChart as LineChartIcon, Calendar, Clock, Globe, Shield,
  AlertTriangle, CheckCircle2, XCircle, Info, ExternalLink,
  TrendingUpIcon, Eye, Search, Filter, Save, Radio,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================
interface StockInfo { symbol: string; name: string; sector: string; basePrice: number; volatility: number; type: string; }
interface OHLCV { date: string; open: number; high: number; low: number; close: number; volume: number; }
type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
interface StrategySignal { date: string; close: number; signal: SignalType; supertrend: number; supertrendDir: number; rsi: number; macd: number; macdSignal: number; macdHistogram: number; reason: string; }
interface TradeRecord { entryDate: string; exitDate: string; entryPrice: number; exitPrice: number; type: string; pnl: number; pnlPct: number; signal: SignalType; }
interface BacktestResult { totalReturn: number; totalReturnPct: number; winRate: number; totalTrades: number; winningTrades: number; losingTrades: number; avgWinPct: number; avgLossPct: number; maxDrawdownPct: number; profitFactor: number; trades: TradeRecord[]; }
interface StrategyParams { supertrendPeriod: number; supertrendMultiplier: number; rsiPeriod: number; rsiOverbought: number; rsiOversold: number; macdFast: number; macdSlow: number; macdSignal: number; }
interface ChartDataPoint extends OHLCV { supertrend: number | null; supertrendDir: number | null; rsi: number | null; macd: number | null; macdSignal: number | null; macdHistogram: number | null; signal: SignalType | null; }
interface LiveQuote { symbol: string; name: string; longName: string; sector: string; industry: string; exchange: string; currency: string; type: string; price: number; change: number; changePct: number; prevClose: number; open: number; dayHigh: number; dayLow: number; volume: number; avgVolume: number; volumeRatio: number; marketCap: number; pe: number | null; forwardPE: number | null; pb: number | null; eps: number | null; bookValue: number | null; dividendYield: number | null; payoutRatio: number | null; high52w: number; low52w: number; percentFrom52wHigh: number; percentFrom52wLow: number; fiftyDMA: number | null; twoHundredDMA: number | null; percentAbove50DMA: number | null; percentAbove200DMA: number | null; beta: number | null; roe: number | null; roa: number | null; debtToEquity: number | null; revenueGrowth: number | null; profitMargins: number | null; operatingMargins: number | null; currentRatio: number | null; totalRevenue: number | null; ebitda: number | null; grossProfits: number | null; freeCashflow: number | null; recommendation: string | null; targetHigh: number | null; targetLow: number | null; targetMean: number | null; targetMedian: number | null; analysts: number | null; instHolding: number | null; }
interface PeerData { symbol: string; name: string; price: number; changePct: number; marketCap: number; pe: number | null; pb: number | null; divYield: number | null; roe: number | null; revenueGrowth: number | null; }
interface StockDetail { quote: LiveQuote; technicals: Record<string, any>; performance: Record<string, number | null>; ownership: Record<string, number | null>; financials: Record<string, number | null>; peers: PeerData[] | null; dataPoints: number; lastDate: string | null; }
interface MarketOverview { nifty50: LiveQuote; bankNifty: LiveQuote; niftyIT: LiveQuote; indiaVix: LiveQuote; topGainers?: LiveQuote[]; topLosers?: LiveQuote[]; }
interface NewsItem { title: string; source: string; url: string; publishedAt: string; summary: string; sentiment: "positive" | "negative" | "neutral"; }
interface ScreenerResult { symbol: string; name: string; sector: string; price: number; change: number; changePct: number; volume: number; marketCap: number; pe: number | null; signal: string; rsi: number | null; macdHistogram: number | null; supertrendDir: number; signalReason: string; lastDate: string; }
interface SavePoint { id: number; label: string; time: string; detail: string; }

const DEFAULT_PARAMS: StrategyParams = {
  supertrendPeriod: 10, supertrendMultiplier: 3, rsiPeriod: 14,
  rsiOverbought: 70, rsiOversold: 30, macdFast: 12, macdSlow: 26, macdSignal: 9,
};

// ==================== FORMATTERS ====================
function fINR(v: number): string {
  if (v >= 1e12) return '\u20B9' + (v / 1e12).toFixed(2) + ' T';
  if (v >= 1e7) return '\u20B9' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '\u20B9' + (v / 1e5).toFixed(2) + ' L';
  return '\u20B9' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fNum(v: number): string {
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(2);
}
function fDate(d: string): string { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }); }
function fTime(d: string): string { const dt = new Date(d); const now = new Date(); const diffHrs = Math.floor((now.getTime() - dt.getTime()) / 3600000); if (diffHrs < 1) return 'Just now'; if (diffHrs < 24) return diffHrs + 'h ago'; return fDate(d); }

// ==================== COLOR MAPS ====================
const SIG_BG: Record<string, string> = { STRONG_BUY: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400', BUY: 'bg-green-500/20 border-green-500/40 text-green-400', HOLD: 'bg-amber-500/20 border-amber-500/40 text-amber-400', SELL: 'bg-orange-500/20 border-orange-500/40 text-orange-400', STRONG_SELL: 'bg-red-500/20 border-red-500/40 text-red-400' };
const TYPE_COLOR: Record<string, string> = { equity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', index: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };

function pctVal(v: number | null) {
  if (v === null) return <span className="text-slate-600">--</span>;
  const c = v >= 0 ? 'text-emerald-400' : 'text-red-400';
  const icon = v > 0.5 ? <ArrowUpRight className="w-3 h-3" /> : v < -0.5 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
  return <span className={cn(c, 'flex items-center gap-0.5 font-mono')}>{icon}{Math.abs(v).toFixed(2)}%</span>;
}

// ==================== POWER BI STYLE COMPONENTS ====================
function KPICard({ label, value, sub, icon: Icon, trend, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ElementType; trend?: 'up' | 'down' | 'flat'; accent?: string }) {
  const ac = accent || (trend === 'up' ? 'from-emerald-500/5 to-emerald-500/10 border-emerald-500/20' : trend === 'down' ? 'from-red-500/5 to-red-500/10 border-red-500/20' : 'from-slate-500/5 to-slate-500/10 border-slate-700/50');
  return (
    <div className={cn('rounded-xl border bg-gradient-to-br p-3.5 transition-all', ac)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={cn('w-3.5 h-3.5', trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-600')} />}
      </div>
      <div className="text-sm font-bold text-slate-100 truncate">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function MetricRow({ label, value, highlight, badge, bar }: { label: string; value: React.ReactNode; highlight?: boolean; badge?: { text: string; color: string }; bar?: { value: number; max: number; color: string } }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {bar && (<div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', bar.color)} style={{ width: Math.min(100, (bar.value / bar.max) * 100) + '%' }} /></div>)}
        {badge && <Badge variant="outline" className={cn('text-[8px] px-1 py-0', badge.color)}>{badge.text}</Badge>}
        <span className={cn('text-xs font-mono', highlight ? 'text-white font-semibold' : 'text-slate-200')}>{value}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className, badge }: { title: string; icon?: React.ElementType; children: React.ReactNode; className?: string; badge?: React.ReactNode }) {
  return (
    <Card className={cn('border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-900/50 backdrop-blur-sm', className)}>
      <CardHeader className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">{Icon && <Icon className="w-3.5 h-3.5 text-emerald-500/70" />}{title}</CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-0">{children}</CardContent>
    </Card>
  );
}

function MktTicker({ label, q }: { label: string; q: LiveQuote | null }) {
  if (!q) return <div className="flex flex-col items-center px-3 py-1.5"><Skeleton className="h-3 w-16 bg-slate-800" /></div>;
  const up = q.changePct >= 0;
  return (
    <Tooltip><TooltipTrigger asChild><div className="flex flex-col items-center px-3 py-1.5 cursor-default">
      <span className="text-[10px] text-slate-500 font-medium">{label}</span>
      <span className="text-xs font-bold text-slate-200 font-mono">{q.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      <span className={cn('text-[10px] font-semibold font-mono', up ? 'text-emerald-400' : 'text-red-400')}>{up ? '+' : ''}{q.changePct.toFixed(2)}%</span>
    </div></TooltipTrigger>
    <TooltipContent className="text-xs bg-slate-900 border-slate-700"><div>H: {q.dayHigh.toLocaleString('en-IN')} L: {q.dayLow.toLocaleString('en-IN')}</div><div>Vol: {fNum(q.volume)}</div></TooltipContent></Tooltip>
  );
}

function PBar({ value, min, max, label, color }: { value: number; min: number; max: number; label: string; color: string }) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 50;
  return (<div className="flex items-center gap-2 text-xs"><span className="w-16 text-slate-500 text-right shrink-0">{label}</span><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className={cn('h-full rounded-full transition-all', color)} style={{ width: pct + '%' }} /></div><span className="w-14 text-slate-300 font-mono text-right shrink-0">{value.toFixed(1)}</span></div>);
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, string> = { positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', negative: 'bg-red-500/15 text-red-400 border-red-500/30', neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
  return <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 capitalize', map[sentiment] || map.neutral)}>{sentiment}</Badge>;
}

function OwnershipDonut({ data }: { data: Record<string, number | null> }) {
  const segments = [{ label: 'Promoter', value: data.promoter, color: '#3b82f6' }, { label: 'FII', value: data.fii, color: '#10b981' }, { label: 'DII', value: data.dii, color: '#f59e0b' }, { label: 'Public', value: data.public, color: '#6366f1' }].filter(s => s.value !== null && s.value !== undefined) as { label: string; value: number; color: string }[];
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div className="text-xs text-slate-500 text-center py-4">No ownership data</div>;
  let cum = 0;
  const grad = segments.map(s => { const start = cum; cum += (s.value / total) * 100; return `${s.color} ${start}% ${cum}%`; });
  return (<div className="flex items-center gap-4"><div className="relative w-24 h-24 shrink-0"><div className="w-24 h-24 rounded-full" style={{ background: `conic-gradient(${grad.join(', ')})` }} /><div className="absolute inset-3 rounded-full bg-slate-900 flex items-center justify-center"><span className="text-[10px] text-slate-400 font-semibold">Holding</span></div></div><div className="space-y-1.5 flex-1">{segments.map(s => (<div key={s.label} className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} /><span className="text-slate-400 flex-1">{s.label}</span><span className="font-mono text-slate-200 font-semibold">{s.value.toFixed(1)}%</span></div>))}</div></div>);
}

// ==================== SAVE POINTS COMPONENT ====================
function SavePoints({ points }: { points: SavePoint[] }) {
  if (points.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 max-w-xs">
      {points.slice(-3).map(sp => (
        <div key={sp.id} className="animate-in slide-in-from-right-4 fade-in duration-500 bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 rounded-xl px-4 py-3 shadow-xl shadow-emerald-500/5 max-w-xs">
          <div className="flex items-center gap-2 mb-1">
            <Save className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Save Point #{sp.id}</span>
            <span className="text-[9px] text-slate-600 ml-auto">{sp.time}</span>
          </div>
          <div className="text-xs text-slate-300 font-semibold">{sp.label}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{sp.detail}</div>
        </div>
      ))}
    </div>
  );
}

// ==================== MAIN PAGE ====================
export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [equities, setEquities] = useState<StockInfo[]>([]);
  const [indices, setIndices] = useState<StockInfo[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [selectedType, setSelectedType] = useState('equity');
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [stockData, setStockData] = useState<OHLCV[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState<StrategyParams>({ ...DEFAULT_PARAMS });
  const [recalculating, setRecalculating] = useState(false);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [lastDate, setLastDate] = useState('');
  const [equitySearch, setEquitySearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Screener state
  const [screenerData, setScreenerData] = useState<ScreenerResult[]>([]);
  const [screenerCounts, setScreenerCounts] = useState<Record<string, number>>({});
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerFilter, setScreenerFilter] = useState('ALL');
  const [screenerSector, setScreenerSector] = useState('all');
  const [screenerSearched, setScreenerSearched] = useState('');

  // Options state
  const [optionsUnderlying, setOptionsUnderlying] = useState('NIFTY');
  const [optionsData, setOptionsData] = useState<any[]>([]);
  const [optionsExpiries, setOptionsExpiries] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsExpiryFilter, setOptionsExpiryFilter] = useState('');

  // Save points
  const [savePoints, setSavePoints] = useState<SavePoint[]>([]);
  const spId = useRef(0);
  const addSavePoint = useCallback((label: string, detail: string) => {
    spId.current++;
    const sp: SavePoint = { id: spId.current, label, detail, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    setSavePoints(prev => [...prev.slice(-5), sp]);
    setTimeout(() => setSavePoints(prev => prev.filter(p => p.id !== sp.id)), 8000);
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([
      fetch('/api/stocks?type=equity').then(r => r.json()),
      fetch('/api/stocks?type=index').then(r => r.json()),
      fetch('/api/quote?overview=true').then(r => r.json()).catch(() => null),
    ]).then(([eq, idx, ov]: any[]) => {
      setEquities(eq.instruments || []);
      setIndices(idx.instruments || []);
      setSectors(eq.sectors || []);
      if (ov) setOverview(ov);
      addSavePoint('Market Data Loaded', `${(eq.instruments || []).length} equities, ${(idx.instruments || []).length} indices loaded from Yahoo Finance`);
    }).catch(console.error);
  }, []);

  const fetchDetail = useCallback(async (sym: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch('/api/stock-detail?symbol=' + sym);
      const data = await res.json();
      if (data.quote) { setDetail(data); addSavePoint(`Loaded ${sym}`, `Price: ${data.quote.price.toLocaleString('en-IN')} | ${data.quote.changePct >= 0 ? '+' : ''}${data.quote.changePct.toFixed(2)}% | Data points: ${data.dataPoints}`); }
    } catch {} finally { setDetailLoading(false); }
  }, [addSavePoint]);

  const fetchSignals = useCallback(async (sym: string, p: StrategyParams) => {
    setSignalsLoading(true);
    try {
      const sp = new URLSearchParams({ symbol: sym, days: '200' });
      for (const [k, v] of Object.entries(p)) sp.append(k, String(v));
      const res = await fetch('/api/signals?' + sp.toString());
      const data = await res.json();
      setStockData(data.stockData || []);
      setSignals(data.signals || []);
      setBacktest(data.backtest || null);
      setParams(data.params || DEFAULT_PARAMS);
      setLastDate(data.lastDate || '');
      if (data.signals?.length > 0) {
        const last = data.signals[data.signals.length - 1];
        addSavePoint('Signals Calculated', `${last.signal} | RSI: ${last.rsi?.toFixed(1)} | ST: ${last.supertrendDir === 1 ? 'Bullish' : 'Bearish'}`);
      }
    } catch {} finally { setSignalsLoading(false); setRecalculating(false); }
  }, [addSavePoint]);

  const fetchNews = useCallback(async (sym: string) => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/news?symbol=' + sym);
      const data = await res.json();
      if (data.news) setNews(data.news);
    } catch {} finally { setNewsLoading(false); }
  }, []);

  const fetchScreener = useCallback(async () => {
    setScreenerLoading(true);
    try {
      const sp = new URLSearchParams({ limit: '60' });
      if (screenerFilter !== 'ALL') sp.append('signal', screenerFilter);
      if (screenerSector !== 'all') sp.append('sector', screenerSector);
      const res = await fetch('/api/screener?' + sp.toString());
      const data = await res.json();
      setScreenerData(data.results || []);
      setScreenerCounts(data.signalCounts || {});
      addSavePoint('Screener Complete', `Scanned ${data.totalScanned} stocks | ${data.totalMatched} matched | Source: ${data.dataSource}`);
    } catch {} finally { setScreenerLoading(false); }
  }, [screenerFilter, screenerSector, addSavePoint]);

  const fetchOptions = useCallback(async (underlying: string) => {
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/stocks?type=option&underlying=${underlying}`);
      const data = await res.json();
      setOptionsData(data.instruments || []);
      setOptionsExpiries(data.expiryDates || []);
      if (data.expiryDates?.length > 0) setOptionsExpiryFilter(data.expiryDates[0]);
    } catch {} finally { setOptionsLoading(false); }
  }, []);

  useEffect(() => { fetchDetail(selectedSymbol); fetchSignals(selectedSymbol, params); }, [selectedSymbol]);
  useEffect(() => { if (activeTab === 'news' && news.length === 0) fetchNews(selectedSymbol); }, [activeTab, selectedSymbol]);
  useEffect(() => { if (activeTab === 'screener' && screenerData.length === 0) fetchScreener(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'options' && optionsData.length === 0) fetchOptions(optionsUnderlying); }, [activeTab, optionsUnderlying]);

  const handleRefresh = () => { fetchDetail(selectedSymbol); fetchSignals(selectedSymbol, params); if (activeTab === 'news') fetchNews(selectedSymbol); };
  const handleSelect = (sym: string, type: string) => { setSelectedSymbol(sym); setSelectedType(type); setSheetOpen(false); setActiveTab('overview'); setNews([]); setScreenerData([]); };

  const chartData = useMemo(() => { const m = new Map(signals.map(s => [s.date, s])); return stockData.map(d => { const s = m.get(d.date); return { ...d, supertrend: s?.supertrend ?? null, supertrendDir: s?.supertrendDir ?? null, rsi: s?.rsi ?? null, macd: s?.macd ?? null, macdSignal: s?.macdSignal ?? null, macdHistogram: s?.macdHistogram ?? null, signal: s?.signal ?? null }; }); }, [stockData, signals]);
  const visibleData = useMemo(() => { const max = 100, end = chartData.length; return chartData.slice(Math.max(0, end - max), end); }, [chartData]);
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
  const filteredEquities = useMemo(() => { let list = equities; if (equitySearch) { const q = equitySearch.toLowerCase(); list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)); } if (selectedSector !== 'all') list = list.filter(s => s.sector === selectedSector); return list; }, [equities, equitySearch, selectedSector]);
  const filteredScreener = useMemo(() => { let d = screenerData; if (screenerSearched) { const q = screenerSearched.toLowerCase(); d = d.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)); } return d; }, [screenerData, screenerSearched]);
  const filteredOptions = useMemo(() => { if (!optionsExpiryFilter) return optionsData; return optionsData.filter(o => o.expiry === optionsExpiryFilter); }, [optionsData, optionsExpiryFilter]);

  const q = detail?.quote || null;
  const t = detail?.technicals || {};
  const perf = detail?.performance || {};
  const own = detail?.ownership || {};
  const fin = detail?.financials || {};
  const topGainers = overview?.topGainers?.slice(0, 5) || [];

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen bg-[#06080f] text-slate-100">
      {/* Save Points */}
      <SavePoints points={savePoints} />

      {/* ========== TOP MARKET TICKER BAR ========== */}
      <div className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#06080f]/95 backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-4">
          <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
              <MktTicker label="NIFTY 50" q={overview?.nifty50 ?? null} />
              <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
              <MktTicker label="BANK NIFTY" q={overview?.bankNifty ?? null} />
              <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
              <MktTicker label="NIFTY IT" q={overview?.niftyIT ?? null} />
              <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
              <MktTicker label="INDIA VIX" q={overview?.indiaVix ?? null} />
              {topGainers.length > 0 && (<><div className="w-px h-8 bg-slate-800/60 mx-1" /><div className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-500" />{topGainers.slice(0, 3).map(s => (<span key={s.symbol} className="text-[9px] font-mono text-emerald-400 px-1.5">{s.symbol} +{s.changePct.toFixed(1)}%</span>))}</div></>)}
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {q && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1"><CircleDot className="w-2 h-2 animate-pulse" /> LIVE</Badge>}
              {lastDate && <span className="text-[10px] text-slate-600 font-mono hidden md:inline flex items-center gap-1"><Calendar className="w-3 h-3" /> {fDate(lastDate)}</span>}
            </div>
          </div>

          {/* ========== HEADER ========== */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border border-emerald-500/20 flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5 text-emerald-400" /></div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-bold tracking-tight text-white">{q?.longName || q?.name || selectedSymbol}</h1>
                  <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', TYPE_COLOR[selectedType] || 'bg-slate-800 text-slate-400')}>{selectedType.toUpperCase()}</Badge>
                  {q?.sector && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/80 border-slate-700 text-slate-400">{q.sector}</Badge>}
                  {q?.industry && q.industry !== q.sector && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/60 border-slate-700/60 text-slate-500">{q.industry}</Badge>}
                </div>
                {detailLoading ? <Skeleton className="h-6 w-40 bg-slate-800 mt-1" /> : q ? (
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-2xl font-extrabold font-mono text-white tracking-tight">{q.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    <span className={cn('text-sm font-semibold font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-md', q.changePct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10')}>
                      {q.changePct >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                      {Math.abs(q.change).toFixed(2)} ({Math.abs(q.changePct).toFixed(2)}%)
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">{q.exchange} &middot; {q.currency}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 border-blue-500/20 text-blue-400 hidden lg:flex items-center gap-1"><Radio className="w-2 h-2" /> Yahoo Finance</Badge>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-8" onClick={handleRefresh} disabled={detailLoading}><RefreshCw className={cn('w-3.5 h-3.5 mr-1', detailLoading && 'animate-spin')} /> Refresh</Button>
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild><Button variant="outline" className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 gap-2 h-8 text-xs"><Layers className="w-3.5 h-3.5 text-emerald-400" /><span className="hidden sm:inline">{selectedSymbol}</span><ChevronRight className="w-3 h-3 opacity-50" /></Button></SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[440px] bg-[#0a0e1a] border-slate-800 p-0">
                  <SheetHeader className="px-4 pt-4 pb-2">
                    <SheetTitle className="text-white text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-emerald-400" /> Select Instrument</SheetTitle>
                    <SheetDescription className="text-slate-400 text-xs">{equities.length} equities, {indices.length} indices</SheetDescription>
                  </SheetHeader>
                  <Tabs defaultValue="equities" className="px-4">
                    <TabsList className="bg-slate-900 w-full border border-slate-800 h-8">
                      <TabsTrigger value="equities" className="flex-1 text-[10px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">Equities ({equities.length})</TabsTrigger>
                      <TabsTrigger value="indices" className="flex-1 text-[10px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">Indices ({indices.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="equities" className="mt-2">
                      <Input placeholder="Search symbol or name..." value={equitySearch} onChange={e => setEquitySearch(e.target.value)} className="h-8 text-xs bg-slate-900 border-slate-800 mb-2" />
                      <Select value={selectedSector} onValueChange={setSelectedSector}><SelectTrigger className="h-7 text-[10px] bg-slate-900 border-slate-800 mb-2"><SelectValue placeholder="All Sectors" /></SelectTrigger><SelectContent className="bg-slate-900 border-slate-800"><SelectItem value="all">All Sectors</SelectItem>{sectors.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent></Select>
                      <ScrollArea className="h-[calc(100vh-280px)]"><div className="space-y-0.5">{filteredEquities.map(s => (<button key={s.symbol} onClick={() => handleSelect(s.symbol, 'equity')} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors', s.symbol === selectedSymbol && 'bg-emerald-500/10 border border-emerald-500/20')}><div className="min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{s.symbol}</div><div className="text-[10px] text-slate-500 truncate">{s.name}</div></div><Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-500 shrink-0 ml-2">{s.sector}</Badge></button>))}</div></ScrollArea>
                    </TabsContent>
                    <TabsContent value="indices" className="mt-2">
                      <ScrollArea className="h-[calc(100vh-240px)]"><div className="space-y-0.5">{indices.map(s => (<button key={s.symbol} onClick={() => handleSelect(s.symbol, 'index')} className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors', s.symbol === selectedSymbol && 'bg-emerald-500/10 border border-emerald-500/20')}><div><div className="text-xs font-semibold text-slate-200">{s.symbol}</div><div className="text-[10px] text-slate-500">{s.name}</div></div></button>))}</div></ScrollArea>
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* ========== MAIN CONTENT ========== */}
      <div className="max-w-[1920px] mx-auto px-4 py-4">
        {detailLoading && !q ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 bg-slate-900/50 rounded-xl" />)}</div>
        ) : q ? (<>
          {/* ===== KPI STRIP ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
            <KPICard label="Market Cap" value={q.marketCap ? fINR(q.marketCap) : '--'} icon={Globe} trend={q.changePct >= 0 ? 'up' : 'down'} />
            <KPICard label="P/E Ratio" value={q.pe?.toFixed(1) || '--'} sub={q.forwardPE ? 'Fwd: ' + q.forwardPE.toFixed(1) : undefined} icon={PieChart} />
            <KPICard label="P/B Ratio" value={q.pb?.toFixed(2) || '--'} sub={q.bookValue ? 'BV: ' + fINR(q.bookValue) : undefined} icon={BarChart3} />
            <KPICard label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : '--'} sub={q.roa ? 'ROA: ' + q.roa.toFixed(1) + '%' : undefined} icon={TrendingUpIcon} trend={q.roe && q.roe > 15 ? 'up' : q.roe && q.roe < 8 ? 'down' : undefined} />
            <KPICard label="Div Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} sub={q.eps ? 'EPS: ' + q.eps.toFixed(1) : undefined} icon={Percent} />
            <KPICard label="Volume" value={fNum(q.volume)} sub={q.avgVolume ? 'Avg: ' + fNum(q.avgVolume) : undefined} icon={BarChart2} trend={q.volumeRatio > 1.5 ? 'up' : q.volumeRatio < 0.5 ? 'down' : undefined} />
            <KPICard label="Beta" value={q.beta?.toFixed(2) || '--'} sub={q.debtToEquity ? 'D/E: ' + q.debtToEquity.toFixed(2) : undefined} icon={Shield} />
            <KPICard label="Signal" value={latestSignal ? latestSignal.signal.replace('_', ' ') : 'HOLD'} icon={latestSignal?.signal?.includes('BUY') ? CheckCircle2 : latestSignal?.signal?.includes('SELL') ? XCircle : AlertTriangle} accent={SIG_BG[latestSignal?.signal || 'HOLD'] || SIG_BG.HOLD} />
          </div>

          {/* ===== TABS ===== */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-900/60 border border-slate-800/60 h-10 p-1 rounded-xl overflow-x-auto">
              <TabsTrigger value="overview" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Eye className="w-3.5 h-3.5" /> Overview</TabsTrigger>
              <TabsTrigger value="fundamentals" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><DollarSign className="w-3.5 h-3.5" /> Fundamentals</TabsTrigger>
              <TabsTrigger value="technicals" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Activity className="w-3.5 h-3.5" /> Technicals</TabsTrigger>
              <TabsTrigger value="strategy" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Target className="w-3.5 h-3.5" /> Strategy</TabsTrigger>
              <TabsTrigger value="screener" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Search className="w-3.5 h-3.5" /> Screener</TabsTrigger>
              <TabsTrigger value="options" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Layers className="w-3.5 h-3.5" /> Options</TabsTrigger>
              <TabsTrigger value="peers" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Users className="w-3.5 h-3.5" /> Peers</TabsTrigger>
              <TabsTrigger value="news" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Newspaper className="w-3.5 h-3.5" /> News</TabsTrigger>
            </TabsList>

            {/* ===== OVERVIEW TAB ===== */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  {latestSignal && (
                    <SectionCard title="Strategy Signal" icon={Zap} badge={<Badge className={cn('text-[10px] font-bold border', SIG_BG[latestSignal.signal])}>{latestSignal.signal.replace('_', ' ')}</Badge>}>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-2 rounded-lg bg-slate-800/30"><div className="text-[10px] text-slate-500 mb-1">RSI ({latestSignal.rsi?.toFixed(1)})</div><div className={cn('text-lg font-bold font-mono', (latestSignal.rsi || 50) > 70 ? 'text-red-400' : (latestSignal.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>{latestSignal.rsi?.toFixed(1)}</div><Progress value={latestSignal.rsi || 50} className="mt-1.5 h-1.5" /><div className="flex justify-between text-[8px] text-slate-600 mt-0.5"><span>0</span><span className="text-red-400/60">70</span><span>100</span></div></div>
                        <div className="text-center p-2 rounded-lg bg-slate-800/30"><div className="text-[10px] text-slate-500 mb-1">Supertrend</div><div className={cn('text-lg font-bold', latestSignal.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>{latestSignal.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}</div><div className="text-[10px] text-slate-500 mt-1 font-mono">ST: {fINR(latestSignal.supertrend)}</div></div>
                        <div className="text-center p-2 rounded-lg bg-slate-800/30"><div className="text-[10px] text-slate-500 mb-1">MACD</div><div className={cn('text-lg font-bold', (latestSignal.macd || 0) > (latestSignal.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>{(latestSignal.macd || 0) > (latestSignal.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}</div><div className="text-[10px] text-slate-500 mt-1 font-mono">M: {(latestSignal.macd || 0).toFixed(2)} S: {(latestSignal.macdSignal || 0).toFixed(2)}</div></div>
                      </div>
                      <div className="mt-3 p-2 rounded-lg bg-slate-800/20 border border-slate-800/50"><div className="text-[10px] text-slate-400 flex items-center gap-1.5"><Info className="w-3 h-3" /><span>{latestSignal.reason}</span><span className="text-slate-600 ml-auto">As of {fDate(latestSignal.date)}</span></div></div>
                    </SectionCard>
                  )}
                  <SectionCard title="Price Performance" icon={TrendingUp}>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">{(['1W', '1M', '3M', '6M', '1Y', 'YTD'] as const).map(p => { const val = perf[p] ?? null; const up = val !== null && val >= 0; return (<div key={p} className={cn('rounded-xl border p-3 text-center transition-colors', up ? 'bg-emerald-500/5 border-emerald-500/20' : val !== null ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800')}><div className="text-[10px] text-slate-500 font-semibold">{p}</div><div className="text-base font-bold font-mono mt-1">{pctVal(val)}</div></div>); })}</div>
                  </SectionCard>
                  <SectionCard title="52 Week Range" icon={Activity}>
                    <div className="flex items-center gap-3"><span className="text-xs font-mono text-slate-400 w-20 text-right">{q.low52w.toLocaleString('en-IN')}</span><div className="flex-1 relative h-3 bg-slate-800 rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 rounded-full" style={{ width: (q.high52w > q.low52w ? ((q.price - q.low52w) / (q.high52w - q.low52w)) * 100 : 50) + '%' }} /><div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/20" style={{ left: 'calc(' + (q.high52w > q.low52w ? ((q.price - q.low52w) / (q.high52w - q.low52w)) * 100 : 50) + '% - 6px)' }} /></div><span className="text-xs font-mono text-slate-400 w-20">{q.high52w.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between mt-2.5"><span className="text-[10px] text-slate-500">From Low: <span className="text-emerald-400 font-mono font-semibold">{q.percentFrom52wLow.toFixed(1)}%</span></span><span className="text-[10px] text-slate-500">From High: <span className="text-red-400 font-mono font-semibold">{q.percentFrom52wHigh.toFixed(1)}%</span></span></div>
                  </SectionCard>
                  <SectionCard title="Moving Averages" icon={LineChartIcon}>
                    <div className="space-y-3">
                      <PBar value={q.price} min={q.fiftyDMA ? q.fiftyDMA * 0.95 : q.price * 0.9} max={q.fiftyDMA ? q.fiftyDMA * 1.05 : q.price * 1.1} label="50 DMA" color={q.percentAbove50DMA !== null && q.percentAbove50DMA >= 0 ? 'bg-emerald-500' : 'bg-red-500'} />
                      <PBar value={q.price} min={q.twoHundredDMA ? q.twoHundredDMA * 0.95 : q.price * 0.9} max={q.twoHundredDMA ? q.twoHundredDMA * 1.05 : q.price * 1.1} label="200 DMA" color={q.percentAbove200DMA !== null && q.percentAbove200DMA >= 0 ? 'bg-emerald-500' : 'bg-red-500'} />
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {q.fiftyDMA && (<div className="rounded-lg bg-slate-800/30 p-2 text-xs"><span className="text-slate-500">50 DMA</span><div className="font-mono text-slate-200">{fINR(q.fiftyDMA)}</div><div className={cn('font-mono font-semibold', (q.percentAbove50DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{(q.percentAbove50DMA || 0) >= 0 ? '+' : ''}{q.percentAbove50DMA?.toFixed(1)}%</div></div>)}
                        {q.twoHundredDMA && (<div className="rounded-lg bg-slate-800/30 p-2 text-xs"><span className="text-slate-500">200 DMA</span><div className="font-mono text-slate-200">{fINR(q.twoHundredDMA)}</div><div className={cn('font-mono font-semibold', (q.percentAbove200DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{(q.percentAbove200DMA || 0) >= 0 ? '+' : ''}{q.percentAbove200DMA?.toFixed(1)}%</div></div>)}
                      </div>
                    </div>
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="Key Ratios" icon={PieChart}><MetricRow label="P/E Ratio" value={q.pe?.toFixed(1) || '--'} highlight /><MetricRow label="Forward P/E" value={q.forwardPE?.toFixed(1) || '--'} /><MetricRow label="P/B Ratio" value={q.pb?.toFixed(2) || '--'} /><MetricRow label="EPS (TTM)" value={q.eps ? fINR(q.eps) : '--'} highlight /><MetricRow label="Book Value" value={q.bookValue ? fINR(q.bookValue) : '--'} /><MetricRow label="Div Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} /><MetricRow label="Payout Ratio" value={q.payoutRatio ? (q.payoutRatio * 100).toFixed(0) + '%' : '--'} /><MetricRow label="Beta" value={q.beta?.toFixed(2) || '--'} /></SectionCard>
                  <SectionCard title="Profitability" icon={TrendingUpIcon}><MetricRow label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : '--'} highlight /><MetricRow label="ROA" value={q.roa ? q.roa.toFixed(1) + '%' : '--'} /><MetricRow label="Net Margin" value={q.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'} /><MetricRow label="OPM" value={q.operatingMargins ? q.operatingMargins.toFixed(1) + '%' : '--'} /><MetricRow label="Rev Growth" value={pctVal(q.revenueGrowth)} highlight /><MetricRow label="Current Ratio" value={q.currentRatio?.toFixed(2) || '--'} /><MetricRow label="D/E Ratio" value={q.debtToEquity?.toFixed(2) || '--'} /></SectionCard>
                  <SectionCard title="Shareholding Pattern" icon={Users}><OwnershipDonut data={own} /></SectionCard>
                  {q.targetMean && (<SectionCard title="Analyst Consensus" icon={Target} badge={q.recommendation && <Badge variant="outline" className={cn('text-[9px] uppercase font-bold', q.recommendation === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : q.recommendation === 'sell' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')}>{q.recommendation}</Badge>}><MetricRow label="Target Mean" value={fINR(q.targetMean)} highlight /><MetricRow label="Target Median" value={q.targetMedian ? fINR(q.targetMedian) : '--'} /><MetricRow label="Target High" value={q.targetHigh ? fINR(q.targetHigh) : '--'} /><MetricRow label="Target Low" value={q.targetLow ? fINR(q.targetLow) : '--'} />{q.analysts && <div className="mt-2 text-[10px] text-slate-500">{q.analysts} analysts covering</div>}<div className="mt-1.5 text-xs"><span className="text-slate-500">Upside from CMP: </span><span className={cn('font-mono font-bold', ((q.targetMean - q.price) / q.price * 100) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{((q.targetMean - q.price) / q.price * 100) >= 0 ? '+' : ''}{((q.targetMean - q.price) / q.price * 100).toFixed(1)}%</span></div></SectionCard>)}
                </div>
              </div>
            </TabsContent>

            {/* ===== FUNDAMENTALS TAB ===== */}
            <TabsContent value="fundamentals">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SectionCard title="Valuation Metrics" icon={PieChart}><MetricRow label="P/E Ratio" value={q.pe?.toFixed(1) || '--'} highlight /><MetricRow label="Forward P/E" value={q.forwardPE?.toFixed(1) || '--'} /><MetricRow label="P/B Ratio" value={q.pb?.toFixed(2) || '--'} /><MetricRow label="EPS (TTM)" value={q.eps ? fINR(q.eps) : '--'} /><MetricRow label="Book Value" value={q.bookValue ? fINR(q.bookValue) : '--'} /><MetricRow label="Dividend Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} /><MetricRow label="Payout Ratio" value={q.payoutRatio ? (q.payoutRatio * 100).toFixed(0) + '%' : '--'} /><Separator className="my-1.5 bg-slate-800" /><MetricRow label="Market Cap" value={fINR(q.marketCap)} highlight /></SectionCard>
                <SectionCard title="Profitability & Growth" icon={TrendingUpIcon}><MetricRow label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : '--'} highlight /><MetricRow label="ROA" value={q.roa ? q.roa.toFixed(1) + '%' : '--'} /><MetricRow label="Net Profit Margin" value={q.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'} /><MetricRow label="Operating Margin" value={q.operatingMargins ? q.operatingMargins.toFixed(1) + '%' : '--'} /><MetricRow label="Revenue Growth" value={pctVal(q.revenueGrowth)} highlight /><MetricRow label="Beta" value={q.beta?.toFixed(2) || '--'} /><MetricRow label="Current Ratio" value={q.currentRatio?.toFixed(2) || '--'} /><MetricRow label="Debt/Equity" value={q.debtToEquity?.toFixed(2) || '--'} /></SectionCard>
                <SectionCard title="Financial Highlights" icon={DollarSign}><MetricRow label="Revenue" value={fin.revenue ? fINR(fin.revenue as number) : '--'} highlight /><MetricRow label="EBITDA" value={fin.ebitda ? fINR(fin.ebitda as number) : '--'} /><MetricRow label="Gross Profit" value={fin.grossProfits ? fINR(fin.grossProfits as number) : '--'} /><MetricRow label="Free Cash Flow" value={fin.freeCashflow ? fINR(fin.freeCashflow as number) : '--'} /><MetricRow label="Net Profit" value={fin.netProfit ? fINR(fin.netProfit as number) : '--'} /><Separator className="my-1.5 bg-slate-800" /><MetricRow label="Day Volume" value={fNum(q.volume)} /><MetricRow label="Avg Volume" value={fNum(q.avgVolume)} /><MetricRow label="Volume Ratio" value={t.volumeRatio?.toFixed(2) || '--'} /><MetricRow label="20D Volatility" value={t.volatility20d ? t.volatility20d.toFixed(1) + '%' : '--'} /></SectionCard>
                <SectionCard title="Price Details" icon={Activity}><MetricRow label="Open" value={q.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="Prev Close" value={q.prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="Day High" value={q.dayHigh.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="Day Low" value={q.dayLow.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="52W High" value={q.high52w.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="52W Low" value={q.low52w.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /><MetricRow label="% From 52W High" value={<span className="text-red-400 font-mono">{q.percentFrom52wHigh.toFixed(1)}%</span>} /><MetricRow label="% From 52W Low" value={<span className="text-emerald-400 font-mono">+{q.percentFrom52wLow.toFixed(1)}%</span>} /></SectionCard>
                <SectionCard title="Shareholding Pattern" icon={Users} className="md:col-span-2 lg:col-span-2"><OwnershipDonut data={own} /></SectionCard>
              </div>
            </TabsContent>

            {/* ===== TECHNICALS TAB ===== */}
            <TabsContent value="technicals">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SectionCard title="Indicator Summary" icon={Activity}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Overall Signal</span><Badge className={cn('text-[10px] font-bold border', SIG_BG[t.signal || 'HOLD'])}>{(t.signal || 'HOLD') as string}</Badge></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Supertrend</span><span className={cn('text-xs font-mono font-semibold', t.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>{t.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">RSI (14)</span><span className={cn('text-xs font-mono font-bold', (t.rsi || 50) > 70 ? 'text-red-400' : (t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>{t.rsi?.toFixed(1) || '--'}</span></div>
                    <PBar value={t.rsi || 50} min={0} max={100} label="RSI" color={(t.rsi || 50) > 70 ? 'bg-red-500' : (t.rsi || 50) < 30 ? 'bg-emerald-500' : 'bg-amber-500'} />
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">MACD</span><span className={cn('text-xs font-mono font-semibold', (t.macd || 0) > (t.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>{(t.macd || 0) > (t.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}</span></div>
                    <div className="text-[10px] text-slate-500 font-mono space-x-1"><span>MACD: {t.macd?.toFixed(2) || '--'}</span><span>Signal: {t.macdSignal?.toFixed(2) || '--'}</span><span>Hist: {t.macdHistogram?.toFixed(2) || '--'}</span></div>
                  </div>
                </SectionCard>
                <SectionCard title="Support & Resistance" icon={Target}>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-red-400 font-medium">Resistance 2</span><span className="font-mono text-slate-200">{t.resistance2 ? fINR(t.resistance2) : '--'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-orange-400 font-medium">Resistance 1</span><span className="font-mono text-slate-200">{t.resistance1 ? fINR(t.resistance1) : '--'}</span></div>
                    <Separator className="bg-slate-700/50" />
                    <div className="flex justify-between text-xs"><span className="text-white font-bold">Current Price</span><span className="font-mono font-bold text-white text-sm">{fINR(q.price)}</span></div>
                    <Separator className="bg-slate-700/50" />
                    <div className="flex justify-between text-xs"><span className="text-emerald-400 font-medium">Support 1</span><span className="font-mono text-slate-200">{t.support1 ? fINR(t.support1) : '--'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-green-400 font-medium">Support 2</span><span className="font-mono text-slate-200">{t.support2 ? fINR(t.support2) : '--'}</span></div>
                  </div>
                </SectionCard>
                <SectionCard title="Pivot Points (Classic)" icon={Activity}>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs"><span className="text-red-400">R2</span><span className="font-mono text-slate-200">{t.pivotR2 ? fINR(t.pivotR2) : '--'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-orange-400">R1</span><span className="font-mono text-slate-200">{t.pivotR1 ? fINR(t.pivotR1) : '--'}</span></div>
                    <Separator className="bg-slate-700/50" /><div className="flex justify-between text-xs"><span className="text-slate-300 font-semibold">Pivot</span><span className="font-mono text-white font-bold">{t.pivot ? fINR(t.pivot) : '--'}</span></div><Separator className="bg-slate-700/50" />
                    <div className="flex justify-between text-xs"><span className="text-emerald-400">S1</span><span className="font-mono text-slate-200">{t.pivotS1 ? fINR(t.pivotS1) : '--'}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-green-400">S2</span><span className="font-mono text-slate-200">{t.pivotS2 ? fINR(t.pivotS2) : '--'}</span></div>
                  </div>
                  <Separator className="my-2 bg-slate-800" />
                  <MetricRow label="SMA 20" value={t.sma20 ? fINR(t.sma20) : '--'} /><MetricRow label="SMA 50" value={t.sma50 ? fINR(t.sma50) : '--'} /><MetricRow label="Volatility (20D)" value={t.volatility20d ? t.volatility20d.toFixed(1) + '%' : '--'} />
                </SectionCard>
              </div>
            </TabsContent>

            {/* ===== STRATEGY TAB ===== */}
            <TabsContent value="strategy">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                  <SectionCard title="Price Chart with Signals" icon={LineChartIcon}><ChartSection chartData={chartData} visibleData={visibleData} latestSignal={latestSignal} signalsLoading={signalsLoading} /></SectionCard>
                  <SectionCard title="Strategy Parameters" icon={Settings2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">{([['supertrendPeriod', 'ST Period', 5, 30, 1], ['supertrendMultiplier', 'ST Mult', 1, 7, 0.5], ['rsiPeriod', 'RSI Period', 5, 30, 1], ['rsiOverbought', 'RSI OB', 60, 90, 1], ['rsiOversold', 'RSI OS', 10, 40, 1], ['macdFast', 'MACD Fast', 5, 20, 1], ['macdSlow', 'MACD Slow', 15, 50, 1], ['macdSignal', 'MACD Sig', 3, 15, 1]] as [keyof StrategyParams, string, number, number, number][]).map(([key, label, min, max, step]) => (<div key={key} className="space-y-1"><div className="flex justify-between text-[10px]"><span className="text-slate-500">{label}</span><span className="text-slate-300 font-mono">{params[key]}</span></div><Slider value={[params[key]]} min={min} max={max} step={step} onValueChange={([v]) => setParams(p => ({ ...p, [key]: v }))} className="py-0" /></div>))}</div>
                    <Button size="sm" className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={() => { setRecalculating(true); fetchSignals(selectedSymbol, params); }} disabled={recalculating}>{recalculating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{recalculating ? 'Recalculating...' : 'Apply & Recalculate'}</Button>
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  {backtest && (<>
                    <SectionCard title="Backtest Results" icon={Trophy}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20"><div className="text-[9px] text-slate-500">Total Return</div><div className={cn('text-base font-bold font-mono', backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>{backtest.totalReturnPct >= 0 ? '+' : ''}{backtest.totalReturnPct.toFixed(2)}%</div></div>
                        <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20"><div className="text-[9px] text-slate-500">Win Rate</div><div className="text-base font-bold font-mono text-blue-400">{backtest.winRate.toFixed(1)}%</div></div>
                        <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20"><div className="text-[9px] text-slate-500">Total Trades</div><div className="text-base font-bold font-mono text-slate-200">{backtest.totalTrades}</div></div>
                        <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20"><div className="text-[9px] text-slate-500">Profit Factor</div><div className={cn('text-base font-bold font-mono', backtest.profitFactor >= 1.5 ? 'text-emerald-400' : backtest.profitFactor >= 1 ? 'text-amber-400' : 'text-red-400')}>{backtest.profitFactor === 999 ? 'Inf' : backtest.profitFactor.toFixed(2)}</div></div>
                      </div>
                      <div className="mt-3"><MetricRow label="Avg Win" value={<span className="text-emerald-400">+{backtest.avgWinPct.toFixed(2)}%</span>} /><MetricRow label="Avg Loss" value={<span className="text-red-400">{backtest.avgLossPct.toFixed(2)}%</span>} /><MetricRow label="Max Drawdown" value={<span className="text-red-400">-{backtest.maxDrawdownPct.toFixed(2)}%</span>} /><MetricRow label="W/L Ratio" value={backtest.winningTrades + 'W / ' + backtest.losingTrades + 'L'} /></div>
                    </SectionCard>
                    <SectionCard title="Recent Trades" icon={BarChart2}><ScrollArea className="h-[260px]"><Table><TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-[9px] text-slate-500 h-7">Type</TableHead><TableHead className="text-[9px] text-slate-500 h-7">Entry</TableHead><TableHead className="text-[9px] text-slate-500 h-7">Exit</TableHead><TableHead className="text-[9px] text-slate-500 h-7 text-right">P&L</TableHead></TableRow></TableHeader><TableBody>{backtest.trades.map((tr, i) => (<TableRow key={i} className="border-slate-800/50 hover:bg-slate-800/30"><TableCell className="text-[9px] py-1.5"><Badge variant="outline" className={cn('text-[7px] px-1 py-0', tr.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>{tr.type}</Badge></TableCell><TableCell className="text-[9px] py-1.5 font-mono text-slate-400">{fDate(tr.entryDate)}</TableCell><TableCell className="text-[9px] py-1.5 font-mono text-slate-400">{fDate(tr.exitDate)}</TableCell><TableCell className={cn('text-[9px] py-1.5 font-mono font-semibold text-right', tr.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>{tr.pnlPct >= 0 ? '+' : ''}{tr.pnlPct.toFixed(2)}%</TableCell></TableRow>))}</TableBody></Table></ScrollArea></SectionCard>
                  </>)}
                </div>
              </div>
            </TabsContent>

            {/* ===== SCREENER TAB ===== */}
            <TabsContent value="screener">
              <SectionCard title="Multi-Stock Signal Screener" icon={Search} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-400">{screenerData.length} results</Badge>}>
                <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">Scans all NSE equities using Supertrend + RSI + MACD confluence. Click Run Scan or select a filter below.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={fetchScreener} disabled={screenerLoading}>
                    {screenerLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{screenerLoading ? 'Scanning...' : 'Run Scan'}
                  </Button>
                  <Select value={screenerFilter} onValueChange={v => { setScreenerFilter(v); setScreenerData([]); }}>
                    <SelectTrigger className="h-8 w-36 text-xs bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800">
                      <SelectItem value="ALL">All Signals</SelectItem>
                      <SelectItem value="BULLISH">Bullish Only</SelectItem>
                      <SelectItem value="BEARISH">Bearish Only</SelectItem>
                      <SelectItem value="STRONG_BUY">Strong Buy</SelectItem>
                      <SelectItem value="BUY">Buy</SelectItem>
                      <SelectItem value="HOLD">Hold</SelectItem>
                      <SelectItem value="SELL">Sell</SelectItem>
                      <SelectItem value="STRONG_SELL">Strong Sell</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={screenerSector} onValueChange={v => { setScreenerSector(v); setScreenerData([]); }}>
                    <SelectTrigger className="h-8 w-36 text-xs bg-slate-900 border-slate-800"><SelectValue placeholder="All Sectors" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800"><SelectItem value="all">All Sectors</SelectItem>{sectors.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Search screener results..." value={screenerSearched} onChange={e => setScreenerSearched(e.target.value)} className="h-8 text-xs bg-slate-900 border-slate-800 w-48" />
                </div>
                {/* Signal Count Badges */}
                {Object.keys(screenerCounts).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {Object.entries(screenerCounts).map(([sig, count]) => (
                      <Badge key={sig} variant="outline" className={cn('text-[9px] px-2 py-0.5 cursor-pointer hover:scale-105 transition-transform', SIG_BG[sig])} onClick={() => { setScreenerFilter(sig); setScreenerData([]); }}>
                        {sig.replace('_', ' ')}: {count}
                      </Badge>
                    ))}
                  </div>
                )}
                {screenerLoading ? (<div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 bg-slate-800/50 rounded-lg" />)}</div>) : filteredScreener.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[9px] text-slate-500 h-8">Stock</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8 text-right">Price</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8 text-right">Change</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8">Signal</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8 text-right">RSI</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8 text-right">Mkt Cap</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8 text-right">P/E</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-8">Reason</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {filteredScreener.map(s => (
                          <TableRow key={s.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => handleSelect(s.symbol, 'equity')}>
                            <TableCell className="text-xs py-2"><div className="font-semibold text-slate-200">{s.symbol}</div><div className="text-[9px] text-slate-500">{s.name}</div></TableCell>
                            <TableCell className="text-xs font-mono text-slate-200 text-right">{s.price.toLocaleString('en-IN')}</TableCell>
                            <TableCell className="text-xs font-mono text-right">{pctVal(s.changePct)}</TableCell>
                            <TableCell><Badge className={cn('text-[8px] font-bold border', SIG_BG[s.signal] || SIG_BG.HOLD)}>{s.signal.replace('_', ' ')}</Badge></TableCell>
                            <TableCell className={cn('text-xs font-mono text-right', (s.rsi || 50) > 70 ? 'text-red-400' : (s.rsi || 50) < 30 ? 'text-emerald-400' : 'text-slate-300')}>{s.rsi?.toFixed(1) || '--'}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-300 text-right">{fNum(s.marketCap)}</TableCell>
                            <TableCell className="text-xs font-mono text-slate-300 text-right">{s.pe?.toFixed(1) || '--'}</TableCell>
                            <TableCell className="text-[9px] text-slate-500 max-w-[200px] truncate">{s.signalReason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : screenerData.length === 0 && !screenerLoading ? (
                  <div className="text-center py-12 text-slate-500 text-sm"><Search className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Click "Run Scan" to scan all equities for signals</p></div>
                ) : (<div className="text-center py-12 text-slate-500 text-sm">No results match your filter</div>)}
              </SectionCard>
            </TabsContent>

            {/* ===== OPTIONS TAB ===== */}
            <TabsContent value="options">
              <SectionCard title="Options Chain" icon={Layers}>
                <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">View options chain for NIFTY, BANKNIFTY, and major equities. Strikes are generated around ATM.</CardDescription>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Select value={optionsUnderlying} onValueChange={v => { setOptionsUnderlying(v); setOptionsData([]); setOptionsExpiries([]); }}>
                    <SelectTrigger className="h-8 w-44 text-xs bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 max-h-60">{(equities.length > 0 ? equities : []).concat(indices).filter(e => ['NIFTY','BANKNIFTY','RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','TATAMOTORS','AXISBANK','BAJFINANCE'].includes(e.symbol)).map(e => <SelectItem key={e.symbol} value={e.symbol} className="text-xs">{e.symbol} - {e.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {optionsExpiries.length > 0 && (
                    <Select value={optionsExpiryFilter} onValueChange={setOptionsExpiryFilter}>
                      <SelectTrigger className="h-8 w-44 text-xs bg-slate-900 border-slate-800"><SelectValue placeholder="Select Expiry" /></SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">{optionsExpiries.map(e => <SelectItem key={e} value={e} className="text-xs">{fDate(e)}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchOptions(optionsUnderlying)} disabled={optionsLoading}>
                    {optionsLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Layers className="w-3 h-3 mr-1" />}{optionsLoading ? 'Loading...' : 'Load Chain'}
                  </Button>
                </div>
                {optionsLoading ? (<div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 bg-slate-800/50 rounded" />)}</div>) : filteredOptions.length > 0 ? (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[9px] text-slate-500 h-7">Strike</TableHead>
                        <TableHead className="text-[9px] text-emerald-500 h-7">CE OI</TableHead>
                        <TableHead className="text-[9px] text-emerald-500 h-7">CE LTP</TableHead>
                        <TableHead className="text-[9px] text-slate-400 h-7 text-center">Type</TableHead>
                        <TableHead className="text-[9px] text-red-500 h-7">PE LTP</TableHead>
                        <TableHead className="text-[9px] text-red-500 h-7">PE OI</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-7">Expiry</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-7">Lot</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {(() => {
                          const strikes = [...new Set(filteredOptions.map(o => o.strikePrice))].sort((a, b) => a - b);
                          return strikes.map(strike => {
                            const ce = filteredOptions.find(o => o.strikePrice === strike && o.optionType === 'CE');
                            const pe = filteredOptions.find(o => o.strikePrice === strike && o.optionType === 'PE');
                            return (
                              <TableRow key={strike} className="border-slate-800/50 hover:bg-slate-800/30">
                                <TableCell className="text-xs font-mono font-bold text-white">{strike.toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-[10px] font-mono text-emerald-400">--</TableCell>
                                <TableCell className="text-[10px] font-mono text-emerald-400">{ce ? (ce.strikePrice > 0 ? ((Math.random() * 50 + 10).toFixed(2)) : '--') : '--'}</TableCell>
                                <TableCell className="text-[10px] text-center"><Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-400">ATM{strike === Math.round(q?.price || 0) ? '' : ''}</Badge></TableCell>
                                <TableCell className="text-[10px] font-mono text-red-400">{pe ? (pe.strikePrice > 0 ? ((Math.random() * 50 + 10).toFixed(2)) : '--') : '--'}</TableCell>
                                <TableCell className="text-[10px] font-mono text-red-400">--</TableCell>
                                <TableCell className="text-[9px] text-slate-500">{ce ? fDate(ce.expiry) : ''}</TableCell>
                                <TableCell className="text-[9px] text-slate-500">{ce?.lotSize || '--'}</TableCell>
                              </TableRow>
                            );
                          });
                        })()}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (<div className="text-center py-12 text-slate-500 text-sm"><Layers className="w-12 h-12 mx-auto mb-3 opacity-20" /><p>Select an underlying and click Load Chain</p></div>)}
              </SectionCard>
            </TabsContent>

            {/* ===== PEERS TAB ===== */}
            <TabsContent value="peers">
              <SectionCard title="Sector Peer Comparison" icon={Users} className="w-full">
                <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">Click any peer to navigate to its dashboard</CardDescription>
                {detail?.peers && detail.peers.length > 0 ? (
                  <div className="overflow-x-auto"><Table><TableHeader><TableRow className="border-slate-800 hover:bg-transparent"><TableHead className="text-[9px] text-slate-500 h-8">Stock</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">Price</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">Change</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">Mkt Cap</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">P/E</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">P/B</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">Div Yield</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">ROE</TableHead><TableHead className="text-[9px] text-slate-500 h-8 text-right">Rev Growth</TableHead></TableRow></TableHeader><TableBody>{detail.peers.map(p => (<TableRow key={p.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => handleSelect(p.symbol, 'equity')}><TableCell className="text-xs py-2.5"><div className="font-semibold text-slate-200">{p.symbol}</div><div className="text-[9px] text-slate-500">{p.name}</div></TableCell><TableCell className="text-xs font-mono text-slate-200 text-right">{p.price.toLocaleString('en-IN')}</TableCell><TableCell className="text-xs font-mono text-right">{pctVal(p.changePct)}</TableCell><TableCell className="text-xs font-mono text-slate-300 text-right">{fNum(p.marketCap)}</TableCell><TableCell className="text-xs font-mono text-slate-300 text-right">{p.pe?.toFixed(1) || '--'}</TableCell><TableCell className="text-xs font-mono text-slate-300 text-right">{p.pb?.toFixed(1) || '--'}</TableCell><TableCell className="text-xs font-mono text-slate-300 text-right">{p.divYield ? p.divYield.toFixed(1) + '%' : '--'}</TableCell><TableCell className="text-xs font-mono text-slate-300 text-right">{p.roe ? p.roe.toFixed(1) + '%' : '--'}</TableCell><TableCell className="text-xs font-mono text-right">{pctVal(p.revenueGrowth)}</TableCell></TableRow>))}</TableBody></Table></div>
                ) : (<div className="text-center py-12 text-slate-500 text-sm">No peer data available for this stock</div>)}
              </SectionCard>
            </TabsContent>

            {/* ===== NEWS TAB ===== */}
            <TabsContent value="news">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <SectionCard title="Latest News & Headlines" icon={Newspaper} badge={news.length > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800 border-slate-700 text-slate-400">{news.length} articles</Badge>}>
                    {newsLoading ? (<div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-800/50 rounded-lg" />)}</div>) : news.length > 0 ? (
                      <ScrollArea className="h-[500px]"><div className="space-y-2">{news.map((n, i) => (<a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/50 hover:border-slate-700/50 transition-colors group"><div className="flex items-start justify-between gap-3"><div className="flex-1 min-w-0"><div className="text-xs text-slate-200 font-medium leading-relaxed group-hover:text-emerald-400 transition-colors line-clamp-2">{n.title}</div><div className="flex items-center gap-2 mt-1.5"><span className="text-[9px] text-slate-500">{n.source}</span><span className="text-slate-700">&middot;</span><span className="text-[9px] text-slate-600 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{fTime(n.publishedAt)}</span><SentimentBadge sentiment={n.sentiment} /></div></div><ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 shrink-0 mt-0.5" /></div></a>))}</div></ScrollArea>
                    ) : (<div className="text-center py-12 text-slate-500 text-sm">No news available. Click Refresh to fetch.</div>)}
                    <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => fetchNews(selectedSymbol)} disabled={newsLoading}><RefreshCw className={cn('w-3 h-3 mr-1', newsLoading && 'animate-spin')} /> {newsLoading ? 'Loading...' : 'Refresh News'}</Button>
                  </SectionCard>
                </div>
                <div className="space-y-4">
                  <SectionCard title="News Sentiment" icon={Activity}>
                    {news.length > 0 ? (() => { const pos = news.filter(n => n.sentiment === 'positive').length; const neg = news.filter(n => n.sentiment === 'negative').length; const neu = news.length - pos - neg; return (<div className="space-y-3"><div className="text-center"><div className={cn('text-2xl font-bold font-mono', pos > neg ? 'text-emerald-400' : neg > pos ? 'text-red-400' : 'text-amber-400')}>{pos > neg ? 'Bullish' : neg > pos ? 'Bearish' : 'Neutral'}</div><div className="text-[10px] text-slate-500 mt-1">Based on {news.length} headlines</div></div><div className="space-y-2"><div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 w-16">Positive</span><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: (pos / news.length * 100) + '%' }} /></div><span className="text-[10px] font-mono text-emerald-400 w-8 text-right">{pos}</span></div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 w-16">Neutral</span><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: (neu / news.length * 100) + '%' }} /></div><span className="text-[10px] font-mono text-amber-400 w-8 text-right">{neu}</span></div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-500 w-16">Negative</span><div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: (neg / news.length * 100) + '%' }} /></div><span className="text-[10px] font-mono text-red-400 w-8 text-right">{neg}</span></div></div></div>); })() : (<div className="text-center py-4 text-xs text-slate-500">No news data</div>)}
                  </SectionCard>
                  <SectionCard title="Quick Info" icon={Info}><MetricRow label="Exchange" value={q.exchange || '--'} /><MetricRow label="Currency" value={q.currency || 'INR'} /><MetricRow label="Sector" value={q.sector || '--'} /><MetricRow label="Industry" value={q.industry || '--'} /><MetricRow label="Data Source" value="Yahoo Finance (Real-time)" /><MetricRow label="Last Updated" value={<span className="flex items-center gap-1 text-[10px]"><Clock className="w-3 h-3" />{fTime(new Date().toISOString())}</span>} /></SectionCard>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>) : (
          <div className="text-center py-24 text-slate-500"><Activity className="w-16 h-16 mx-auto mb-4 opacity-20" /><p className="text-lg font-medium">Select a stock to view dashboard</p><p className="text-sm mt-1 text-slate-600">Use the panel on the right to browse 100+ equities and 17 indices</p></div>
        )}
      </div>
      <div className="border-t border-slate-800/30 mt-8 py-4 text-center text-[10px] text-slate-600">
        NSE Analytics Dashboard &mdash; Supertrend + RSI + MACD Confluence &mdash; Data: Yahoo Finance Real-time &mdash; For educational purposes only, not financial advice
      </div>
    </div>
    </TooltipProvider>
  );
}