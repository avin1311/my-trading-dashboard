'use client';

import { useState, useMemo } from 'react';
import { Layers, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
  const [indexSearch, setIndexSearch] = useState('');

  const filteredIndices = useMemo(() => {
    if (!indexSearch) return indices;
    const q = indexSearch.toLowerCase();
    return indices.filter(idx =>
      idx.symbol.toLowerCase().includes(q) ||
      (idx.name && idx.name.toLowerCase().includes(q))
    );
  }, [indices, indexSearch]);

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="outline"
        className="bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800 gap-2 h-8 text-xs"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <Layers className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">{selectedSymbol || 'Select Stock'}</span>
        <ChevronRight className="w-3 h-3 opacity-50" />
      </Button>

      {/* Sheet */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:w-[440px] bg-[#0c1018] border-slate-700/60 p-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-slate-800/60">
            <SheetTitle className="text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Select Instrument
            </SheetTitle>
            <SheetDescription className="text-slate-300 text-xs">
              {equities.length} equities, {indices.length} indices
            </SheetDescription>
          </SheetHeader>
          <Tabs defaultValue="equities" className="px-4">
            <TabsList className="bg-slate-900 w-full border border-slate-700/60 h-9 mt-3">
              <TabsTrigger value="equities" className="flex-1 text-[11px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400">
                Equities ({equities.length})
              </TabsTrigger>
              <TabsTrigger value="indices" className="flex-1 text-[11px] data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 text-slate-400">
                Indices ({indices.length})
              </TabsTrigger>
            </TabsList>

            {/* Equities Tab */}
            <TabsContent value="equities" className="mt-3">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="Search symbol or name..."
                  value={equitySearch}
                  onChange={e => setEquitySearch(e.target.value)}
                  className="h-9 text-xs bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-8"
                  autoFocus
                />
              </div>
              <Select value={selectedSector} onValueChange={setSelectedSector}>
                <SelectTrigger className="h-8 text-[11px] bg-slate-900 border-slate-700 text-slate-200 mb-2">
                  <SelectValue placeholder="All Sectors" />
                </SelectTrigger>
                <SelectContent className="bg-[#0c1018] border-slate-700">
                  <SelectItem value="all" className="text-slate-200">All Sectors</SelectItem>
                  {sectors.map(s => <SelectItem key={s} value={s} className="text-slate-200 text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-0.5">
                  {filteredEquities.length === 0 && (
                    <div className="text-center text-slate-400 text-xs py-8">
                      <Search className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      No stocks match your search
                    </div>
                  )}
                  {filteredEquities.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => handleSelect(s.symbol, 'equity')}
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-emerald-500/10 transition-colors border border-transparent',
                        s.symbol === selectedSymbol && 'bg-emerald-500/10 border-emerald-500/30'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{s.symbol}</div>
                        <div className="text-[10px] text-slate-300 truncate">{s.name}</div>
                      </div>
                      <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 bg-slate-800/80 border-slate-600/60 text-slate-300 shrink-0 ml-2">
                        {s.sector}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Indices Tab */}
            <TabsContent value="indices" className="mt-3">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  placeholder="Search index..."
                  value={indexSearch}
                  onChange={e => setIndexSearch(e.target.value)}
                  className="h-9 text-xs bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500 pl-8"
                />
              </div>
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-0.5">
                  {filteredIndices.length === 0 && indexSearch && (
                    <div className="text-center text-slate-400 text-xs py-8">
                      <Search className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      No indices match your search
                    </div>
                  )}
                  {filteredIndices.map(s => (
                    <button
                      key={s.symbol}
                      onClick={() => handleSelect(s.symbol, 'index')}
                      type="button"
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left hover:bg-emerald-500/10 transition-colors border border-transparent',
                        s.symbol === selectedSymbol && 'bg-emerald-500/10 border-emerald-500/30'
                      )}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white">{s.symbol}</div>
                        <div className="text-[10px] text-slate-300">{s.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
}
