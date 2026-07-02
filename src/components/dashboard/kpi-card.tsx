'use client';

import React from 'react';
import { Save, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { fINR, fNum } from '@/lib/formatters';
import type { LiveQuote, SavePoint } from '@/lib/types';

// ==================== KPICard ====================
export function KPICard({ label, value, sub, icon: Icon, trend, accent, indicator }: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ElementType;
  trend?: 'up' | 'down' | 'flat';
  accent?: string;
  /** Mini visual indicator rendered in bottom-right */
  indicator?: React.ReactNode;
}) {
  const ac = accent || (
    trend === 'up'
      ? 'from-emerald-500/5 to-emerald-500/10 border-emerald-500/20'
      : trend === 'down'
        ? 'from-red-500/5 to-red-500/10 border-red-500/20'
        : 'from-slate-500/5 to-slate-500/10 border-slate-700/50'
  );
  return (
    <div className={cn('rounded-xl border bg-gradient-to-br p-3.5 transition-all relative overflow-hidden', ac)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</span>
        {Icon && <Icon className={cn('w-3.5 h-3.5', trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-slate-600')} />}
      </div>
      <div className="text-sm font-bold text-slate-100 truncate">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
      {/* Mini indicator overlay in bottom-right */}
      {indicator && (
        <div className="absolute bottom-2 right-2.5 opacity-70">
          {indicator}
        </div>
      )}
    </div>
  );
}

// ==================== MetricRow ====================
export function MetricRow({ label, value, highlight, badge, bar }: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
  badge?: { text: string; color: string };
  bar?: { value: number; max: number; color: string };
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {bar && (
          <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', bar.color)}
              style={{ width: Math.min(100, (bar.value / bar.max) * 100) + '%' }}
            />
          </div>
        )}
        {badge && <Badge variant="outline" className={cn('text-[8px] px-1 py-0', badge.color)}>{badge.text}</Badge>}
        <span className={cn('text-xs font-mono', highlight ? 'text-white font-semibold' : 'text-slate-200')}>{value}</span>
      </div>
    </div>
  );
}

// ==================== SectionCard ====================
export function SectionCard({ title, icon: Icon, children, className, badge }: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}) {
  return (
    <Card className={cn('border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-900/50 backdrop-blur-sm', className)}>
      <CardHeader className="p-3.5 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            {Icon && <Icon className="w-3.5 h-3.5 text-emerald-500/70" />}
            {title}
          </CardTitle>
          {badge}
        </div>
      </CardHeader>
      <CardContent className="p-3.5 pt-0">{children}</CardContent>
    </Card>
  );
}

// ==================== MktTicker ====================
export function MktTicker({ label, q }: { label: string; q: LiveQuote | null }) {
  if (!q) return <div className="flex flex-col items-center px-3 py-1.5"><Skeleton className="h-3 w-16 bg-slate-800" /></div>;
  const up = q.changePct >= 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center px-3 py-1.5 cursor-default">
          <span className="text-[10px] text-slate-500 font-medium">{label}</span>
          <span className="text-xs font-bold text-slate-200 font-mono">
            {q.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className={cn('text-[10px] font-semibold font-mono', up ? 'text-emerald-400' : 'text-red-400')}>
            {up ? '+' : ''}{q.changePct.toFixed(2)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs bg-slate-900 border-slate-700">
        <div>H: {q.dayHigh.toLocaleString('en-IN')} L: {q.dayLow.toLocaleString('en-IN')}</div>
        <div>Vol: {fNum(q.volume)}</div>
      </TooltipContent>
    </Tooltip>
  );
}

// ==================== PBar ====================
export function PBar({ value, min, max, label, color }: {
  value: number;
  min: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 50;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-500 text-right shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: pct + '%' }} />
      </div>
      <span className="w-14 text-slate-300 font-mono text-right shrink-0">{value.toFixed(1)}</span>
    </div>
  );
}

// ==================== SentimentBadge ====================
export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const map: Record<string, string> = {
    positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    negative: 'bg-red-500/15 text-red-400 border-red-500/30',
    neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 capitalize', map[sentiment] || map.neutral)}>
      {sentiment}
    </Badge>
  );
}

// ==================== OwnershipDonut ====================
export function OwnershipDonut({ data }: { data: Record<string, number | null> }) {
  const segments = [
    { label: 'Promoter', value: data.promoter, color: '#3b82f6' },
    { label: 'FII', value: data.fii, color: '#10b981' },
    { label: 'DII', value: data.dii, color: '#f59e0b' },
    { label: 'Public', value: data.public, color: '#6366f1' },
  ].filter(s => s.value !== null && s.value !== undefined) as { label: string; value: number; color: string }[];

  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return <div className="text-xs text-slate-500 text-center py-4">No ownership data</div>;

  let cum = 0;
  const grad = segments.map(s => {
    const start = cum;
    cum += (s.value / total) * 100;
    return `${s.color} ${start}% ${cum}%`;
  });

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 shrink-0">
        <div className="w-24 h-24 rounded-full" style={{ background: `conic-gradient(${grad.join(', ')})` }} />
        <div className="absolute inset-3 rounded-full bg-slate-900 flex items-center justify-center">
          <span className="text-[10px] text-slate-400 font-semibold">Holding</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-slate-400 flex-1">{s.label}</span>
            <span className="font-mono text-slate-200 font-semibold">{s.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SavePoints ====================
export function SavePoints({ points }: { points: SavePoint[] }) {
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