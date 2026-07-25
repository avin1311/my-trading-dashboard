'use client';

import React from 'react';
import { Globe, PieChart, BarChart3, TrendingUp, Percent, BarChart2, Shield, CheckCircle2, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fINR, fNum, SIG_BG } from '@/lib/formatters';
import { KPICard } from './kpi-card';
import type { LiveQuote, StrategySignal } from '@/lib/types';

/** Colored dot indicator for the Signal card */
function SignalDot({ signal }: { signal: StrategySignal | null }) {
  const color = signal?.signal === 'STRONG_BUY' || signal?.signal === 'BUY'
    ? 'bg-emerald-400'
    : signal?.signal === 'SELL' || signal?.signal === 'STRONG_SELL'
      ? 'bg-red-400'
      : 'bg-amber-400';
  return (
    <div className="flex items-center gap-1">
      <div className={cn('w-2 h-2 rounded-full', color)} style={{ boxShadow: `0 0 6px ${color === 'bg-emerald-400' ? '#22c55e' : color === 'bg-red-400' ? '#ef4444' : '#f59e0b'}` }} />
      <span className="text-[8px] text-slate-500 font-mono">
        {signal?.signal === 'STRONG_BUY' || signal?.signal === 'BUY' ? 'BULL' : signal?.signal === 'SELL' || signal?.signal === 'STRONG_SELL' ? 'BEAR' : 'NEUT'}
      </span>
    </div>
  );
}

/** Small volume bar comparing current vs average */
function VolumeBar({ volume, avgVolume }: { volume: number; avgVolume: number }) {
  const ratio = avgVolume > 0 ? Math.min(volume / avgVolume, 2) : 0;
  const pct = Math.min(ratio / 2 * 100, 100);
  const color = ratio > 1.5 ? 'bg-emerald-500' : ratio < 0.5 ? 'bg-red-500' : 'bg-amber-500';
  return (
    <div className="flex items-end gap-[2px] h-4">
      {/* Average volume baseline bar */}
      <div className="w-1.5 h-2.5 bg-slate-700 rounded-[1px]" />
      {/* Current volume bar */}
      <div className={cn('w-1.5 rounded-[1px] transition-all', color)} style={{ height: `${Math.max(pct, 15)}%` }} />
      <div className="w-1.5 h-1.5 bg-slate-700 rounded-[1px] opacity-40" />
      <div className="w-1.5 h-3 bg-slate-700 rounded-[1px] opacity-25" />
    </div>
  );
}

/** Small trend arrow for numeric metrics */
function TrendArrow({ value, goodUp = true }: { value: number | null; goodUp?: boolean }) {
  if (value === null) return null;
  const isGood = goodUp ? value > 0 : value < 0;
  const color = value > 0.5 ? (isGood ? 'text-emerald-500' : 'text-red-500') : value < -0.5 ? (isGood ? 'text-red-500' : 'text-emerald-500') : 'text-slate-600';
  return (
    <div className={cn('flex items-center', color)}>
      {value > 0.5 ? <ArrowUpRight className="w-3 h-3" /> : value < -0.5 ? <ArrowDownRight className="w-3 h-3" /> : null}
    </div>
  );
}

export function KPIStrip({
  q,
  latestSignal,
}: {
  q: LiveQuote | null;
  latestSignal: StrategySignal | null;
}) {
  if (!q) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5 mb-5">
      <KPICard
        label="Market Cap"
        value={q.marketCap ? fINR(q.marketCap) : '--'}
        icon={Globe}
        trend={q.changePct >= 0 ? 'up' : 'down'}
        indicator={<TrendArrow value={q.changePct} />}
      />
      <KPICard
        label="P/E Ratio"
        value={q.pe?.toFixed(1) || '--'}
        sub={q.forwardPE ? 'Fwd: ' + q.forwardPE.toFixed(1) : undefined}
        icon={PieChart}
        indicator={<PEIndicator pe={q.pe} />}
      />
      <KPICard
        label="P/B Ratio"
        value={q.pb?.toFixed(2) || '--'}
        sub={q.bookValue ? 'BV: ' + fINR(q.bookValue) : undefined}
        icon={BarChart3}
        indicator={<TrendArrow value={q.changePct} />}
      />
      <KPICard
        label="ROE"
        value={q.roe ? q.roe.toFixed(1) + '%' : '--'}
        sub={q.roa ? 'ROA: ' + q.roa.toFixed(1) + '%' : undefined}
        icon={TrendingUp}
        trend={q.roe && q.roe > 15 ? 'up' : q.roe && q.roe < 8 ? 'down' : undefined}
        indicator={<ROEIndicator roe={q.roe} />}
      />
      <KPICard
        label="Div Yield"
        value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'}
        sub={q.eps ? 'EPS: ' + q.eps.toFixed(1) : undefined}
        icon={Percent}
        indicator={<DivYieldIndicator yield={q.dividendYield} />}
      />
      <KPICard
        label="Volume"
        value={fNum(q.volume)}
        sub={q.avgVolume ? 'Avg: ' + fNum(q.avgVolume) : undefined}
        icon={BarChart2}
        trend={q.volumeRatio > 1.5 ? 'up' : q.volumeRatio < 0.5 ? 'down' : undefined}
        indicator={<VolumeBar volume={q.volume} avgVolume={q.avgVolume} />}
      />
      <KPICard
        label="Beta"
        value={q.beta?.toFixed(2) || '--'}
        sub={q.debtToEquity ? 'D/E: ' + q.debtToEquity.toFixed(2) : undefined}
        icon={Shield}
        indicator={<BetaIndicator beta={q.beta} />}
      />
      <KPICard
        label="Signal"
        value={latestSignal ? latestSignal.signal.replace('_', ' ') : 'HOLD'}
        icon={latestSignal?.signal?.includes('BUY') ? CheckCircle2 : latestSignal?.signal?.includes('SELL') ? XCircle : AlertTriangle}
        accent={SIG_BG[latestSignal?.signal || 'HOLD'] || SIG_BG.HOLD}
        indicator={<SignalDot signal={latestSignal} />}
      />
    </div>
  );
}

/** Small colored bar for PE: green if <20, amber 20-30, red >30 */
function PEIndicator({ pe }: { pe: number | null }) {
  if (pe === null) return null;
  const color = pe < 20 ? '#22c55e' : pe < 30 ? '#f59e0b' : '#ef4444';
  const width = Math.min(pe / 50 * 100, 100);
  return (
    <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

/** Small bar for ROE: green >20%, amber 10-20%, red <10% */
function ROEIndicator({ roe }: { roe: number | null }) {
  if (roe === null) return null;
  const color = roe > 20 ? '#22c55e' : roe > 10 ? '#f59e0b' : '#ef4444';
  const width = Math.min(roe / 40 * 100, 100);
  return (
    <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}

/** Small dot for dividend yield */
function DivYieldIndicator({ yield: dy }: { yield: number | null }) {
  if (dy === null) return null;
  const color = dy > 2 ? '#22c55e' : dy > 0.5 ? '#f59e0b' : '#64748b';
  return <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />;
}

/** Small bar for beta: green if 0.8-1.2 (low vol), red if >1.5 or <0.5 */
function BetaIndicator({ beta }: { beta: number | null }) {
  if (beta === null) return null;
  const color = beta >= 0.8 && beta <= 1.2 ? '#22c55e' : beta > 1.5 || beta < 0.5 ? '#ef4444' : '#f59e0b';
  const width = Math.min(beta / 2.5 * 100, 100);
  return (
    <div className="w-8 h-1 bg-slate-800 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
    </div>
  );
}