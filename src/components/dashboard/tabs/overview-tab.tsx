'use client';

import { TrendingUp, Activity, PieChart, LineChart as LineChartIcon, Target, Users, Info, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { fINR, fDate, pctVal, SIG_BG } from '@/lib/formatters';
import { SectionCard, MetricRow, PBar, OwnershipDonut } from '../kpi-card';
import { SignalGauge } from '../signal-gauge';
import type { LiveQuote, StrategySignal } from '@/lib/types';

export function OverviewTab({
  q,
  latestSignal,
  perf,
  t,
  own,
  fin,
}: {
  q: LiveQuote;
  latestSignal: StrategySignal | null;
  perf: Record<string, number | null>;
  t: Record<string, any>;
  own: Record<string, number | null>;
  fin: Record<string, number | null>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Signal Gauge — prominent top card */}
        {latestSignal && (
          <SectionCard
            title="Composite Signal Score"
            icon={Gauge}
            badge={
              <Badge className={cn('text-[10px] font-bold border', SIG_BG[latestSignal.signal])}>
                {latestSignal.signal.replace('_', ' ')}
              </Badge>
            }
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Gauge */}
              <div className="shrink-0">
                <SignalGauge signal={latestSignal} />
              </div>

              {/* Indicator breakdown */}
              <div className="flex-1 w-full">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">RSI ({latestSignal.rsi?.toFixed(1)})</div>
                    <div className={cn('text-xl font-bold font-mono', (latestSignal.rsi || 50) > 70 ? 'text-red-400' : (latestSignal.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>
                      {latestSignal.rsi?.toFixed(1)}
                    </div>
                    <Progress value={latestSignal.rsi || 50} className="mt-2 h-1.5" />
                    <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
                      <span>0</span><span className="text-red-400/60">70</span><span>100</span>
                    </div>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">Supertrend</div>
                    <div className={cn('text-xl font-bold', latestSignal.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>
                      {latestSignal.supertrendDir === 1 ? '↑ BULLISH' : '↓ BEARISH'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 font-mono">ST: {fINR(latestSignal.supertrend)}</div>
                  </div>
                  <div className="text-center p-2.5 rounded-lg bg-slate-800/30 border border-slate-800/50">
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">MACD</div>
                    <div className={cn('text-xl font-bold', (latestSignal.macd || 0) > (latestSignal.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>
                      {(latestSignal.macd || 0) > (latestSignal.macdSignal || 0) ? '↑ BULLISH' : '↓ BEARISH'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2 font-mono">M: {(latestSignal.macd || 0).toFixed(2)} S: {(latestSignal.macdSignal || 0).toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-3 p-2.5 rounded-lg bg-slate-800/20 border border-slate-800/50">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3 h-3 shrink-0" />
                    <span className="truncate">{latestSignal.reason}</span>
                    <span className="text-slate-600 ml-auto shrink-0">As of {fDate(latestSignal.date)}</span>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        )}
        <SectionCard title="Price Performance" icon={TrendingUp}>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
            {(['1W', '1M', '3M', '6M', '1Y', 'YTD'] as const).map(p => {
              const val = perf[p] ?? null;
              const up = val !== null && val >= 0;
              return (
                <div key={p} className={cn('rounded-xl border p-3 text-center transition-colors', up ? 'bg-emerald-500/5 border-emerald-500/20' : val !== null ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800')}>
                  <div className="text-[10px] text-slate-500 font-semibold">{p}</div>
                  <div className="text-base font-bold font-mono mt-1">{pctVal(val)}</div>
                </div>
              );
            })}
          </div>
        </SectionCard>
        <SectionCard title="52 Week Range" icon={Activity}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400 w-20 text-right">{q.low52w.toLocaleString('en-IN')}</span>
            <div className="flex-1 relative h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 rounded-full"
                style={{ width: (q.high52w > q.low52w ? ((q.price - q.low52w) / (q.high52w - q.low52w)) * 100 : 50) + '%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                style={{ left: 'calc(' + (q.high52w > q.low52w ? ((q.price - q.low52w) / (q.high52w - q.low52w)) * 100 : 50) + '% - 6px)' }}
              />
            </div>
            <span className="text-xs font-mono text-slate-400 w-20">{q.high52w.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between mt-2.5">
            <span className="text-[10px] text-slate-500">From Low: <span className="text-emerald-400 font-mono font-semibold">{q.percentFrom52wLow.toFixed(1)}%</span></span>
            <span className="text-[10px] text-slate-500">From High: <span className="text-red-400 font-mono font-semibold">{q.percentFrom52wHigh.toFixed(1)}%</span></span>
          </div>
        </SectionCard>
        <SectionCard title="Moving Averages" icon={LineChartIcon}>
          <div className="space-y-3">
            <PBar
              value={q.price}
              min={q.fiftyDMA ? q.fiftyDMA * 0.95 : q.price * 0.9}
              max={q.fiftyDMA ? q.fiftyDMA * 1.05 : q.price * 1.1}
              label="50 DMA"
              color={q.percentAbove50DMA !== null && q.percentAbove50DMA >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
            />
            <PBar
              value={q.price}
              min={q.twoHundredDMA ? q.twoHundredDMA * 0.95 : q.price * 0.9}
              max={q.twoHundredDMA ? q.twoHundredDMA * 1.05 : q.price * 1.1}
              label="200 DMA"
              color={q.percentAbove200DMA !== null && q.percentAbove200DMA >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
            />
            <div className="grid grid-cols-2 gap-2 mt-1">
              {q.fiftyDMA && (
                <div className="rounded-lg bg-slate-800/30 p-2 text-xs">
                  <span className="text-slate-500">50 DMA</span>
                  <div className="font-mono text-slate-200">{fINR(q.fiftyDMA)}</div>
                  <div className={cn('font-mono font-semibold', (q.percentAbove50DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {(q.percentAbove50DMA || 0) >= 0 ? '+' : ''}{q.percentAbove50DMA?.toFixed(1)}%
                  </div>
                </div>
              )}
              {q.twoHundredDMA && (
                <div className="rounded-lg bg-slate-800/30 p-2 text-xs">
                  <span className="text-slate-500">200 DMA</span>
                  <div className="font-mono text-slate-200">{fINR(q.twoHundredDMA)}</div>
                  <div className={cn('font-mono font-semibold', (q.percentAbove200DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {(q.percentAbove200DMA || 0) >= 0 ? '+' : ''}{q.percentAbove200DMA?.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
      <div className="space-y-4">
        <SectionCard title="Key Ratios" icon={PieChart}>
          <MetricRow label="P/E Ratio" value={q.pe?.toFixed(1) || '--'} highlight />
          <MetricRow label="Forward P/E" value={q.forwardPE?.toFixed(1) || '--'} />
          <MetricRow label="P/B Ratio" value={q.pb?.toFixed(2) || '--'} />
          <MetricRow label="EPS (TTM)" value={q.eps ? fINR(q.eps) : '--'} highlight />
          <MetricRow label="Book Value" value={q.bookValue ? fINR(q.bookValue) : '--'} />
          <MetricRow label="Div Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} />
          <MetricRow label="Payout Ratio" value={q.payoutRatio ? (q.payoutRatio * 100).toFixed(0) + '%' : '--'} />
          <MetricRow label="Beta" value={q.beta?.toFixed(2) || '--'} />
        </SectionCard>
        <SectionCard title="Profitability" icon={TrendingUp}>
          <MetricRow label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : '--'} highlight />
          <MetricRow label="ROA" value={q.roa ? q.roa.toFixed(1) + '%' : '--'} />
          <MetricRow label="Net Margin" value={q.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'} />
          <MetricRow label="OPM" value={q.operatingMargins ? q.operatingMargins.toFixed(1) + '%' : '--'} />
          <MetricRow label="Rev Growth" value={pctVal(q.revenueGrowth)} highlight />
          <MetricRow label="Current Ratio" value={q.currentRatio?.toFixed(2) || '--'} />
          <MetricRow label="D/E Ratio" value={q.debtToEquity?.toFixed(2) || '--'} />
        </SectionCard>
        <SectionCard title="Shareholding Pattern" icon={Users}>
          <OwnershipDonut data={own} />
        </SectionCard>
        {q.targetMean && (
          <SectionCard
            title="Analyst Consensus"
            icon={Target}
            badge={q.recommendation && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[9px] uppercase font-bold',
                  q.recommendation === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : q.recommendation === 'sell' ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                )}
              >
                {q.recommendation}
              </Badge>
            )}
          >
            <MetricRow label="Target Mean" value={fINR(q.targetMean)} highlight />
            <MetricRow label="Target Median" value={q.targetMedian ? fINR(q.targetMedian) : '--'} />
            <MetricRow label="Target High" value={q.targetHigh ? fINR(q.targetHigh) : '--'} />
            <MetricRow label="Target Low" value={q.targetLow ? fINR(q.targetLow) : '--'} />
            {q.analysts && <div className="mt-2 text-[10px] text-slate-500">{q.analysts} analysts covering</div>}
            <div className="mt-1.5 text-xs">
              <span className="text-slate-500">Upside from CMP: </span>
              <span className={cn('font-mono font-bold', ((q.targetMean - q.price) / q.price * 100) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {((q.targetMean - q.price) / q.price * 100) >= 0 ? '+' : ''}{((q.targetMean - q.price) / q.price * 100).toFixed(1)}%
              </span>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}