'use client';

import { Layers, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { StockInfo } from '@/lib/types';

export function StockSelectorSheet({
  open,
  onOpenChange,
  selectedSymbol,
  equities,
  indices,
  sectors,
  equitySearch,
  setEquitySearch,
  selectedSector,
  setSelectedSector,
  filteredEquities,
  handleSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSymbol: string;
  equities: StockInfo[];
  indices: StockInfo[];
  sectors: string[];
  equitySearch: string;
  setEquitySearch: (v: string) => void;
  selectedSector: string;
  setSelectedSector: (v: string) => void;
  filteredEquities: StockInfo[];
  handleSelect: (sym: string, type: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 gap-2 h-8 text-xs">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">{selectedSymbol}</span>
          <ChevronRight className="w-3 h-3 opacity-50" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[440px] bg-[#0a0e1a] border-slate-800 p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-white text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> Select Instrument
          </SheetTitle>
          <SheetDescription className="text-slate-400 text-xs">
            {equities.length} equities, {indices.length} indices
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="equities" className="px-4">
          <TabsList className="bg-slate-900 w-full border border-slate-800 h-8">
            <TabsTrigger value="equities" className="flex-1 text-[10px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              Equities ({equities.length})
            </TabsTrigger>
            <TabsTrigger value="indices" className="flex-1 text-[10px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400">
              Indices ({indices.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="equities" className="mt-2">
            <Input
              placeholder="Search symbol or name..."
              value={equitySearch}
              onChange={e => setEquitySearch(e.target.value)}
              className="h-8 text-xs bg-slate-900 border-slate-800 mb-2"
            />
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="h-7 text-[10px] bg-slate-900 border-slate-800 mb-2">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="all">All Sectors</SelectItem>
                {sectors.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-0.5">
                {filteredEquities.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => handleSelect(s.symbol, 'equity')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors',
                      s.symbol === selectedSymbol && 'bg-emerald-500/10 border border-emerald-500/20'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-200 truncate">{s.symbol}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.name}</div>
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 bg-slate-800 border-slate-700 text-slate-500 shrink-0 ml-2">
                      {s.sector}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="indices" className="mt-2">
            <ScrollArea className="h-[calc(100vh-240px)]">
              <div className="space-y-0.5">
                {indices.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => handleSelect(s.symbol, 'index')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-slate-800/60 transition-colors',
                      s.symbol === selectedSymbol && 'bg-emerald-500/10 border border-emerald-500/20'
                    )}
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{s.symbol}</div>
                      <div className="text-[10px] text-slate-500">{s.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}