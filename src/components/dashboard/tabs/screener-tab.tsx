'use client';

import { Search, Zap, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { fNum, pctVal, SIG_BG } from '@/lib/formatters';
import { SectionCard } from '../kpi-card';
import type { ScreenerResult } from '@/lib/types';

export function ScreenerTab({
  screenerData,
  screenerCounts,
  screenerLoading,
  screenerFilter,
  setScreenerFilter,
  screenerSector,
  setScreenerSector,
  screenerSearched,
  setScreenerSearched,
  setScreenerData,
  filteredScreener,
  sectors,
  fetchScreener,
  handleSelect,
}: {
  screenerData: ScreenerResult[];
  screenerCounts: Record<string, number>;
  screenerLoading: boolean;
  screenerFilter: string;
  setScreenerFilter: (v: string) => void;
  screenerSector: string;
  setScreenerSector: (v: string) => void;
  screenerSearched: string;
  setScreenerSearched: (v: string) => void;
  setScreenerData: React.Dispatch<React.SetStateAction<ScreenerResult[]>>;
  filteredScreener: ScreenerResult[];
  sectors: string[];
  fetchScreener: () => void;
  handleSelect: (sym: string, type: string) => void;
}) {
  return (
    <SectionCard
      title="Multi-Stock Signal Screener"
      icon={Search}
      badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-400">{screenerData.length} results</Badge>}
    >
      <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">
        Scans all NSE equities using Supertrend + RSI + MACD confluence. Click Run Scan or select a filter below.
      </CardDescription>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={fetchScreener} disabled={screenerLoading}>
          {screenerLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{screenerLoading ? 'Scanning...' : 'Run Scan'}
        </Button>
        <Select value={screenerFilter} onValueChange={v => { setScreenerFilter(v); setScreenerData([]); }}>
          <SelectTrigger className="h-8 w-36 text-xs bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="ALL">All Signals</SelectItem>
            <SelectItem value="BULLISH">Bullish Only</SelectItem>
            <SelectItem value="BEARISH">Bearish Only</SelectItem>
            <SelectItem value="STRONG_BUY">Strong Buy</SelectItem>
            <SelectItem value="BUY">Buy</SelectItem>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="SELL">Sell</SelectItem>
            <SelectItem value="STRONG_SELL">Strong Sell</SelectItem>
          </SelectContent>
        </Select>
        <Select value={screenerSector} onValueChange={v => { setScreenerSector(v); setScreenerData([]); }}>
          <SelectTrigger className="h-8 w-36 text-xs bg-slate-900 border-slate-800"><SelectValue placeholder="All Sectors" /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800">
            <SelectItem value="all">All Sectors</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="Search screener results..." value={screenerSearched} onChange={e => setScreenerSearched(e.target.value)} className="h-8 text-xs bg-slate-900 border-slate-800 w-48" />
      </div>
      {/* Signal Count Badges */}
      {Object.keys(screenerCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(screenerCounts).map(([sig, count]) => (
            <Badge
              key={sig}
              variant="outline"
              className={cn('text-[9px] px-2 py-0.5 cursor-pointer hover:scale-105 transition-transform', SIG_BG[sig])}
              onClick={() => { setScreenerFilter(sig); setScreenerData([]); }}
            >
              {sig.replace('_', ' ')}: {count}
            </Badge>
          ))}
        </div>
      )}
      {screenerLoading ? (
        <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-10 bg-slate-800/50 rounded-lg" />)}</div>
      ) : filteredScreener.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-[9px] text-slate-500 h-8">Stock</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Price</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Change</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8">Signal</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">RSI</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Mkt Cap</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">P/E</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScreener.map(s => (
                <TableRow key={s.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => handleSelect(s.symbol, 'equity')}>
                  <TableCell className="text-xs py-2">
                    <div className="font-semibold text-slate-200">{s.symbol}</div>
                    <div className="text-[9px] text-slate-500">{s.name}</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-200 text-right">{s.price.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{pctVal(s.changePct)}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-[8px] font-bold border', SIG_BG[s.signal] || SIG_BG.HOLD)}>
                      {s.signal.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-xs font-mono text-right', (s.rsi || 50) > 70 ? 'text-red-400' : (s.rsi || 50) < 30 ? 'text-emerald-400' : 'text-slate-300')}>
                    {s.rsi?.toFixed(1) || '--'}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{fNum(s.marketCap)}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{s.pe?.toFixed(1) || '--'}</TableCell>
                  <TableCell className="text-[9px] text-slate-500 max-w-[200px] truncate">{s.signalReason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : screenerData.length === 0 && !screenerLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Click &quot;Run Scan&quot; to scan all equities for signals</p>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 text-sm">No results match your filter</div>
      )}
    </SectionCard>
  );
}