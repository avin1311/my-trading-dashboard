'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function fINR(v: number): string {
  if (v >= 1e12) return '\u20B9' + (v / 1e12).toFixed(2) + ' T';
  if (v >= 1e7) return '\u20B9' + (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return '\u20B9' + (v / 1e5).toFixed(2) + ' L';
  return '\u20B9' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fNum(v: number): string {
  if (v >= 1e12) return (v / 1e12).toFixed(2) + 'T';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + ' Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + ' L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(2);
}

export function fDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

export function fTime(d: string): string {
  const dt = new Date(d);
  const now = new Date();
  const diffHrs = Math.floor((now.getTime() - dt.getTime()) / 3600000);
  if (diffHrs < 1) return 'Just now';
  if (diffHrs < 24) return diffHrs + 'h ago';
  return fDate(d);
}

export const SIG_BG: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
  BUY: 'bg-green-500/20 border-green-500/40 text-green-400',
  HOLD: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
  SELL: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
  STRONG_SELL: 'bg-red-500/20 border-red-500/40 text-red-400',
};

export const TYPE_COLOR: Record<string, string> = {
  equity: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  index: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export function pctVal(v: number | null) {
  if (v === null) return <span className="text-slate-600">--</span>;
  const c = v >= 0 ? 'text-emerald-400' : 'text-red-400';
  const icon = v > 0.5 ? <ArrowUpRight className="w-3 h-3" /> : v < -0.5 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
  return <span className={cn(c, 'flex items-center gap-0.5 font-mono')}>{icon}{Math.abs(v).toFixed(2)}%</span>;
}