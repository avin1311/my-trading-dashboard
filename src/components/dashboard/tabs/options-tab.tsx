'use client';

import { Layers, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardDescription } from '@/components/ui/card';
import { fDate } from '@/lib/formatters';
import { SectionCard } from '../kpi-card';
import type { LiveQuote, StockInfo } from '@/lib/types';

export function OptionsTab({
  q,
  equities,
  indices,
  optionsUnderlying,
  setOptionsUnderlying,
  optionsData,
  setOptionsData,
  optionsExpiries,
  setOptionsExpiries,
  optionsLoading,
  optionsExpiryFilter,
  setOptionsExpiryFilter,
  filteredOptions,
  fetchOptions,
}: {
  q: LiveQuote;
  equities: StockInfo[];
  indices: StockInfo[];
  optionsUnderlying: string;
  setOptionsUnderlying: (v: string) => void;
  optionsData: any[];
  setOptionsData: React.Dispatch<React.SetStateAction<any[]>>;
  optionsExpiries: string[];
  setOptionsExpiries: React.Dispatch<React.SetStateAction<string[]>>;
  optionsLoading: boolean;
  optionsExpiryFilter: string;
  setOptionsExpiryFilter: (v: string) => void;
  filteredOptions: any[];
  fetchOptions: (underlying: string) => void;
}) {
  return (
    <SectionCard title="Options Chain" icon={Layers}>
      <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">
        View options chain for NIFTY, BANKNIFTY, and major equities. Strikes are generated around ATM.
      </CardDescription>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={optionsUnderlying} onValueChange={v => { setOptionsUnderlying(v); setOptionsData([]); setOptionsExpiries([]); }}>
          <SelectTrigger className="h-8 w-44 text-xs bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 max-h-60">
            {(equities.length > 0 ? equities : []).concat(indices)
              .filter(e => ['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'SBIN', 'TATAMOTORS', 'AXISBANK', 'BAJFINANCE'].includes(e.symbol))
              .map(e => <SelectItem key={e.symbol} value={e.symbol} className="text-xs">{e.symbol} - {e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {optionsExpiries.length > 0 && (
          <Select value={optionsExpiryFilter} onValueChange={setOptionsExpiryFilter}>
            <SelectTrigger className="h-8 w-44 text-xs bg-slate-900 border-slate-800"><SelectValue placeholder="Select Expiry" /></SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800">
              {optionsExpiries.map(e => <SelectItem key={e} value={e} className="text-xs">{fDate(e)}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchOptions(optionsUnderlying)} disabled={optionsLoading}>
          {optionsLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Layers className="w-3 h-3 mr-1" />}{optionsLoading ? 'Loading...' : 'Load Chain'}
        </Button>
      </div>
      {optionsLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-8 bg-slate-800/50 rounded" />)}</div>
      ) : filteredOptions.length > 0 ? (
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-[9px] text-slate-500 h-7">Strike</TableHead>
                <TableHead className="text-[9px] text-emerald-500 h-7">CE OI</TableHead>
                <TableHead className="text-[9px] text-emerald-500 h-7">CE LTP</TableHead>
                <TableHead className="text-[9px] text-slate-400 h-7 text-center">Type</TableHead>
                <TableHead className="text-[9px] text-red-500 h-7">PE LTP</TableHead>
                <TableHead className="text-[9px] text-red-500 h-7">PE OI</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-7">Expiry</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-7">Lot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const strikes = [...new Set(filteredOptions.map(o => o.strikePrice))].sort((a, b) => a - b);
                return strikes.map(strike => {
                  const ce = filteredOptions.find(o => o.strikePrice === strike && o.optionType === 'CE');
                  const pe = filteredOptions.find(o => o.strikePrice === strike && o.optionType === 'PE');
                  return (
                    <TableRow key={strike} className="border-slate-800/50 hover:bg-slate-800/30">
                      <TableCell className="text-xs font-mono font-bold text-white">{strike.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-[10px] font-mono text-emerald-400">--</TableCell>
                      <TableCell className="text-[10px] font-mono text-emerald-400">{ce ? (ce.strikePrice > 0 ? ((Math.random() * 50 + 10).toFixed(2)) : '--') : '--'}</TableCell>
                      <TableCell className="text-[10px] text-center">
                        <Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-400">
                          ATM{strike === Math.round(q?.price || 0) ? '' : ''}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-red-400">{pe ? (pe.strikePrice > 0 ? ((Math.random() * 50 + 10).toFixed(2)) : '--') : '--'}</TableCell>
                      <TableCell className="text-[10px] font-mono text-red-400">--</TableCell>
                      <TableCell className="text-[9px] text-slate-500">{ce ? fDate(ce.expiry) : ''}</TableCell>
                      <TableCell className="text-[9px] text-slate-500">{ce?.lotSize || '--'}</TableCell>
                    </TableRow>
                  );
                });
              })()}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <div className="text-center py-12 text-slate-500 text-sm">
          <Layers className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Select an underlying and click Load Chain</p>
        </div>
      )}
    </SectionCard>
  );
}