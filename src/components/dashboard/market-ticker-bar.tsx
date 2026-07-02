'use client';

import { ArrowUp, ArrowDown, TrendingUp, Calendar, CircleDot, Radio, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fDate, TYPE_COLOR } from '@/lib/formatters';
import { MktTicker } from './kpi-card';
import type { LiveQuote, MarketOverview } from '@/lib/types';

export function MarketTickerBar({
  overview,
  lastDate,
  q,
  detailLoading,
  selectedSymbol,
  selectedType,
  selectedLongName,
  handleRefresh,
  headerActions,
}: {
  overview: MarketOverview | null;
  lastDate: string;
  q: LiveQuote | null;
  detailLoading: boolean;
  selectedSymbol: string;
  selectedType: string;
  selectedLongName: string;
  handleRefresh: () => void;
  headerActions: React.ReactNode;
}) {
  const topGainers = overview?.topGainers?.slice(0, 5) || [];

  return (
    <div className="sticky top-0 z-50 border-b border-slate-800/60 bg-[#06080f]/95 backdrop-blur-md">
      <div className="max-w-[1920px] mx-auto px-4">
        <div className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
            <MktTicker label="NIFTY 50" q={overview?.nifty50 ?? null} />
            <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
            <MktTicker label="BANK NIFTY" q={overview?.bankNifty ?? null} />
            <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
            <MktTicker label="NIFTY IT" q={overview?.niftyIT ?? null} />
            <div className="w-px h-8 bg-slate-800/60 mx-0.5" />
            <MktTicker label="INDIA VIX" q={overview?.indiaVix ?? null} />
            {topGainers.length > 0 && (
              <>
                <div className="w-px h-8 bg-slate-800/60 mx-1" />
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  {topGainers.slice(0, 3).map(s => (
                    <span key={s.symbol} className="text-[9px] font-mono text-emerald-400 px-1.5">
                      {s.symbol} +{s.changePct.toFixed(1)}%
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {q && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400 gap-1">
                <CircleDot className="w-2 h-2 animate-pulse" /> LIVE
              </Badge>
            )}
            {lastDate && (
              <span className="text-[10px] text-slate-600 font-mono hidden md:inline flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {fDate(lastDate)}
              </span>
            )}
          </div>
        </div>

        {/* ========== HEADER ========== */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-600/20 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight text-white">{selectedLongName || selectedSymbol}</h1>
                <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', TYPE_COLOR[selectedType] || 'bg-slate-800 text-slate-400')}>
                  {selectedType.toUpperCase()}
                </Badge>
                {q?.sector && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/80 border-slate-700 text-slate-400">
                    {q.sector}
                  </Badge>
                )}
                {q?.industry && q.industry !== q.sector && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800/60 border-slate-700/60 text-slate-500">
                    {q.industry}
                  </Badge>
                )}
              </div>
              {detailLoading ? (
                <Skeleton className="h-6 w-40 bg-slate-800 mt-1" />
              ) : q ? (
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
                    {q.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <span className={cn('text-sm font-semibold font-mono flex items-center gap-0.5 px-2 py-0.5 rounded-md', q.changePct >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10')}>
                    {q.changePct >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                    {Math.abs(q.change).toFixed(2)} ({Math.abs(q.changePct).toFixed(2)}%)
                  </span>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">{q.exchange} &middot; {q.currency}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/10 border-blue-500/20 text-blue-400 hidden lg:flex items-center gap-1"><Radio className="w-2 h-2" /> Yahoo Finance</Badge>
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-8" onClick={handleRefresh} disabled={detailLoading}>
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', detailLoading && 'animate-spin')} /> Refresh
            </Button>
            {headerActions}
          </div>
        </div>
      </div>
    </div>
  );
}