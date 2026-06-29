'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceDot,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Loader2,
  ArrowUpTriangle,
  ArrowDownTriangle,
  Activity,
  BarChart3,
  Target,
  Trophy,
  TrendingDown,
  AlertTriangle,
  Zap,
  Shield,
  Flame,
  Scale,
  ChevronDown,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

// ==================== TYPES ====================

interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
}

interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

interface StrategySignal {
  date: string;
  close: number;
  signal: SignalType;
  supertrend: number;
  supertrendDir: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  reason: string;
}

interface TradeRecord {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  type: 'LONG' | 'SHORT';
  pnl: number;
  pnlPct: number;
  signal: SignalType;
}

interface BacktestResult {
  totalReturn: number;
  totalReturnPct: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPct: number;
  avgLossPct: number;
  maxDrawdownPct: number;
  profitFactor: number;
  trades: TradeRecord[];
}

interface StrategyParams {
  supertrendPeriod: number;
  supertrendMultiplier: number;
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
}

interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  supertrend: number | null;
  supertrendDir: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  signal: SignalType | null;
}

// ==================== DEFAULTS ====================

const DEFAULT_PARAMS: StrategyParams = {
  supertrendPeriod: 10,
  supertrendMultiplier: 3,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  macdFast: 12,
  macdSlow: 26,
  macdSignal: 9,
};

// ==================== FORMATTERS ====================

function formatINR(value: number): string {
  return '₹' + value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(value: number): string {
  if (value >= 10000000) {
    return (value / 10000000).toFixed(2) + ' Cr';
  }
  if (value >= 100000) {
    return (value / 100000).toFixed(2) + ' L';
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function getSignalColor(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY': return 'text-emerald-400';
    case 'BUY': return 'text-green-400';
    case 'HOLD': return 'text-amber-400';
    case 'SELL': return 'text-orange-400';
    case 'STRONG_SELL': return 'text-red-400';
  }
}

function getSignalBg(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY': return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400';
    case 'BUY': return 'bg-green-500/20 border-green-500/40 text-green-400';
    case 'HOLD': return 'bg-amber-500/20 border-amber-500/40 text-amber-400';
    case 'SELL': return 'bg-orange-500/20 border-orange-500/40 text-orange-400';
    case 'STRONG_SELL': return 'bg-red-500/20 border-red-500/40 text-red-400';
  }
}

function getSignalIcon(signal: SignalType): string {
  switch (signal) {
    case 'STRONG_BUY': return '⬆⬆';
    case 'BUY': return '⬆';
    case 'HOLD': return '⏸';
    case 'SELL': return '⬇';
    case 'STRONG_SELL': return '⬇⬇';
  }
}

// ==================== MAIN COMPONENT ====================

export default function Home() {
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [loading, setLoading] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const [stockData, setStockData] = useState<OHLCV[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [params, setParams] = useState<StrategyParams>({ ...DEFAULT_PARAMS });

  const [chartOffset, setChartOffset] = useState(0);
  const [recalculating, setRecalculating] = useState(false);

  // Fetch stocks list
  useEffect(() => {
    fetch('/api/stocks')
      .then((r) => r.json())
      .then(setStocks)
      .catch(console.error);
  }, []);

  // Fetch signals data
  const fetchData = useCallback(
    async (symbol: string, p: StrategyParams) => {
      setLoading(true);
      setChartOffset(0);
      try {
        const sp = new URLSearchParams({ symbol, days: '200' });
        for (const [key, val] of Object.entries(p)) {
          sp.append(key, String(val));
        }
        const res = await fetch(`/api/signals?${sp.toString()}`);
        const data = await res.json();
        setStockData(data.stockData || []);
        setSignals(data.signals || []);
        setBacktest(data.backtest || null);
        setStockInfo(data.stockInfo || null);
        setParams(data.params || DEFAULT_PARAMS);
      } catch (err) {
        console.error('Failed to fetch signals:', err);
      } finally {
        setLoading(false);
        setRecalculating(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData(selectedSymbol, params);
  }, [selectedSymbol]);

  // Merge stock data with signals for chart
  const chartData = useMemo(() => {
    const signalMap = new Map<string, StrategySignal>();
    for (const s of signals) {
      signalMap.set(s.date, s);
    }
    return stockData.map((d) => {
      const sig = signalMap.get(d.date);
      return {
        date: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume,
        supertrend: sig?.supertrend ?? null,
        supertrendDir: sig?.supertrendDir ?? null,
        rsi: sig?.rsi ?? null,
        macd: sig?.macd ?? null,
        macdSignal: sig?.macdSignal ?? null,
        macdHistogram: sig?.macdHistogram ?? null,
        signal: sig?.signal ?? null,
      };
    });
  }, [stockData, signals]);

  // Visible chart slice (last 100 by default, with sliding)
  const visibleData = useMemo(() => {
    const maxVisible = 100;
    const end = chartData.length - chartOffset;
    const start = Math.max(0, end - maxVisible);
    return chartData.slice(start, end);
  }, [chartData, chartOffset]);

  const canSlideLeft = chartOffset < chartData.length - 100;
  const canSlideRight = chartOffset > 0;

  // Latest signal
  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
  const latestStockData = stockData.length > 0 ? stockData[stockData.length - 1] : null;
  const prevStockData =
    stockData.length > 1 ? stockData[stockData.length - 2] : null;
  const priceChange =
    latestStockData && prevStockData
      ? latestStockData.close - prevStockData.close
      : 0;
  const priceChangePct =
    prevStockData && prevStockData.close !== 0
      ? (priceChange / prevStockData.close) * 100
      : 0;

  // Handle stock selection
  const handleStockSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setPopoverOpen(false);
  };

  // Handle parameter change with recalculation
  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyParams = () => {
    setRecalculating(true);
    fetchData(selectedSymbol, params);
  };

  // Custom tooltip for main chart
  const MainChartTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: ChartDataPoint }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
        <div className="font-semibold text-slate-200 mb-1.5">
          {formatDate(d.date)}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
          <span>O: {formatINR(d.open)}</span>
          <span>H: {formatINR(d.high)}</span>
          <span>L: {formatINR(d.low)}</span>
          <span>C: {formatINR(d.close)}</span>
          <span className="col-span-2 text-slate-400">Vol: {formatVolume(d.volume)}</span>
          {d.supertrend !== null && (
            <span className="col-span-2">
              ST:{' '}
              <span
                className={
                  d.supertrendDir === 1
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }
              >
                {formatINR(d.supertrend)}
              </span>{' '}
              ({d.supertrendDir === 1 ? 'Bullish' : 'Bearish'})
            </span>
          )}
          {d.signal && d.signal !== 'HOLD' && (
            <span className={`col-span-2 font-semibold ${getSignalColor(d.signal)}`}>
              {d.signal.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    );
  };

  const currentRSI = latestSignal?.rsi ?? 0;
  const currentSTDir = latestSignal?.supertrendDir ?? 0;
  const currentSTValue = latestSignal?.supertrend ?? 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ===== HEADER ===== */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  NSE Trading Strategy Dashboard
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Supertrend + RSI + MACD Confluence Strategy for Zerodha
                </p>
              </div>
            </div>
            {/* Stock Selector */}
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-[280px] justify-between bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  {stockInfo
                    ? `${stockInfo.symbol} - ${stockInfo.name}`
                    : 'Select Stock...'}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 bg-slate-900 border-slate-700" align="end">
                <Command className="bg-slate-900">
                  <CommandInput placeholder="Search stocks..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No stock found.</CommandEmpty>
                    <CommandGroup>
                      {stocks.map((stock) => (
                        <CommandItem
                          key={stock.symbol}
                          value={`${stock.symbol} ${stock.name}`}
                          onSelect={() => handleStockSelect(stock.symbol)}
                          className="text-slate-200 data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
                        >
                          <span className="font-medium text-emerald-400 w-24 shrink-0">
                            {stock.symbol}
                          </span>
                          <span className="text-slate-400 text-xs truncate">
                            {stock.name}{' '}
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px] px-1.5 py-0 border-slate-600 text-slate-400"
                            >
                              {stock.sector}
                            </Badge>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* ===== MAIN CHART ===== */}
            <Card className="bg-slate-900 border-slate-800 py-4 gap-4">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Price Chart with Supertrend
                    {latestStockData && (
                      <span className="ml-2">
                        <span className="text-white font-semibold text-base">
                          {formatINR(latestStockData.close)}
                        </span>
                        <span
                          className={`ml-1.5 text-sm font-medium ${
                            priceChange >= 0
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}
                        >
                          {priceChange >= 0 ? '+' : ''}
                          {formatINR(priceChange)} ({priceChangePct >= 0 ? '+' : ''}
                          {priceChangePct.toFixed(2)}%)
                        </span>
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                      disabled={!canSlideRight}
                      onClick={() => setChartOffset((p) => Math.max(0, p - 50))}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="rotate-180">
                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-800"
                      disabled={!canSlideLeft}
                      onClick={() => setChartOffset((p) => p + 50)}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[350px] sm:h-[420px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={visibleData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradientBull" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="priceGradientBear" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v: string) => {
                          const d = new Date(v);
                          return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                        }}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        interval={Math.floor(visibleData.length / 8)}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v: number) => '₹' + v.toLocaleString('en-IN')}
                        axisLine={{ stroke: '#334155' }}
                        tickLine={false}
                        width={75}
                      />
                      <RechartsTooltip content={<MainChartTooltip />} />
                      {/* Supertrend line */}
                      <Line
                        type="monotone"
                        dataKey="supertrend"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        dot={false}
                        name="Supertrend"
                        connectNulls={false}
                        strokeDasharray="4 2"
                      />
                      {/* Price area */}
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke="#e2e8f0"
                        strokeWidth={2}
                        fill="url(#priceGradientBull)"
                        name="Close"
                        isAnimationActive={false}
                      />
                      {/* Buy/Sell markers */}
                      {visibleData.map((d, idx) => {
                        if (d.signal === 'STRONG_BUY' || d.signal === 'BUY') {
                          return (
                            <ReferenceDot
                              key={`buy-${idx}`}
                              x={d.date}
                              y={d.close}
                              r={5}
                              fill="#10b981"
                              stroke="#064e3b"
                              strokeWidth={1}
                              shape={
                                <g>
                                  <polygon
                                    points={`${0},${6} ${-5},${-4} ${5},${-4}`}
                                    fill="#10b981"
                                    stroke="#064e3b"
                                    strokeWidth={1}
                                  />
                                </g>
                              }
                            />
                          );
                        }
                        if (d.signal === 'STRONG_SELL' || d.signal === 'SELL') {
                          return (
                            <ReferenceDot
                              key={`sell-${idx}`}
                              x={d.date}
                              y={d.close}
                              r={5}
                              fill="#ef4444"
                              stroke="#7f1d1d"
                              strokeWidth={1}
                              shape={
                                <g>
                                  <polygon
                                    points={`${0},${-6} ${-5},${4} ${5},${4}`}
                                    fill="#ef4444"
                                    stroke="#7f1d1d"
                                    strokeWidth={1}
                                  />
                                </g>
                              }
                            />
                          );
                        }
                        return null;
                      })}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* ===== INDICATOR PANELS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RSI Gauge */}
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    RSI ({params.rsiPeriod})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50" cy="50" r="42"
                          fill="none"
                          stroke={currentRSI < 30 ? '#ef4444' : currentRSI > 70 ? '#ef4444' : '#10b981'}
                          strokeWidth="8"
                          strokeDasharray={`${(currentRSI / 100) * 264} 264`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-lg font-bold ${currentRSI < 30 ? 'text-red-400' : currentRSI > 70 ? 'text-red-400' : 'text-emerald-400'}`}>
                          {currentRSI.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Zone:</span>
                        <span className={currentRSI < 30 ? 'text-red-400 font-medium' : currentRSI > 70 ? 'text-red-400 font-medium' : 'text-emerald-400 font-medium'}>
                          {currentRSI < 30 ? 'Oversold' : currentRSI > 70 ? 'Overbought' : 'Neutral'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">OB:</span>
                        <span className="text-slate-300">{params.rsiOverbought}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">OS:</span>
                        <span className="text-slate-300">{params.rsiOversold}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* MACD Mini Chart */}
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5" />
                    MACD ({params.macdFast},{params.macdSlow},{params.macdSignal})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[80px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={visibleData.slice(-50)} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                        <Bar dataKey="macdHistogram" name="Histogram">
                          {visibleData.slice(-50).map((d, idx) => (
                            <Cell
                              key={idx}
                              fill={d.macdHistogram !== null && d.macdHistogram >= 0 ? '#10b981' : '#ef4444'}
                              opacity={0.7}
                            />
                          ))}
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="macd"
                          stroke="#3b82f6"
                          strokeWidth={1.5}
                          dot={false}
                          name="MACD"
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="macdSignal"
                          stroke="#f59e0b"
                          strokeWidth={1.5}
                          dot={false}
                          name="Signal"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>
                      MACD:{' '}
                      <span className={latestSignal && latestSignal.macd >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {latestSignal?.macd?.toFixed(2) ?? '-'}
                      </span>
                    </span>
                    <span>
                      Sig:{' '}
                      <span className={latestSignal && latestSignal.macdSignal >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {latestSignal?.macdSignal?.toFixed(2) ?? '-'}
                      </span>
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Supertrend Status */}
              <Card className="bg-slate-900 border-slate-800 py-4 gap-3">
                <CardHeader className="pb-0">
                  <CardTitle className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    Supertrend ({params.supertrendPeriod},{params.supertrendMultiplier})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-20 h-20 rounded-full border-2 ${
                        currentSTDir === 1
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-red-500/40 bg-red-500/10'
                      }`}
                    >
                      <div className="text-center">
                        {currentSTDir === 1 ? (
                          <TrendingUp className={`w-6 h-6 mx-auto ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`} />
                        ) : (
                          <TrendingDown className="w-6 h-6 mx-auto text-red-400" />
                        )}
                        <span
                          className={`text-[10px] font-medium ${
                            currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {currentSTDir === 1 ? 'Bullish' : 'Bearish'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Value:</span>
                        <span className={`font-medium ${currentSTDir === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatINR(currentSTValue)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Period:</span>
                        <span className="text-slate-300">{params.supertrendPeriod}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Multiplier:</span>
                        <span className="text-slate-300">{params.supertrendMultiplier}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ===== CURRENT SIGNAL CARD ===== */}
            {latestSignal && (
              <Card
                className={`border py-4 gap-4 ${
                  latestSignal.signal === 'STRONG_BUY'
                    ? 'bg-emerald-950/40 border-emerald-500/30'
                    : latestSignal.signal === 'BUY'
                    ? 'bg-green-950/40 border-green-500/30'
                    : latestSignal.signal === 'HOLD'
                    ? 'bg-amber-950/30 border-amber-500/30'
                    : latestSignal.signal === 'SELL'
                    ? 'bg-orange-950/30 border-orange-500/30'
                    : 'bg-red-950/40 border-red-500/30'
                }`}
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex items-center justify-center w-16 h-16 rounded-xl border-2 ${getSignalBg(
                        latestSignal.signal
                      )}`}
                    >
                      <span className="text-2xl">{getSignalIcon(latestSignal.signal)}</span>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 mb-0.5">Latest Signal</div>
                      <div className={`text-2xl font-bold ${getSignalColor(latestSignal.signal)}`}>
                        {latestSignal.signal.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 max-w-md">
                        {latestSignal.reason}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Current Price</div>
                    <div className="text-2xl font-bold text-white">
                      {formatINR(latestSignal.close)}
                    </div>
                    <div
                      className={`text-sm font-medium ${
                        priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {priceChange >= 0 ? '+' : ''}
                      {priceChangePct.toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">{formatDate(latestSignal.date)}</div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ===== BACKTEST RESULTS ===== */}
            {backtest && (
              <>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <h2 className="text-sm font-semibold text-slate-300">Backtest Results</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <MetricCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Total Return"
                    value={`${backtest.totalReturnPct >= 0 ? '+' : ''}${backtest.totalReturnPct.toFixed(2)}%`}
                    color={backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    icon={<Trophy className="w-4 h-4" />}
                    label="Win Rate"
                    value={`${backtest.winRate.toFixed(1)}%`}
                    color={backtest.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Total Trades"
                    value={String(backtest.totalTrades)}
                    color="text-slate-200"
                  />
                  <MetricCard
                    icon={<Zap className="w-4 h-4" />}
                    label="Winning"
                    value={String(backtest.winningTrades)}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    icon={<Flame className="w-4 h-4" />}
                    label="Losing"
                    value={String(backtest.losingTrades)}
                    color="text-red-400"
                  />
                  <MetricCard
                    icon={<ArrowUpTriangle className="w-4 h-4" />}
                    label="Avg Win"
                    value={`+${backtest.avgWinPct.toFixed(2)}%`}
                    color="text-emerald-400"
                  />
                  <MetricCard
                    icon={<ArrowDownTriangle className="w-4 h-4" />}
                    label="Avg Loss"
                    value={`${backtest.avgLossPct.toFixed(2)}%`}
                    color="text-red-400"
                  />
                  <MetricCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Max Drawdown"
                    value={`-${backtest.maxDrawdownPct.toFixed(2)}%`}
                    color={backtest.maxDrawdownPct > 10 ? 'text-red-400' : 'text-amber-400'}
                  />
                  <MetricCard
                    icon={<Scale className="w-4 h-4" />}
                    label="Profit Factor"
                    value={backtest.profitFactor >= 999 ? '∞' : backtest.profitFactor.toFixed(2)}
                    color={backtest.profitFactor >= 1.5 ? 'text-emerald-400' : backtest.profitFactor >= 1 ? 'text-amber-400' : 'text-red-400'}
                  />
                </div>

                {/* ===== TRADE HISTORY TABLE ===== */}
                <Card className="bg-slate-900 border-slate-800 py-4 gap-4">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      Trade History (Last {backtest.trades.length} Trades)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto rounded-md border border-slate-800">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-800 hover:bg-slate-800/50">
                            <TableHead className="text-slate-400 text-xs">Entry Date</TableHead>
                            <TableHead className="text-slate-400 text-xs">Exit Date</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Entry Price</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">Exit Price</TableHead>
                            <TableHead className="text-slate-400 text-xs text-right">P&L %</TableHead>
                            <TableHead className="text-slate-400 text-xs">Signal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backtest.trades.map((trade, idx) => (
                            <TableRow
                              key={idx}
                              className="border-slate-800 hover:bg-slate-800/50"
                            >
                              <TableCell className="text-slate-300 text-xs font-mono">
                                {formatDate(trade.entryDate)}
                              </TableCell>
                              <TableCell className="text-slate-300 text-xs font-mono">
                                {formatDate(trade.exitDate)}
                              </TableCell>
                              <TableCell className="text-slate-300 text-xs text-right font-mono">
                                {formatINR(trade.entryPrice)}
                              </TableCell>
                              <TableCell className="text-slate-300 text-xs text-right font-mono">
                                {formatINR(trade.exitPrice)}
                              </TableCell>
                              <TableCell
                                className={`text-xs text-right font-semibold font-mono ${
                                  trade.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 ${getSignalBg(trade.signal)}`}
                                >
                                  {trade.signal}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {backtest.trades.length === 0 && (
                            <TableRow className="border-slate-800">
                              <TableCell className="text-slate-500 text-center py-8" colSpan={6}>
                                No trades executed in this period
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ===== STRATEGY PARAMETERS ===== */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="params" className="border-slate-800">
                <AccordionTrigger className="text-sm font-medium text-slate-300 hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    Strategy Parameters
                    {recalculating && <Loader2 className="w-3 h-3 animate-spin text-amber-400" />}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <ParamSlider
                      label="Supertrend Period"
                      value={params.supertrendPeriod}
                      min={5}
                      max={20}
                      step={1}
                      onChange={(v) => handleParamChange('supertrendPeriod', v)}
                    />
                    <ParamSlider
                      label="Supertrend Multiplier"
                      value={params.supertrendMultiplier}
                      min={1}
                      max={5}
                      step={0.5}
                      onChange={(v) => handleParamChange('supertrendMultiplier', v)}
                    />
                    <ParamSlider
                      label="RSI Period"
                      value={params.rsiPeriod}
                      min={5}
                      max={30}
                      step={1}
                      onChange={(v) => handleParamChange('rsiPeriod', v)}
                    />
                    <ParamSlider
                      label="RSI Overbought"
                      value={params.rsiOverbought}
                      min={60}
                      max={90}
                      step={1}
                      onChange={(v) => handleParamChange('rsiOverbought', v)}
                    />
                    <ParamSlider
                      label="RSI Oversold"
                      value={params.rsiOversold}
                      min={10}
                      max={40}
                      step={1}
                      onChange={(v) => handleParamChange('rsiOversold', v)}
                    />
                    <ParamSlider
                      label="MACD Fast"
                      value={params.macdFast}
                      min={5}
                      max={20}
                      step={1}
                      onChange={(v) => handleParamChange('macdFast', v)}
                    />
                    <ParamSlider
                      label="MACD Slow"
                      value={params.macdSlow}
                      min={15}
                      max={40}
                      step={1}
                      onChange={(v) => handleParamChange('macdSlow', v)}
                    />
                    <ParamSlider
                      label="MACD Signal"
                      value={params.macdSignal}
                      min={3}
                      max={15}
                      step={1}
                      onChange={(v) => handleParamChange('macdSignal', v)}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleApplyParams}
                      disabled={recalculating}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {recalculating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      Apply & Recalculate
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setParams({ ...DEFAULT_PARAMS })}
                      className="text-slate-400 hover:text-white"
                    >
                      Reset to Defaults
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-800 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            ⚠️ This is a simulated strategy for educational purposes. Not financial advice.
            Always do your own research before trading. Past performance does not guarantee future results.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function ParamSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-400 font-medium">{label}</label>
        <Input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 h-7 text-xs text-right bg-slate-800 border-slate-700 text-slate-200"
        />
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="py-1"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Chart Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <Skeleton className="h-6 w-48 mb-4 bg-slate-800" />
        <Skeleton className="h-[350px] w-full bg-slate-800 rounded-lg" />
      </div>
      {/* Indicators Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Skeleton className="h-4 w-32 mb-3 bg-slate-800" />
            <Skeleton className="h-20 w-full bg-slate-800 rounded-lg" />
          </div>
        ))}
      </div>
      {/* Signal Skeleton */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <Skeleton className="h-20 w-full bg-slate-800 rounded-lg" />
      </div>
      {/* Backtest Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <Skeleton className="h-4 w-20 mb-2 bg-slate-800" />
            <Skeleton className="h-6 w-16 bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  );
}