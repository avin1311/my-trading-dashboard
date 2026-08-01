'use client';

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== INR FORMATTING ====================
// Unified scale: raw absolute INR values → human-readable
// One scale per canvas, declared. Never mix Cr/L/T in one list.

export type INRScale = 'auto' | 'raw' | 'L' | 'Cr' | 'T';

export function fINR(v: number, opts?: { scale?: INRScale; decimals?: number; sign?: boolean }): string {
  if (v == null || isNaN(v)) return '—';
  const { scale = 'auto', decimals, sign = false } = opts || {};
  const prefix = sign && v > 0 ? '+' : '';
  const rupee = '\u20B9';

  if (scale === 'raw') return prefix + rupee + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: decimals ?? 2 });

  if (scale === 'L') return prefix + rupee + (v / 1e5).toFixed(decimals ?? 2) + ' L';
  if (scale === 'Cr') return prefix + rupee + (v / 1e7).toFixed(decimals ?? 2) + ' Cr';
  if (scale === 'T') return prefix + rupee + (v / 1e12).toFixed(decimals ?? 2) + ' T';

  // Auto scale: T for >₹10K Cr, Cr for >₹1L, L for >₹10K
  if (Math.abs(v) >= 1e12) return prefix + rupee + (v / 1e12).toFixed(decimals ?? 2) + ' T';
  if (Math.abs(v) >= 1e11) return prefix + rupee + (v / 1e12).toFixed(decimals ?? 2) + ' T';
  if (Math.abs(v) >= 1e7) return prefix + rupee + (v / 1e7).toFixed(decimals ?? 2) + ' Cr';
  if (Math.abs(v) >= 1e5) return prefix + rupee + (v / 1e5).toFixed(decimals ?? 2) + ' L';
  if (Math.abs(v) >= 1e3) return prefix + rupee + (v / 1e3).toFixed(decimals ?? 1) + 'K';
  return prefix + rupee + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: decimals ?? 2 });
}

export function fNum(v: number, opts?: { decimals?: number; sign?: boolean }): string {
  if (v == null || isNaN(v)) return '—';
  const { decimals, sign = false } = opts || {};
  const prefix = sign && v > 0 ? '+' : '';

  if (Math.abs(v) >= 1e12) return prefix + (v / 1e12).toFixed(decimals ?? 2) + 'T';
  if (Math.abs(v) >= 1e7) return prefix + (v / 1e7).toFixed(decimals ?? 2) + ' Cr';
  if (Math.abs(v) >= 1e5) return prefix + (v / 1e5).toFixed(decimals ?? 2) + ' L';
  if (Math.abs(v) >= 1e3) return prefix + (v / 1e3).toFixed(decimals ?? 1) + 'K';
  return prefix + v.toFixed(decimals ?? 2);
}

// Format percentage with EXPLICIT sign: +2.50% or −1.30%
export function fPct(v: number | null, decimals: number = 2): string {
  if (v == null || isNaN(v)) return '—';
  const sign = v >= 0 ? '+' : '\u2212'; // minus sign U+2212
  return sign + Math.abs(v).toFixed(decimals) + '%';
}

// Format a price with fixed 2 decimal places and optional sign/currency symbol (NO auto-scaling — always shows full number, e.g. ₹1,308.45)
export function fPrice(v: number | null, opts?: { sign?: boolean; currency?: boolean }): string {
  if (v == null || isNaN(v)) return '—';
  const { sign = false, currency = true } = opts || {};
  const prefix = sign && v > 0 ? '+' : (sign && v < 0 ? '\u2212' : '');
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return prefix + (currency ? '\u20B9' : '') + formatted;
}

// Compact large-number formatter WITHOUT rupee symbol.
// Use for: market cap, volume, revenue in tables where ₹ prefix is shown separately.
// Examples: 8.90 L Cr, 1.34 L Cr, 45.2K, 1.20 L
export function fCompact(v: number, opts?: { decimals?: number }): string {
  if (v == null || isNaN(v)) return '—';
  const { decimals } = opts || {};
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(decimals ?? 2) + ' L Cr';
  if (Math.abs(v) >= 1e11) return (v / 1e12).toFixed(decimals ?? 2) + ' L Cr';
  if (Math.abs(v) >= 1e7) return (v / 1e7).toFixed(decimals ?? 2) + ' Cr';
  if (Math.abs(v) >= 1e5) return (v / 1e5).toFixed(decimals ?? 2) + ' L';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(decimals ?? 1) + 'K';
  return v.toFixed(decimals ?? 2);
}

// Per-share price formatter: always 2 decimals, auto ₹ prefix.
// Use for: stock price, EPS, book value, target price, DMA, open, close, high, low, supertrend.
// NEVER auto-scales — a stock price of ₹1,308.45 must NOT become ₹1.31K.
export function fPerShare(v: number | null, opts?: { sign?: boolean; currency?: boolean }): string {
  if (v == null || isNaN(v)) return '—';
  const { sign = false, currency = true } = opts || {};
  const prefix = sign && v > 0 ? '+' : (sign && v < 0 ? '\u2212' : '');
  const abs = Math.abs(v);
  // For very small values (penny stocks), show more decimals
  const d = abs < 10 ? 3 : 2;
  const formatted = abs.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  return prefix + (currency ? '\u20B9' : '') + formatted;
}

// ISO-ish date: 2026-07-31 15:30 IST
export function fDateISO(d: string | Date): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' })
    + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
    + ' IST';
}

export function fDate(d: string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

// Percentage display with explicit +/− sign and arrow
// ALWAYS shows the sign character, not just color
export function pctVal(v: number | null) {
  if (v === null) return <span className="text-slate-600">—</span>;
  const c = v >= 0 ? 'text-emerald-400' : 'text-red-400';
  const sign = v >= 0 ? '+' : '\u2212';
  const icon = v > 0.5 ? <ArrowUpRight className="w-3 h-3" /> : v < -0.5 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />;
  return <span className={cn(c, 'flex items-center gap-0.5 font-mono tabular-nums')}>{icon}{sign}{Math.abs(v).toFixed(2)}%</span>;
}
