'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceDot, Bar, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  type ChartType, type IndicatorId, type DrawingTool,
  CHART_TYPES, INDICATOR_LIST,
} from './candlestick-chart';
import type { DetectedPattern } from '@/lib/technical-indicators';
import { Target, TrendingUp, TrendingDown, Minus, PenTool, Crosshair, ArrowUpRight, ArrowDownRight, Ruler, Square, MinusIcon, Trash2, ChevronDown, Zap, Activity, BarChart3, Waves, GitBranch, Layers } from 'lucide-react';

const CandlestickChartDynamic = dynamic(() => import('./candlestick-chart'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-[#0a0e1a] flex items-center justify-center">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400">Loading chart engine...</span>
      </div>
    </div>
  ),
});

export interface OHLCV { date: string; open: number; high: number; low: number; close: number; volume: number; }
type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
export interface StrategySignal { date: string; close: number; signal: SignalType; supertrend: number; supertrendDir: number; rsi: number; macd: number; macdSignal: number; macdHistogram: number; reason: string; }
export interface ChartDataPoint extends OHLCV { supertrend: number | null; supertrendDir: number | null; rsi: number | null; macd: number | null; macdSignal: number | null; macdHistogram: number | null; signal: SignalType | null; }

export function mergeChartData(stockData: OHLCV[], signals: StrategySignal[]): ChartDataPoint[] {
  const sigMap = new Map(signals.map(s => [s.date, s]));
  return stockData.map(d => {
    const sig = sigMap.get(d.date);
    return { ...d, supertrend: sig?.supertrend ?? null, supertrendDir: sig?.supertrendDir ?? null, rsi: sig?.rsi ?? null, macd: sig?.macd ?? null, macdSignal: sig?.macdSignal ?? null, macdHistogram: sig?.macdHistogram ?? null, signal: sig?.signal ?? null };
  });
}

function fPriceAxis(v: number): string {
  if (v >= 100000) return (v / 1000).toFixed(0) + 'K';
  if (v >= 1000) return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fTooltipPrice(v: number): string {
  return '\u20B9' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ChartTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
      <div className="font-semibold text-slate-200 mb-1.5">{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
        <span>O: {fTooltipPrice(d.open)}</span><span>H: {fTooltipPrice(d.high)}</span>
        <span>L: {fTooltipPrice(d.low)}</span><span>C: {fTooltipPrice(d.close)}</span>
        {d.supertrend !== null && <span className="col-span-2">ST: <span className={d.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400'}>{fTooltipPrice(d.supertrend)}</span></span>}
        {d.signal && d.signal !== 'HOLD' && <span className={cn('col-span-2 font-semibold', d.signal.includes('BUY') ? 'text-emerald-400' : 'text-red-400')}>{d.signal.replace('_', ' ')}</span>}
      </div>
    </div>
  );
}

function RSIGauge({ value }: { value: number | null }) {
  if (value === null) return <div className="text-slate-500 text-xs">RSI: --</div>;
  const color = value > 70 ? '#ef4444' : value < 30 ? '#10b981' : '#f59e0b';
  return (
    <div className="flex flex-col items-center">
      <svg width="80" height="48" viewBox="0 0 80 48">
        <path d="M 8 44 A 34 34 0 0 1 72 44" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
        <path d="M 8 44 A 34 34 0 0 1 72 44" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={(value / 100 * 107) + ' 107'} />
        <text x="40" y="28" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white" stroke="#0f172a" strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">{Math.round(value)}</text>
      </svg>
      <span className="text-[9px] text-slate-500">{value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral'}</span>
    </div>
  );
}

// ==================== TIMEFRAME ====================
type TimeframeKey = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' | '1M';

const TIMEFRAMES: { key: TimeframeKey; label: string; apiInterval: string }[] = [
  { key: '1m', label: '1m', apiInterval: '1' },
  { key: '5m', label: '5m', apiInterval: '5' },
  { key: '15m', label: '15m', apiInterval: '15' },
  { key: '1H', label: '1H', apiInterval: '60' },
  { key: '4H', label: '4H', apiInterval: '240' },
  { key: '1D', label: '1D', apiInterval: 'D' },
  { key: '1W', label: '1W', apiInterval: 'W' },
  { key: '1M', label: '1M', apiInterval: 'M' },
];

// ==================== CHART TYPE SELECTOR ====================
function ChartTypeSelector({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Chart</span>
      <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/40 border border-slate-700/50 p-0.5">
        {CHART_TYPES.map(ct => (
          <button
            key={ct.id}
            onClick={() => onChange(ct.id)}
            title={ct.label}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-medium transition-all',
              value === ct.id
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-700/30'
            )}
          >
            <span className="mr-1">{ct.icon}</span>
            <span className="hidden xl:inline">{ct.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== DRAWING TOOLS ====================
const DRAW_TOOLS: { id: DrawingTool; label: string; icon: React.ElementType }[] = [
  { id: 'crosshair', label: 'Crosshair', icon: Crosshair },
  { id: 'trendline', label: 'Trendline', icon: Ruler },
  { id: 'hline', label: 'Horiz. Line', icon: MinusIcon },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
];

function DrawingToolbar({ activeTool, setActiveTool }: { activeTool: DrawingTool; setActiveTool: (t: DrawingTool) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Draw</span>
      <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/40 border border-slate-700/50 p-0.5">
        {DRAW_TOOLS.map(tool => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            title={tool.label}
            className={cn(
              'p-1.5 rounded transition-all',
              activeTool === tool.id
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-500 hover:text-slate-300 border border-transparent hover:bg-slate-700/30'
            )}
          >
            <tool.icon className="w-3 h-3" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== INDICATOR PICKER ====================
function IndicatorPicker({
  active, onToggle, showPanel, onTogglePanel
}: {
  active: IndicatorId[];
  onToggle: (id: IndicatorId) => void;
  showPanel: boolean;
  onTogglePanel: () => void;
}) {
  const priceIndicators = INDICATOR_LIST.filter(i => i.panel === undefined || i.panel === 'price');
  const subIndicators = INDICATOR_LIST.filter(i => i.panel === 'rsi' || i.panel === 'macd');

  return (
    <div className="relative">
      <button
        onClick={onTogglePanel}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border',
          showPanel
            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
            : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-slate-300 hover:bg-slate-700/30'
        )}
      >
        <Layers className="w-3 h-3" />
        Indicators
        {active.length > 0 && (
          <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-300 text-[8px] flex items-center justify-center font-bold">{active.length}</span>
        )}
        <ChevronDown className={cn('w-3 h-3 transition-transform', showPanel && 'rotate-180')} />
      </button>

      {showPanel && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-lg border border-slate-700/60 bg-[#0d1117] shadow-2xl z-50 p-3 space-y-3">
          {/* Quick presets */}
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Quick Presets</span>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <button onClick={() => { onToggle('sma_20'); onToggle('sma_50'); onToggle('bb'); }} className="text-[9px] px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 transition-all">MA + BB</button>
              <button onClick={() => { onToggle('ema_9'); onToggle('ema_21'); onToggle('rsi'); onToggle('macd'); }} className="text-[9px] px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 transition-all">EMA + RSI + MACD</button>
              <button onClick={() => { onToggle('vwap'); onToggle('supertrend'); onToggle('fib'); onToggle('bb'); }} className="text-[9px] px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 transition-all">VWAP + ST + Fib</button>
              <button onClick={() => { onToggle('stoch'); onToggle('rsi'); onToggle('macd'); onToggle('sma_200'); }} className="text-[9px] px-2 py-1 rounded bg-slate-800/60 border border-slate-700/40 text-slate-400 hover:text-slate-200 hover:border-slate-600/60 transition-all">Full Technical</button>
            </div>
          </div>

          <div className="border-t border-slate-700/40" />

          {/* Price Overlay Indicators */}
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1"><Activity className="w-2.5 h-2.5" /> Price Overlay</span>
            <div className="space-y-0.5 mt-1.5 max-h-48 overflow-y-auto">
              {priceIndicators.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => onToggle(ind.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-all text-left',
                    active.includes(ind.id)
                      ? 'bg-slate-700/30 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  )}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                  <span className="font-medium flex-1">{ind.label}</span>
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    active.includes(ind.id) ? 'bg-emerald-500/20 border-emerald-500/50' : 'border-slate-600/50'
                  )}>
                    {active.includes(ind.id) && <span className="text-emerald-400 text-[8px]">\u2713</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-700/40" />

          {/* Sub-chart Indicators */}
          <div>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1"><BarChart3 className="w-2.5 h-2.5" /> Sub-Charts</span>
            <div className="space-y-0.5 mt-1.5">
              {subIndicators.map(ind => (
                <button
                  key={ind.id}
                  onClick={() => onToggle(ind.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-[10px] transition-all text-left',
                    active.includes(ind.id)
                    ? 'bg-slate-700/30 text-slate-200'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                  )}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                  <span className="font-medium flex-1">{ind.label}</span>
                  <span className="text-[8px] text-slate-600 px-1.5 py-0.5 rounded bg-slate-800/50">{ind.panel?.toUpperCase()}</span>
                  <div className={cn(
                    'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all',
                    active.includes(ind.id) ? 'bg-emerald-500/20 border-emerald-500/50' : 'border-slate-600/50'
                  )}>
                    {active.includes(ind.id) && <span className="text-emerald-400 text-[8px]">\u2713</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== PATTERN BADGES ====================
function PatternBadges({ patterns }: { patterns: DetectedPattern[] }) {
  if (patterns.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {patterns.map((p, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md border text-[9px] font-semibold',
            p.direction === 'bullish' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
            p.direction === 'bearish' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
            'bg-amber-500/10 border-amber-500/30 text-amber-300'
          )}
          title={p.description}
        >
          {p.direction === 'bullish' ? <ArrowUpRight className="w-2.5 h-2.5" /> : p.direction === 'bearish' ? <ArrowDownRight className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
          {p.name}
          <span className="text-[8px] opacity-60">{p.confidence}%</span>
        </div>
      ))}
    </div>
  );
}

// ==================== TIMEFRAME TOGGLE ====================
function TimeframeToggle({ timeframe, setTimeframe }: { timeframe: TimeframeKey; setTimeframe: (t: TimeframeKey) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Timeframe</span>
      <div className="flex items-center gap-0.5 rounded-lg bg-slate-800/40 border border-slate-700/50 p-0.5">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            onClick={() => setTimeframe(tf.key)}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-semibold transition-all',
              timeframe === tf.key
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-700/40'
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== ACTIVE INDICATOR CHIPS ====================
function ActiveIndicatorChips({ active, onRemove }: { active: IndicatorId[]; onRemove: (id: IndicatorId) => void }) {
  if (active.length === 0) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map(id => {
        const cfg = INDICATOR_LIST.find(i => i.id === id);
        if (!cfg) return null;
        return (
          <button
            key={id}
            onClick={() => onRemove(id)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border transition-all hover:opacity-70"
            style={{
              backgroundColor: cfg.color + '15',
              borderColor: cfg.color + '40',
              color: cfg.color,
            }}
          >
            {cfg.shortLabel}
            <XIcon className="w-2 h-2 opacity-60" />
          </button>
        );
      })}
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

// ==================== MAIN EXPORT ====================
export default function StrategySection({
  chartData, visibleData, latestSignal, signalsLoading, symbol, liveTick, strategyParams,
}: {
  chartData: ChartDataPoint[];
  visibleData: ChartDataPoint[];
  latestSignal: StrategySignal | null;
  signalsLoading: boolean;
  symbol?: string;
  liveTick?: import('./candlestick-chart').LiveTickProp | null;
  strategyParams?: { macdFast?: number; macdSlow?: number; macdSignal?: number };
}) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1D');
  const [chartType, setChartType] = useState<ChartType>('candle');
  const [activeIndicators, setActiveIndicators] = useState<IndicatorId[]>(['sma_20', 'sma_50']);
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const [showSignals, setShowSignals] = useState(true);
  const [patterns, setPatterns] = useState<DetectedPattern[]>([]);
  const tfConfig = TIMEFRAMES.find(t => t.key === timeframe) || TIMEFRAMES[5];

  const handleIndicatorToggle = useCallback((id: IndicatorId) => {
    setActiveIndicators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const handlePatternsDetected = useCallback((p: DetectedPattern[]) => {
    setPatterns(p);
  }, []);

  const priceMin = useMemo(() => {
    if (visibleData.length === 0) return 0;
    return Math.min(...visibleData.map(d => d.low)) * 0.998;
  }, [visibleData]);
  const priceMax = useMemo(() => {
    if (visibleData.length === 0) return 100;
    return Math.max(...visibleData.map(d => d.high)) * 1.002;
  }, [visibleData]);

  const activeLabels = activeIndicators.map(id => INDICATOR_LIST.find(i => i.id === id)?.shortLabel || id).join(', ');

  return (
    <div className="space-y-3">
      {/* Toolbar Row 1: Timeframe + Chart Type + Drawing Tools */}
      <div className="flex items-center gap-3 flex-wrap">
        <TimeframeToggle timeframe={timeframe} setTimeframe={setTimeframe} />
        <ChartTypeSelector value={chartType} onChange={setChartType} />
        <DrawingToolbar activeTool={activeTool} setActiveTool={setActiveTool} />
        <IndicatorPicker
          active={activeIndicators}
          onToggle={handleIndicatorToggle}
          showPanel={showIndicatorPanel}
          onTogglePanel={() => setShowIndicatorPanel(p => !p)}
        />
        {/* Buy/Sell Signal Toggle */}
        <button
          onClick={() => setShowSignals(v => !v)}
          title={showSignals ? 'Hide Buy/Sell Signals' : 'Show Buy/Sell Signals'}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all border',
            showSignals
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : 'bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-slate-300 hover:bg-slate-700/30'
          )}
        >
          <Zap className="w-3 h-3" />
          <span className="hidden xl:inline">Signals</span>
        </button>
      </div>

      {/* Active indicator chips */}
      <ActiveIndicatorChips active={activeIndicators} onRemove={handleIndicatorToggle} />

      {/* Pattern badges */}
      <PatternBadges patterns={patterns} />

      {/* Main chart */}
      <div className="rounded-lg border border-slate-800/60 bg-[#0a0e1a] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/60">
          <span className="text-[10px] font-semibold text-blue-400">NSE Chart</span>
          <span className="text-[9px] text-slate-600">{symbol || ''} — {CHART_TYPES.find(c => c.id === chartType)?.label || 'Candlestick'}{activeLabels ? ' + ' + activeLabels : ''}</span>
          {activeTool !== 'crosshair' && <span className="text-[9px] text-amber-500">Drawing: {DRAW_TOOLS.find(t => t.id === activeTool)?.label}</span>}
          <span className="text-[9px] text-slate-700 ml-auto">Lightweight Charts v5</span>
        </div>
        {symbol && (
          <CandlestickChartDynamic
            symbol={symbol}
            interval={tfConfig.apiInterval}
            height={520}
            chartType={chartType}
            activeIndicators={activeIndicators}
            activeTool={activeTool}
            onPatternsDetected={handlePatternsDetected}
            liveTick={liveTick}
            signalData={showSignals ? visibleData : undefined}
          />
        )}
      </div>

      {/* Signal markers (Recharts — supplementary) */}
      {signalsLoading ? (
        <div className="h-[200px] bg-slate-900/50 rounded-lg animate-pulse flex items-center justify-center text-slate-600 text-sm">Loading signals...</div>
      ) : visibleData.length > 0 ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strategy Signal Markers</span>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={visibleData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tickFormatter={d => { const dt = new Date(d); return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} minTickGap={40} />
                <YAxis domain={[priceMin, priceMax]} tickFormatter={v => fPriceAxis(v)} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} width={70} tickCount={6} />
                <RTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={0.05} isAnimationActive={false} />
                <Line type="monotone" dataKey="supertrend" stroke="#f59e0b" strokeWidth={1.2} dot={false} strokeDasharray="4 2" isAnimationActive={false} connectNulls />
                {visibleData.map((d, i) => {
                  if (!d.signal || d.signal === 'HOLD') return null;
                  const isBuy = d.signal === 'STRONG_BUY' || d.signal === 'BUY';
                  return <ReferenceDot key={i} x={d.date} y={d.close} r={d.signal.startsWith('STRONG') ? 5 : 3.5} fill={isBuy ? '#10b981' : '#ef4444'} stroke={isBuy ? '#065f46' : '#7f1d1d'} strokeWidth={1} />;
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* RSI + MACD row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">RSI Gauge</div>
          <div className="flex justify-center">
            {latestSignal ? <RSIGauge value={latestSignal.rsi} /> : <div className="text-slate-600 text-xs">--</div>}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 md:col-span-2">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">MACD ({strategyParams?.macdFast ?? 12}, {strategyParams?.macdSlow ?? 26}, {strategyParams?.macdSignal ?? 9})</div>
          {signalsLoading ? (
            <div className="h-[100px] bg-slate-900/50 rounded-lg animate-pulse" />
          ) : chartData.length > 0 ? (
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.slice(-30)} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <XAxis dataKey="date" tick={false} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                  <YAxis domain={['auto', 'auto']} tick={false} tickLine={false} axisLine={false} />
                  <Bar dataKey="macdHistogram" isAnimationActive={false}>
                    {chartData.slice(-30).map((d, i) => (
                      <Cell key={i} fill={(d.macdHistogram || 0) >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.7} />
                    ))}
                  </Bar>
                  <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="macdSignal" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="2 1" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
