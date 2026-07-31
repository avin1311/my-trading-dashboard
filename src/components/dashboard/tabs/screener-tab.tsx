'use client';

import { useState } from 'react';
import { Search, Zap, RefreshCw, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { fNum, pctVal, SIG_BG } from '@/lib/formatters';
import { SectionCard } from '../kpi-card';
import type { ScreenerResult } from '@/lib/types';

const SIGNAL_OPTIONS = ['STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'] as const;

function CheckboxFilter<T extends string>({
  options,
  selected,
  onToggle,
  label,
  counts,
  colorMap,
}: {
  options: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
  label: string;
  counts?: Record<string, number>;
  colorMap?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const allSelected = selected.length === options.length;
  const someSelected = selected.length > 0 && !allSelected;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'h-8 px-3 text-xs rounded-md border flex items-center gap-2 transition-colors',
          open ? 'bg-slate-800 border-slate-600 text-white' :
          someSelected ? 'bg-blue-500/10 border-blue-500/40 text-blue-300' :
          allSelected ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' :
          'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
        )}
      >
        <span>{label}</span>
        {someSelected && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-500/20 border-blue-500/30 text-blue-300 h-4 min-w-[16px] flex items-center justify-center">{selected.length}</Badge>}
        <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[180px] max-h-[300px] overflow-y-auto">
            {/* Select All / None buttons */}
            <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800">
              <button
                onClick={() => { options.forEach(o => { if (!selected.includes(o)) onToggle(o); }); }}
                className="text-[10px] text-blue-400 hover:text-blue-300"
              >Select All</button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => { selected.forEach(o => onToggle(o)); }}
                className="text-[10px] text-red-400 hover:text-red-300"
              >Clear</button>
            </div>
            {options.map(opt => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
                    checked ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(opt)}
                    className="w-3.5 h-3.5"
                  />
                  <span className={cn('text-xs flex-1', colorMap?.[opt] || 'text-slate-300')}>
                    {typeof opt === 'string' ? opt.replace(/_/g, ' ') : opt}
                  </span>
                  {counts?.[opt] !== undefined && (
                    <span className="text-[9px] text-slate-500">{counts[opt]}</span>
                  )}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

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
  screenerFilter: string[];
  setScreenerFilter: (v: string[]) => void;
  screenerSector: string[];
  setScreenerSector: (v: string[]) => void;
  screenerSearched: string;
  setScreenerSearched: (v: string) => void;
  setScreenerData: React.Dispatch<React.SetStateAction<ScreenerResult[]>>;
  filteredScreener: ScreenerResult[];
  sectors: string[];
  fetchScreener: () => void;
  handleSelect: (sym: string, type: string) => void;
}) {
  const toggleSignal = (sig: string) => {
    setScreenerFilter(
      screenerFilter.includes(sig)
        ? screenerFilter.filter(s => s !== sig)
        : [...screenerFilter, sig]
    );
  };

  const toggleSector = (sec: string) => {
    setScreenerSector(
      screenerSector.includes(sec)
        ? screenerSector.filter(s => s !== sec)
        : [...screenerSector, sec]
    );
  };

  return (
    <SectionCard
      title="Multi-Stock Signal Screener"
      icon={Search}
      badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 border-blue-500/30 text-blue-400">{filteredScreener.length} of {screenerData.length} results</Badge>}
    >
      <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">
        Scans all NSE equities using Supertrend + RSI + MACD confluence. Use checkboxes to multi-select filters.
      </CardDescription>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500" onClick={fetchScreener} disabled={screenerLoading}>
          {screenerLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{screenerLoading ? 'Scanning...' : 'Run Scan'}
        </Button>
        <CheckboxFilter
          options={SIGNAL_OPTIONS}
          selected={screenerFilter as unknown as typeof SIGNAL_OPTIONS[number][]}
          onToggle={toggleSignal as any}
          label="Signals"
          counts={screenerCounts}
          colorMap={Object.fromEntries(Object.entries(SIG_BG).map(([k, v]) => [k, v.split(' ').find(c => c.startsWith('text-')) || 'text-slate-300']))}
        />
        {sectors.length > 0 && (
          <CheckboxFilter
            options={sectors}
            selected={screenerSector as unknown as string[]}
            onToggle={toggleSector}
            label="Sectors"
          />
        )}
        <Input placeholder="Search screener results..." value={screenerSearched} onChange={e => setScreenerSearched(e.target.value)} className="h-8 text-xs bg-slate-900 border-slate-800 w-48" />
      </div>
      {/* Active filter chips */}
      {(screenerFilter.length > 0 || screenerSector.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {screenerFilter.map(sig => (
            <Badge
              key={sig}
              variant="outline"
              className={cn('text-[9px] px-2 py-0.5 cursor-pointer', SIG_BG[sig] || SIG_BG.HOLD)}
              onClick={() => toggleSignal(sig)}
            >
              {sig.replace('_', ' ')} <span className="ml-1 opacity-60">x</span>
            </Badge>
          ))}
          {screenerSector.map(sec => (
            <Badge
              key={sec}
              variant="outline"
              className="text-[9px] px-2 py-0.5 cursor-pointer bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              onClick={() => toggleSector(sec)}
            >
              {sec} <span className="ml-1 opacity-60">x</span>
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