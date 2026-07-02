'use client';

import React from 'react';
import { Activity, Target, Gauge, TrendingUp, BarChart3, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fINR, SIG_BG } from '@/lib/formatters';
import { SectionCard, MetricRow, PBar } from '../kpi-card';
import { VolumeProfile } from '../volume-profile';
import type { LiveQuote } from '@/lib/types';

/* ==============================
   RSI Zone Visual Card
   ============================== */
function RSIZoneCard({ rsi }: { rsi: number | null }) {
  const value = rsi ?? 50;
  // Zones: 0-30 oversold, 30-70 neutral, 70-100 overbought
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">RSI (14)</span>
        <span className={cn(
          'text-2xl font-black font-mono',
          value > 70 ? 'text-red-400' : value < 30 ? 'text-emerald-400' : 'text-amber-400'
        )}>
          {value.toFixed(1)}
        </span>
      </div>

      {/* Vertical zone bar */}
      <div className="flex items-center gap-3">
        {/* Labels */}
        <div className="flex flex-col justify-between h-40 text-[8px] text-slate-500 w-6">
          <span>100</span>
          <span>70</span>
          <span>50</span>
          <span>30</span>
          <span>0</span>
        </div>

        {/* Bar with zones */}
        <div className="relative w-10 h-40 rounded-lg overflow-hidden border border-slate-800/60 bg-slate-900">
          {/* Overbought zone (top 30%) */}
          <div className="absolute top-0 left-0 right-0 h-[30%] bg-red-500/15" />
          {/* Neutral zone (middle 40%) */}
          <div className="absolute top-[30%] left-0 right-0 h-[40%] bg-amber-500/8" />
          {/* Oversold zone (bottom 30%) */}
          <div className="absolute top-[70%] left-0 right-0 h-[30%] bg-emerald-500/15" />

          {/* Zone labels */}
          <div className="absolute top-[12%] left-1 text-[7px] text-red-400/60 font-semibold">OB</div>
          <div className="absolute top-[45%] left-1 text-[7px] text-amber-400/60 font-semibold">N</div>
          <div className="absolute top-[82%] left-1 text-[7px] text-emerald-400/60 font-semibold">OS</div>

          {/* Threshold lines */}
          <div className="absolute top-[30%] left-0 right-0 border-t border-red-500/30 border-dashed" />
          <div className="absolute top-[50%] left-0 right-0 border-t border-slate-700/50" />
          <div className="absolute top-[70%] left-0 right-0 border-t border-emerald-500/30 border-dashed" />

          {/* RSI marker */}
          <div
            className="absolute left-0 right-0 h-[3px] transition-all"
            style={{
              bottom: `${pct}%`,
              backgroundColor: value > 70 ? '#ef4444' : value < 30 ? '#22c55e' : '#f59e0b',
              boxShadow: `0 0 8px ${value > 70 ? 'rgba(239,68,68,0.6)' : value < 30 ? 'rgba(34,197,94,0.6)' : 'rgba(245,158,11,0.6)'}`,
            }}
          />
          {/* Marker dot */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white/80 transition-all"
            style={{
              bottom: `calc(${pct}% - 8px)`,
              backgroundColor: value > 70 ? '#ef4444' : value < 30 ? '#22c55e' : '#f59e0b',
            }}
          />
        </div>

        {/* Interpretation label */}
        <div className="flex flex-col justify-center">
          <div className={cn(
            'px-2 py-1 rounded-md text-[10px] font-bold uppercase',
            value > 70 ? 'bg-red-500/15 text-red-400 border border-red-500/20'
              : value < 30 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
          )}>
            {value > 70 ? 'Overbought' : value < 30 ? 'Oversold' : 'Neutral'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==============================
   Supertrend Status Card
   ============================== */
function SupertrendCard({ dir, value }: { dir: number | null; value: number | null }) {
  const isBullish = dir === 1;
  return (
    <div className="flex flex-col items-center justify-center py-3 space-y-3">
      {/* Large arrow indicator */}
      <div className={cn(
        'flex items-center gap-2 px-5 py-3 rounded-xl border-2 transition-colors',
        isBullish
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-red-500/10 border-red-500/30'
      )}>
        <div className={cn(
          'text-3xl font-black tracking-wide',
          isBullish ? 'text-emerald-400' : 'text-red-400'
        )}>
          {isBullish ? '↑' : '↓'}
        </div>
        <div>
          <div className={cn(
            'text-lg font-black uppercase tracking-widest',
            isBullish ? 'text-emerald-400' : 'text-red-400'
          )}>
            {isBullish ? 'BULLISH' : 'BEARISH'}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {value ? `ST: ${fINR(value)}` : '--'}
          </div>
        </div>
      </div>

      {/* Signal context */}
      <div className="text-[10px] text-slate-500 text-center">
        {isBullish
          ? 'Price trading above Supertrend line — uptrend intact'
          : 'Price trading below Supertrend line — downtrend active'}
      </div>
    </div>
  );
}

/* ==============================
   MACD Momentum Card
   ============================== */
function MACDMomentumCard({
  macd,
  signal,
  histogram,
}: {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
}) {
  const m = macd ?? 0;
  const s = signal ?? 0;
  const h = histogram ?? 0;

  // Create visual histogram bars: show the histogram as main, and context bars
  // Use the MACD/Signal spread as context
  const maxVal = Math.max(Math.abs(m), Math.abs(s), Math.abs(h), 1);
  const mBar = (m / maxVal) * 100;
  const sBar = (s / maxVal) * 100;
  const hBar = (Math.abs(h) / maxVal) * 100;
  const hPositive = h >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">MACD Momentum</span>
        <Badge className={cn(
          'text-[9px] font-bold border',
          hPositive
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/20 border-red-500/30 text-red-400'
        )}>
          {hPositive ? 'BULLISH' : 'BEARISH'}
        </Badge>
      </div>

      {/* Visual bars */}
      <div className="space-y-2">
        {/* MACD line bar */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 w-10">MACD</span>
          <div className="flex-1 h-3 bg-slate-800/80 rounded-sm overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700" />
            <div
              className={cn('absolute top-0 bottom-0 rounded-sm', m >= 0 ? 'left-1/2' : 'right-1/2')}
              style={{
                width: `${Math.min(Math.abs(mBar), 50)}%`,
                backgroundColor: m >= 0 ? '#22c55e' : '#ef4444',
                opacity: 0.7,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300 w-14 text-right">{m.toFixed(2)}</span>
        </div>

        {/* Signal line bar */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 w-10">Signal</span>
          <div className="flex-1 h-3 bg-slate-800/80 rounded-sm overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700" />
            <div
              className={cn('absolute top-0 bottom-0 rounded-sm', s >= 0 ? 'left-1/2' : 'right-1/2')}
              style={{
                width: `${Math.min(Math.abs(sBar), 50)}%`,
                backgroundColor: '#f59e0b',
                opacity: 0.7,
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-300 w-14 text-right">{s.toFixed(2)}</span>
        </div>

        {/* Histogram bars */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-slate-500 w-10">Hist</span>
          <div className="flex-1 h-6 bg-slate-800/80 rounded-sm overflow-hidden relative flex items-center">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-700" />
            {/* Show multiple mini bars for visual "histogram" effect */}
            {[0.4, 0.6, 0.8, 0.9, 1.0].map((scale, i) => (
              <div
                key={i}
                className={cn('absolute top-0 bottom-0 rounded-[1px]', h >= 0 ? 'left-1/2' : 'right-1/2')}
                style={{
                  width: `${Math.min(hBar * scale, 50)}%`,
                  backgroundColor: h >= 0 ? '#22c55e' : '#ef4444',
                  opacity: 0.15 + scale * 0.25,
                  height: `${40 + i * 15}%`,
                  top: `${30 - i * 7.5}%`,
                }}
              />
            ))}
            {/* Main histogram bar */}
            <div
              className={cn('absolute rounded-sm z-10', h >= 0 ? 'left-1/2' : 'right-1/2')}
              style={{
                width: `${Math.min(hBar, 50)}%`,
                height: '70%',
                top: '15%',
                backgroundColor: h >= 0 ? '#22c55e' : '#ef4444',
                boxShadow: `0 0 10px ${h >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            />
          </div>
          <span className={cn('text-[10px] font-mono w-14 text-right font-bold', h >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {h >= 0 ? '+' : ''}{h.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Spread info */}
      <div className="text-[9px] text-slate-500 text-center font-mono">
        Spread: {h >= 0 ? '+' : ''}{(m - s).toFixed(2)} &middot; {' '}
        {h >= 0 ? 'MACD above signal — positive momentum' : 'MACD below signal — negative momentum'}
      </div>
    </div>
  );
}

/* ==============================
   Support/Resistance Range Chart
   ============================== */
function SRRangeChart({
  price,
  support1,
  support2,
  resistance1,
  resistance2,
}: {
  price: number;
  support1?: number | null;
  support2?: number | null;
  resistance1?: number | null;
  resistance2?: number | null;
}) {
  const allLevels = [support2, support1, price, resistance1, resistance2].filter((v): v is number => v != null);
  if (allLevels.length < 2) return <div className="text-xs text-slate-500 text-center py-4">Insufficient data for range chart</div>;

  const min = Math.min(...allLevels);
  const max = Math.max(...allLevels);
  const range = max - min || 1;

  const toPct = (v: number) => ((v - min) / range) * 100;

  const levels = [
    { label: 'R2', value: resistance2, color: 'text-red-400', bg: 'bg-red-500', borderColor: 'border-red-500/40' },
    { label: 'R1', value: resistance1, color: 'text-orange-400', bg: 'bg-orange-500', borderColor: 'border-orange-500/40' },
    { label: 'Price', value: price, color: 'text-white', bg: 'bg-white', borderColor: 'border-white/60' },
    { label: 'S1', value: support1, color: 'text-emerald-400', bg: 'bg-emerald-500', borderColor: 'border-emerald-500/40' },
    { label: 'S2', value: support2, color: 'text-green-400', bg: 'bg-green-500', borderColor: 'border-green-500/40' },
  ];

  return (
    <div className="space-y-2">
      {/* Horizontal range chart */}
      <div className="relative h-28 bg-slate-800/50 rounded-lg border border-slate-800/60 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-amber-500/5 to-red-500/5" />

        {/* Zone fills */}
        {support2 && resistance2 && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/8"
            style={{ left: 0, width: `${toPct(support1 ?? min)}%` }}
          />
        )}

        {/* Level lines and labels */}
        {levels.map(level => {
          if (level.value == null) return null;
          const pct = toPct(level.value);
          return (
            <div
              key={level.label}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${Math.max(5, Math.min(90, pct))}%` }}
            >
              <div className={cn('w-full h-px', level.label === 'Price' ? 'bg-white/40' : 'bg-slate-700/50')} />
              {/* Label dot */}
              <div className={cn(
                'absolute left-2 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border',
                level.borderColor,
                level.label === 'Price' && 'bg-slate-900/90'
              )}>
                <div className={cn('w-1.5 h-1.5 rounded-full', level.bg)} />
                <span className={level.color}>{level.label}</span>
                <span className="text-slate-400">{level.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distance labels */}
      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
        {resistance1 && (
          <span>
            <span className="text-orange-400">R1</span>:{' '}
            {price < resistance1
              ? <span className="text-red-400">{((resistance1 - price) / price * 100).toFixed(1)}% above</span>
              : <span className="text-emerald-400">{((price - resistance1) / price * 100).toFixed(1)}% above</span>}
          </span>
        )}
        {support1 && (
          <span>
            <span className="text-emerald-400">S1</span>:{' '}
            {price > support1
              ? <span className="text-emerald-400">{((price - support1) / price * 100).toFixed(1)}% below</span>
              : <span className="text-red-400">{((support1 - price) / price * 100).toFixed(1)}% below</span>}
          </span>
        )}
      </div>
    </div>
  );
}

/* ==============================
   Main Technicals Tab
   ============================== */
export function TechnicalsTab({
  q,
  t,
}: {
  q: LiveQuote;
  t: Record<string, any>;
  stockData?: { date: string; close: number; volume: number; high: number; low: number }[];
}) {
  return (
    <div className="space-y-4">
      {/* Visual Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSI Zone */}
        <SectionCard title="RSI Zone" icon={Gauge}>
          <RSIZoneCard rsi={t.rsi} />
        </SectionCard>

        {/* Supertrend Status */}
        <SectionCard title="Supertrend" icon={TrendingUp}>
          <SupertrendCard dir={t.supertrendDir} value={t.supertrend} />
        </SectionCard>

        {/* MACD Momentum */}
        <SectionCard title="MACD" icon={BarChart3}>
          <MACDMomentumCard
            macd={t.macd}
            signal={t.macdSignal}
            histogram={t.macdHistogram}
          />
        </SectionCard>

        {/* Support/Resistance */}
        <SectionCard title="Support / Resistance" icon={Target}>
          <SRRangeChart
            price={q.price}
            support1={t.support1}
            support2={t.support2}
            resistance1={t.resistance1}
            resistance2={t.resistance2}
          />
        </SectionCard>
      </div>

      {/* Detailed metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionCard title="Indicator Summary" icon={Activity}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Overall Signal</span>
              <Badge className={cn('text-[10px] font-bold border', SIG_BG[t.signal || 'HOLD'])}>
                {(t.signal || 'HOLD') as string}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Supertrend</span>
              <span className={cn('text-xs font-mono font-semibold', t.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>
                {t.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">RSI (14)</span>
              <span className={cn('text-xs font-mono font-bold', (t.rsi || 50) > 70 ? 'text-red-400' : (t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>
                {t.rsi?.toFixed(1) || '--'}
              </span>
            </div>
            <PBar
              value={t.rsi || 50}
              min={0}
              max={100}
              label="RSI"
              color={(t.rsi || 50) > 70 ? 'bg-red-500' : (t.rsi || 50) < 30 ? 'bg-emerald-500' : 'bg-amber-500'}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">MACD</span>
              <span className={cn('text-xs font-mono font-semibold', (t.macd || 0) > (t.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>
                {(t.macd || 0) > (t.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono space-x-1">
              <span>MACD: {t.macd?.toFixed(2) || '--'}</span>
              <span>Signal: {t.macdSignal?.toFixed(2) || '--'}</span>
              <span>Hist: {t.macdHistogram?.toFixed(2) || '--'}</span>
            </div>
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
            <Separator className="bg-slate-700/50" />
            <div className="flex justify-between text-xs"><span className="text-slate-300 font-semibold">Pivot</span><span className="font-mono text-white font-bold">{t.pivot ? fINR(t.pivot) : '--'}</span></div>
            <Separator className="bg-slate-700/50" />
            <div className="flex justify-between text-xs"><span className="text-emerald-400">S1</span><span className="font-mono text-slate-200">{t.pivotS1 ? fINR(t.pivotS1) : '--'}</span></div>
            <div className="flex justify-between text-xs"><span className="text-green-400">S2</span><span className="font-mono text-slate-200">{t.pivotS2 ? fINR(t.pivotS2) : '--'}</span></div>
          </div>
          <Separator className="my-2 bg-slate-800" />
          <MetricRow label="SMA 20" value={t.sma20 ? fINR(t.sma20) : '--'} />
          <MetricRow label="SMA 50" value={t.sma50 ? fINR(t.sma50) : '--'} />
          <MetricRow label="Volatility (20D)" value={t.volatility20d ? t.volatility20d.toFixed(1) + '%' : '--'} />
        </SectionCard>
      </div>

      {/* Volume Profile */}
      <SectionCard title="Volume Profile" icon={BarChart2}>
        <VolumeProfile data={stockData || []} currentPrice={q.price} />
      </SectionCard>
    </div>
  );
}