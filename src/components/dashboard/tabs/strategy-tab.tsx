'use client';

import { LineChart as LineChartIcon, Settings2, Zap, Trophy, BarChart2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { fDate } from '@/lib/formatters';
import { SectionCard, MetricRow } from '../kpi-card';
import type { StrategyParams, StrategySignal, BacktestResult, ChartDataPoint } from '@/lib/types';
import ChartSection from '../charts';
import { ExportButton } from '../export-button';

export function StrategyTab({
  chartData,
  visibleData,
  latestSignal,
  signalsLoading,
  params,
  setParams,
  selectedSymbol,
  backtest,
  recalculating,
  fetchSignals,
}: {
  chartData: ChartDataPoint[];
  visibleData: ChartDataPoint[];
  latestSignal: StrategySignal | null;
  signalsLoading: boolean;
  params: StrategyParams;
  setParams: React.Dispatch<React.SetStateAction<StrategyParams>>;
  selectedSymbol: string;
  backtest: BacktestResult | null;
  recalculating: boolean;
  fetchSignals: (sym: string, p: StrategyParams, days?: number) => void;
  setRecalculating: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <SectionCard
          title="Price Chart with Signals"
          icon={LineChartIcon}
          badge={<ExportButton symbol={selectedSymbol} />}
        >
          <ChartSection chartData={chartData} visibleData={visibleData} latestSignal={latestSignal} signalsLoading={signalsLoading} symbol={selectedSymbol} />
        </SectionCard>
        <SectionCard title="Strategy Parameters" icon={Settings2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {([['supertrendPeriod', 'ST Period', 5, 30, 1], ['supertrendMultiplier', 'ST Mult', 1, 7, 0.5], ['rsiPeriod', 'RSI Period', 5, 30, 1], ['rsiOverbought', 'RSI OB', 60, 90, 1], ['rsiOversold', 'RSI OS', 10, 40, 1], ['macdFast', 'MACD Fast', 5, 20, 1], ['macdSlow', 'MACD Slow', 15, 50, 1], ['macdSignal', 'MACD Sig', 3, 15, 1]] as [keyof StrategyParams, string, number, number, number][]).map(([key, label, min, max, step]) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-slate-300 font-mono">{params[key]}</span>
                </div>
                <Slider
                  value={[params[key]]}
                  min={min}
                  max={max}
                  step={step}
                  onValueChange={([v]) => setParams(p => ({ ...p, [key]: v }))}
                  className="py-0"
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
            onClick={() => { setRecalculating(true); fetchSignals(selectedSymbol, params); }}
            disabled={recalculating}
          >
            {recalculating ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
            {recalculating ? 'Recalculating...' : 'Apply & Recalculate'}
          </Button>
        </SectionCard>
      </div>
      <div className="space-y-4">
        {backtest && (
          <>
            <SectionCard title="Backtest Results" icon={Trophy} badge={<ExportButton symbol={selectedSymbol} />}>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20">
                  <div className="text-[9px] text-slate-500">Total Return</div>
                  <div className={cn('text-base font-bold font-mono', backtest.totalReturnPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {backtest.totalReturnPct >= 0 ? '+' : ''}{backtest.totalReturnPct.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20">
                  <div className="text-[9px] text-slate-500">Win Rate</div>
                  <div className="text-base font-bold font-mono text-blue-400">{backtest.winRate.toFixed(1)}%</div>
                </div>
                <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20">
                  <div className="text-[9px] text-slate-500">Total Trades</div>
                  <div className="text-base font-bold font-mono text-slate-200">{backtest.totalTrades}</div>
                </div>
                <div className="rounded-lg border border-slate-800 p-2.5 text-center bg-slate-800/20">
                  <div className="text-[9px] text-slate-500">Profit Factor</div>
                  <div className={cn('text-base font-bold font-mono', backtest.profitFactor >= 1.5 ? 'text-emerald-400' : backtest.profitFactor >= 1 ? 'text-amber-400' : 'text-red-400')}>
                    {backtest.profitFactor === 999 ? 'Inf' : backtest.profitFactor.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <MetricRow label="Avg Win" value={<span className="text-emerald-400">+{backtest.avgWinPct.toFixed(2)}%</span>} />
                <MetricRow label="Avg Loss" value={<span className="text-red-400">{backtest.avgLossPct.toFixed(2)}%</span>} />
                <MetricRow label="Max Drawdown" value={<span className="text-red-400">-{backtest.maxDrawdownPct.toFixed(2)}%</span>} />
                <MetricRow label="W/L Ratio" value={backtest.winningTrades + 'W / ' + backtest.losingTrades + 'L'} />
              </div>
            </SectionCard>
            <SectionCard title="Recent Trades" icon={BarChart2}>
              <ScrollArea className="h-[260px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-[9px] text-slate-500 h-7">Type</TableHead>
                      <TableHead className="text-[9px] text-slate-500 h-7">Entry</TableHead>
                      <TableHead className="text-[9px] text-slate-500 h-7">Exit</TableHead>
                      <TableHead className="text-[9px] text-slate-500 h-7 text-right">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backtest.trades.map((tr, i) => (
                      <TableRow key={i} className="border-slate-800/50 hover:bg-slate-800/30">
                        <TableCell className="text-[9px] py-1.5">
                          <Badge variant="outline" className={cn('text-[7px] px-1 py-0', tr.type === 'LONG' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}>
                            {tr.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[9px] py-1.5 font-mono text-slate-400">{fDate(tr.entryDate)}</TableCell>
                        <TableCell className="text-[9px] py-1.5 font-mono text-slate-400">{fDate(tr.exitDate)}</TableCell>
                        <TableCell className={cn('text-[9px] py-1.5 font-mono font-semibold text-right', tr.pnlPct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {tr.pnlPct >= 0 ? '+' : ''}{tr.pnlPct.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}