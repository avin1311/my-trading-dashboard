'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, TrendingUp, PieChart, Target, Users, Newspaper, Search, Layers, Star, Gauge, BarChart3, DollarSign, Zap, RefreshCw, ExternalLink, Clock, Radio, Calendar, ArrowUp, ArrowDown, Settings2, Trophy, Download, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fINR, fNum, fDate, fTime, pctVal, SIG_BG, TYPE_COLOR } from '@/lib/formatters';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useWatchlist } from '@/components/dashboard/watchlist';
import { SavePoints, SectionCard, MetricRow, PBar, OwnershipDonut, SentimentBadge, KPICard, MktTicker } from '@/components/dashboard/kpi-card';
import { MarketTickerBar } from '@/components/dashboard/market-ticker-bar';
import { StockSelectorSheet } from '@/components/dashboard/stock-selector-sheet';
import { KPIStrip } from '@/components/dashboard/kpi-strip';
import { SignalGauge } from '@/components/dashboard/signal-gauge';
import ChartSection from '@/components/dashboard/charts';
import { ExportButton } from '@/components/dashboard/export-button';
import { VolumeProfile } from '@/components/dashboard/volume-profile';
import type { LiveQuote, StrategySignal, ScreenerResult, PeerData, StrategyParams } from '@/lib/types';

// ==================== POWER BI PANEL WRAPPER ====================
function Panel({ title, icon: Icon, badge, children, className, source, span }: {
  title: string; icon?: React.ElementType; badge?: React.ReactNode;
  children: React.ReactNode; className?: string; source?: string;
  span?: string;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-800/60 bg-[#0d1017]/80 backdrop-blur-sm overflow-hidden flex flex-col',
      span && span,
      className
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/40 bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{title}</span>
          {source && (
            <Badge variant="outline" className="text-[7px] px-1 py-0 bg-blue-500/8 border-blue-500/20 text-blue-400/70 h-3.5">{source}</Badge>
          )}
        </div>
        {badge}
      </div>
      <div className="p-3.5 flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ==================== COMPACT METRIC BOX (for dense panels) ====================
function MetricBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
      <div className="text-[9px] text-slate-500 font-medium mb-0.5">{label}</div>
      <div className={cn('text-sm font-bold font-mono', color || 'text-slate-100')}>{value}</div>
      {sub && <div className="text-[8px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// ==================== HOME PAGE ====================
export default function Home() {
  const d = useDashboardData();
  const watchlist = useWatchlist();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-[#080a12] text-slate-100">
        <SavePoints points={d.savePoints} />

        {/* ========== MARKET TICKER BAR ========== */}
        <MarketTickerBar
          overview={d.overview}
          lastDate={d.lastDate}
          q={d.q}
          detailLoading={d.detailLoading}
          selectedSymbol={d.selectedSymbol}
          selectedType={d.selectedType}
          selectedLongName={d.q?.longName || d.q?.name || d.selectedSymbol}
          handleRefresh={d.handleRefresh}
          autoRefresh={d.autoRefresh}
          onToggleAutoRefresh={() => d.setAutoRefresh(!d.autoRefresh)}
          refreshInterval={d.refreshInterval}
          isWatchlisted={watchlist.isInWatchlist(d.selectedSymbol)}
          onToggleWatchlist={() => {
            if (watchlist.isInWatchlist(d.selectedSymbol)) {
              watchlist.removeFromWatchlist(d.selectedSymbol);
            } else {
              watchlist.addToWatchlist(d.selectedSymbol, d.selectedType);
            }
          }}
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

        {/* ========== MAIN DASHBOARD GRID ========== */}
        <div className="max-w-[1920px] mx-auto px-3 py-3">
          {d.detailLoading && !d.q ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 bg-slate-900/50 rounded-xl" />)}
            </div>
          ) : d.q ? (
            <div className="space-y-3">
              {/* ===== KPI STRIP ===== */}
              <KPIStrip q={d.q} latestSignal={d.latestSignal} />

              {/* ===== ROW 1: CHART + SIGNAL ANALYSIS ===== */}
              <div className="grid grid-cols-12 gap-3">
                {/* Price Chart - 8 cols */}
                <div className="col-span-12 xl:col-span-8">
                  <Panel
                    title="Price Chart with Signals"
                    icon={Activity}
                    badge={<ExportButton symbol={d.selectedSymbol} />}
                    source="Yahoo Finance"
                  >
                    <ChartSection
                      chartData={d.chartData}
                      visibleData={d.visibleData}
                      latestSignal={d.latestSignal}
                      signalsLoading={d.signalsLoading}
                    />
                  </Panel>
                </div>

                {/* Signal Analysis + Gauge - 4 cols */}
                <div className="col-span-12 xl:col-span-4 space-y-3">
                  {/* Composite Signal */}
                  {d.latestSignal && (
                    <Panel
                      title="Composite Signal"
                      icon={Gauge}
                      badge={
                        <Badge className={cn('text-[10px] font-bold border', SIG_BG[d.latestSignal.signal])}>
                          {d.latestSignal.signal.replace('_', ' ')}
                        </Badge>
                      }
                    >
                      <div className="flex flex-col items-center gap-3">
                        <SignalGauge signal={d.latestSignal} />
                        <div className="grid grid-cols-3 gap-2 w-full">
                          <div className="text-center p-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 mb-0.5 font-medium">RSI</div>
                            <div className={cn('text-lg font-bold font-mono', (d.latestSignal.rsi || 50) > 70 ? 'text-red-400' : (d.latestSignal.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>
                              {d.latestSignal.rsi?.toFixed(1)}
                            </div>
                            <Progress value={d.latestSignal.rsi || 50} className="mt-1.5 h-1" />
                          </div>
                          <div className="text-center p-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 mb-0.5 font-medium">Supertrend</div>
                            <div className={cn('text-sm font-bold', d.latestSignal.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>
                              {d.latestSignal.supertrendDir === 1 ? '↑ BULL' : '↓ BEAR'}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-mono">{fINR(d.latestSignal.supertrend)}</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-slate-800/30 border border-slate-800/50">
                            <div className="text-[9px] text-slate-500 mb-0.5 font-medium">MACD</div>
                            <div className={cn('text-sm font-bold', (d.latestSignal.macd || 0) > (d.latestSignal.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>
                              {(d.latestSignal.macd || 0) > (d.latestSignal.macdSignal || 0) ? '↑ BULL' : '↓ BEAR'}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-mono">{(d.latestSignal.macdHistogram || 0).toFixed(2)}</div>
                          </div>
                        </div>
                        <div className="w-full p-2 rounded-lg bg-slate-800/15 border border-slate-800/30">
                          <p className="text-[9px] text-slate-400 leading-relaxed">{d.latestSignal.reason}</p>
                        </div>
                      </div>
                    </Panel>
                  )}

                  {/* Backtest Summary */}
                  {d.backtest && (
                    <Panel title="Backtest Results" icon={Trophy} source="200-day">
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <MetricBox label="Total Return" value={(d.backtest.totalReturnPct >= 0 ? '+' : '') + d.backtest.totalReturnPct.toFixed(1) + '%'} color={d.backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400'} />
                          <MetricBox label="Win Rate" value={d.backtest.winRate.toFixed(0) + '%'} color={d.backtest.winRate > 50 ? 'text-emerald-400' : 'text-red-400'} />
                          <MetricBox label="Total Trades" value={String(d.backtest.totalTrades)} />
                          <MetricBox label="Profit Factor" value={d.backtest.profitFactor.toFixed(2)} color={d.backtest.profitFactor > 1.5 ? 'text-emerald-400' : 'text-amber-400'} />
                          <MetricBox label="Max Drawdown" value={'-' + d.backtest.maxDrawdownPct.toFixed(1) + '%'} color="text-red-400" />
                          <MetricBox label="Avg Win" value={'+' + d.backtest.avgWinPct.toFixed(1) + '%'} sub={'Avg Loss: ' + d.backtest.avgLossPct.toFixed(1) + '%'} color="text-emerald-400" />
                        </div>
                    </Panel>
                  )}

                  {/* Strategy Parameters */}
                  <Panel title="Strategy Parameters" icon={Settings2}>
                    <div className="grid grid-cols-2 gap-2">
                      {([['supertrendPeriod', 'ST Period', 5, 30, 1], ['supertrendMultiplier', 'ST Mult', 1, 7, 0.5], ['rsiPeriod', 'RSI Period', 5, 30, 1], ['rsiOverbought', 'RSI OB', 60, 90, 1], ['rsiOversold', 'RSI OS', 10, 40, 1], ['macdFast', 'MACD Fast', 5, 20, 1], ['macdSlow', 'MACD Slow', 15, 50, 1], ['macdSignal', 'MACD Sig', 3, 15, 1]] as [keyof StrategyParams, string, number, number, number][]).map(([key, label, min, max, step]) => (
                        <div key={key} className="space-y-0.5">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">{label}</span>
                            <span className="text-slate-300 font-mono">{d.params[key]}</span>
                          </div>
                          <Slider value={[d.params[key]]} min={min} max={max} step={step} onValueChange={([v]) => d.setParams(p => ({ ...p, [key]: v }))} className="py-0" />
                        </div>
                      ))}
                    </div>
                    <Button size="sm" className="mt-2 h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500 w-full" onClick={() => { d.setRecalculating(true); d.fetchSignals(d.selectedSymbol, d.params); }} disabled={d.recalculating}>
                      {d.recalculating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                      {d.recalculating ? 'Recalculating...' : 'Recalculate Signals'}
                    </Button>
                  </Panel>
                </div>
              </div>

              {/* ===== ROW 2: FUNDAMENTALS + TECHNICALS + PERFORMANCE ===== */}
              <div className="grid grid-cols-12 gap-3">
                {/* Fundamentals - 3 cols */}
                <div className="col-span-12 md:col-span-6 xl:col-span-3">
                  <Panel title="Fundamentals" icon={PieChart} source="Tickertape / Moneycontrol">
                    <div className="space-y-1">
                      <MetricRow label="P/E Ratio" value={d.q.pe?.toFixed(1) || '--'} highlight />
                      <MetricRow label="Forward P/E" value={d.q.forwardPE?.toFixed(1) || '--'} />
                      <MetricRow label="P/B Ratio" value={d.q.pb?.toFixed(2) || '--'} />
                      <MetricRow label="EPS (TTM)" value={d.q.eps ? fINR(d.q.eps) : '--'} highlight />
                      <MetricRow label="Book Value" value={d.q.bookValue ? fINR(d.q.bookValue) : '--'} />
                      <MetricRow label="Div Yield" value={d.q.dividendYield ? d.q.dividendYield.toFixed(2) + '%' : '--'} />
                      <Separator className="bg-slate-800/40 my-1" />
                      <MetricRow label="ROE" value={d.q.roe ? d.q.roe.toFixed(1) + '%' : '--'} highlight />
                      <MetricRow label="ROA" value={d.q.roa ? d.q.roa.toFixed(1) + '%' : '--'} />
                      <MetricRow label="Net Margin" value={d.q.profitMargins ? d.q.profitMargins.toFixed(1) + '%' : '--'} />
                      <MetricRow label="OPM" value={d.q.operatingMargins ? d.q.operatingMargins.toFixed(1) + '%' : '--'} />
                      <MetricRow label="Rev Growth" value={pctVal(d.q.revenueGrowth)} highlight />
                      <MetricRow label="D/E Ratio" value={d.q.debtToEquity?.toFixed(2) || '--'} />
                      <MetricRow label="Current Ratio" value={d.q.currentRatio?.toFixed(2) || '--'} />
                    </div>
                    {d.q.targetMean && (
                      <>
                        <Separator className="bg-slate-800/40 my-1" />
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400 font-medium">Analyst Consensus</span>
                          <Badge variant="outline" className={cn('text-[8px] px-1 py-0', d.q.recommendation === 'buy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : d.q.recommendation === 'sell' ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30')}>{d.q.recommendation}</Badge>
                        </div>
                        <MetricRow label="Target Mean" value={fINR(d.q.targetMean)} highlight />
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          Upside: <span className={cn('font-mono font-bold', ((d.q.targetMean - d.q.price) / d.q.price * 100) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {((d.q.targetMean - d.q.price) / d.q.price * 100) >= 0 ? '+' : ''}{((d.q.targetMean - d.q.price) / d.q.price * 100).toFixed(1)}%
                          </span>
                          <span className="text-slate-600 ml-1">({d.q.analysts} analysts)</span>
                        </div>
                      </>
                    )}
                  </Panel>
                </div>

                {/* Technical Analysis - 3 cols */}
                <div className="col-span-12 md:col-span-6 xl:col-span-3">
                  <Panel title="Technical Analysis" icon={Activity} source="TradingView Style">
                    <div className="space-y-2.5">
                      {/* RSI */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-400 font-medium">RSI (14)</span>
                          <span className={cn('text-sm font-bold font-mono', (d.t.rsi || 50) > 70 ? 'text-red-400' : (d.t.rsi || 50) < 30 ? 'text-emerald-400' : 'text-amber-400')}>
                            {d.t.rsi?.toFixed(1) || '--'}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500/40 h-full" style={{ width: '30%' }} />
                          <div className="bg-amber-500/30 h-full" style={{ width: '40%' }} />
                          <div className="bg-red-500/40 h-full" style={{ width: '30%' }} />
                        </div>
                        <div className="flex justify-between text-[7px] text-slate-600 mt-0.5">
                          <span>OS: 30</span><span>OB: 70</span>
                        </div>
                      </div>

                      {/* Supertrend */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
                        <span className="text-[10px] text-slate-400">Supertrend</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-bold', d.t.supertrendDir === 1 ? 'text-emerald-400' : 'text-red-400')}>
                            {d.t.supertrendDir === 1 ? 'BULLISH' : 'BEARISH'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{d.t.supertrend ? fINR(d.t.supertrend) : '--'}</span>
                        </div>
                      </div>

                      {/* MACD */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/20 border border-slate-800/30">
                        <span className="text-[10px] text-slate-400">MACD</span>
                        <div className="flex items-center gap-2">
                          <span className={cn('text-xs font-bold', (d.t.macd || 0) > (d.t.macdSignal || 0) ? 'text-emerald-400' : 'text-red-400')}>
                            {(d.t.macd || 0) > (d.t.macdSignal || 0) ? 'BULLISH' : 'BEARISH'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">H: {(d.t.macdHistogram || 0).toFixed(2)}</span>
                        </div>
                      </div>

                      <Separator className="bg-slate-800/40" />

                      {/* Support/Resistance */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]"><span className="text-red-400/80 font-medium">Resistance 2</span><span className="font-mono text-slate-300">{d.t.resistance2 ? fINR(d.t.resistance2) : '--'}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-orange-400/80 font-medium">Resistance 1</span><span className="font-mono text-slate-300">{d.t.resistance1 ? fINR(d.t.resistance1) : '--'}</span></div>
                        <div className="flex justify-between text-[10px] bg-slate-800/30 px-1.5 py-0.5 rounded"><span className="text-white font-bold">Price</span><span className="font-mono font-bold text-white">{fINR(d.q.price)}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-emerald-400/80 font-medium">Support 1</span><span className="font-mono text-slate-300">{d.t.support1 ? fINR(d.t.support1) : '--'}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-green-400/80 font-medium">Support 2</span><span className="font-mono text-slate-300">{d.t.support2 ? fINR(d.t.support2) : '--'}</span></div>
                      </div>

                      <Separator className="bg-slate-800/40" />

                      {/* Pivot Points */}
                      <div className="space-y-1">
                        <div className="text-[9px] text-slate-500 font-semibold mb-0.5">Pivot Points</div>
                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">Pivot</span><span className="font-mono text-white">{d.t.pivot ? fINR(d.t.pivot) : '--'}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">R1 / S1</span><span className="font-mono text-slate-300">{d.t.pivotR1 ? fINR(d.t.pivotR1) : '--'} / {d.t.pivotS1 ? fINR(d.t.pivotS1) : '--'}</span></div>
                        <div className="flex justify-between text-[10px]"><span className="text-slate-500">R2 / S2</span><span className="font-mono text-slate-300">{d.t.pivotR2 ? fINR(d.t.pivotR2) : '--'} / {d.t.pivotS2 ? fINR(d.t.pivotS2) : '--'}</span></div>
                      </div>

                      {/* Moving Averages */}
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        {d.q.fiftyDMA && (
                          <div className="rounded-lg bg-slate-800/20 p-1.5 text-[10px]">
                            <div className="text-slate-500">50 DMA</div>
                            <div className="font-mono text-slate-200">{fINR(d.q.fiftyDMA)}</div>
                            <div className={cn('font-mono font-semibold', (d.q.percentAbove50DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {(d.q.percentAbove50DMA || 0) >= 0 ? '+' : ''}{d.q.percentAbove50DMA?.toFixed(1)}%
                            </div>
                          </div>
                        )}
                        {d.q.twoHundredDMA && (
                          <div className="rounded-lg bg-slate-800/20 p-1.5 text-[10px]">
                            <div className="text-slate-500">200 DMA</div>
                            <div className="font-mono text-slate-200">{fINR(d.q.twoHundredDMA)}</div>
                            <div className={cn('font-mono font-semibold', (d.q.percentAbove200DMA || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {(d.q.percentAbove200DMA || 0) >= 0 ? '+' : ''}{d.q.percentAbove200DMA?.toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Panel>
                </div>

                {/* Performance + 52W Range - 3 cols */}
                <div className="col-span-12 md:col-span-6 xl:col-span-3">
                  <Panel title="Price Performance" icon={TrendingUp} source="Moneycontrol">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {(['1W', '1M', '3M', '6M', '1Y', 'YTD'] as const).map(p => {
                        const val = d.perf[p] ?? null;
                        const up = val !== null && val >= 0;
                        return (
                          <div key={p} className={cn('rounded-lg border p-2 text-center transition-colors', up ? 'bg-emerald-500/5 border-emerald-500/20' : val !== null ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/50 border-slate-800')}>
                            <div className="text-[9px] text-slate-500 font-semibold">{p}</div>
                            <div className="text-xs font-bold font-mono mt-0.5">{pctVal(val)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <Separator className="bg-slate-800/40 my-2" />
                    <div className="text-[10px] text-slate-400 font-medium mb-2">52 Week Range</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 w-16 text-right">{d.q.low52w.toLocaleString('en-IN')}</span>
                      <div className="flex-1 relative h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/30 via-amber-500/30 to-emerald-500/30 rounded-full"
                          style={{ width: (d.q.high52w > d.q.low52w ? ((d.q.price - d.q.low52w) / (d.q.high52w - d.q.low52w)) * 100 : 50) + '%' }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                          style={{ left: 'calc(' + (d.q.high52w > d.q.low52w ? ((d.q.price - d.q.low52w) / (d.q.high52w - d.q.low52w)) * 100 : 50) + '% - 5px)' }} />
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 w-16">{d.q.high52w.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between mt-1.5 text-[9px] text-slate-500">
                      <span>From Low: <span className="text-emerald-400 font-mono font-semibold">{d.q.percentFrom52wLow.toFixed(1)}%</span></span>
                      <span>From High: <span className="text-red-400 font-mono font-semibold">{d.q.percentFrom52wHigh.toFixed(1)}%</span></span>
                    </div>
                    <Separator className="bg-slate-800/40 my-2" />
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Open</span><span className="font-mono text-slate-200">{fINR(d.q.open)}</span></div>
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Prev Close</span><span className="font-mono text-slate-200">{fINR(d.q.prevClose)}</span></div>
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Day High</span><span className="font-mono text-emerald-400">{fINR(d.q.dayHigh)}</span></div>
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Day Low</span><span className="font-mono text-red-400">{fINR(d.q.dayLow)}</span></div>
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Volume</span><span className="font-mono text-slate-200">{fNum(d.q.volume)}</span></div>
                      <div className="flex justify-between p-1.5 bg-slate-800/15 rounded"><span className="text-slate-500">Volatility</span><span className="font-mono text-slate-200">{d.t.volatility20d ? d.t.volatility20d.toFixed(1) + '%' : '--'}</span></div>
                    </div>
                  </Panel>
                </div>

                {/* Ownership + Financials - 3 cols */}
                <div className="col-span-12 md:col-span-6 xl:col-span-3">
                  <Panel title="Shareholding & Financials" icon={Users} source="Screener.in">
                    <OwnershipDonut data={d.own} />
                    <Separator className="bg-slate-800/40 my-2" />
                    <div className="text-[9px] text-slate-500 font-semibold mb-1">Financial Highlights</div>
                    <div className="space-y-0.5">
                      <MetricRow label="Revenue" value={d.fin.revenue ? fINR(d.fin.revenue) : '--'} />
                      <MetricRow label="EBITDA" value={d.fin.ebitda ? fINR(d.fin.ebitda) : '--'} />
                      <MetricRow label="Gross Profit" value={d.fin.grossProfits ? fINR(d.fin.grossProfits) : '--'} />
                      <MetricRow label="Free Cashflow" value={d.fin.freeCashflow ? fINR(d.fin.freeCashflow) : '--'} />
                      <MetricRow label="Net Profit" value={d.fin.netProfit ? fINR(d.fin.netProfit) : '--'} highlight />
                    </div>
                  </Panel>
                </div>
              </div>

              {/* ===== ROW 3: SCREENER + NEWS ===== */}
              <div className="grid grid-cols-12 gap-3">
                {/* Screener - 7 cols */}
                <div className="col-span-12 xl:col-span-7">
                  <Panel
                    title="Multi-Stock Signal Screener"
                    icon={Search}
                    badge={<Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">{d.screenerData.length} stocks</Badge>}
                    source="Screener"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Button size="sm" className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-500" onClick={d.fetchScreener} disabled={d.screenerLoading}>
                        {d.screenerLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}{d.screenerLoading ? 'Scanning...' : 'Run Scan'}
                      </Button>
                      <Select value={d.screenerFilter} onValueChange={v => { d.setScreenerFilter(v); d.setScreenerData([]); }}>
                        <SelectTrigger className="h-7 w-[130px] text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All Signals</SelectItem>
                          {Object.entries(d.screenerCounts).map(([sig, cnt]) => (
                            <SelectItem key={sig} value={sig}>{sig.replace('_', ' ')} ({cnt})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="Search stock..." value={d.screenerSearched} onChange={e => d.setScreenerSearched(e.target.value)} className="h-7 w-[140px] text-[10px]" />
                    </div>
                    <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                      <Table>
                        <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                          <TableHead className="text-[9px] text-slate-500 h-7">Stock</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-right">Price</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-right">Change</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-right">RSI</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-center">Signal</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-right">Volume</TableHead>
                          <TableHead className="text-[9px] text-slate-500 h-7 text-right">Mkt Cap</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {d.screenerLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-7 bg-slate-800/50" /></TableCell></TableRow>)
                          ) : d.filteredScreener.map((s: ScreenerResult) => (
                            <TableRow key={s.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => d.handleSelect(s.symbol, 'equity')}>
                              <TableCell className="text-[10px] py-1.5">
                                <span className="font-semibold text-slate-200">{s.symbol}</span>
                                <span className="text-slate-500 ml-1 text-[9px]">{s.sector}</span>
                              </TableCell>
                              <TableCell className="text-[10px] font-mono text-slate-200 text-right">{s.price.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-[10px] font-mono text-right">{pctVal(s.changePct)}</TableCell>
                              <TableCell className="text-[10px] font-mono text-right">{s.rsi?.toFixed(1) || '--'}</TableCell>
                              <TableCell className="text-center"><Badge className={cn('text-[8px] font-bold border px-1 py-0', SIG_BG[s.signal as keyof typeof SIG_BG] || SIG_BG.HOLD)}>{s.signal.replace('_', ' ')}</Badge></TableCell>
                              <TableCell className="text-[10px] font-mono text-slate-400 text-right">{fNum(s.volume)}</TableCell>
                              <TableCell className="text-[10px] font-mono text-slate-400 text-right">{fNum(s.marketCap)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Panel>
                </div>

                {/* News Feed - 5 cols */}
                <div className="col-span-12 xl:col-span-5">
                  <Panel
                    title="News & Headlines"
                    icon={Newspaper}
                    badge={d.news.length > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800 border-slate-700 text-slate-400">{d.news.length}</Badge>}
                    source="Google News"
                  >
                    <ScrollArea className="h-[320px]">
                      <div className="space-y-1.5">
                        {d.newsLoading ? (
                          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 bg-slate-800/50 rounded-lg" />)
                        ) : d.news.length > 0 ? d.news.map((n, i) => (
                          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-2.5 rounded-lg bg-slate-800/15 hover:bg-slate-800/30 border border-slate-800/30 hover:border-slate-700/40 transition-colors group">
                            <div className="text-[10px] text-slate-200 font-medium leading-relaxed group-hover:text-emerald-400 transition-colors line-clamp-2">{n.title}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[8px] text-slate-500">{n.source}</span>
                              <span className="text-slate-700">&middot;</span>
                              <span className="text-[8px] text-slate-600 flex items-center gap-0.5"><Clock className="w-2 h-2" />{fTime(n.publishedAt)}</span>
                              <SentimentBadge sentiment={n.sentiment} />
                              <ExternalLink className="w-2.5 h-2.5 text-slate-600 group-hover:text-emerald-400 ml-auto" />
                            </div>
                          </a>
                        )) : (
                          <div className="text-center py-8 text-slate-500 text-xs">No news available</div>
                        )}
                      </div>
                    </ScrollArea>
                  </Panel>
                </div>
              </div>

              {/* ===== ROW 4: PEERS + VOLUME PROFILE ===== */}
              <div className="grid grid-cols-12 gap-3">
                {/* Sector Peers - 7 cols */}
                <div className="col-span-12 xl:col-span-7">
                  <Panel title="Sector Peer Comparison" icon={Users} source="Screener.in">
                    {d.detail?.peers && d.detail.peers.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-[9px] text-slate-500 h-7">Stock</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">Price</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">Change</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">Mkt Cap</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">P/E</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">P/B</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">ROE</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">Div Yield</TableHead>
                            <TableHead className="text-[9px] text-slate-500 h-7 text-right">Rev Growth</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {d.detail.peers.map((p: PeerData) => (
                              <TableRow key={p.symbol} className="border-slate-800/50 hover:bg-slate-800/30 cursor-pointer" onClick={() => d.handleSelect(p.symbol, 'equity')}>
                                <TableCell className="text-[10px] py-1.5"><span className="font-semibold text-slate-200">{p.symbol}</span><span className="text-slate-500 ml-1 text-[8px]">{p.name}</span></TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-200 text-right">{p.price.toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-[10px] font-mono text-right">{pctVal(p.changePct)}</TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-300 text-right">{fNum(p.marketCap)}</TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.pe?.toFixed(1) || '--'}</TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.pb?.toFixed(1) || '--'}</TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.roe ? p.roe.toFixed(1) + '%' : '--'}</TableCell>
                                <TableCell className="text-[10px] font-mono text-slate-300 text-right">{p.divYield ? p.divYield.toFixed(1) + '%' : '--'}</TableCell>
                                <TableCell className="text-[10px] font-mono text-right">{pctVal(p.revenueGrowth)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 text-xs">No peer data available</div>
                    )}
                  </Panel>
                </div>

                {/* Volume Profile - 5 cols */}
                <div className="col-span-12 xl:col-span-5">
                  <Panel title="Volume Profile" icon={BarChart3} source="Technical Analysis">
                    <VolumeProfile data={d.stockData} currentPrice={d.q.price} />
                  </Panel>
                </div>
              </div>

              {/* ===== FOOTER ===== */}
              <div className="border-t border-slate-800/30 py-2 flex items-center justify-between text-[9px] text-slate-600">
                <span>NSE Analytics Dashboard — Supertrend + RSI + MACD Confluence</span>
                <div className="flex items-center gap-3">
                  {d.lastUpdated && <span className="flex items-center gap-1"><Radio className="w-2.5 h-2.5 text-emerald-500 animate-pulse" /> Updated: {d.lastUpdated}</span>}
                  <span>Data: Yahoo Finance Real-time — For educational purposes only</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-500">
              <Activity className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a stock to view dashboard</p>
              <p className="text-sm mt-1 text-slate-600">Use the panel on the right to browse 100+ equities and 17 indices</p>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}