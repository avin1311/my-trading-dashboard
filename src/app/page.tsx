'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, PieChart, Target, Users, Newspaper, Search, Layers, Star, Gauge, BarChart3, DollarSign, Zap, RefreshCw, ExternalLink, Clock, Radio, Calendar, ArrowUp, ArrowDown, Settings2, Trophy, Download, ChevronRight, ChevronLeft, ChevronDown, ChevronUp, LayoutDashboard, ScanSearch, LineChart, BookOpen, Cpu, Flame, BookmarkPlus, Eye, X, PanelLeftClose, PanelLeft, Bot, GitBranch, WifiOff, Wallet, Bell, BellRing, Plus, Trash2, ToggleLeft, ToggleRight, History, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fINR, fPerShare, fCompact, fNum, fDate, fTime, pctVal, SIG_BG, TYPE_COLOR } from '@/lib/formatters';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useRealtimeData, type LiveTick } from '@/hooks/use-realtime-data';
import { useWatchlist } from '@/components/dashboard/watchlist';
import { SavePoints, MetricRow, OwnershipDonut, SentimentBadge, KPICard, MktTicker } from '@/components/dashboard/kpi-card';
import { StockSelectorSheet } from '@/components/dashboard/stock-selector-sheet';
import { KPIStrip } from '@/components/dashboard/kpi-strip';
import { SignalGauge } from '@/components/dashboard/signal-gauge';
import { AIStrategyPanel } from '@/components/dashboard/ai-strategy-panel';
import { ExportButton } from '@/components/dashboard/export-button';
import { VolumeProfile } from '@/components/dashboard/volume-profile';
import type { LiveQuote, StrategySignal, ScreenerResult, PeerData, StrategyParams } from '@/lib/types';

// ==================== TYPES ====================
type ViewType = 'overview' | 'screener' | 'chart' | 'fundamentals' | 'technicals' | 'strategy' | 'news' | 'watchlist' | 'portfolio' | 'alerts' | 'oi';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
  source: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, source: 'Aggregated', color: 'from-emerald-500/20 to-cyan-500/10' },
  { id: 'screener', label: 'Screener', icon: ScanSearch, source: 'Screener.in', color: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'chart', label: 'Chart', icon: LineChart, source: 'Yahoo/Upstox', color: 'from-amber-500/20 to-orange-500/10' },
  { id: 'fundamentals', label: 'Fundamentals', icon: BookOpen, source: 'Tickertape', color: 'from-purple-500/20 to-pink-500/10' },
  { id: 'technicals', label: 'Technicals', icon: Cpu, source: 'TradingView', color: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'strategy', label: 'Strategy', icon: Target, source: 'Signal Engine', color: 'from-rose-500/20 to-red-500/10' },
  { id: 'news', label: 'News', icon: Newspaper, source: 'Moneycontrol', color: 'from-teal-500/20 to-emerald-500/10' },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet, source: 'Live P&L', color: 'from-emerald-500/20 to-green-500/10' },
  { id: 'alerts', label: 'Alerts', icon: Bell, source: 'Price Monitor', color: 'from-amber-500/20 to-red-500/10' },
  { id: 'watchlist', label: 'Watchlist', icon: Star, source: 'Custom', color: 'from-amber-500/20 to-yellow-500/10' },
  { id: 'oi', label: 'Open Interest', icon: GitBranch, source: 'OI Analysis', color: 'from-violet-500/20 to-purple-500/10' },
];

const ChartSection = dynamic(() => import('@/components/dashboard/charts'), { ssr: false, loading: () => <div className="h-[340px] bg-slate-900/50 rounded-lg animate-pulse flex items-center justify-center text-slate-600 text-sm">Loading chart...</div> });
const Recharts = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });

// ==================== EMPTY STATE ====================
function EmptyState({ label, onBrowse }: { label: string; onBrowse?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/40 border border-slate-700/30 flex items-center justify-center mb-4">
        <Search className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">No Stock Selected</h3>
      <p className="text-xs text-slate-500 mb-4">Select a stock to view {label}</p>
      <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={onBrowse}>
        <Search className="w-3.5 h-3.5 mr-1.5" /> Browse Stocks
      </Button>
    </div>
  );
}
function EMPTY_STOCK(label: string) {
  return <EmptyState label={label} />;
}
function P({ title, icon: Icon, badge, children, className, source, accent }: {
  title: string; icon?: React.ElementType; badge?: React.ReactNode;
  children: React.ReactNode; className?: string; source?: string; accent?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-800/50 bg-[#0c1018]/95 backdrop-blur-sm overflow-hidden flex flex-col panel-glow hover-lift',
      className
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/30 bg-gradient-to-r from-slate-900/40 to-transparent shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
          {source && (
            <Badge variant="outline" className="text-[7px] px-1.5 py-0 bg-slate-800/50 border-slate-700/30 text-slate-500 h-4 font-medium">{source}</Badge>
          )}
        </div>
        {badge}
      </div>
      <div className="p-3.5 flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ==================== COLLAPSIBLE SECTION ====================
function CSection({ title, icon: Icon, badge, children, defaultOpen = false }: { title: string; icon: React.ElementType; badge?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30 hover:bg-slate-800/35 hover:border-slate-700/40 transition-colors group">
        <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-colors" />
        <span className="text-xs font-semibold text-slate-300 flex-1 text-left">{title}</span>
        {badge}
        {open ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ==================== METRIC BOX ====================
function MBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="text-center p-2.5 rounded-lg bg-slate-800/15 border border-slate-800/25 hover:bg-slate-800/25 hover:border-slate-700/30 transition-colors">
      <div className="text-[9px] text-slate-500 font-medium mb-0.5">{label}</div>
      <div className={cn('text-sm font-bold font-mono', color || 'text-slate-100')}>{value}</div>
      {sub && <div className="text-[8px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ==================== SIDEBAR ====================
function Sidebar({ view, setView, collapsed, setCollapsed, d, watchlist }: {
  view: ViewType; setView: (v: ViewType) => void; collapsed: boolean; setCollapsed: (v: boolean) => void;
  d: ReturnType<typeof useDashboardData>; watchlist: ReturnType<typeof useWatchlist>;
}) {
  return (
    <aside className={cn(
      'h-screen sticky top-0 flex flex-col border-r border-slate-800/40 bg-[#070a10] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shrink-0 z-40',
      collapsed ? 'w-[60px]' : 'w-[220px]'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-slate-800/30">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && <span className="text-xs font-bold text-slate-200 tracking-tight">NSE Analytics</span>}
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 py-2">
        <nav className="space-y-0.5 px-2">
          {NAV_ITEMS.map(item => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left transition-all duration-200 group relative',
                  active
                    ? 'bg-gradient-to-r ' + item.color + ' border border-slate-700/40 shadow-sm'
                    : 'hover:bg-slate-800/30 border border-transparent'
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-400" />}
                <Icon className={cn('w-4 h-4 shrink-0 transition-colors duration-200', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-300')} />
                {!collapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-[11px] font-semibold truncate transition-colors duration-200', active ? 'text-white' : 'text-slate-400')}>{item.label}</div>
                      <div className="text-[8px] text-slate-600 transition-colors duration-200">{item.source}</div>
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom controls */}
      <div className="border-t border-slate-800/30 p-2 space-y-1">
        <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800/30 text-slate-500 hover:text-slate-300 transition-colors duration-200">
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          {!collapsed && <span className="text-[10px]">Collapse</span>}
        </button>
        {!collapsed && d.q && (
          <div className="px-2.5 py-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[8px] text-slate-600 mb-0.5">Active Stock</div>
            <div className="text-[11px] font-bold text-slate-200 truncate">{d.selectedSymbol}</div>
            <div className="text-[10px] font-mono text-emerald-400 mt-0.5">{d.q.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ==================== HEADER BAR ====================
function HeaderBar({ d, watchlist, liveTick, rtTicks, upstoxConnected }: { d: ReturnType<typeof useDashboardData>; watchlist: ReturnType<typeof useWatchlist>; liveTick: LiveTick | null; rtTicks: Map<string, LiveTick>; upstoxConnected: boolean }) {
  const q = d.q;
  // Use real-time price from Upstox when available
  const price = liveTick?.ltp || q?.price || 0;
  const changePct = liveTick ? liveTick.changePct : (q?.changePct || 0);
  const change = liveTick ? liveTick.change : (q?.change || 0);
  const isLive = !!liveTick;
  const topGainers = d.overview?.topGainers?.slice(0, 4) || [];
  return (
    <div className={cn('border-b border-slate-800/30 backdrop-blur-md transition-colors duration-500', upstoxConnected ? 'bg-[#060d0a]/95 border-l-2 border-l-emerald-500/60' : 'bg-[#080a12]/95')}>
      {/* Market Ticker — scrollable area for index prices */}
      <div className="border-b border-slate-800/30 flex items-center">
        <div className="flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-0.5 px-4 py-1 min-w-max">
          <MktTicker label="NIFTY 50" q={rtTicks.get('NIFTY') ? { price: rtTicks.get('NIFTY')!.ltp, changePct: rtTicks.get('NIFTY')!.changePct, change: rtTicks.get('NIFTY')!.change } : d.overview?.nifty50 ?? null} />
          <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
          <MktTicker label="BANK NIFTY" q={rtTicks.get('BANKNIFTY') ? { price: rtTicks.get('BANKNIFTY')!.ltp, changePct: rtTicks.get('BANKNIFTY')!.changePct, change: rtTicks.get('BANKNIFTY')!.change } : d.overview?.bankNifty ?? null} />
          <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
          <MktTicker label="NIFTY IT" q={rtTicks.get('NIFTYIT') ? { price: rtTicks.get('NIFTYIT')!.ltp, changePct: rtTicks.get('NIFTYIT')!.changePct, change: rtTicks.get('NIFTYIT')!.change } : d.overview?.niftyIT ?? null} />
          <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
          <MktTicker label="INDIA VIX" q={rtTicks.get('INDIAVIX') ? { price: rtTicks.get('INDIAVIX')!.ltp, changePct: rtTicks.get('INDIAVIX')!.changePct, change: rtTicks.get('INDIAVIX')!.change } : d.overview?.indiaVix ?? null} />
          {topGainers.length > 0 && (
            <>
              <div className="w-px h-8 bg-slate-800/60 mx-1" />
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {topGainers.map(s => (
                  <span key={s.symbol} className="text-[9px] font-mono text-emerald-400 px-1.5">
                    {s.symbol} +{s.changePct.toFixed(1)}%
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      {/* Stock Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {d.selectedSymbol && d.q ? (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-600/15 border border-emerald-500/15 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-white">{q?.longName || q?.name || d.selectedSymbol}</h1>
              <button
                onClick={() => {
                  if (watchlist.isInWatchlist(d.selectedSymbol)) watchlist.removeFromWatchlist(d.selectedSymbol);
                  else watchlist.addToWatchlist(d.selectedSymbol, d.selectedType);
                }}
                className={cn('p-1 rounded-md transition-all duration-200', watchlist.isInWatchlist(d.selectedSymbol) ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-amber-400')}
              >
                <Star className={cn('w-4 h-4', watchlist.isInWatchlist(d.selectedSymbol) && 'fill-current')} />
              </button>
              <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0 font-medium', TYPE_COLOR[d.selectedType] || 'bg-slate-800 text-slate-400')}>
                {d.selectedType.toUpperCase()}
              </Badge>
              {q?.sector && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/60 border-slate-700/40 text-slate-400 font-medium">{q.sector}</Badge>}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-2xl font-extrabold font-mono text-white tracking-tight">{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={cn('text-sm font-semibold font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-md', changePct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10')}>
                {changePct >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                {Math.abs(change).toFixed(2)} ({Math.abs(changePct).toFixed(2)}%)
              </span>
              <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 gap-1 font-medium transition-colors duration-300', isLive ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-slate-800/50 border-slate-700/40 text-slate-500')}>
                {isLive ? <><Radio className="w-2 h-2 animate-pulse" /> UPSTOX LIVE</> : <><Clock className="w-2 h-2" /> DELAYED</>}
              </Badge>
              <span className="text-[10px] text-slate-500 hidden sm:inline">{q.exchange} &middot; {q.currency}</span>
              {d.lastUpdated && <span className="text-[9px] text-slate-600 hidden lg:inline">Updated: {d.lastUpdated}</span>}
            </div>
          </div>
        </div>
        ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-blue-600/15 border border-emerald-500/15 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">NSE Analytics Dashboard</h1>
            <p className="text-xs text-slate-500">Select a stock to begin analysis</p>
          </div>
        </div>
        )}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800/40 text-xs h-8 transition-colors" onClick={d.handleRefresh} disabled={d.detailLoading}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5 transition-transform', d.detailLoading && 'animate-spin')} /> Refresh
          </Button>
          <button
            onClick={() => d.setAutoRefresh(!d.autoRefresh)}
            className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all duration-200',
              d.autoRefresh ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/15' : 'bg-slate-800/30 border-slate-700/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full transition-colors', d.autoRefresh ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
            {d.autoRefresh ? 'POLLING' : 'OFF'}
          </button>
          <StockSelectorSheet
            open={d.sheetOpen} onOpenChange={d.setSheetOpen}
            selectedSymbol={d.selectedSymbol}
            equities={d.equities} indices={d.indices} sectors={d.sectors}
            equitySearch={d.equitySearch} setEquitySearch={d.setEquitySearch}
            selectedSector={d.selectedSector} setSelectedSector={d.setSelectedSector}
            filteredEquities={d.filteredEquities} handleSelect={d.handleSelect}
          />
        </div>
      </div>
    </div>
  );
}

// ==================== OVERVIEW VIEW ====================
function ConfluenceBadges({ signal }: { signal: { supertrendDir: number; rsi: number; macd: number | null; macdSignal: number | null } }) {
  const items = [
    { label: 'ST', bullish: signal.supertrendDir === 1, tip: 'Supertrend direction' },
    { label: 'RSI>50', bullish: signal.rsi > 50, tip: 'RSI above/below 50' },
    { label: 'MACD', bullish: (signal.macd || 0) > (signal.macdSignal || 0), tip: 'MACD above/below signal line' },
  ];
  return (
    <div className="flex items-center gap-3 text-[10px]">
      {items.map(({ label, bullish, tip }) => (
        <span key={label} className={cn('flex items-center gap-1 px-2 py-1 rounded-md border', bullish ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-red-500/10 border-red-500/25 text-red-400')} title={tip}>
          <span className={cn('w-1.5 h-1.5 rounded-full', bullish ? 'bg-emerald-400' : 'bg-red-400')} />{label}
        </span>
      ))}
    </div>
  );
}

function OverviewView({ d, watchlist, onSetAlert, liveTick, onViewScreener }: { d: ReturnType<typeof useDashboardData>; watchlist: ReturnType<typeof useWatchlist>; onSetAlert: (s: { symbol: string; name: string; price: number; signal: string }) => void; liveTick?: import('@/hooks/use-realtime-data').LiveTick | null; onViewScreener: () => void }) {
  // Market landing page when no stock is selected at all
  if (!d.selectedSymbol) {
    const topGainers = d.overview?.topGainers || [];
    const topLosers = d.overview?.topLosers || [];
    return (
      <div className="space-y-3 view-enter">
        {/* Market Indices Row */}
        <P title="Market Indices" icon={Activity} source="NSE Real-time">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MktTicker label="NIFTY 50" q={d.overview?.nifty50 ?? null} />
            <MktTicker label="BANK NIFTY" q={d.overview?.bankNifty ?? null} />
            <MktTicker label="NIFTY IT" q={d.overview?.niftyIT ?? null} />
            <MktTicker label="INDIA VIX" q={d.overview?.indiaVix ?? null} />
          </div>
        </P>

        {/* Top Gainers & Losers side by side */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-6">
            <P title="Top Gainers" icon={TrendingUp} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/8 border-emerald-500/20 text-emerald-400 font-medium">Today</Badge>} source="NSE">
              {topGainers.length > 0 ? (
                <div className="space-y-1">
                  {topGainers.map((s: any, i: number) => (
                    <div key={s.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 hover:border-emerald-500/20 cursor-pointer transition-all duration-200" onClick={() => d.handleSelect(s.symbol, 'equity')}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[9px] font-mono text-emerald-500/40 w-4 text-right">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200">{s.symbol}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{s.longName || s.name}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-xs font-bold font-mono text-slate-200">{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div className="text-[10px] font-mono font-semibold text-emerald-400">+{s.changePct?.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex items-center justify-center py-8"><div className="shimmer h-4 w-32 rounded" /></div>}
            </P>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <P title="Top Losers" icon={TrendingUp} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-red-500/8 border-red-500/20 text-red-400 font-medium">Today</Badge>} source="NSE">
              {topLosers.length > 0 ? (
                <div className="space-y-1">
                  {topLosers.map((s: any, i: number) => (
                    <div key={s.symbol} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 cursor-pointer transition-all duration-200" onClick={() => d.handleSelect(s.symbol, 'equity')}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[9px] font-mono text-red-500/40 w-4 text-right">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200">{s.symbol}</div>
                          <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{s.longName || s.name}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <div className="text-xs font-bold font-mono text-slate-200">{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                        <div className="text-[10px] font-mono font-semibold text-red-400">{s.changePct?.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="flex items-center justify-center py-8"><div className="shimmer h-4 w-32 rounded" /></div>}
            </P>
          </div>
        </div>

        {/* Important Stocks in News + Quick Browse */}
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-7">
            <P title="Stocks in Focus" icon={Flame} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/10 border-amber-500/30 text-amber-400">Trending</Badge>} source="NSE">
              <div className="text-[10px] text-slate-500 mb-3">Popular NSE stocks — click to analyze</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'LT', 'AXISBANK', 'BAJFINANCE', 'SUNPHARMA', 'MARUTI'].map(sym => {
                  const info = d.equities.find(e => e.symbol === sym);
                  return (
                    <button key={sym} onClick={() => d.handleSelect(sym, 'equity')} className="p-2.5 rounded-lg bg-slate-800/10 border border-slate-800/20 hover:bg-emerald-500/8 hover:border-emerald-500/20 text-left transition-all duration-200 hover-lift group">
                      <div className="text-[11px] font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{sym}</div>
                      <div className="text-[9px] text-slate-500 truncate">{info?.name || sym}</div>
                      {info?.sector && <div className="text-[8px] text-slate-600 mt-0.5">{info.sector}</div>}
                    </button>
                  );
                })}
              </div>
            </P>
          </div>
          <div className="col-span-12 lg:col-span-5">
            <P title="Quick Browse" icon={Search} source="All NSE Stocks">
              <div className="space-y-3">
                <Button onClick={() => d.setSheetOpen(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white">
                  <Search className="w-4 h-4 mr-2" /> Browse All {d.equities.length} Stocks
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  {['BANKNIFTY', 'NIFTYIT', 'NIFTYMIDCAP', 'NIFTYPHARMA'].map(sym => {
                    const info = d.indices.find(i => i.symbol === sym);
                    return (
                      <button key={sym} onClick={() => d.handleSelect(sym, 'index')} className="p-2 rounded-lg bg-slate-800/10 border border-slate-800/20 hover:bg-purple-500/8 hover:border-purple-500/20 text-left transition-all duration-200 hover-lift group">
                        <div className="text-[10px] font-bold text-slate-200 group-hover:text-purple-400 transition-colors">{sym}</div>
                        <div className="text-[9px] text-slate-500 truncate">{info?.name || sym}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[10px] text-slate-500 text-center pt-1">
                  Select a stock or index to see full analysis with Supertrend + RSI + MACD signals
                </div>
              </div>
            </P>
          </div>
        </div>
      </div>
    );
  }
  // Stock is selected but data not yet loaded — show loading
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh]">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <WifiOff className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Failed to load {d.selectedSymbol}</h3>
          <p className="text-xs text-slate-500 mb-4">Could not fetch data. The data source may be rate-limited or temporarily unavailable.</p>
          <div className="flex gap-2">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry
            </Button>
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-400 hover:text-white" onClick={() => d.setSheetOpen(true)}>
              <Search className="w-3.5 h-3.5 mr-1.5" /> Pick Another Stock
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-3" />
        <p className="text-sm text-slate-300">Loading {d.selectedSymbol} data...</p>
        <p className="text-xs text-slate-500 mt-1">Fetching quote, signals & fundamentals</p>
      </div>
    );
  }
  const q = d.q;
  const t = d.t;
  const price = liveTick?.ltp || q?.price || 0;
  const changePct = liveTick ? liveTick.changePct : (q?.changePct || 0);
  const change = liveTick ? liveTick.change : (q?.change || 0);
  const isLive = !!liveTick;
  const sig = d.latestSignal?.signal || 'HOLD';
  const isInWatchlist = watchlist.watchlist.some(w => w.symbol === d.selectedSymbol);

  return (
    <div className="space-y-3 view-enter">
      {/* ===== STOCK MONITOR HERO ===== */}
      <div className="rounded-xl border border-slate-800/60 bg-gradient-to-br from-[#0c1018] to-[#0a0e1a] p-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          {/* Left: Price + Signal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-slate-100">{d.selectedSymbol}</span>
              <span className="text-xs text-slate-500 truncate max-w-[200px]">{q?.longName || q?.name || ''}</span>
              {isLive && <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</span>}
              {q?.sector && <Badge variant="outline" className="text-[8px] px-1.5 py-0 text-slate-500 border-slate-700/50">{q.sector}</Badge>}
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold font-mono tracking-tight text-white">{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className={cn('text-sm font-semibold font-mono', changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
                <span className="text-xs ml-1">({changePct >= 0 ? '+' : ''}{change.toFixed(2)})</span>
              </span>
            </div>
            {/* Quick metrics row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px]">
              <span className="text-slate-500">MCap: <span className="text-slate-300 font-mono">{q?.marketCap ? fCompact(q.marketCap) : '--'}</span></span>
              <span className="text-slate-500">P/E: <span className="text-slate-300 font-mono">{q?.pe?.toFixed(1) || '--'}</span></span>
              <span className="text-slate-500">Vol: <span className="text-slate-300 font-mono">{fNum(q?.volume || 0)}</span></span>
              {q?.avgVolume && <span className="text-slate-500">Avg Vol: <span className="text-slate-300 font-mono">{fNum(q.avgVolume)}</span></span>}
              <span className="text-slate-500">H: <span className="text-emerald-400 font-mono">{q?.dayHigh?.toLocaleString('en-IN')}</span></span>
              <span className="text-slate-500">L: <span className="text-red-400 font-mono">{q?.dayLow?.toLocaleString('en-IN')}</span></span>
            </div>
          </div>

          {/* Center: Signal Badge + Gauge + Verdict */}
          <div className="flex flex-col items-center gap-2 lg:min-w-[220px]">
            {d.latestSignal ? (
              <>
                <SignalGauge signal={d.latestSignal} />
                <Badge className={cn('text-[11px] font-bold border px-3 py-1', SIG_BG[sig])}>{sig.replace('_', ' ')}</Badge>
                {/* Richer verdict summary */}
                <div className="w-full space-y-1.5 mt-1">
                  <ConfluenceBadges signal={d.latestSignal} />
                  <div className="text-[8px] text-slate-500 text-center leading-relaxed">{d.latestSignal.reason}</div>
                  {d.backtest && (
                    <div className="flex items-center justify-center gap-3 text-[9px]">
                      <span className={cn('font-mono font-bold', d.backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>Str: {(d.backtest.totalReturnPct >= 0 ? '+' : '') + d.backtest.totalReturnPct.toFixed(1)}%</span>
                      <span className="text-slate-700">|</span>
                      <span className={cn('font-mono', d.backtest.alphaPct >= 0 ? 'text-emerald-400/70' : 'text-red-400/70')}>α: {(d.backtest.alphaPct >= 0 ? '+' : '') + d.backtest.alphaPct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">Calculating signal...</div>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex lg:flex-col gap-2 flex-shrink-0">
            <button onClick={() => onSetAlert({ symbol: d.selectedSymbol, name: q?.name || d.selectedSymbol, price, signal: sig })} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-semibold hover:bg-amber-500/20 transition-colors">
              <Bell className="w-3.5 h-3.5" /> Set Alert
            </button>
            <button onClick={() => isInWatchlist ? watchlist.removeFromWatchlist(d.selectedSymbol) : watchlist.addToWatchlist(d.selectedSymbol, 'equity')} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-semibold transition-colors', isInWatchlist ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/20' : 'bg-slate-800/30 border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600')}>
              {isInWatchlist ? <><Star className="w-3.5 h-3.5 fill-current" /> Watching</> : <><Star className="w-3.5 h-3.5" /> Watchlist</>}
            </button>
            <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/40 text-slate-400 text-[10px] font-semibold hover:text-slate-200 hover:border-slate-600 transition-colors">
              <Activity className="w-3.5 h-3.5" /> Full Chart
            </button>
          </div>
        </div>

        {/* 52W range bar */}
        {q?.high52w > q?.low52w && (
          <div className="mt-3 pt-3 border-t border-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-600 w-14 text-right">{q.low52w.toLocaleString('en-IN')}</span>
              <div className="flex-1 relative h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/40 via-amber-500/30 to-emerald-500/40 rounded-full" style={{ width: ((price - q.low52w) / (q.high52w - q.low52w) * 100) + '%' }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-emerald-400 shadow" style={{ left: 'calc(' + ((price - q.low52w) / (q.high52w - q.low52w) * 100) + '% - 4px)' }} />
              </div>
              <span className="text-[9px] font-mono text-slate-600 w-14">{q.high52w.toLocaleString('en-IN')}</span>
              <span className="text-[8px] text-slate-600 ml-1">52W</span>
            </div>
          </div>
        )}
      </div>

      {/* ===== CHART (always visible) ===== */}
      <P title="Price Chart with Signals" icon={Activity} badge={<ExportButton symbol={d.selectedSymbol} />} source="Yahoo Finance" className="col-span-full">
        <ChartSection chartData={d.chartData} visibleData={d.visibleData} latestSignal={d.latestSignal} signalsLoading={d.signalsLoading} symbol={d.selectedSymbol} liveTick={liveTick} strategyParams={{ macdFast: d.params.macdFast, macdSlow: d.params.macdSlow, macdSignal: d.params.macdSignal }} />
      </P>

      {/* ===== DETAIL SECTIONS (collapsible, collapsed by default) ===== */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-6">
          <CSection title="Signal Analysis" icon={Gauge} defaultOpen={false}>
            {d.latestSignal ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <MBox label="RSI" value={Math.round(d.latestSignal.rsi) || '--'} color={(d.latestSignal.rsi || 50) > 70 ? 'text-red-400' : (d.latestSignal.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400'} sub={d.latestSignal.rsi > 70 ? 'Overbought' : d.latestSignal.rsi < 30 ? 'Oversold' : d.latestSignal.rsi > 50 ? 'Bullish zone' : 'Bearish zone'} />
                  <MBox label="Supertrend" value={d.latestSignal.supertrendDir === 1 ? 'BULL' : 'BEAR'} color={d.latestSignal.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400'} sub={fPerShare(d.latestSignal.supertrend)} />
                  <MBox label="MACD" value={(d.latestSignal.macd || 0) > (d.latestSignal.macdSignal || 0) ? 'BULL' : 'BEAR'} color={(d.latestSignal.macd || 0) > (d.latestSignal.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400'} sub={'Hist: ' + (d.latestSignal.macdHistogram || 0).toFixed(2)} />
                </div>
                {/* Indicator confluence breakdown */}
                <ConfluenceBadges signal={d.latestSignal} />
                <div className="p-2 rounded-lg bg-slate-800/15 border border-slate-800/30">
                  <p className="text-[9px] text-slate-400 leading-relaxed">{d.latestSignal.reason}</p>
                </div>
                {d.backtest && <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <MBox label="Win Rate" value={d.backtest.winRate.toFixed(0) + '%'} color={d.backtest.winRate > 50 ? 'text-emerald-400' : 'text-red-400'} />
                    <MBox label="Profit Factor" value={d.backtest.profitFactor.toFixed(2)} color={d.backtest.profitFactor > 1.5 ? 'text-emerald-400' : 'text-amber-400'} />
                    <MBox label="Strategy" value={(d.backtest.totalReturnPct >= 0 ? '+' : '') + d.backtest.totalReturnPct.toFixed(1) + '%'} color={d.backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <MBox label="Buy & Hold" value={(d.backtest.benchmarkReturnPct >= 0 ? '+' : '') + d.backtest.benchmarkReturnPct.toFixed(1) + '%'} color={d.backtest.benchmarkReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} sub='Same period' />
                    <MBox label="Alpha" value={(d.backtest.alphaPct >= 0 ? '+' : '') + d.backtest.alphaPct.toFixed(1) + '%'} color={d.backtest.alphaPct >= 0 ? 'text-emerald-400' : 'text-red-400'} sub={d.backtest.alphaPct >= 0 ? 'Outperformed' : 'Underperformed'} />
                  </div>
                  {d.backtest.note && <p className="text-[8px] text-amber-500/70 italic">{d.backtest.note}</p>}
                </div>}
              </div>
            ) : <div className="text-center py-4 text-slate-500 text-xs">Loading signals...</div>}
          </CSection>

          <CSection title="Technical Analysis" icon={Activity} defaultOpen={false}>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
                <span className="text-[10px] text-slate-400">RSI ({d.params.rsiPeriod}) <span className="text-slate-600 hover:text-slate-400 cursor-help text-[9px] transition-colors" title="Relative Strength Index: momentum oscillator (0-100). Above 70 = overbought, below 30 = oversold.">ⓘ</span></span>
                <span className={cn('text-sm font-bold font-mono', (t.rsi || 50) > 70 ? 'text-red-400' : (t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>{t.rsi ? Math.round(t.rsi) : '--'}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
                <span className="text-[10px] text-slate-400">Supertrend <span className="text-slate-600 hover:text-slate-400 cursor-help text-[9px] transition-colors" title="Trend-following indicator using ATR. Price above ST = bullish, below = bearish.">ⓘ</span></span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold', t.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>{t.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{t.supertrend ? fPerShare(t.supertrend) : '--'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
                <span className="text-[10px] text-slate-400">MACD <span className="text-slate-600 hover:text-slate-400 cursor-help text-[9px] transition-colors" title="Moving Average Convergence Divergence. MACD > Signal line = bullish crossover.">ⓘ</span></span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-bold', (t.macd || 0) > (t.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>{(t.macd || 0) > (t.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}</span>
                  <span className="text-[10px] text-slate-500 font-mono">Hist: {(t.macdHistogram || 0).toFixed(2)}</span>
                </div>
              </div>
              <Separator className="bg-slate-800/40" />
              <div className="space-y-1">
                {[['Resistance 2', t.resistance2, 'text-red-400/80'], ['Resistance 1', t.resistance1, 'text-orange-400/80'], ['Price', q?.price, 'text-white font-bold', true], ['Support 1', t.support1, 'text-emerald-400/80'], ['Support 2', t.support2, 'text-green-400/80']].map(([label, val, color, isPrice]: any) => (
                  <div key={String(label)} className={cn('flex justify-between text-[10px]', isPrice && 'bg-slate-800/30 px-1.5 py-0.5 rounded')}>
                    <span className={String(color)}>{label}</span>
                    <span className={cn('font-mono', isPrice ? 'font-bold text-white' : 'text-slate-300')}>{val ? fPerShare(val) : '--'}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {q?.fiftyDMA && <div className="rounded-lg bg-slate-800/20 p-1.5 text-[10px]"><div className="text-slate-500">50 DMA <span className="text-slate-600 hover:text-slate-400 cursor-help text-[9px] transition-colors" title="50-day simple moving average. Price above = short-term bullish.">ⓘ</span></div><div className="font-mono text-slate-200">{fPerShare(q.fiftyDMA)}</div><div className={cn('font-mono font-semibold', (q.percentAbove50DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{(q.percentAbove50DMA || 0) >= 0 ? '+' : ''}{q.percentAbove50DMA?.toFixed(1)}%</div></div>}
                {q?.twoHundredDMA && <div className="rounded-lg bg-slate-800/20 p-1.5 text-[10px]"><div className="text-slate-500">200 DMA <span className="text-slate-600 hover:text-slate-400 cursor-help text-[9px] transition-colors" title="200-day simple moving average. Price above = long-term bullish.">ⓘ</span></div><div className="font-mono text-slate-200">{fPerShare(q.twoHundredDMA)}</div><div className={cn('font-mono font-semibold', (q.percentAbove200DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{(q.percentAbove200DMA || 0) >= 0 ? '+' : ''}{q.percentAbove200DMA?.toFixed(1)}%</div></div>}
              </div>
            </div>
          </CSection>
        </div>

        <div className="col-span-12 lg:col-span-6">
          <CSection title="Fundamentals & Financials" icon={PieChart} defaultOpen={false}>
            <div className="space-y-0">
              <MetricRow label="P/E Ratio" value={q?.pe?.toFixed(1) || '--'} highlight tooltip="Price / EPS. Lower = cheaper." />
              <MetricRow label="Forward P/E" value={q?.forwardPE?.toFixed(1) || '--'} tooltip="Price / expected EPS next 12 months." />
              <MetricRow label="P/B Ratio" value={q?.pb?.toFixed(2) || '--'} tooltip="Price / Book Value. <1 may signal undervaluation." />
              <MetricRow label="EPS (TTM)" value={q?.eps ? fPerShare(q.eps) : '--'} highlight tooltip="Trailing 12-month earnings per share." />
              <MetricRow label="ROE" value={q?.roe ? q.roe.toFixed(1) + '%' : '--'} highlight tooltip="Return on Equity — capital efficiency." />
              <MetricRow label="ROA" value={q?.roa ? q.roa.toFixed(1) + '%' : '--'} tooltip="Return on Assets — includes leverage effect." />
              <MetricRow label="Net Margin" value={q?.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'} tooltip="Net profit / revenue (bottom line)." />
              <MetricRow label="Rev Growth" value={pctVal(q?.revenueGrowth)} highlight tooltip="Year-over-year revenue change." />
              <MetricRow label="D/E Ratio" value={q?.debtToEquity?.toFixed(2) || '--'} tooltip="Total debt / shareholders equity. Higher = more leveraged."
              />
              <MetricRow label="Div Yield" value={q?.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} tooltip="Annual dividend per share / current price."
              />
              <Separator className="bg-slate-800/40 my-1" />
              <MetricRow label="Revenue" value={d.fin.revenue ? fINR(d.fin.revenue) : '--'} tooltip="Total revenue (TTM) from income statement."
              />
              <MetricRow label="EBITDA" value={d.fin.ebitda ? fINR(d.fin.ebitda) : '--'} tooltip="Earnings Before Interest, Taxes, Depreciation & Amortization."
              />
              <MetricRow label="Net Profit (est.)" value={d.fin.netProfit ? '~' + fINR(d.fin.netProfit) : '--'} highlight tooltip="Estimated net profit (TTM) from Screener.in fundamentals DB."
              />
            </div>
            {q?.targetMean && (
              <><Separator className="bg-slate-800/40 my-1" />
              <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-800/15">
                <span className="text-[10px] text-slate-400">Analyst Target</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-200">{fPerShare(q.targetMean)}</span>
                  <Badge variant="outline" className={cn('text-[8px] px-1 py-0', q.recommendation === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')}>{q.recommendation}</Badge>
                  <span className={cn('text-[9px] font-mono font-bold', ((q.targetMean - q.price) / q.price * 100) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {((q.targetMean - q.price) / q.price * 100) >= 0 ? '+' : ''}{((q.targetMean - q.price) / q.price * 100).toFixed(1)}%
                  </span>
                </div>
              </div></>
            )}
          </CSection>

          <CSection title="Price Performance" icon={TrendingUp} defaultOpen={false}>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {(['1W', '1M', '3M', '6M', '1Y', 'Period'] as const).map(p => {
                const val = d.perf[p] ?? null;
                const up = val !== null && val >= 0;
                return (
                  <div key={p} className={cn('rounded-lg border p-2 text-center', up ? 'bg-emerald-500/5 border-emerald-500/20' : val !== null ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800')}>
                    <div className="text-[9px] text-slate-500 font-semibold">{p}</div>
                    <div className="text-xs font-bold font-mono mt-0.5">{pctVal(val)}</div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Open</span><span className="font-mono text-slate-200">{fPerShare(q?.open)}</span></div>
              <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Prev Close</span><span className="font-mono text-slate-200">{fPerShare(q?.prevClose)}</span></div>
            </div>
          </CSection>

          <CSection title="Shareholding" icon={Users} defaultOpen={false}>
            <OwnershipDonut data={d.own} />
          </CSection>
        </div>
      </div>
      {/* Row 3: Screener + News */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 xl:col-span-7 2xl:col-span-8">
          <P title="Actionable Signals" icon={Zap} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">{d.filteredScreener.filter((s: ScreenerResult) => s.signal !== 'HOLD').length} signals</Badge>} source="Signal Engine">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500" onClick={d.fetchScreener} disabled={d.screenerLoading}>
                {d.screenerLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{d.screenerLoading ? 'Scanning...' : 'Run Scan'}
              </Button>
              <button onClick={onViewScreener} className="text-[9px] text-emerald-400/70 hover:text-emerald-400 underline underline-offset-2 transition-colors">View full screener →</button>
            </div>
            <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-[9px] text-slate-500 h-7">Stock</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 text-right">Price</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 text-right">Change</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 text-right">RSI</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 text-center">Signal</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 text-right">Volume</TableHead>
                  <TableHead className="text-[9px] text-slate-500 h-7 w-8"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {d.screenerLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-7 bg-slate-800/50" /></TableCell></TableRow>)
                    : d.screenerError && d.screenerData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-6"><div className="text-amber-400 text-xs mb-2">Scan failed or timed out</div><Button size="sm" className="h-6 text-[10px] bg-emerald-600 hover:bg-emerald-500" onClick={d.fetchScreener}><RefreshCw className="w-3 h-3 mr-1" />Retry Scan</Button></TableCell></TableRow>
                  )
                    : d.filteredScreener.filter((s: ScreenerResult) => s.signal !== 'HOLD').slice(0, 15).map((s: ScreenerResult) => (
                    <TableRow key={s.symbol} className={cn('border-slate-800/50 hover:bg-slate-800/30 cursor-pointer', s.symbol === d.selectedSymbol && 'bg-emerald-500/5 border-emerald-500/20')} onClick={() => d.handleSelect(s.symbol, 'equity')}>
                      <TableCell className="text-[10px] py-1.5"><span className="font-semibold text-slate-200">{s.symbol}</span>{s.symbol === d.selectedSymbol && <span className="text-emerald-400 ml-1 text-[8px]">← you</span>}<span className="text-slate-500 ml-1 text-[9px]">{s.sector}</span></TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-200 text-right">{s.price.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-[10px] font-mono text-right">{pctVal(s.changePct)}</TableCell>
                      <TableCell className="text-[10px] font-mono text-right">{s.rsi ? Math.round(s.rsi) : '--'}</TableCell>
                      <TableCell className="text-center"><Badge className={cn('text-[8px] font-bold border px-1 py-0', SIG_BG[s.signal as keyof typeof SIG_BG] || SIG_BG.HOLD)}>{s.signal.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-400 text-right">{fNum(s.volume)}</TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSetAlert({ symbol: s.symbol, name: s.name, price: s.price, signal: s.signal }); }}
                          className="p-1 rounded hover:bg-amber-500/20 text-slate-600 hover:text-amber-400 transition-colors"
                          title="Set price alert"
                        ><Bell className="w-3 h-3" /></button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </P>
        </div>
        <div className="col-span-12 xl:col-span-5 2xl:col-span-4">
          <P title="News & Headlines" icon={Newspaper} badge={d.news.length > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800 border-slate-700 text-slate-400">{d.news.length}</Badge>} source="Moneycontrol / Google News">
            <ScrollArea className="h-[320px]">
              <div className="space-y-1.5">
                {d.newsLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 bg-slate-800/50 rounded-lg" />)
                  : d.news.length > 0 ? d.news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-lg bg-slate-800/15 hover:bg-slate-800/30 border border-slate-800/30 hover:border-slate-700/40 transition-colors group">
                    <div className="text-[10px] text-slate-200 font-medium leading-relaxed group-hover:text-emerald-400 transition-colors line-clamp-2">{n.title}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[8px] text-slate-500">{n.source}</span>
                      <span className="text-slate-700">&middot;</span>
                      <span className="text-[8px] text-slate-600 flex items-center gap-0.5"><Clock className="w-2 h-2" />{fTime(n.publishedAt)}</span>
                      <SentimentBadge sentiment={n.sentiment} />
                      <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-emerald-400 ml-auto" />
                    </div>
                  </a>
                )) : <div className="text-center py-8 text-slate-500 text-xs">No news available</div>}
              </div>
            </ScrollArea>
          </P>
        </div>
      </div>
      {/* Row 4: Peers + Volume */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 xl:col-span-7 2xl:col-span-8">
          <P title="Sector Peer Comparison" icon={Users} source="Screener.in">
            {d.detail?.peers && d.detail.peers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[9px] text-slate-500 h-7">Stock</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">Price</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">Change</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">Mkt Cap</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">P/E</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">P/B</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">ROE</TableHead>
                    <TableHead className="text-[9px] text-slate-500 h-7 text-right">Rev Growth</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {d.detail.peers.filter((p: PeerData) => p.price > 0).map((p: PeerData) => (
                      <TableRow key={p.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => d.handleSelect(p.symbol, 'equity')}>
                        <TableCell className="text-[10px] py-1.5"><span className="font-semibold text-slate-200">{p.symbol}</span><span className="text-slate-500 ml-1 text-[8px]">{p.name}</span></TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-200 text-right">{p.price.toLocaleString('en-IN')}</TableCell>
                        <TableCell className="text-[10px] font-mono text-right">{pctVal(p.changePct)}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-300 text-right">{fCompact(p.marketCap)}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.pe?.toFixed(1) || '--'}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.pb?.toFixed(1) || '--'}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.roe ? p.roe.toFixed(1) + '%' : '--'}</TableCell>
                        <TableCell className="text-[10px] font-mono text-right">{pctVal(p.revenueGrowth)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <div className="text-center py-8 text-slate-500 text-xs">No peer data available</div>}
          </P>
        </div>
        <div className="col-span-12 xl:col-span-5 2xl:col-span-4">
          <P title="Volume Profile" icon={BarChart3} source="Technical Analysis">
            {d.signalsLoading ? <div className="flex items-center justify-center py-6"><RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400 mr-2" /><span className="text-[10px] text-slate-400">Loading volume data...</span></div> : <VolumeProfile data={d.stockData} currentPrice={d.q?.price} />}
          </P>
        </div>
      </div>
    </div>
  );
}

// ==================== SCREENER VIEW (Screener.in Style) ====================
function ScreenerView({ d, onSetAlert }: { d: ReturnType<typeof useDashboardData>; onSetAlert: (s: { symbol: string; name: string; price: number; signal: string }) => void }) {
  const [sortBy, setSortBy] = useState<string>('changePct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [savedScreeners, setSavedScreeners] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const sorted = useMemo(() => {
    const arr = [...d.filteredScreener];
    arr.sort((a, b) => {
      const va = (a as any)[sortBy]; const vb = (b as any)[sortBy];
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'desc' ? vb - va : va - vb;
      return 0;
    });
    return arr;
  }, [d.filteredScreener, sortBy, sortDir]);
  const handleSort = (col: string) => { if (sortBy === col) setSortDir(p => p === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortDir('desc'); } };

  // Load saved screeners list
  const loadSaved = async () => {
    setLoadingSaved(true);
    try {
      const res = await fetch('/api/screener?action=list_saved');
      const data = await res.json();
      setSavedScreeners(data.saved || []);
    } catch {}
    setLoadingSaved(false);
  };

  // Save current filter
  const handleSave = async () => {
    if (!saveName.trim()) return;
    await fetch('/api/screener', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: saveName.trim(), filters: { signal: d.screenerFilter, sector: d.screenerSector } }),
    });
    setSaveName('');
    setShowSaveInput(false);
    loadSaved();
  };

  // Export CSV
  const handleExport = () => {
    const params = new URLSearchParams({ export: 'csv' });
    d.screenerFilter.forEach((s: string) => params.append('signal', s));
    d.screenerSector.forEach((s: string) => params.append('sector', s));
    const url = '/api/screener?' + params.toString();
    const a = document.createElement('a');
    a.href = url;
    a.download = `screener-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Load a saved filter
  const handleLoadFilter = (filters: any) => {
    if (filters.signal) d.setScreenerFilter(Array.isArray(filters.signal) ? filters.signal : [filters.signal]);
    if (filters.sector) d.setScreenerSector(Array.isArray(filters.sector) ? filters.sector : [filters.sector]);
    d.fetchScreener();
  };

  // Delete a saved screener
  const handleDeleteSaved = async (id: string) => {
    await fetch(`/api/screener?id=${id}`, { method: 'DELETE' });
    loadSaved();
  };

  return (
    <P title="Full Stock Screener" icon={Search} source="Screener.in" className="h-full"
      badge={
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => { loadSaved(); setShowSaveInput(false); }}>
            <BookmarkPlus className="w-3 h-3 mr-1" />{showSaveInput ? 'Saved' : 'Load'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10" onClick={() => setShowSaveInput(!showSaveInput)}>
            <Save className="w-3 h-3 mr-1" />Save
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={handleExport} disabled={d.screenerData.length === 0}>
            <Download className="w-3 h-3 mr-1" />CSV
          </Button>
        </div>
      }
    >
      {/* Save Input */}
      {showSaveInput && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-800/30 border border-amber-500/20">
          <Input placeholder="Screener name..." value={saveName} onChange={e => setSaveName(e.target.value)} className="h-7 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && handleSave()} />
          <Button size="sm" className="h-7 text-[10px] bg-amber-600 hover:bg-amber-500" onClick={handleSave} disabled={!saveName.trim()}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setShowSaveInput(false)}>Cancel</Button>
        </div>
      )}
      {/* Saved Screeners List */}
      {loadingSaved ? <div className="text-[10px] text-slate-500 mb-2">Loading saved screeners...</div> : savedScreeners.length > 0 && !showSaveInput ? (
        <div className="mb-3 p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Saved Presets</div>
          <div className="flex flex-wrap gap-1.5">
            {savedScreeners.map((s: any) => (
              <div key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/40 border border-slate-700/30 hover:border-emerald-500/30 transition-colors">
                <button onClick={() => handleLoadFilter(s.filters)} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium">{s.name}</button>
                <button onClick={() => handleDeleteSaved(s.id)} className="text-slate-600 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={d.fetchScreener} disabled={d.screenerLoading}>
          {d.screenerLoading ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          {d.screenerLoading ? 'Scanning All Stocks...' : 'Scan All Stocks'}
        </Button>
        {d.screenerTotal > 0 && <Badge variant="outline" className="text-[9px] px-2 py-0.5 bg-blue-500/10 border-blue-500/20 text-blue-400">Scanned {d.screenerTotal} stocks</Badge>}
        <div className="flex flex-wrap items-center gap-1">
          {Object.entries(d.screenerCounts).map(([sig, cnt]) => {
            const isActive = d.screenerFilter.includes(sig);
            return (
              <Badge
                key={sig}
                variant="outline"
                className={cn(
                  'text-[9px] px-2 py-0.5 cursor-pointer transition-all',
                  SIG_BG[sig as keyof typeof SIG_BG] || SIG_BG.HOLD,
                  isActive ? 'ring-1 ring-white/30 scale-105' : 'opacity-50 hover:opacity-80'
                )}
                onClick={() => {
                  d.setScreenerFilter(
                    isActive
                      ? d.screenerFilter.filter((s: string) => s !== sig)
                      : [...d.screenerFilter, sig]
                  );
                }}
              >
                {isActive && '✓ '}{cnt} {sig.replace('_', ' ')}
              </Badge>
            );
          })}
        </div>
        <Input placeholder="Search stock..." value={d.screenerSearched} onChange={e => d.setScreenerSearched(e.target.value)} className="h-8 w-[180px] text-xs" />
      </div>
      <div className="overflow-auto max-h-[calc(100vh-320px)]">
        <Table>
          <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
            {([['symbol', 'Stock'], ['price', 'Price'], ['changePct', 'Change'], ['rsi', 'RSI'], ['signal', 'Signal'], ['volume', 'Volume'], ['marketCap', 'Mkt Cap'], ['pe', 'P/E'], ['_alert', '']] as [string, string][]).map(([key, label]) => (
              <TableHead key={key} className={cn('text-[10px] text-slate-400 h-8 cursor-pointer hover:text-white', key === 'price' || key === 'changePct' || key === 'rsi' || key === 'volume' || key === 'marketCap' || key === 'pe' ? 'text-right' : '', key === '_alert' ? 'w-8' : '')} onClick={() => { if (key !== '_alert') handleSort(key); }}>
                {label} {sortBy === key && <span className="text-emerald-400 ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>}
              </TableHead>
            ))}
          </TableRow></TableHeader>
          <TableBody>
            {d.screenerLoading ? Array.from({ length: 10 }).map((_, i) => <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-8 bg-slate-800/50" /></TableCell></TableRow>)
              : d.screenerError && d.screenerData.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8"><div className="text-amber-400 text-sm mb-1">Scan failed or timed out</div><div className="text-slate-500 text-xs mb-3">Yahoo Finance may be rate-limited. Try again in a minute.</div><Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={d.fetchScreener}><RefreshCw className="w-3 h-3 mr-1.5" />Retry Scan</Button></TableCell></TableRow>
              )
              : sorted.map((s: ScreenerResult) => (
              <TableRow key={s.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => d.handleSelect(s.symbol, 'equity')}>
                <TableCell className="text-xs py-2"><div className="font-bold text-slate-200">{s.symbol}</div><div className="text-[9px] text-slate-500">{s.name} &middot; {s.sector}</div></TableCell>
                <TableCell className="text-xs font-mono text-slate-200 text-right font-semibold">{s.price.toLocaleString('en-IN')}</TableCell>
                <TableCell className="text-xs font-mono text-right">{pctVal(s.changePct)}</TableCell>
                <TableCell className="text-xs font-mono text-right">{s.rsi ? Math.round(s.rsi) : '--'}</TableCell>
                <TableCell className="text-center"><Badge className={cn('text-[9px] font-bold border px-1.5 py-0.5', SIG_BG[s.signal as keyof typeof SIG_BG] || SIG_BG.HOLD)}>{s.signal.replace('_', ' ')}</Badge></TableCell>
                <TableCell className="text-xs font-mono text-slate-400 text-right">{fNum(s.volume)}</TableCell>
                <TableCell className="text-xs font-mono text-slate-300 text-right">{fCompact(s.marketCap)}</TableCell>
                <TableCell className="text-xs font-mono text-slate-300 text-right">{s.pe?.toFixed(1) || '--'}</TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSetAlert({ symbol: s.symbol, name: s.name, price: s.price, signal: s.signal }); }}
                    className="p-1.5 rounded hover:bg-amber-500/20 text-slate-600 hover:text-amber-400 transition-colors"
                    title="Set price alert"
                  ><Bell className="w-3.5 h-3.5" /></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </P>
  );
}

// ==================== CHART VIEW (TradingView Style) ====================
function ChartView({ d, liveTick }: { d: ReturnType<typeof useDashboardData>; liveTick?: import('@/hooks/use-realtime-data').LiveTick | null }) {
  if (!d.selectedSymbol) return EMPTY_STOCK('price charts & indicators');
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <WifiOff className="w-6 h-6 text-red-400 mb-3" />
        <p className="text-xs text-slate-400 mb-3">Failed to load {d.selectedSymbol}</p>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button>
      </div>
    );
    return <div className="flex items-center justify-center h-[50vh]"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading {d.selectedSymbol}...</span></div>;
  }
  return (
    <div className="space-y-3 view-enter">
      <P title={`${d.selectedSymbol} — Price Action & Indicators`} icon={Activity} badge={<ExportButton symbol={d.selectedSymbol} />} source="TradingView Style" className="col-span-full">
        <ChartSection chartData={d.chartData} visibleData={d.visibleData} latestSignal={d.latestSignal} signalsLoading={d.signalsLoading} symbol={d.selectedSymbol} liveTick={liveTick} strategyParams={{ macdFast: d.params.macdFast, macdSlow: d.params.macdSlow, macdSignal: d.params.macdSignal }} />
      </P>
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-6">
          <P title="Signal Analysis" icon={Gauge} source="Signal Engine">
            {d.latestSignal ? (
              <div className="flex flex-col items-center gap-3">
                <SignalGauge signal={d.latestSignal} />
                <div className="w-full p-2 rounded-lg bg-slate-800/15 border border-slate-800/30">
                  <p className="text-[9px] text-slate-400 leading-relaxed">{d.latestSignal.reason}</p>
                </div>
              </div>
            ) : <div className="text-center py-8 text-slate-500 text-xs">Loading signals...</div>}
          </P>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <P title="Volume Profile" icon={BarChart3} source="Technical Analysis">
            {d.signalsLoading ? <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading volume data...</span></div> : <VolumeProfile data={d.stockData} currentPrice={d.q.price} />}
          </P>
        </div>
      </div>
    </div>
  );
}

// ==================== FUNDAMENTALS VIEW (Tickertape Style) ====================
function FundamentalsView({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.selectedSymbol) return EMPTY_STOCK('fundamentals & financials');
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]"><WifiOff className="w-6 h-6 text-red-400 mb-3" /><p className="text-xs text-slate-400 mb-3">Failed to load {d.selectedSymbol}</p><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button></div>
    );
    return <div className="flex items-center justify-center h-[50vh]"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading {d.selectedSymbol}...</span></div>;
  }
  // Detect if fundamental data is completely unavailable (stock not in DB + Yahoo enrichment failed)
  const hasFundamentals = !!(d.q.pe || d.q.pb || d.q.eps || d.q.roe || d.fin.revenue);
  const fundSections = [
    { title: 'Valuation Ratios', icon: PieChart, source: hasFundamentals ? 'Tickertape' : 'Yahoo Finance unavailable', items: [
      { l: 'P/E Ratio', v: d.q.pe?.toFixed(1) || '--', h: true, t: 'Price / Earnings per Share. Lower = cheaper relative to earnings.' }, { l: 'Forward P/E', v: d.q.forwardPE?.toFixed(1) || '--', t: 'Price / Expected EPS (next 12 months). Useful for growth stocks.' },
      { l: 'P/B Ratio', v: d.q.pb?.toFixed(2) || '--', t: 'Price / Book Value per Share. <1 may indicate undervaluation.' }, { l: 'EPS (TTM)', v: d.q.eps ? fPerShare(d.q.eps) : '--', h: true, t: 'Earnings Per Share — trailing twelve months net profit / shares outstanding.' },
      { l: 'Book Value' + (d.q._bvDerived ? ' (derived)' : ''), v: d.q.bookValue ? fPerShare(d.q.bookValue) : '--', t: d.q._bvDerived ? 'Derived from EPS / ROE — raw book value was inconsistent with other fundamentals.' : 'Total equity / shares outstanding. Also called net asset value per share.' }, { l: 'Dividend Yield', v: d.q.dividendYield ? d.q.dividendYield.toFixed(2) + '%' : '--', t: 'Annual dividend per share / current price.' },
      { l: 'Payout Ratio', v: d.q.payoutRatio ? (d.q.payoutRatio * 100).toFixed(1) + '%' : '--', t: 'Dividends / Net Profit. >100% means paying from reserves.' },
    ]},
    { title: 'Profitability', icon: TrendingUp, source: 'Moneycontrol', items: [
      { l: 'ROE', v: d.q.roe ? d.q.roe.toFixed(1) + '%' : '--', h: true, t: 'Return on Equity — net profit / shareholders equity. Measures capital efficiency.' }, { l: 'ROA', v: d.q.roa ? d.q.roa.toFixed(1) + '%' : '--', t: 'Return on Assets — net profit / total assets. Lower than ROE when debt is used.' },
      { l: 'Net Profit Margin', v: d.q.profitMargins ? d.q.profitMargins.toFixed(1) + '%' : '--', t: 'Net profit / revenue. What percentage of revenue becomes bottom-line profit.' },
      { l: 'Operating Margin (OPM)', v: d.q.operatingMargins ? d.q.operatingMargins.toFixed(1) + '%' : '--', t: 'Operating profit / revenue. Excludes interest and taxes. Not the same as EBITDA margin.' },
      { l: 'Revenue Growth', v: d.q.revenueGrowth ? d.q.revenueGrowth.toFixed(1) + '%' : '--', h: true, t: 'Year-over-year revenue growth rate.' },
      { l: 'Beta', v: d.q.beta?.toFixed(2) || '--', t: 'Volatility relative to NIFTY 50. >1 = more volatile than market, <1 = less.' }, { l: 'D/E Ratio', v: d.q.debtToEquity?.toFixed(2) || '--', t: 'Total debt / shareholders equity. Higher = more leveraged.' },
      { l: 'Current Ratio', v: d.q.currentRatio?.toFixed(2) || '--', t: 'Current assets / current liabilities. >1.5 = healthy short-term liquidity.' },
    ]},
    { title: 'Financial Highlights', icon: DollarSign, source: 'Moneycontrol', items: (() => {
      const finVals = [d.fin.revenue, d.fin.ebitda, d.fin.grossProfits, d.fin.freeCashflow, d.fin.netProfit].filter((v): v is number => v != null && v > 0);
      const finMax = finVals.length > 0 ? Math.max(...finVals) : 0;
      const fs = finMax >= 1e11 ? 'T' as const : finMax >= 1e7 ? 'Cr' as const : finMax >= 1e5 ? 'L' as const : 'raw' as const;
      return [
      { l: 'Total Revenue', v: d.fin.revenue ? fINR(d.fin.revenue, { scale: fs }) : '--', h: true },
      { l: 'EBITDA', v: d.fin.ebitda ? fINR(d.fin.ebitda, { scale: fs }) : '--' },
      { l: 'Gross Profit', v: d.fin.grossProfits ? fINR(d.fin.grossProfits, { scale: fs }) : '--' },
      { l: 'Free Cashflow', v: d.fin.freeCashflow ? fINR(d.fin.freeCashflow, { scale: fs }) : '--' },
      { l: 'Net Profit (est.)', v: d.fin.netProfit ? '~' + fINR(d.fin.netProfit, { scale: fs }) : '--', h: true },
      ];
    })() },
  ];
  return (
    <div className="space-y-3 view-enter">
      {!hasFundamentals && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 leading-relaxed">
          <span className="font-semibold">Limited fundamental data</span> — {d.selectedSymbol} is not in the local fundamentals database and the Yahoo Finance enrichment call failed (likely rate-limited). Price and chart data should still work. Try again in a minute or select a major stock like RELIANCE or TCS for full data.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {fundSections.map(sec => (
          <P key={sec.title} title={sec.title} icon={sec.icon} source={sec.source}>
            <div className="space-y-0">
              {sec.items.map(item => <MetricRow key={item.l} label={item.l} value={item.v} highlight={item.h} tooltip={item.t} />)}
            </div>
          </P>
        ))}
      </div>
      {/* Analyst consensus */}
      {d.q.targetMean && (
        <P title="Analyst Price Target" icon={Target} source="Tickertape">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MBox label="Target High" value={d.q.targetHigh ? fPerShare(d.q.targetHigh) : '—'} color="text-emerald-400" />
            <MBox label="Target Mean" value={fPerShare(d.q.targetMean)} color="text-cyan-400" />
            <MBox label="Target Median" value={d.q.targetMedian ? fPerShare(d.q.targetMedian) : '—'} color="text-blue-400" />
            <MBox label="Target Low" value={d.q.targetLow ? fPerShare(d.q.targetLow) : '—'} color="text-red-400" />
            <MBox label="Upside" value={((d.q.targetMean - d.q.price) / d.q.price * 100).toFixed(1) + '%'} color={((d.q.targetMean - d.q.price) / d.q.price * 100) >= 0 ? 'text-emerald-400' : 'text-red-400'} sub={`${d.q.analysts} analysts`} />
          </div>
        </P>
      )}
      {/* Ownership */}
      <P title="Shareholding Pattern" icon={Users} source="Screener.in">
        <OwnershipDonut data={d.own} />
      </P>
    </div>
  );
}

// ==================== TECHNICALS VIEW (TradingView Style) ====================
function TechnicalsView({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.selectedSymbol) return EMPTY_STOCK('technical indicators');
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]"><WifiOff className="w-6 h-6 text-red-400 mb-3" /><p className="text-xs text-slate-400 mb-3">Failed to load {d.selectedSymbol}</p><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button></div>
    );
    return <div className="flex items-center justify-center h-[50vh]"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading {d.selectedSymbol}...</span></div>;
  }
  return (
    <div className="space-y-3 view-enter">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-6">
          <P title="Technical Indicators Summary" icon={Activity} source="TradingView">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 font-medium">RSI ({d.params.rsiPeriod})</span>
                  <span className={cn('text-lg font-bold font-mono', (d.t.rsi || 50) > 70 ? 'text-red-400' : (d.t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>{d.t.rsi?.toFixed(1) || '--'}</span>
                </div>
                <Progress value={d.t.rsi || 50} className="h-2.5" />
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                  <span>Oversold ({d.params.rsiOversold})</span>
                  <span className={cn('font-semibold', (d.t.rsi || 50) > 70 ? 'text-red-400' : (d.t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>
                    {(d.t.rsi || 50) > 70 ? 'OVERBOUGHT' : (d.t.rsi || 50) < 30 ? 'OVERSOLD' : 'NEUTRAL'}
                  </span>
                  <span>Overbought ({d.params.rsiOverbought})</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-slate-800/20 border border-slate-800/30">
                  <div className="text-[10px] text-slate-500 mb-1">Supertrend ({d.params.supertrendPeriod}, {d.params.supertrendMultiplier})</div>
                  <div className={cn('text-lg font-bold', d.t.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>{d.t.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">ST Value: {d.t.supertrend ? fPerShare(d.t.supertrend) : '--'}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/20 border border-slate-800/30">
                  <div className="text-[10px] text-slate-500 mb-1">MACD ({d.params.macdFast}, {d.params.macdSlow}, {d.params.macdSignal})</div>
                  <div className={cn('text-lg font-bold', (d.t.macd || 0) > (d.t.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>{(d.t.macd || 0) > (d.t.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}</div>
                  <div className="text-[10px] text-slate-500 font-mono">Histogram: {(d.t.macdHistogram || 0).toFixed(2)}</div>
                </div>
              </div>
              {d.t.volatility60d && (
                <div className="p-3 rounded-lg bg-slate-800/20 border border-slate-800/30">
                  <div className="flex justify-between"><span className="text-[10px] text-slate-500">Annualized Volatility (60D)</span><span className="text-xs font-mono text-amber-400 font-bold">{d.t.volatility60d.toFixed(1)}%</span></div>
                </div>
              )}
            </div>
          </P>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <P title="Support & Resistance Levels" icon={Layers} source="TradingView">
            <div className="space-y-2">
              {[
                { l: 'Resistance 2', v: d.t.resistance2, c: 'text-red-400' },
                { l: 'Resistance 1', v: d.t.resistance1, c: 'text-orange-400' },
                { l: 'Current Price', v: d.q.price, c: 'text-white', bg: true },
                { l: 'Support 1', v: d.t.support1, c: 'text-emerald-400' },
                { l: 'Support 2', v: d.t.support2, c: 'text-green-400' },
              ].map(level => (
                <div key={level.l} className={cn('flex items-center justify-between p-2.5 rounded-lg', level.bg ? 'bg-slate-700/30 border border-slate-600/40' : 'bg-slate-800/15 border border-slate-800/30')}>
                  <span className={cn('text-xs font-medium', level.c)}>{level.l}</span>
                  <span className={cn('text-sm font-bold font-mono', level.c)}>{level.v ? fPerShare(level.v) : '--'}</span>
                </div>
              ))}
              <Separator className="bg-slate-800/40" />
              <div className="text-[10px] text-slate-500 font-semibold mb-1">Pivot Points</div>
              {[
                { l: 'Pivot', v: d.t.pivot }, { l: 'R1', v: d.t.pivotR1 }, { l: 'S1', v: d.t.pivotS1 },
                { l: 'R2', v: d.t.pivotR2 }, { l: 'S2', v: d.t.pivotS2 },
              ].map(pp => (
                <div key={pp.l} className="flex justify-between text-[10px] py-0.5">
                  <span className="text-slate-500">{pp.l}</span>
                  <span className="font-mono text-slate-300">{pp.v ? fPerShare(pp.v) : '--'}</span>
                </div>
              ))}
            </div>
          </P>
        </div>
      </div>
      {/* Moving Averages */}
      <P title="Moving Averages & Price Position" icon={TrendingUp} source="Technical Analysis">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {d.q.fiftyDMA && <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 text-center">
            <div className="text-[10px] text-slate-500 mb-1">50 Day MA</div>
            <div className="text-lg font-bold font-mono text-slate-200">{fPerShare(d.q.fiftyDMA)}</div>
            <div className={cn('text-sm font-bold font-mono', (d.q.percentAbove50DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {(d.q.percentAbove50DMA || 0) >= 0 ? '+' : ''}{d.q.percentAbove50DMA?.toFixed(1)}%
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">{(d.q.percentAbove50DMA || 0) >= 0 ? 'Above' : 'Below'} 50 DMA</div>
          </div>}
          {d.q.twoHundredDMA && <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 text-center">
            <div className="text-[10px] text-slate-500 mb-1">200 Day MA</div>
            <div className="text-lg font-bold font-mono text-slate-200">{fPerShare(d.q.twoHundredDMA)}</div>
            <div className={cn('text-sm font-bold font-mono', (d.q.percentAbove200DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
              {(d.q.percentAbove200DMA || 0) >= 0 ? '+' : ''}{d.q.percentAbove200DMA?.toFixed(1)}%
            </div>
            <div className="text-[9px] text-slate-600 mt-0.5">{(d.q.percentAbove200DMA || 0) >= 0 ? 'Above' : 'Below'} 200 DMA</div>
          </div>}
          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 text-center">
            <div className="text-[10px] text-slate-500 mb-1">52W High</div>
            <div className="text-lg font-bold font-mono text-slate-200">{fPerShare(d.q.high52w)}</div>
            <div className="text-sm font-bold font-mono text-red-400">{d.q.percentFrom52wHigh.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-600 mt-0.5">From 52W High</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 text-center">
            <div className="text-[10px] text-slate-500 mb-1">52W Low</div>
            <div className="text-lg font-bold font-mono text-slate-200">{fPerShare(d.q.low52w)}</div>
            <div className="text-sm font-bold font-mono text-emerald-400">+{d.q.percentFrom52wLow.toFixed(1)}%</div>
            <div className="text-[9px] text-slate-600 mt-0.5">From 52W Low</div>
          </div>
        </div>
      </P>
    </div>
  );
}

// ==================== STRATEGY VIEW ====================
function StrategyView({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.selectedSymbol) return EMPTY_STOCK('trading strategies & signals');
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]"><WifiOff className="w-6 h-6 text-red-400 mb-3" /><p className="text-xs text-slate-400 mb-3">Failed to load {d.selectedSymbol}</p><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button></div>
    );
    return <div className="flex items-center justify-center h-[50vh]"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading {d.selectedSymbol}...</span></div>;
  }
  return (
    <div className="space-y-3 view-enter">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 lg:col-span-5 2xl:col-span-4">
          <P title="Signal Gauge & Analysis" icon={Gauge} source="Signal Engine">
            {d.signalsLoading ? <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" /> <span className="text-xs text-slate-400">Analyzing signals...</span></div> : d.latestSignal ? <SignalGauge signal={d.latestSignal} /> : <div className="text-center py-8 text-slate-500 text-xs">No signals generated. Try Recalculate.</div>}
          </P>
        </div>
        <div className="col-span-12 lg:col-span-7 2xl:col-span-8">
          <P title="Backtest Performance" icon={Trophy} source="200-day Historical">
            {d.signalsLoading ? <div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" /> <span className="text-xs text-slate-400">Running backtest...</span></div> : d.backtest ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 2xl:grid-cols-6 gap-2">
                  <MBox label="Total Return" value={(d.backtest.totalReturnPct >= 0 ? '+' : '') + d.backtest.totalReturnPct.toFixed(1) + '%'} color={d.backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                  <MBox label="Win Rate" value={d.backtest.winRate.toFixed(0) + '%'} color={d.backtest.winRate > 50 ? 'text-emerald-400' : 'text-red-400'} />
                  <MBox label="Total Trades" value={String(d.backtest.totalTrades)} />
                  <MBox label="Profit Factor" value={d.backtest.profitFactor.toFixed(2)} color={d.backtest.profitFactor > 1.5 ? 'text-emerald-400' : 'text-amber-400'} />
                  <MBox label="Max Drawdown" value={'-' + d.backtest.maxDrawdownPct.toFixed(1) + '%'} color="text-red-400" />
                  <MBox label="Win / Loss" value={`${d.backtest.winningTrades}W / ${d.backtest.losingTrades}L`} color={d.backtest.winningTrades > d.backtest.losingTrades ? 'text-emerald-400' : 'text-red-400'} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MBox label="Avg Win" value={'+' + d.backtest.avgWinPct.toFixed(1) + '%'} color="text-emerald-400" />
                  <MBox label="Avg Loss" value={d.backtest.avgLossPct.toFixed(1) + '%'} color="text-red-400" />
                </div>
                {/* Strategy vs Buy & Hold visual comparison */}
                <div className="p-3 rounded-lg bg-slate-800/15 border border-slate-800/30 space-y-2">
                  <div className="text-[10px] text-slate-400 font-semibold">Strategy vs Buy & Hold</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Strategy</span>
                      <span className={cn('font-mono font-bold', d.backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>{(d.backtest.totalReturnPct >= 0 ? '+' : '') + d.backtest.totalReturnPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', d.backtest.totalReturnPct >= 0 ? 'bg-emerald-500' : 'bg-red-500')} style={{ width: Math.min(100, Math.abs(d.backtest.totalReturnPct)) + '%' }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Buy & Hold</span>
                      <span className={cn('font-mono font-bold', d.backtest.benchmarkReturnPct >= 0 ? 'text-slate-300' : 'text-red-400/70')}>{(d.backtest.benchmarkReturnPct >= 0 ? '+' : '') + d.backtest.benchmarkReturnPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800/60 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500', d.backtest.benchmarkReturnPct >= 0 ? 'bg-slate-500' : 'bg-red-500/60')} style={{ width: Math.min(100, Math.abs(d.backtest.benchmarkReturnPct)) + '%' }} />
                    </div>
                  </div>
                  <div className={cn('text-center text-[10px] font-semibold pt-1 border-t border-slate-800/30', d.backtest.alphaPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {d.backtest.alphaPct >= 0 ? 'Outperformed B&H by ' + d.backtest.alphaPct.toFixed(1) + '%' : 'Underperformed B&H by ' + Math.abs(d.backtest.alphaPct).toFixed(1) + '%'}
                  </div>
                </div>
                {d.backtest.trades.length > 0 && (
                  <div className="overflow-auto max-h-[200px]">
                    <Table>
                      <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-[9px] text-slate-500 h-6">Entry</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-6 text-right">Entry Price</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-6">Exit</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-6 text-right">Exit Price</TableHead>
                        <TableHead className="text-[9px] text-slate-500 h-6 text-right">P&L %</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {d.backtest.trades.slice(-10).reverse().map((t, i) => (
                          <TableRow key={i} className="border-slate-800/50">
                            <TableCell className="text-[9px] py-1 text-slate-400">{fDate(t.entryDate)}</TableCell>
                            <TableCell className="text-[9px] py-1 font-mono text-slate-300 text-right">{t.entryPrice.toFixed(0)}</TableCell>
                            <TableCell className="text-[9px] py-1 text-slate-400">{fDate(t.exitDate)}</TableCell>
                            <TableCell className="text-[9px] py-1 font-mono text-slate-300 text-right">{t.exitPrice.toFixed(0)}</TableCell>
                            <TableCell className={cn('text-[9px] py-1 font-mono font-bold text-right', t.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>{t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : <div className="text-center py-8 text-slate-500 text-xs">Run signals to see backtest results</div>}
          </P>
        </div>
      </div>
      {/* AI Trading Advisor */}
      <P title="AI Trading Advisor" icon={Bot} badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-violet-500/10 border-violet-500/20 text-violet-400">By Vrushal Bhilpawar</Badge>} source="5 Workflows" className="min-h-[400px]">
        {d.q ? (
          <AIStrategyPanel
            symbol={d.selectedSymbol}
            name={d.equities.find(e => e.symbol === d.selectedSymbol)?.name || d.selectedSymbol}
            sector={d.q.sector || ''}
            price={d.q.price || 0}
            changePct={d.q.changePct || 0}
            rsi={d.latestSignal?.rsi ?? null}
            signal={d.latestSignal?.signal ?? ''}
            supertrendDir={d.latestSignal?.supertrendDir ?? 0}
            macdHistogram={d.latestSignal?.macdHistogram ?? null}
          />
        ) : <div className="text-center py-8 text-slate-500 text-xs">Loading...</div>}
      </P>
      {/* Strategy Parameters */}
      <P title="Strategy Parameters" icon={Settings2} source="Customizable">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
          {([['supertrendPeriod', 'ST Period', 5, 30, 1], ['supertrendMultiplier', 'ST Multiplier', 1, 7, 0.5], ['rsiPeriod', 'RSI Period', 5, 30, 1], ['rsiOverbought', 'RSI Overbought', 60, 90, 1], ['rsiOversold', 'RSI Oversold', 10, 40, 1], ['macdFast', 'MACD Fast', 5, 20, 1], ['macdSlow', 'MACD Slow', 15, 50, 1], ['macdSignal', 'MACD Signal', 3, 15, 1]] as [keyof StrategyParams, string, number, number, number][]).map(([key, label, min, max, step]) => (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300 font-mono font-bold">{d.params[key]}</span>
              </div>
              <Slider value={[d.params[key]]} min={min} max={max} step={step} onValueChange={([v]) => d.setParams(p => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 w-full md:w-auto" onClick={() => { d.setRecalculating(true); d.fetchSignals(d.selectedSymbol, d.params); }} disabled={d.recalculating}>
          {d.recalculating ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          {d.recalculating ? 'Recalculating...' : 'Recalculate Signals'}
        </Button>
      </P>
    </div>
  );
}

// ==================== NEWS VIEW (Moneycontrol Style) ====================
function NewsView({ d }: { d: ReturnType<typeof useDashboardData> }) {
  if (!d.selectedSymbol) return EMPTY_STOCK('news & headlines');
  if (!d.q) {
    if (d.initialLoadError && !d.detailLoading) return (
      <div className="flex flex-col items-center justify-center h-[50vh]"><WifiOff className="w-6 h-6 text-red-400 mb-3" /><p className="text-xs text-slate-400 mb-3">Failed to load {d.selectedSymbol}</p><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => { d.setInitialLoadError(false); d.handleRefresh(); }}><RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Retry</Button></div>
    );
    return <div className="flex items-center justify-center h-[50vh]"><RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading {d.selectedSymbol}...</span></div>;
  }
  return (
    <P title={`${d.selectedSymbol} — News & Headlines`} icon={Newspaper} badge={d.news.length > 0 && <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-slate-800 border-slate-700 text-slate-400">{d.news.length} articles</Badge>} source="Moneycontrol / Google News">
      <Button size="sm" variant="ghost" className="h-7 text-[10px] mb-3 text-slate-400 hover:text-white" onClick={() => d.fetchNews(d.selectedSymbol)} disabled={d.newsLoading}>
        <RefreshCw className={cn('w-3 h-3 mr-1', d.newsLoading && 'animate-spin')} /> Refresh News
      </Button>
      <div className="space-y-2">
        {d.newsLoading ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 bg-slate-800/50 rounded-lg" />)
          : d.news.length > 0 ? d.news.map((n, i) => (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-4 rounded-xl bg-slate-800/15 hover:bg-slate-800/30 border border-slate-800/30 hover:border-slate-700/40 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm text-slate-200 font-medium leading-relaxed group-hover:text-emerald-400 transition-colors">{n.title}</h3>
                {n.summary && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{n.summary}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-500 font-medium">{n.source}</span>
                  <span className="text-slate-700">&middot;</span>
                  <span className="text-[10px] text-slate-600 flex items-center gap-0.5"><Clock className="w-3 h-3" />{fTime(n.publishedAt)}</span>
                  <SentimentBadge sentiment={n.sentiment} />
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 shrink-0 mt-0.5" />
            </div>
          </a>
        )) : <div className="text-center py-16 text-slate-500">No news available for {d.selectedSymbol}</div>}
      </div>
    </P>
  );
}

// ==================== OPEN INTEREST VIEW ====================
function OpenInterestView({ d, upstoxConnected }: { d: ReturnType<typeof useDashboardData>; upstoxConnected: boolean }) {
  const [oiTab, setOiTab] = useState<'options' | 'futures'>('options');
  const [strikeRange, setStrikeRange] = useState(5);

  const oc = d.oiOptionData;
  const fc = d.oiFuturesData;

  // Filter strikes around ATM
  const filteredStrikes = useMemo(() => {
    if (!oc) return [];
    const atmIdx = oc.strikes.findIndex(s => s.strikePrice >= oc.spotPrice);
    const start = Math.max(0, (atmIdx >= 0 ? atmIdx : Math.floor(oc.strikes.length / 2)) - strikeRange);
    const end = start + strikeRange * 2 + 1;
    return oc.strikes.slice(start, end);
  }, [oc, strikeRange]);

  // Max OI for bar visualization
  const maxCallOI = useMemo(() => Math.max(...filteredStrikes.map(s => s.callOI), 1), [filteredStrikes]);
  const maxPutOI = useMemo(() => Math.max(...filteredStrikes.map(s => s.putOI), 1), [filteredStrikes]);

  // Top 5 CE/PE OI strikes
  const topCallOI = useMemo(() => {
    if (!oc) return [];
    return [...oc.strikes].sort((a, b) => b.callOI - a.callOI).slice(0, 5);
  }, [oc]);
  const topPutOI = useMemo(() => {
    if (!oc) return [];
    return [...oc.strikes].sort((a, b) => b.putOI - a.putOI).slice(0, 5);
  }, [oc]);

  const fmtOI = (n: number) => {
    if (n >= 10000000) return (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return (n / 100000).toFixed(2) + ' L';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString('en-IN');
  };

  const fmtValue = (n: number) => {
    if (n >= 10000000) return '₹' + (n / 10000000).toFixed(2) + ' Cr';
    if (n >= 100000) return '₹' + (n / 100000).toFixed(2) + ' L';
    if (n >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
    return '₹' + n.toLocaleString('en-IN');
  };

  if (d.oiLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {[1, 2].map(i => (
          <div key={i} className="rounded-xl border border-slate-800/60 bg-[#0d1117]/90">
            <Skeleton className="h-10 bg-slate-800/50" />
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, j) => <Skeleton key={j} className="h-8 bg-slate-800/30" />)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 view-enter">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Underlying</span>
          <Select value={d.oiUnderlying} onValueChange={(v) => { d.setOiUnderlying(v); d.setOiExpiryFilter(''); }}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-800/50 border-slate-700/50 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700/50 max-h-[300px]">
              {d.oiUnderlyings.length > 0 ? d.oiUnderlyings.map(u => (
                <SelectItem key={u} value={u} className="text-xs text-slate-300 focus:bg-slate-800 focus:text-white">{u}</SelectItem>
              )) : <SelectItem value="NIFTY" className="text-xs">NIFTY</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        {oc && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Expiry</span>
            <Select value={d.oiExpiryFilter} onValueChange={d.setOiExpiryFilter}>
              <SelectTrigger className="w-[150px] h-8 text-xs bg-slate-800/50 border-slate-700/50 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700/50">
                {oc.expiryDates.map(exp => (
                  <SelectItem key={exp} value={exp} className="text-xs text-slate-300 focus:bg-slate-800 focus:text-white">{exp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Strikes</span>
          <Select value={String(strikeRange)} onValueChange={(v) => setStrikeRange(Number(v))}>
            <SelectTrigger className="w-[70px] h-8 text-xs bg-slate-800/50 border-slate-700/50 text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700/50">
              {[3, 5, 8, 12, 15].map(n => (
                <SelectItem key={n} value={String(n)} className="text-xs text-slate-300">+/- {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs text-slate-400 hover:text-white hover:bg-slate-800/50" onClick={() => d.fetchOIData(d.oiUnderlying, d.oiExpiryFilter)}>
          <RefreshCw className={cn("w-3 h-3 mr-1", d.oiLoading && "animate-spin")} /> Refresh
        </Button>
        {d.oiOptionData?.dataSource === 'upstox_live' ? (
          <Badge className="h-7 text-[10px] font-semibold bg-emerald-500/90 text-white border-0 gap-1">
            <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE UPSTOX
          </Badge>
        ) : d.oiOptionData?.dataSource === 'nse_live' ? (
          <Badge className="h-7 text-[10px] font-semibold bg-emerald-600/90 text-white border-0 gap-1">
            <Radio className="w-2.5 h-2.5" /> LIVE NSE
          </Badge>
        ) : (
          <Badge className="h-7 text-[10px] font-semibold bg-amber-600/20 text-amber-400 border border-amber-600/30 gap-1">
            <WifiOff className="w-2.5 h-2.5" /> SIMULATED OI{upstoxConnected ? ' · Live Price' : ''}
          </Badge>
        )}
        {d.oiLastUpdated && (
          <span className="text-[10px] text-slate-600">{new Date(d.oiLastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        )}
      </div>

      {/* Summary KPI Cards */}
      {oc && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Spot Price</div>
            <div className="text-sm font-bold font-mono text-slate-100">{oc.spotPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">PCR (OI)</div>
            <div className={cn('text-sm font-bold font-mono', oc.pcr > 1 ? 'text-emerald-400' : oc.pcr < 0.8 ? 'text-red-400' : 'text-amber-400')}>
              {oc.pcr.toFixed(3)}
            </div>
            <div className="text-[9px] text-slate-600">{oc.pcr > 1 ? 'Bullish' : oc.pcr < 0.8 ? 'Bearish' : 'Neutral'}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Max Pain</div>
            <div className="text-sm font-bold font-mono text-violet-400">{oc.maxPain.toLocaleString('en-IN')}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Total Call OI</div>
            <div className="text-sm font-bold font-mono text-cyan-400">{fmtOI(oc.totalCallOI)}</div>
            <div className={cn('text-[9px]', oc.totalCallOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {oc.totalCallOIChg >= 0 ? '+' : ''}{fmtOI(oc.totalCallOIChg)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Total Put OI</div>
            <div className="text-sm font-bold font-mono text-rose-400">{fmtOI(oc.totalPutOI)}</div>
            <div className={cn('text-[9px]', oc.totalPutOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {oc.totalPutOIChg >= 0 ? '+' : ''}{fmtOI(oc.totalPutOIChg)}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Expiry</div>
            <div className="text-xs font-bold text-slate-200">{oc.currentExpiry}</div>
            <div className="text-[9px] text-slate-600">{oc.expiryDates.length} expiries</div>
          </div>
        </div>
      )}

      {/* Top OI Strikes sidebar + Main Option Chain Table */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        {/* Top OI Strikes Panel */}
        <div className="xl:col-span-1 space-y-3">
          <P title="Top Call OI" icon={ArrowUp} source="Calls" className="h-auto">
            <div className="space-y-1.5">
              {topCallOI.map((s, i) => (
                <div key={s.strikePrice} className="flex items-center justify-between p-1.5 rounded bg-slate-800/20 border border-slate-800/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-600 w-3">{i + 1}</span>
                    <span className="text-xs font-mono font-bold text-cyan-400">{s.strikePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-300">{fmtOI(s.callOI)}</div>
                    <div className={cn('text-[9px] font-mono', s.callOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {s.callOIChg >= 0 ? '+' : ''}{fmtOI(s.callOIChg)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </P>
          <P title="Top Put OI" icon={ArrowDown} source="Puts" className="h-auto">
            <div className="space-y-1.5">
              {topPutOI.map((s, i) => (
                <div key={s.strikePrice} className="flex items-center justify-between p-1.5 rounded bg-slate-800/20 border border-slate-800/20">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-slate-600 w-3">{i + 1}</span>
                    <span className="text-xs font-mono font-bold text-rose-400">{s.strikePrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono text-slate-300">{fmtOI(s.putOI)}</div>
                    <div className={cn('text-[9px] font-mono', s.putOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                      {s.putOIChg >= 0 ? '+' : ''}{fmtOI(s.putOIChg)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </P>
        </div>

        {/* Main Option Chain Table */}
        <div className="xl:col-span-3">
          <P title={`${d.oiUnderlying} Option Chain`} icon={Layers} source={d.oiOptionData?.dataSource === 'upstox_live' ? 'Upstox OI' : d.oiOptionData?.dataSource === 'nse_live' ? 'NSE OI' : 'Simulated OI'} badge={
            <div className="flex gap-1">
              <button onClick={() => setOiTab('options')} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-colors', oiTab === 'options' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-500 hover:text-slate-300')}>Options</button>
              <button onClick={() => setOiTab('futures')} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-colors', oiTab === 'futures' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300')}>Futures</button>
            </div>
          } className="h-auto">
            <ScrollArea className="h-[520px]">
              {oiTab === 'options' ? (
                <div className="min-w-[800px]">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_70px_1fr_1fr_1fr_1fr_1fr_1fr] gap-px bg-slate-800/60 text-[9px] font-bold uppercase tracking-wider text-slate-500 px-2 py-2 sticky top-0 z-10 bg-[#0d1117]">
                    <div className="text-right text-cyan-500/70">Call LTP</div>
                    <div className="text-right text-cyan-500/70">Call IV</div>
                    <div className="text-right text-cyan-500/70">Call OI</div>
                    <div className="text-right text-cyan-500/70">OI Chg</div>
                    <div className="text-right text-cyan-500/70">Call Vol</div>
                    <div className="text-right text-cyan-500/70">OI Bar</div>
                    <div className="text-center text-slate-400">Strike</div>
                    <div className="text-left text-rose-500/70">OI Bar</div>
                    <div className="text-left text-rose-500/70">Put Vol</div>
                    <div className="text-left text-rose-500/70">OI Chg</div>
                    <div className="text-left text-rose-500/70">Put OI</div>
                    <div className="text-left text-rose-500/70">Put IV</div>
                    <div className="text-left text-rose-500/70">Put LTP</div>
                  </div>
                  {/* Table Rows */}
                  {filteredStrikes.map((s) => {
                    const isATM = oc && s.strikePrice >= oc.spotPrice - (oc.spotPrice * 0.001) && s.strikePrice <= oc.spotPrice + (oc.spotPrice * 0.001);
                    const isITMCall = oc && s.strikePrice < oc.spotPrice;
                    const isITMPut = oc && s.strikePrice > oc.spotPrice;
                    const callBarW = (s.callOI / maxCallOI) * 100;
                    const putBarW = (s.putOI / maxPutOI) * 100;
                    return (
                      <div key={s.strikePrice} className={cn(
                        'grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_70px_1fr_1fr_1fr_1fr_1fr_1fr] gap-px px-2 py-1.5 border-b border-slate-800/20 text-[11px] font-mono hover:bg-slate-800/30 transition-colors',
                        isATM && 'bg-emerald-500/5 border-emerald-500/20'
                      )}>
                        {/* Call Side (right-aligned) */}
                        <div className={cn('text-right', isITMCall ? 'text-cyan-300' : 'text-slate-400')}>{s.callLTP.toFixed(2)}
                          {s.callChg !== 0 && <span className={cn('ml-1 text-[9px]', s.callChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>{s.callChg >= 0 ? '+' : ''}{s.callChg.toFixed(2)}</span>}
                        </div>
                        <div className={cn('text-right', isITMCall ? 'text-cyan-300' : 'text-slate-400')}>{s.callIV.toFixed(1)}%</div>
                        <div className={cn('text-right font-semibold', isITMCall ? 'text-cyan-200' : 'text-slate-300')}>{fmtOI(s.callOI)}</div>
                        <div className={cn('text-right', s.callOIChg >= 0 ? 'text-emerald-400' : 'text-red-400')}>{s.callOIChg >= 0 ? '+' : ''}{fmtOI(s.callOIChg)}</div>
                        <div className="text-right text-slate-500">{fmtOI(s.callVolume)}</div>
                        <div className="flex items-center justify-end pr-1">
                          <div className="w-full h-3 bg-slate-800/40 rounded-sm overflow-hidden">
                            <div className="h-full bg-cyan-500/40 rounded-sm" style={{ width: callBarW + '%' }} />
                          </div>
                        </div>
                        {/* Strike (center) */}
                        <div className={cn(
                          'text-center font-bold px-1 rounded',
                          isATM ? 'bg-emerald-500/20 text-emerald-300 text-xs' :
                          isITMCall ? 'text-cyan-300 bg-cyan-500/5' :
                          isITMPut ? 'text-rose-300 bg-rose-500/5' :
                          'text-slate-300'
                        )}>
                          {s.strikePrice.toLocaleString('en-IN')}
                          {isATM && <div className="text-[8px] text-emerald-400 font-semibold">ATM</div>}
                        </div>
                        {/* Put Side (left-aligned) */}
                        <div className="flex items-center pl-1">
                          <div className="w-full h-3 bg-slate-800/40 rounded-sm overflow-hidden">
                            <div className="h-full bg-rose-500/40 rounded-sm" style={{ width: putBarW + '%' }} />
                          </div>
                        </div>
                        <div className="text-left text-slate-500">{fmtOI(s.putVolume)}</div>
                        <div className={cn('text-left', s.putOIChg >= 0 ? 'text-emerald-400' : 'text-red-400')}>{s.putOIChg >= 0 ? '+' : ''}{fmtOI(s.putOIChg)}</div>
                        <div className={cn('text-left font-semibold', isITMPut ? 'text-rose-200' : 'text-slate-300')}>{fmtOI(s.putOI)}</div>
                        <div className={cn('text-left', isITMPut ? 'text-rose-300' : 'text-slate-400')}>{s.putIV.toFixed(1)}%</div>
                        <div className={cn('text-left', isITMPut ? 'text-rose-300' : 'text-slate-400')}>{s.putLTP.toFixed(2)}
                          {s.putChg !== 0 && <span className={cn('ml-1 text-[9px]', s.putChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>{s.putChg >= 0 ? '+' : ''}{s.putChg.toFixed(2)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Futures Tab */
                fc ? (
                  <div className="space-y-3">
                    {/* Basis Info */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Spot vs Future</div>
                        <div className={cn('text-sm font-bold font-mono', fc.basis >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {fc.basis >= 0 ? '+' : ''}{fc.basis.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Basis %</div>
                        <div className={cn('text-sm font-bold font-mono', fc.basisPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {fc.basisPct >= 0 ? '+' : ''}{fc.basisPct.toFixed(3)}%
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/30">
                        <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Contango/Bkwdn</div>
                        <div className={cn('text-sm font-bold', fc.basis > 0 ? 'text-cyan-400' : 'text-orange-400')}>
                          {fc.basis > 0 ? 'Contango' : 'Backwardation'}
                        </div>
                      </div>
                    </div>
                    {/* Futures Contracts Table */}
                    {[fc.currentMonth, fc.nextMonth, fc.farMonth].filter(Boolean).map((contract, idx) => {
                      if (!contract) return null;
                      const labels = ['Current Month', 'Next Month', 'Far Month'];
                      return (
                        <div key={idx} className="rounded-lg border border-slate-800/40 bg-slate-800/10 overflow-hidden">
                          <div className="px-3 py-2 border-b border-slate-800/30 bg-slate-900/30">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">{labels[idx]}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-500/8 border-amber-500/20 text-amber-400">{contract.expiry}</Badge>
                                <span className={cn('text-xs font-bold font-mono', contract.changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                  {contract.changePct >= 0 ? '+' : ''}{contract.changePct.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3">
                            <div>
                              <div className="text-[9px] text-slate-500">Last Price</div>
                              <div className="text-sm font-bold font-mono text-slate-200">{contract.lastPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500">Open / High / Low</div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {contract.open.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {contract.high.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / {contract.low.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500">Open Interest</div>
                              <div className="text-sm font-bold font-mono text-violet-400">{fmtOI(contract.oi)}</div>
                              <div className={cn('text-[10px] font-mono', contract.oiChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                                Chg: {contract.oiChg >= 0 ? '+' : ''}{fmtOI(contract.oiChg)} ({contract.oiChgPct >= 0 ? '+' : ''}{contract.oiChgPct.toFixed(2)}%)
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500">Volume / Value</div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {fmtOI(contract.volume)} / {fmtValue(contract.value)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {/* OI Comparison Bar */}
                    <div className="rounded-lg border border-slate-800/40 bg-slate-800/10 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">OI Across Contracts</div>
                      <div className="space-y-2">
                        {[fc.currentMonth, fc.nextMonth, fc.farMonth].filter(Boolean).map((c, i) => {
                          if (!c) return null;
                          const maxOI = Math.max(fc.currentMonth.oi, fc.nextMonth.oi, fc.farMonth?.oi || 0, 1);
                          const w = (c.oi / maxOI) * 100;
                          const labels = ['Current Month', 'Next Month', 'Far Month'];
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-24 shrink-0">{labels[i]}</span>
                              <div className="flex-1 h-4 bg-slate-800/40 rounded-sm overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-violet-500/60 to-violet-400/30 rounded-sm flex items-center justify-end pr-2" style={{ width: w + '%' }}>
                                  <span className="text-[9px] font-mono font-bold text-white/90">{fmtOI(c.oi)}</span>
                                </div>
                              </div>
                              <div className={cn('text-[10px] font-mono w-16 text-right', c.oiChg >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                                {c.oiChg >= 0 ? '+' : ''}{fmtOI(c.oiChg)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">No futures OI data available</div>
                )
              )}
            </ScrollArea>
          </P>
        </div>
      </div>
    </div>
  );
}

// ==================== PORTFOLIO VIEW ====================
function PortfolioView({ d }: { d: ReturnType<typeof useDashboardData> }) {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'trades'>('holdings');
  const [form, setForm] = useState({ symbol: '', name: '', qty: '', avgPrice: '', sector: '' });
  const [tradeForm, setTradeForm] = useState({ symbol: '', name: '', type: 'BUY', qty: '', price: '', pnl: '', note: '' });

  useEffect(() => {
    let cancelled = false;
    const load = async () => { if (cancelled) return; try { const res = await fetch('/api/portfolio'); const data = await res.json(); if (!cancelled) { setHoldings(data.holdings || []); setTotals(data.totals || {}); setTrades(data.trades || []); } } catch {} if (!cancelled) setLoading(false); };
    load(); const iv = setInterval(load, 15000); return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const reloadPortfolio = async () => {
    try { const res = await fetch('/api/portfolio'); const data = await res.json(); setHoldings(data.holdings || []); setTotals(data.totals || {}); setTrades(data.trades || []); } catch {}
  };

  const handleAddHolding = async () => {
    if (!form.symbol || !form.qty || !form.avgPrice) return;
    await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setForm({ symbol: '', name: '', qty: '', avgPrice: '', sector: '' });
    setShowAddHolding(false);
    reloadPortfolio();
  };

  const handleAddTrade = async () => {
    if (!tradeForm.symbol || !tradeForm.qty || !tradeForm.price) return;
    await fetch('/api/portfolio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...tradeForm, _type: 'trade' }) });
    setTradeForm({ symbol: '', name: '', type: 'BUY', qty: '', price: '', pnl: '', note: '' });
    setShowAddTrade(false);
    reloadPortfolio();
  };

  const handleDeleteHolding = async (id: string) => {
    await fetch(`/api/portfolio?id=${id}`, { method: 'DELETE' });
    reloadPortfolio();
  };

  const handleDeleteTrade = async (id: string) => {
    await fetch(`/api/portfolio?id=${id}&type=trade`, { method: 'DELETE' });
    reloadPortfolio();
  };

  return (
    <div className="space-y-3 view-enter">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MBox label="Total Invested" value={fINR(totals.totalInvested || 0)} sub="Cost basis" color="text-slate-200" />
        <MBox label="Current Value" value={fINR(totals.totalCurrent || 0)} sub="Mark-to-market" color="text-slate-200" />
        <MBox label="Total P&L" value={fINR(totals.totalPnl || 0)} sub="invested" color={(totals.totalPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MBox label="P&L %" value={(totals.totalPnlPct || 0).toFixed(2) + '%'} sub="Overall return" color={(totals.totalPnlPct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <MBox label="Day P&L" value={fINR(totals.totalDayPnl || 0)} sub="Today's change" color={(totals.totalDayPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'} />
      </div>

      {/* Holdings & Trades Tabs */}
      <P title="Portfolio Manager" icon={Wallet} source="Live P&L"
        badge={
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500" onClick={() => setShowAddHolding(!showAddHolding)}><Plus className="w-3 h-3 mr-1" />Holding</Button>
            <Button size="sm" variant="outline" className="h-7 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10" onClick={() => setShowAddTrade(!showAddTrade)}><Plus className="w-3 h-3 mr-1" />Trade</Button>
          </div>
        }>
        {/* Tab Switcher */}
        <div className="flex gap-1 mb-3">
          <button className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors', activeTab === 'holdings' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/20 text-slate-500 hover:text-slate-300')} onClick={() => setActiveTab('holdings')}>
            Holdings ({holdings.length})
          </button>
          <button className={cn('px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors', activeTab === 'trades' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800/20 text-slate-500 hover:text-slate-300')} onClick={() => setActiveTab('trades')}>
            Trade Journal ({trades.length})
          </button>
        </div>

        {/* Add Holding Form */}
        {showAddHolding && (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-emerald-500/20 mb-3">
            <div className="text-[11px] font-bold text-emerald-400 mb-2">Add New Holding</div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Input placeholder="Symbol" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} className="h-8 text-xs" />
              <Input placeholder="Name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Quantity" type="number" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Avg Price" type="number" value={form.avgPrice} onChange={e => setForm(f => ({ ...f, avgPrice: e.target.value }))} className="h-8 text-xs" />
              <Button className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={handleAddHolding}>Add</Button>
            </div>
          </div>
        )}

        {/* Add Trade Form */}
        {showAddTrade && (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-amber-500/20 mb-3">
            <div className="text-[11px] font-bold text-amber-400 mb-2">Add Trade Entry</div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              <Input placeholder="Symbol" value={tradeForm.symbol} onChange={e => setTradeForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} className="h-8 text-xs" />
              <Select value={tradeForm.type} onValueChange={v => setTradeForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="BUY">BUY</SelectItem><SelectItem value="SELL">SELL</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Qty" type="number" value={tradeForm.qty} onChange={e => setTradeForm(f => ({ ...f, qty: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Price" type="number" value={tradeForm.price} onChange={e => setTradeForm(f => ({ ...f, price: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="P&L (optional)" type="number" value={tradeForm.pnl} onChange={e => setTradeForm(f => ({ ...f, pnl: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Note" value={tradeForm.note} onChange={e => setTradeForm(f => ({ ...f, note: e.target.value }))} className="h-8 text-xs" />
              <Button className="h-8 text-xs bg-amber-600 hover:bg-amber-500" onClick={handleAddTrade}>Add</Button>
            </div>
          </div>
        )}

        {activeTab === 'holdings' && (
          loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-4 h-4 animate-spin text-emerald-400 mr-2" /><span className="text-xs text-slate-400">Loading portfolio...</span></div> :
          holdings.length === 0 ? (
            <div className="text-center py-16">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-400">No holdings yet</p>
              <p className="text-xs text-slate-600 mt-1">Add your stock holdings to track live P&L</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                  {['Stock', 'Qty', 'Avg Price', 'LTP', 'Invested', 'Current', 'P&L', 'Day P&L', ''].map(h => (
                    <TableHead key={h} className="text-[10px] text-slate-400 h-8">{h}</TableHead>
                  ))}
                </TableRow></TableHeader>
                <TableBody>
                  {holdings.map((h: any) => (
                    <TableRow key={h.id} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => d.handleSelect(h.symbol, 'equity')}>
                      <TableCell className="text-xs py-2"><div className="font-bold text-slate-200">{h.symbol}</div><div className="text-[9px] text-slate-500">{h.name || h.sector}</div></TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">{h.qty}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">{h.avgPrice.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-200 font-semibold">{h.currentPrice ? h.currentPrice.toLocaleString('en-IN') : '--'}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-400">{fINR(h.invested)}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">{fINR(h.currentValue)}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className={h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {fINR(h.pnl)} <span className="text-[9px]">({h.pnlPct}%)</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn('text-xs font-mono', h.dayPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {fINR(h.dayPnl)}
                      </TableCell>
                      <TableCell><button onClick={(e) => { e.stopPropagation(); handleDeleteHolding(h.id); }} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}

        {activeTab === 'trades' && (
          trades.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-400">No trades logged yet</p>
              <p className="text-xs text-slate-600 mt-1">Record your buy/sell trades to track performance</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[calc(100vh-380px)]">
              <Table>
                <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                  {['Date', 'Symbol', 'Type', 'Qty', 'Price', 'P&L', 'Note', ''].map(h => (
                    <TableHead key={h} className="text-[10px] text-slate-400 h-8">{h}</TableHead>
                  ))}
                </TableRow></TableHeader>
                <TableBody>
                  {trades.map((t: any) => (
                    <TableRow key={t.id} className="border-slate-800/50 hover:bg-slate-800/30">
                      <TableCell className="text-[10px] text-slate-400 py-2">{new Date(t.tradedAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-200 cursor-pointer" onClick={() => d.handleSelect(t.symbol, 'equity')}>{t.symbol}</TableCell>
                      <TableCell><Badge className={cn('text-[9px] font-bold border', t.type === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>{t.type}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">{t.qty}</TableCell>
                      <TableCell className="text-xs font-mono text-slate-300">{Number(t.price).toLocaleString('en-IN')}</TableCell>
                      <TableCell className={cn('text-xs font-mono', (t.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>{t.pnl != null ? fINR(t.pnl) : '--'}</TableCell>
                      <TableCell className="text-[10px] text-slate-500 max-w-[120px] truncate">{t.note}</TableCell>
                      <TableCell><button onClick={() => handleDeleteTrade(t.id)} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        )}
      </P>
    </div>
  );
}

// ==================== ALERTS VIEW ====================
function AlertsView({ d, pendingAlert, onPendingAlertConsumed }: { d: ReturnType<typeof useDashboardData>; pendingAlert: { symbol: string; name: string; price: number; signal: string } | null; onPendingAlertConsumed: () => void }) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [justTriggered, setJustTriggered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ symbol: '', name: '', condition: 'above', targetPrice: '', note: '' });

  // Pre-fill form when navigated from screener
  useEffect(() => {
    if (pendingAlert) {
      const isBearish = pendingAlert.signal === 'SELL' || pendingAlert.signal === 'STRONG_SELL';
      // Add 2% buffer so the alert doesn't trigger instantly on creation
      const bufferMultiplier = isBearish ? 0.98 : 1.02;
      const bufferedPrice = Math.round(pendingAlert.price * bufferMultiplier * 100) / 100;
      setForm({
        symbol: pendingAlert.symbol,
        name: pendingAlert.name,
        condition: isBearish ? 'below' : 'above',
        targetPrice: String(bufferedPrice),
        note: `From screener: ${pendingAlert.signal}`,
      });
      setFormError('');
      setShowAdd(true);
      onPendingAlertConsumed();
    }
  }, [pendingAlert, onPendingAlertConsumed]);

  // Auto-clear triggered notifications after 8 seconds
  useEffect(() => {
    if (justTriggered.length === 0) return;
    const t = setTimeout(() => setJustTriggered([]), 8000);
    return () => clearTimeout(t);
  }, [justTriggered]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => { if (cancelled) return; try { const res = await fetch('/api/alerts'); const data = await res.json(); if (!cancelled) { setAlerts(data.alerts || []); if (data.justTriggered?.length > 0) setJustTriggered(data.justTriggered); } } catch {} if (!cancelled) setLoading(false); };
    load(); const iv = setInterval(load, 15000); return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const reloadAlerts = async () => {
    try { const res = await fetch('/api/alerts'); const data = await res.json(); setAlerts(data.alerts || []); if (data.justTriggered?.length > 0) setJustTriggered(data.justTriggered); } catch {}
  };

  const handleAdd = async () => {
    if (!form.symbol || !form.targetPrice) {
      setFormError('Symbol and target price are required');
      return;
    }
    const price = parseFloat(form.targetPrice);
    if (isNaN(price) || price <= 0) {
      setFormError('Please enter a valid target price');
      return;
    }
    setFormError('');
    setCreating(true);
    try {
      const res = await fetch('/api/alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || 'Failed to create alert');
        return;
      }
      setForm({ symbol: '', name: '', condition: 'above', targetPrice: '', note: '' });
      setShowAdd(false);
      await reloadAlerts();
    } catch {
      setFormError('Network error — please try again');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    reloadAlerts();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: !active }) });
    reloadAlerts();
  };

  const handleReset = async (id: string) => {
    await fetch('/api/alerts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, triggered: false }) });
    reloadAlerts();
  };

  const activeAlerts = alerts.filter(a => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);

  return (
    <div className="space-y-3 view-enter">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MBox label="Active Alerts" value={String(activeAlerts.length)} sub="Monitoring" color="text-amber-400" />
        <MBox label="Triggered" value={String(triggeredAlerts.length)} sub="Fired alerts" color="text-emerald-400" />
        <MBox label="Total" value={String(alerts.length)} sub="All time" color="text-slate-300" />
      </div>

      {/* Triggered Alert Notifications */}
      {justTriggered.length > 0 && (
        <div className="space-y-2">
          {justTriggered.map((a: any) => (
            <div key={a.id} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 animate-pulse">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-emerald-300">{a.symbol} {a.condition === 'above' ? 'crossed above' : 'dropped below'} {Number(a.targetPrice).toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-emerald-400/70">Triggered at {a.triggeredPrice?.toLocaleString('en-IN')} — {new Date(a.triggeredAt).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <P title="Price Alerts" icon={Bell} source="Price Monitor"
        badge={
          <Button size="sm" className="h-7 text-[10px] bg-amber-600 hover:bg-amber-500" onClick={() => setShowAdd(!showAdd)}><Plus className="w-3 h-3 mr-1" />New Alert</Button>
        }>
        {/* Add Alert Form */}
        {showAdd && (
          <div className="p-3 rounded-lg bg-slate-800/30 border border-amber-500/20 mb-3">
            <div className="text-[11px] font-bold text-amber-400 mb-2">Create Price Alert</div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <Input placeholder="Symbol (e.g. RELIANCE)" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))} className="h-8 text-xs" />
              <Input placeholder="Name (optional)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-xs" />
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="above">Goes Above</SelectItem><SelectItem value="below">Goes Below</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Target Price" type="number" value={form.targetPrice} onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))} className="h-8 text-xs" />
              <Input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="h-8 text-xs" />
              <Button className="h-8 text-xs bg-amber-600 hover:bg-amber-500" onClick={handleAdd} disabled={creating}>
                {creating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : null} {creating ? 'Creating...' : 'Create'}
              </Button>
            </div>
            {formError && <div className="text-[10px] text-red-400 mt-1.5 px-1">{formError}</div>}
          </div>
        )}

        {loading ? <div className="flex items-center justify-center py-12"><RefreshCw className="w-4 h-4 animate-spin text-amber-400 mr-2" /><span className="text-xs text-slate-400">Loading alerts...</span></div> :
          alerts.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-400">No price alerts set</p>
              <p className="text-xs text-slate-600 mt-1">Get notified when a stock hits your target price</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[calc(100vh-380px)] overflow-y-auto">
              {/* Active Alerts */}
              {activeAlerts.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Active Alerts ({activeAlerts.length})</div>
                  <div className="space-y-1.5">
                    {activeAlerts.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/15 border border-slate-800/30 hover:bg-slate-800/30">
                        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => d.handleSelect(a.symbol, 'equity')}>
                          <div className={cn('w-2 h-2 rounded-full shrink-0', a.condition === 'above' ? 'bg-emerald-400' : 'bg-red-400')} />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200">{a.symbol} <span className="text-[9px] text-slate-500 font-normal">{a.condition === 'above' ? '>= ABOVE' : '<= BELOW'}</span></div>
                            <div className="text-[10px] text-slate-500">Target: {Number(a.targetPrice).toLocaleString('en-IN')} {a.note && <span className="text-slate-600 ml-1">· {a.note}</span>}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.currentPrice && (
                            <div className="text-right mr-1">
                              <div className="text-[10px] font-mono text-slate-400">LTP: {a.currentPrice.toLocaleString('en-IN')}</div>
                              <div className="text-[9px] text-slate-600">Gap: {a.condition === 'above' ? '+' : '-'}{Math.abs(a.currentPrice - a.targetPrice).toFixed(1)}</div>
                            </div>
                          )}
                          <button onClick={() => handleToggle(a.id, true)} className="p-1 rounded hover:bg-slate-700/50 text-amber-400" title="Pause alert">
                            <ToggleRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Triggered Alerts */}
              {triggeredAlerts.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Triggered ({triggeredAlerts.length})</div>
                  <div className="space-y-1.5">
                    {triggeredAlerts.map((a: any) => (
                      <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => d.handleSelect(a.symbol, 'equity')}>
                          <BellRing className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-200">{a.symbol} <span className="text-[9px] text-emerald-400 font-normal">triggered!</span></div>
                            <div className="text-[10px] text-slate-500">Target: {Number(a.targetPrice).toLocaleString('en-IN')} · Hit at: {a.triggeredPrice?.toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[9px] text-slate-600">{a.triggeredAt ? new Date(a.triggeredAt).toLocaleString('en-IN') : ''}</span>
                          <button onClick={() => handleReset(a.id)} className="p-1 rounded hover:bg-amber-500/20 text-amber-400" title="Re-activate">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        }
      </P>
    </div>
  );
}

// ==================== WATCHLIST VIEW ====================
function WatchlistView({ d, watchlist }: { d: ReturnType<typeof useDashboardData>; watchlist: ReturnType<typeof useWatchlist> }) {
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, { price: number; changePct: number; name: string; loading: boolean }>>({});
  useEffect(() => {
    if (watchlist.watchlist.length === 0) return;
    const fetchQuotes = async () => {
      const results: typeof watchlistQuotes = {};
      for (const item of watchlist.watchlist) {
        results[item.symbol] = { price: 0, changePct: 0, name: item.symbol, loading: true };
      }
      setWatchlistQuotes({ ...results });
      for (const item of watchlist.watchlist) {
        try {
          const res = await fetch('/api/stock-detail?symbol=' + item.symbol);
          const data = await res.json();
          if (data.quote) {
            results[item.symbol] = { price: data.quote.price, changePct: data.quote.changePct, name: data.quote.longName || data.quote.name, loading: false };
          }
        } catch { results[item.symbol] = { ...results[item.symbol], loading: false }; }
        setWatchlistQuotes({ ...results });
      }
    };
    fetchQuotes();
    const interval = setInterval(fetchQuotes, 30000);
    return () => clearInterval(interval);
  }, [watchlist.watchlist]);
  return (
    <P title="My Watchlist" icon={Star} badge={<Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-amber-500/10 border-amber-500/30 text-amber-400">{watchlist.watchlist.length} stocks</Badge>} source="Custom">
      {watchlist.watchlist.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-12 h-12 mx-auto mb-3 text-slate-700" />
          <p className="text-sm text-slate-400">Your watchlist is empty</p>
          <p className="text-xs text-slate-600 mt-1">Click the star icon on any stock to add it here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {watchlist.watchlist.map(item => {
            const info = watchlistQuotes[item.symbol];
            return (
              <div key={item.symbol} className="p-3 rounded-xl bg-slate-800/20 border border-slate-800/40 hover:bg-slate-800/40 cursor-pointer transition-colors" onClick={() => d.handleSelect(item.symbol, item.type)}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-200">{item.symbol}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[140px]">{info?.name || item.symbol}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); watchlist.removeFromWatchlist(item.symbol); }} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {info?.loading ? <Skeleton className="h-6 w-24 bg-slate-700" /> : info?.price ? (
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-bold font-mono text-slate-100">{info.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className={cn('text-sm font-semibold font-mono', info.changePct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {info.changePct >= 0 ? '+' : ''}{info.changePct.toFixed(2)}%
                    </span>
                  </div>
                ) : <Skeleton className="h-6 w-24 bg-slate-700" />}
              </div>
            );
          })}
        </div>
      )}
    </P>
  );
}

// ==================== MAIN HOME PAGE ====================
export default function Home() {
  const d = useDashboardData();
  const watchlist = useWatchlist();
  const [view, setView] = useState<ViewType>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [pendingAlert, setPendingAlert] = useState<{ symbol: string; name: string; price: number; signal: string } | null>(null);

  const handleSetAlert = (s: { symbol: string; name: string; price: number; signal: string }) => {
    setPendingAlert(s);
    setView('alerts');
  };
  const consumePendingAlert = useCallback(() => setPendingAlert(null), []);

  // Real-time WebSocket data via Upstox
  const realtimeSymbols = [
    ...(d.selectedSymbol ? [d.selectedSymbol] : []),
    'NIFTY', 'BANKNIFTY', 'NIFTYIT', 'INDIAVIX',
  ];
  const rt = useRealtimeData(realtimeSymbols);

  // Handle URL query params: ?symbol=RELIANCE&view=screener&upstox=connected
  const queryApplied = useRef(false);
  useEffect(() => {
    if (queryApplied.current) return;
    const sp = new URLSearchParams(window.location.search);
    let applied = false;

    // Handle ?symbol=RELIANCE
    const sym = sp.get('symbol');
    if (sym && /^[A-Z0-9]+$/i.test(sym)) {
      const upper = sym.toUpperCase();
      const indexNames = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'NIFTYMIDCAP', 'NIFTYNXT50', 'NIFTYPHARMA'];
      d.handleSelect(upper, indexNames.includes(upper) ? 'index' : 'equity');
      applied = true;
    }

    // Handle ?view=screener
    const viewParam = sp.get('view');
    if (viewParam && ['overview', 'screener', 'chart', 'fundamentals', 'technicals', 'strategy', 'news', 'portfolio', 'alerts', 'watchlist', 'oi'].includes(viewParam)) {
      setView(viewParam as ViewType);
      applied = true;
    }

    // Handle ?upstox=connected
    const upstoxStatus = sp.get('upstox');
    if (upstoxStatus === 'connected') {
      rt.connectUpstox();
      applied = true;
    } else if (upstoxStatus?.startsWith('error')) {
      console.error('[Upstox] OAuth error:', upstoxStatus);
      alert(`Upstox connection failed: ${upstoxStatus.replace('error_', '')}. Check that UPSTOX_API_KEY and UPSTOX_API_SECRET are set in .env`);
      applied = true;
    }

    // Clean URL — remove all query params after applying
    if (applied) {
      queryApplied.current = true;
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [d, rt]);

  // Re-fetch OI data when a live Upstox tick arrives for the OI underlying
  // This ensures the mock OI strikes use the live spot price, not stale bp/Yahoo
  const prevOiSpotRef = useRef(0);
  useEffect(() => {
    if (!d.oiUnderlying || !rt.upstoxConnected) return;
    const tick = rt.liveTicks.get(d.oiUnderlying);
    if (!tick || tick.ltp <= 0) return;
    // Only re-fetch if price moved significantly (>0.1%) from last OI fetch
    const prevSpot = prevOiSpotRef.current;
    if (prevSpot > 0 && Math.abs(tick.ltp - prevSpot) / prevSpot < 0.001) return;
    prevOiSpotRef.current = tick.ltp;
    d.fetchOIData(d.oiUnderlying, d.oiExpiryFilter, tick.ltp);
  }, [rt.liveTicks, rt.upstoxConnected, d.oiUnderlying]);

  // Get live price for current symbol
  const liveTick = d.selectedSymbol ? rt.getLivePrice(d.selectedSymbol) : null;

  // Dynamic browser title for SEO and tab identification
  useEffect(() => {
    if (d.selectedSymbol && d.q) {
      const name = d.q.longName || d.q.name || d.selectedSymbol;
      const price = d.q.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      document.title = `${d.selectedSymbol} ${price ? '₹' + price + ' · ' : ''}${name} - NSE Analytics`;
    } else {
      document.title = 'NSE Analytics - Trading Strategy Dashboard';
    }
  }, [d.selectedSymbol, d.q?.price, d.q?.longName]);

  const activeNav = NAV_ITEMS.find(n => n.id === view);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[#070a10] text-slate-100 flex" suppressHydrationWarning>
        <SavePoints points={d.savePoints} />
        {/* === FLOATING UPSTOX CONNECTION INDICATOR — always visible, top-right === */}
        {rt.upstoxConnected ? (
          <div className="fixed top-2 right-2 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0c1018]/90 border border-emerald-500/25 backdrop-blur-md shadow-lg shadow-emerald-900/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-wider text-emerald-300/90">UPSTOX {rt.wsConnected ? 'LIVE' : 'CONNECTED'}</span>
            {rt.lastTickTime && <span className="text-[9px] text-emerald-600 font-mono">{rt.lastTickTime}</span>}
            <a href="/api/upstox/disconnect" onClick={async (e) => { e.preventDefault(); await fetch('/api/upstox/disconnect', { method: 'POST' }); window.location.reload(); }} className="ml-0.5 text-emerald-600 hover:text-red-400 transition-colors duration-200" title="Disconnect Upstox">
              <X className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <a href="/api/upstox/connect" className="fixed top-2 right-2 z-[100] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0c1018]/90 border border-slate-700/30 backdrop-blur-md shadow-lg hover:border-amber-500/30 hover:bg-amber-950/40 transition-all duration-200 group" title="Connect to Upstox for real-time data">
            <WifiOff className="w-3 h-3 text-slate-500 group-hover:text-amber-400 transition-colors" />
            <span className="text-[10px] font-semibold text-slate-500 group-hover:text-amber-400 transition-colors">CONNECT UPSTOX</span>
          </a>
        )}
        <Sidebar view={view} setView={setView} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} d={d} watchlist={watchlist} />
        <div className={cn('flex-1 min-w-0 flex flex-col', rt.upstoxConnected && 'bg-[#060a08]')}>
          <HeaderBar d={d} watchlist={watchlist} liveTick={liveTick} rtTicks={rt.liveTicks} upstoxConnected={rt.upstoxConnected} />
          <main className="flex-1 p-3 max-w-[1920px] w-full mx-auto">
            {/* View breadcrumb */}
            <div className="flex items-center gap-2 mb-3 view-enter" key={view}>
              <div className={cn('w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center shadow-sm', activeNav?.color)}>
                {activeNav && <activeNav.icon className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm font-bold text-slate-200">{activeNav?.label}</span>
              <Badge variant="outline" className="text-[8px] px-1.5 py-0 bg-slate-800/50 border-slate-700/40 text-slate-500 font-medium">{activeNav?.source}</Badge>
              {d.lastDate && <span className="ml-auto text-[10px] text-slate-600 flex items-center gap-1"><Calendar className="w-3 h-3" />{fDate(d.lastDate)}</span>}
            </div>

            {/* View Content */}
            {view === 'overview' && <OverviewView d={d} watchlist={watchlist} onSetAlert={handleSetAlert} liveTick={liveTick} onViewScreener={() => setView('screener')} />}
            {view === 'screener' && <ScreenerView d={d} onSetAlert={handleSetAlert} />}
            {view === 'chart' && <ChartView d={d} liveTick={liveTick} />}
            {view === 'fundamentals' && <FundamentalsView d={d} />}
            {view === 'technicals' && <TechnicalsView d={d} />}
            {view === 'strategy' && <StrategyView d={d} />}
            {view === 'news' && <NewsView d={d} />}
            {view === 'portfolio' && <PortfolioView d={d} />}
            {view === 'alerts' && <AlertsView d={d} pendingAlert={pendingAlert} onPendingAlertConsumed={consumePendingAlert} />}
            {view === 'watchlist' && <WatchlistView d={d} watchlist={watchlist} />}
            {view === 'oi' && <OpenInterestView d={d} upstoxConnected={rt.upstoxConnected} />}
          </main>
          {/* Footer */}
          <div className="border-t border-slate-800/20 py-2.5 px-4 flex items-center justify-between text-[9px] text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">NSE Analytics</span>
              <span className="text-slate-700">·</span>
              <span>Educational use only</span>
            </div>
            <div className="flex items-center gap-3">
              {d.autoRefresh && <span className="flex items-center gap-1 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Auto-refresh: {d.refreshInterval}s</span>}
              <span className="text-slate-700">·</span>
              {rt.upstoxConnected
                ? <span className="flex items-center gap-1 text-emerald-500/70"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Upstox Live{rt.lastTickTime ? ` · ${rt.lastTickTime}` : ''}</span>
                : <a href="/api/upstox/connect" className="flex items-center gap-1 text-amber-500/60 hover:text-amber-400 transition-colors"><WifiOff className="w-2 h-2" /> Connect Upstox</a>}
              <span className="text-slate-700">·</span>
              <span className="text-slate-600">{rt.upstoxConnected ? 'Real-time via Upstox' : 'Yahoo Finance · 15 min delayed'}</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}