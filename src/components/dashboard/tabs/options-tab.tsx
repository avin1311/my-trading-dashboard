'use client';

import { useState, useMemo } from 'react';
import { Layers, RefreshCw, Filter, TrendingUp, TrendingDown, Target, BarChart2, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fDate } from '@/lib/formatters';
import { SectionCard, MetricRow } from '../kpi-card';
import type { LiveQuote, OIStrikeData, OptionChainData } from '@/lib/types';

interface Strategy {
  name: string;
  desc: string;
  legs: { type: 'CE' | 'PE'; direction: 'BUY' | 'SELL'; strikes: string }[];
}

const PRESET_STRATEGIES: Strategy[] = [
  { name: 'Long Straddle', desc: 'Buy ATM CE + ATM PE. Profit from big moves.', legs: [{ type: 'CE', direction: 'BUY', strikes: 'ATM' }, { type: 'PE', direction: 'BUY', strikes: 'ATM' }] },
  { name: 'Long Strangle', desc: 'Buy OTM CE + OTM PE. Cheaper, needs bigger move.', legs: [{ type: 'CE', direction: 'BUY', strikes: 'ATM+2' }, { type: 'PE', direction: 'BUY', strikes: 'ATM-2' }] },
  { name: 'Bull Call Spread', desc: 'Buy ATM CE, Sell OTM CE. Bullish, limited risk.', legs: [{ type: 'CE', direction: 'BUY', strikes: 'ATM' }, { type: 'CE', direction: 'SELL', strikes: 'ATM+4' }] },
  { name: 'Bear Put Spread', desc: 'Buy ATM PE, Sell OTM PE. Bearish, limited risk.', legs: [{ type: 'PE', direction: 'BUY', strikes: 'ATM' }, { type: 'PE', direction: 'SELL', strikes: 'ATM-4' }] },
  { name: 'Iron Condor', desc: 'Sell OTM strangle + Buy further OTM strangle. Range-bound profit.', legs: [{ type: 'CE', direction: 'SELL', strikes: 'ATM+4' }, { type: 'CE', direction: 'BUY', strikes: 'ATM+8' }, { type: 'PE', direction: 'SELL', strikes: 'ATM-4' }, { type: 'PE', direction: 'BUY', strikes: 'ATM-8' }] },
  { name: 'Short Straddle', desc: 'Sell ATM CE + ATM PE. Profit from low volatility.', legs: [{ type: 'CE', direction: 'SELL', strikes: 'ATM' }, { type: 'PE', direction: 'SELL', strikes: 'ATM' }] },
];

function resolveStrike(strikeSpec: string, spotPrice: number, step: number, allStrikes: number[]): number | null {
  if (strikeSpec === 'ATM') {
    return allStrikes.reduce((prev, curr) => Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev, allStrikes[0]);
  }
  const match = strikeSpec.match(/^ATM([+-])(\d+)$/);
  if (match) {
    const offset = parseInt(match[2]) * (match[1] === '+' ? 1 : -1);
    const atmStrike = allStrikes.reduce((prev, curr) => Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev, allStrikes[0]);
    const idx = allStrikes.indexOf(atmStrike);
    if (idx >= 0 && idx + offset >= 0 && idx + offset < allStrikes.length) {
      return allStrikes[idx + offset];
    }
  }
  return null;
}

function formatOI(n: number) {
  if (n >= 10000000) return (n / 10000000).toFixed(2) + ' Cr';
  if (n >= 100000) return (n / 100000).toFixed(2) + ' L';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString('en-IN');
}

export function OptionsTab({
  q,
  oiOptionData,
  oiLoading,
  fetchOIData,
  oiUnderlyings,
  oiUnderlying,
  setOiUnderlying,
  oiExpiryFilter,
  setOiExpiryFilter,
}: {
  q: LiveQuote;
  oiOptionData: OptionChainData | null;
  oiLoading: boolean;
  fetchOIData: (underlying: string, expiry?: string) => void;
  oiUnderlyings: string[];
  oiUnderlying: string;
  setOiUnderlying: (v: string) => void;
  oiExpiryFilter: string;
  setOiExpiryFilter: (v: string) => void;
}) {
  const [strategyIdx, setStrategyIdx] = useState(0);
  const [ivFilter, setIvFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
  const [oiFilter, setOiFilter] = useState<'all' | 'high_ce' | 'high_pe'>('all');
  const [strikeRange, setStrikeRange] = useState(10);

  const spotPrice = q?.price || oiOptionData?.spotPrice || 0;
  const allStrikes = oiOptionData?.strikes || [];

  // Determine strike step from data
  const step = allStrikes.length >= 2 ? allStrikes[1].strikePrice - allStrikes[0].strikePrice : 50;

  // ATM index
  const atmIdx = useMemo(() => {
    return allStrikes.findIndex(s => s.strikePrice >= spotPrice);
  }, [allStrikes, spotPrice]);

  // Filtered strikes
  const filteredStrikes = useMemo(() => {
    let list = allStrikes;

    // Strike range filter around ATM
    if (atmIdx >= 0) {
      const start = Math.max(0, atmIdx - strikeRange);
      const end = Math.min(list.length, atmIdx + strikeRange + 1);
      list = list.slice(start, end);
    }

    // IV filter
    if (ivFilter !== 'all') {
      list = list.filter(s => {
        const avgIV = (s.callIV + s.putIV) / 2;
        if (ivFilter === 'low') return avgIV > 0 && avgIV < 15;
        if (ivFilter === 'mid') return avgIV >= 15 && avgIV < 25;
        if (ivFilter === 'high') return avgIV >= 25;
        return true;
      });
    }

    // OI filter
    if (oiFilter !== 'all') {
      const maxOI = Math.max(...allStrikes.map(s => Math.max(s.callOI, s.putOI)), 1);
      list = list.filter(s => {
        if (oiFilter === 'high_ce') return s.callOI > maxOI * 0.3;
        if (oiFilter === 'high_pe') return s.putOI > maxOI * 0.3;
        return true;
      });
    }

    return list;
  }, [allStrikes, atmIdx, strikeRange, ivFilter, oiFilter]);

  // Strategy P&L calculation
  const strategy = PRESET_STRATEGIES[strategyIdx];
  const strategyLegs = useMemo(() => {
    return strategy.legs.map(leg => {
      const strike = resolveStrike(leg.strikes, spotPrice, step, allStrikes);
      const strikeData = strike ? allStrikes.find(s => s.strikePrice === strike) : null;
      const ltp = strikeData
        ? (leg.type === 'CE' ? strikeData.callLTP : strikeData.putLTP)
        : 0;
      const oi = strikeData
        ? (leg.type === 'CE' ? strikeData.callOI : strikeData.putOI)
        : 0;
      const iv = strikeData
        ? (leg.type === 'CE' ? strikeData.callIV : strikeData.putIV)
        : 0;
      const premium = leg.direction === 'BUY' ? ltp : -ltp;
      return { ...leg, strike, ltp, oi, iv, premium };
    });
  }, [strategy, spotPrice, step, allStrikes]);

  const totalPremium = strategyLegs.reduce((sum, l) => sum + l.premium, 0);
  const maxProfit = strategy.name.includes('Iron Condor')
    ? strategyLegs.filter(l => l.direction === 'SELL').reduce((s, l) => s + l.premium, 0) - strategyLegs.filter(l => l.direction === 'BUY').reduce((s, l) => s + l.premium, 0)
    : strategy.name.includes('Spread')
      ? strategyLegs.length >= 2 ? Math.abs(strategyLegs[0].premium) - Math.abs(totalPremium) : 0
      : strategy.name.includes('Short')
        ? Math.abs(totalPremium)
        : null; // Unlimited for long straddles/strangles

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        {/* Controls */}
        <SectionCard title="Options Chain" icon={Layers}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Select value={oiUnderlying} onValueChange={v => { setOiUnderlying(v); setOiExpiryFilter(''); }}>
              <SelectTrigger className="h-8 w-44 text-xs bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 max-h-60">
                {oiUnderlyings.length > 0 ? oiUnderlyings.map(u => (
                  <SelectItem key={u} value={u} className="text-xs text-slate-300">{u}</SelectItem>
                )) : <SelectItem value="NIFTY" className="text-xs">NIFTY</SelectItem>}
              </SelectContent>
            </Select>
            {oiOptionData?.expiryDates && oiOptionData.expiryDates.length > 0 && (
              <Select value={oiExpiryFilter} onValueChange={setOiExpiryFilter}>
                <SelectTrigger className="h-8 w-40 text-xs bg-slate-900 border-slate-800"><SelectValue placeholder="Expiry" /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {oiOptionData.expiryDates.map(e => <SelectItem key={e} value={e} className="text-xs text-slate-300">{fDate(e)}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchOIData(oiUnderlying, oiExpiryFilter)} disabled={oiLoading}>
              {oiLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}{oiLoading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] text-slate-500">IV:</span>
              <div className="flex items-center gap-0.5 rounded bg-slate-800/40 border border-slate-700/50 p-0.5">
                {(['all', 'low', 'mid', 'high'] as const).map(v => (
                  <button key={v} onClick={() => setIvFilter(v)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all', ivFilter === v ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent')}>{v === 'all' ? 'All' : v === 'low' ? '<15%' : v === 'mid' ? '15-25%' : '>25%'}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">OI:</span>
              <div className="flex items-center gap-0.5 rounded bg-slate-800/40 border border-slate-700/50 p-0.5">
                {(['all', 'high_ce', 'high_pe'] as const).map(v => (
                  <button key={v} onClick={() => setOiFilter(v)} className={cn('px-2 py-0.5 rounded text-[9px] font-semibold transition-all', oiFilter === v ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent')}>{v === 'all' ? 'All' : v === 'high_ce' ? 'High CE' : 'High PE'}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500">Range:</span>
              <Select value={String(strikeRange)} onValueChange={v => setStrikeRange(Number(v))}>
                <SelectTrigger className="h-7 w-20 text-[10px] bg-slate-800/40 border-slate-700/50 text-slate-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {[5, 8, 10, 15, 20].map(n => <SelectItem key={n} value={String(n)} className="text-xs">+/-{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options Chain Table */}
          {oiLoading ? (
            <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 bg-slate-800/50 rounded" />)}</div>
          ) : filteredStrikes.length > 0 ? (
            <ScrollArea className="h-[450px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[9px] text-red-400 h-7 text-right">PE OI</TableHead>
                    <TableHead className="text-[9px] text-red-400 h-7 text-right">PE Chg</TableHead>
                    <TableHead className="text-[9px] text-red-400 h-7 text-right">PE IV</TableHead>
                    <TableHead className="text-[9px] text-red-400 h-7 text-right">PE LTP</TableHead>
                    <TableHead className="text-[9px] text-slate-400 h-7 text-center">Strike</TableHead>
                    <TableHead className="text-[9px] text-emerald-400 h-7">CE LTP</TableHead>
                    <TableHead className="text-[9px] text-emerald-400 h-7">CE IV</TableHead>
                    <TableHead className="text-[9px] text-emerald-400 h-7">CE Chg</TableHead>
                    <TableHead className="text-[9px] text-emerald-400 h-7">CE OI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStrikes.map(s => {
                    const isATM = s.strikePrice >= spotPrice - step * 0.5 && s.strikePrice <= spotPrice + step * 0.5;
                    const isITMCall = s.strikePrice < spotPrice;
                    const isITMPut = s.strikePrice > spotPrice;
                    return (
                      <TableRow key={s.strikePrice} className={cn('border-slate-800/30 hover:bg-slate-800/20', isATM && 'bg-amber-500/5')}>
                        <TableCell className={cn('text-[10px] font-mono text-right', isITMPut ? 'text-red-300' : 'text-slate-500')}>{formatOI(s.putOI)}</TableCell>
                        <TableCell className={cn('text-[10px] font-mono text-right', s.putOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>{s.putOIChg >= 0 ? '+' : ''}{formatOI(s.putOIChg)}</TableCell>
                        <TableCell className="text-[10px] font-mono text-right text-slate-400">{s.putIV ? s.putIV.toFixed(1) + '%' : '--'}</TableCell>
                        <TableCell className={cn('text-[10px] font-mono', isITMPut ? 'text-red-300 font-semibold' : 'text-slate-500')}>{s.putLTP > 0 ? s.putLTP.toFixed(2) : '--'}</TableCell>
                        <TableCell className={cn('text-[11px] font-mono font-bold text-center text-white', isATM && 'text-amber-400')}>{isATM ? s.strikePrice + ' ATM' : s.strikePrice}</TableCell>
                        <TableCell className={cn('text-[10px] font-mono', isITMCall ? 'text-emerald-300 font-semibold' : 'text-slate-500')}>{s.callLTP > 0 ? s.callLTP.toFixed(2) : '--'}</TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-400">{s.callIV ? s.callIV.toFixed(1) + '%' : '--'}</TableCell>
                        <TableCell className={cn('text-[10px] font-mono', s.callOIChg >= 0 ? 'text-emerald-500' : 'text-red-500')}>{s.callOIChg >= 0 ? '+' : ''}{formatOI(s.callOIChg)}</TableCell>
                        <TableCell className={cn('text-[10px] font-mono text-left', isITMCall ? 'text-emerald-300' : 'text-slate-500')}>{formatOI(s.callOI)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Select an underlying and click Refresh to load options chain</p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Strategy Builder Sidebar */}
      <div className="space-y-4">
        <SectionCard title="Strategy Builder" icon={Target}>
          <div className="space-y-2">
            {PRESET_STRATEGIES.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setStrategyIdx(i)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg border transition-colors',
                  strategyIdx === i ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'border-slate-800/50 hover:bg-slate-800/30 text-slate-400'
                )}
              >
                <div className="text-xs font-bold">{s.name}</div>
                <div className="text-[9px] opacity-70">{s.desc}</div>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Strategy Legs */}
        <SectionCard title="Strategy Legs" icon={BarChart2}>
          <div className="space-y-1.5">
            {strategyLegs.map((leg, i) => (
              <div key={i} className={cn('flex items-center justify-between p-2 rounded-lg border', leg.direction === 'BUY' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5')}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0', leg.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                    {leg.direction}
                  </Badge>
                  <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0', leg.type === 'CE' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}>
                    {leg.type}
                  </Badge>
                  <span className="text-xs font-mono font-bold text-white">{leg.strike?.toLocaleString('en-IN') || 'N/A'}</span>
                </div>
                <div className="text-right">
                  <div className={cn('text-xs font-mono font-bold', leg.direction === 'BUY' ? 'text-red-400' : 'text-emerald-400')}>
                    {leg.direction === 'BUY' ? '-' : '+'}{leg.ltp > 0 ? leg.ltp.toFixed(2) : '--'}
                  </div>
                  <div className="text-[9px] text-slate-500">IV: {leg.iv > 0 ? leg.iv.toFixed(1) + '%' : '--'}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/50 space-y-1.5">
            <MetricRow label="Net Premium" value={<span className={cn('font-mono font-bold', totalPremium < 0 ? 'text-red-400' : 'text-emerald-400')}>{totalPremium < 0 ? '' : '+'}{totalPremium.toFixed(2)}</span>} />
            <MetricRow label="Spot Price" value={<span className="font-mono text-white">{spotPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>} />
            {maxProfit !== null && <MetricRow label="Max Profit" value={<span className="font-mono text-emerald-400">{maxProfit > 0 ? '+' : ''}{maxProfit.toFixed(2)}</span>} />}
            <MetricRow label="Max Loss" value={<span className="font-mono text-red-400">{strategy.name.includes('Spread') || strategy.name.includes('Iron') ? Math.abs(totalPremium).toFixed(2) : 'Unlimited'}</span>} />
          </div>
        </SectionCard>

        {oiOptionData && (
          <SectionCard title="Quick Filters Info" icon={Info}>
            <div className="text-[10px] text-slate-400 space-y-1">
              <p><span className="text-slate-300 font-semibold">IV Filter:</span> Low (&lt;15%), Mid (15-25%), High (&gt;25%) implied volatility.</p>
              <p><span className="text-slate-300 font-semibold">OI Filter:</span> Shows strikes with highest Call/Put open interest.</p>
              <p><span className="text-slate-300 font-semibold">ATM:</span> At-The-Money strike highlighted in amber. ITM options shown in brighter colors.</p>
              <p><span className="text-slate-300 font-semibold">Data:</span> {oiOptionData.dataSource === 'upstox_live' ? 'Live Upstox' : oiOptionData.dataSource === 'nse_live' ? 'Live NSE' : 'Simulated'} | {oiOptionData.strikes.length} strikes</p>
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
