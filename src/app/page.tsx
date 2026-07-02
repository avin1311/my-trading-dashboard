'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Eye, DollarSign, Target, Search, Layers, Users, Newspaper } from 'lucide-react';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { SavePoints } from '@/components/dashboard/kpi-card';
import { MarketTickerBar } from '@/components/dashboard/market-ticker-bar';
import { StockSelectorSheet } from '@/components/dashboard/stock-selector-sheet';
import { KPIStrip } from '@/components/dashboard/kpi-strip';
import { OverviewTab } from '@/components/dashboard/tabs/overview-tab';
import { FundamentalsTab } from '@/components/dashboard/tabs/fundamentals-tab';
import { TechnicalsTab } from '@/components/dashboard/tabs/technicals-tab';
import { StrategyTab } from '@/components/dashboard/tabs/strategy-tab';
import { ScreenerTab } from '@/components/dashboard/tabs/screener-tab';
import { OptionsTab } from '@/components/dashboard/tabs/options-tab';
import { PeersTab } from '@/components/dashboard/tabs/peers-tab';
import { NewsTab } from '@/components/dashboard/tabs/news-tab';

export default function Home() {
  const d = useDashboardData();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[#06080f] text-slate-100">
        {/* Save Points */}
        <SavePoints points={d.savePoints} />

        {/* ========== TOP BAR ========== */}
        <MarketTickerBar
          overview={d.overview}
          lastDate={d.lastDate}
          q={d.q}
          detailLoading={d.detailLoading}
          selectedSymbol={d.selectedSymbol}
          selectedType={d.selectedType}
          selectedLongName={d.q?.longName || d.q?.name || d.selectedSymbol}
          handleRefresh={d.handleRefresh}
          headerActions={
            <StockSelectorSheet
              open={d.sheetOpen}
              onOpenChange={d.setSheetOpen}
              selectedSymbol={d.selectedSymbol}
              equities={d.equities}
              indices={d.indices}
              sectors={d.sectors}
              equitySearch={d.equitySearch}
              setEquitySearch={d.setEquitySearch}
              selectedSector={d.selectedSector}
              setSelectedSector={d.setSelectedSector}
              filteredEquities={d.filteredEquities}
              handleSelect={d.handleSelect}
            />
          }
        />

        {/* ========== MAIN CONTENT ========== */}
        <div className="max-w-[1920px] mx-auto px-4 py-4">
          {d.detailLoading && !d.q ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 bg-slate-900/50 rounded-xl" />)}
            </div>
          ) : d.q ? (
            <>
              {/* ===== KPI STRIP ===== */}
              <KPIStrip q={d.q} latestSignal={d.latestSignal} />

              {/* ===== TABS ===== */}
              <Tabs value={d.activeTab} onValueChange={d.setActiveTab} className="space-y-4">
                <TabsList className="bg-slate-900/60 border border-slate-800/60 h-10 p-1 rounded-xl overflow-x-auto">
                  <TabsTrigger value="overview" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Eye className="w-3.5 h-3.5" /> Overview</TabsTrigger>
                  <TabsTrigger value="fundamentals" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><DollarSign className="w-3.5 h-3.5" /> Fundamentals</TabsTrigger>
                  <TabsTrigger value="technicals" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Activity className="w-3.5 h-3.5" /> Technicals</TabsTrigger>
                  <TabsTrigger value="strategy" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Target className="w-3.5 h-3.5" /> Strategy</TabsTrigger>
                  <TabsTrigger value="screener" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Search className="w-3.5 h-3.5" /> Screener</TabsTrigger>
                  <TabsTrigger value="options" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Layers className="w-3.5 h-3.5" /> Options</TabsTrigger>
                  <TabsTrigger value="peers" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Users className="w-3.5 h-3.5" /> Peers</TabsTrigger>
                  <TabsTrigger value="news" className="text-[11px] rounded-lg data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400 gap-1.5 px-3 whitespace-nowrap"><Newspaper className="w-3.5 h-3.5" /> News</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <OverviewTab q={d.q} latestSignal={d.latestSignal} perf={d.perf} t={d.t} own={d.own} fin={d.fin} />
                </TabsContent>

                <TabsContent value="fundamentals">
                  <FundamentalsTab q={d.q} t={d.t} perf={d.perf} own={d.own} fin={d.fin} />
                </TabsContent>

                <TabsContent value="technicals">
                  <TechnicalsTab q={d.q} t={d.t} />
                </TabsContent>

                <TabsContent value="strategy">
                  <StrategyTab
                    chartData={d.chartData}
                    visibleData={d.visibleData}
                    latestSignal={d.latestSignal}
                    signalsLoading={d.signalsLoading}
                    params={d.params}
                    setParams={d.setParams}
                    selectedSymbol={d.selectedSymbol}
                    backtest={d.backtest}
                    recalculating={d.recalculating}
                    fetchSignals={d.fetchSignals}
                    setRecalculating={d.setRecalculating}
                  />
                </TabsContent>

                <TabsContent value="screener">
                  <ScreenerTab
                    screenerData={d.screenerData}
                    screenerCounts={d.screenerCounts}
                    screenerLoading={d.screenerLoading}
                    screenerFilter={d.screenerFilter}
                    setScreenerFilter={d.setScreenerFilter}
                    screenerSector={d.screenerSector}
                    setScreenerSector={d.setScreenerSector}
                    screenerSearched={d.screenerSearched}
                    setScreenerSearched={d.setScreenerSearched}
                    setScreenerData={d.setScreenerData}
                    filteredScreener={d.filteredScreener}
                    sectors={d.sectors}
                    fetchScreener={d.fetchScreener}
                    handleSelect={d.handleSelect}
                  />
                </TabsContent>

                <TabsContent value="options">
                  <OptionsTab
                    q={d.q}
                    equities={d.equities}
                    indices={d.indices}
                    optionsUnderlying={d.optionsUnderlying}
                    setOptionsUnderlying={d.setOptionsUnderlying}
                    optionsData={d.optionsData}
                    setOptionsData={d.setOptionsData}
                    optionsExpiries={d.optionsExpiries}
                    setOptionsExpiries={d.setOptionsExpiries}
                    optionsLoading={d.optionsLoading}
                    optionsExpiryFilter={d.optionsExpiryFilter}
                    setOptionsExpiryFilter={d.setOptionsExpiryFilter}
                    filteredOptions={d.filteredOptions}
                    fetchOptions={d.fetchOptions}
                  />
                </TabsContent>

                <TabsContent value="peers">
                  <PeersTab detail={d.detail} handleSelect={d.handleSelect} />
                </TabsContent>

                <TabsContent value="news">
                  <NewsTab
                    q={d.q}
                    news={d.news}
                    newsLoading={d.newsLoading}
                    fetchNews={d.fetchNews}
                    selectedSymbol={d.selectedSymbol}
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-24 text-slate-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a stock to view dashboard</p>
              <p className="text-sm mt-1 text-slate-600">Use the panel on the right to browse 100+ equities and 17 indices</p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/30 mt-8 py-4 text-center text-[10px] text-slate-600">
          NSE Analytics Dashboard &mdash; Supertrend + RSI + MACD Confluence &mdash; Data: Yahoo Finance Real-time &mdash; For educational purposes only, not financial advice
        </div>
      </div>
    </TooltipProvider>
  );
}