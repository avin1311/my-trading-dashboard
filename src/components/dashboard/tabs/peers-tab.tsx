'use client';

import { Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CardDescription } from '@/components/ui/card';
import { fNum, pctVal } from '@/lib/formatters';
import { SectionCard } from '../kpi-card';
import type { StockDetail, PeerData } from '@/lib/types';

export function PeersTab({
  detail,
  handleSelect,
}: {
  detail: StockDetail | null;
  handleSelect: (sym: string, type: string) => void;
}) {
  return (
    <SectionCard title="Sector Peer Comparison" icon={Users} className="w-full">
      <CardDescription className="text-[10px] text-slate-500 mb-3 -mt-1">Click any peer to navigate to its dashboard</CardDescription>
      {detail?.peers && detail.peers.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-[9px] text-slate-500 h-8">Stock</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Price</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Change</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Mkt Cap</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">P/E</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">P/B</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Div Yield</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">ROE</TableHead>
                <TableHead className="text-[9px] text-slate-500 h-8 text-right">Rev Growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.peers.map((p: PeerData) => (
                <TableRow key={p.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => handleSelect(p.symbol, 'equity')}>
                  <TableCell className="text-xs py-2.5">
                    <div className="font-semibold text-slate-200">{p.symbol}</div>
                    <div className="text-[9px] text-slate-500">{p.name}</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-slate-200 text-right">{p.price.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{pctVal(p.changePct)}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{fNum(p.marketCap)}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{p.pe?.toFixed(1) || '--'}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{p.pb?.toFixed(1) || '--'}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{p.divYield ? p.divYield.toFixed(1) + '%' : '--'}</TableCell>
                  <TableCell className="text-xs font-mono text-slate-300 text-right">{p.roe ? p.roe.toFixed(1) + '%' : '--'}</TableCell>
                  <TableCell className="text-xs font-mono text-right">{pctVal(p.revenueGrowth)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 text-sm">No peer data available for this stock</div>
      )}
    </SectionCard>
  );
}