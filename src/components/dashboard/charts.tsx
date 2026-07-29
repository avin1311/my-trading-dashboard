'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceDot, Bar, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

// Dynamic import — lightweight-charts only works in browser
const CandlestickChart = dynamic(() => import('./candlestick-chart'), {
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

function fINR(v: number): string {
  if (v >= 1e12) return '\u20B9' + (v / 1e12).toFixed(2) + ' T';
  if (v >= 1e7) return '\u20B9' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '\u20B9' + (v / 1e5).toFixed(2) + ' L';
  return '\u20B9' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ChartTooltipContent({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl text-xs">
      <div className="font-semibold text-slate-200 mb-1.5">{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
        <span>O: {fINR(d.open)}</span><span>H: {fINR(d.high)}</span>
        <span>L: {fINR(d.low)}</span><span>C: {fINR(d.close)}</span>
        {d.supertrend !== null && <span className="col-span-2">ST: <span className={d.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400'}>{fINR(d.supertrend)}</span></span>}
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
        <text x="40" y="28" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{Math.round(value)}</text>
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

// ==================== MAIN EXPORT ====================
export default function StrategySection({
  chartData, visibleData, latestSignal, signalsLoading, symbol,
}: {
  chartData: ChartDataPoint[];
  visibleData: ChartDataPoint[];
  latestSignal: StrategySignal | null;
  signalsLoading: boolean;
  symbol?: string;
}) {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1D');
  const tfConfig = TIMEFRAMES.find(t => t.key === timeframe) || TIMEFRAMES[5];

  const priceMin = useMemo(() => {
    if (visibleData.length === 0) return 0;
    return Math.min(...visibleData.map(d => d.low)) * 0.998;
  }, [visibleData]);
  const priceMax = useMemo(() => {
    if (visibleData.length === 0) return 100;
    return Math.max(...visibleData.map(d => d.high)) * 1.002;
  }, [visibleData]);

  // Build supertrend overlay data for the candlestick chart (daily only)
  const stOverlay = useMemo(() => {
    if (timeframe !== '1D') return undefined;
    return chartData.map(d => ({
      date: d.date,
      supertrend: d.supertrend,
      supertrendDir: d.supertrendDir,
    }));
  }, [chartData, timeframe]);

  return (
    <div className="space-y-3">
      {/* Timeframe toggle */}
      <TimeframeToggle timeframe={timeframe} setTimeframe={setTimeframe} />

      {/* Real candlestick chart — powered by TradingView's Lightweight Charts */}
      <div className="rounded-lg border border-slate-800/60 bg-[#0a0e1a] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-800/60">
          <span className="text-[10px] font-semibold text-blue-400">NSE Chart</span>
          <span className="text-[9px] text-slate-600">{symbol || ''} — Candlestick + Volume + Supertrend</span>
          <span className="text-[9px] text-slate-700 ml-auto">Powered by Lightweight Charts</span>
        </div>
        {symbol && (
          <CandlestickChart
            symbol={symbol}
            interval={tfConfig.apiInterval}
            height={520}
            supertrendData={stOverlay}
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
                <XAxis dataKey="date" tickFormatter={d => { const dt = new Date(d); return dt.getDate() + '/' + (dt.getMonth() + 1); }} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
                <YAxis domain={[priceMin, priceMax]} tickFormatter={v => fINR(v)} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#1e293b' }} width={70} />
                <RTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={1.5} fillOpacity={0.05} isAnimationActive={false} />
                <Line type="monotone" dataKey="supertrend" stroke="#f59e0b" strokeWidth={1.2} dot={false} strokeDasharray="4 2" isAnimationActive={false} connectNulls />
                {visibleData.map((d, i) => {
                  if (!d.signal || d.signal === 'HOLD') return null;
                  const isBuy = d.signal === 'STRONG_BUY' || d.signal === 'BUY';
                  return <ReferenceDot key={i} x={d.date} y={d.close} r={d.signal.startsWith('STRONG') ? 5 : 3.5} fill={isBuy ? '#10b981' : '#ef4444'} stroke={isBuy ? '#065f46' : '#7f1d1d'} strokeWidth={1} isAnimationActive={false} />;
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
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">MACD (12, 26, 9)</div>
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
