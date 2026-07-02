'use client';

import { PieChart, TrendingUp, DollarSign, Activity, Users } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { fINR, fNum, pctVal } from '@/lib/formatters';
import { SectionCard, MetricRow, OwnershipDonut } from '../kpi-card';
import type { LiveQuote } from '@/lib/types';

/* ========== Heatmap tile helpers ========== */

type TileSentiment = 'good' | 'neutral' | 'bad' | 'info';

const TILE_STYLE: Record<TileSentiment, string> = {
  good: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15',
  neutral: 'bg-amber-500/8 border-amber-500/15 hover:bg-amber-500/12',
  bad: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15',
  info: 'bg-slate-800/40 border-slate-800/60 hover:bg-slate-800/60',
};

const TILE_LABEL: Record<TileSentiment, string> = {
  good: 'text-emerald-400',
  neutral: 'text-amber-400',
  bad: 'text-red-400',
  info: 'text-slate-300',
};

function HeatmapTile({
  label,
  value,
  sub,
  sentiment,
}: {
  label: string;
  value: string;
  sub?: string;
  sentiment: TileSentiment;
}) {
  return (
    <div className={cn(
      'rounded-xl border p-3.5 transition-colors',
      TILE_STYLE[sentiment]
    )}>
      <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">{label}</div>
      <div className={cn('text-base font-bold font-mono', TILE_LABEL[sentiment])}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function getPEsentiment(pe: number | null): TileSentiment {
  if (pe === null) return 'info';
  if (pe < 15) return 'good';
  if (pe < 25) return 'neutral';
  return 'bad';
}

function getPBsentiment(pb: number | null): TileSentiment {
  if (pb === null) return 'info';
  if (pb < 1.5) return 'good';
  if (pb < 3) return 'neutral';
  return 'bad';
}

function getROEsentiment(roe: number | null): TileSentiment {
  if (roe === null) return 'info';
  if (roe > 20) return 'good';
  if (roe > 10) return 'neutral';
  return 'bad';
}

function getROAsentiment(roa: number | null): TileSentiment {
  if (roa === null) return 'info';
  if (roa > 10) return 'good';
  if (roa > 5) return 'neutral';
  return 'bad';
}

function getNetMarginSentiment(margin: number | null): TileSentiment {
  if (margin === null) return 'info';
  if (margin > 15) return 'good';
  if (margin > 5) return 'neutral';
  return 'bad';
}

function getRevGrowthSentiment(growth: number | null): TileSentiment {
  if (growth === null) return 'info';
  if (growth > 15) return 'good';
  if (growth > 0) return 'neutral';
  return 'bad';
}

function getDEsentiment(de: number | null): TileSentiment {
  if (de === null) return 'info';
  if (de < 0.5) return 'good';
  if (de < 1) return 'neutral';
  return 'bad';
}

export function FundamentalsTab({
  q,
  t,
  perf,
  own,
  fin,
}: {
  q: LiveQuote;
  t: Record<string, any>;
  perf: Record<string, number | null>;
  own: Record<string, number | null>;
  fin: Record<string, number | null>;
}) {
  return (
    <div className="space-y-4">
      {/* Heatmap Grid */}
      <SectionCard title="Fundamentals Heatmap" icon={PieChart}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
          <HeatmapTile
            label="P/E Ratio"
            value={q.pe?.toFixed(1) || '--'}
            sub={q.forwardPE ? 'Fwd P/E: ' + q.forwardPE.toFixed(1) : undefined}
            sentiment={getPEsentiment(q.pe)}
          />
          <HeatmapTile
            label="P/B Ratio"
            value={q.pb?.toFixed(2) || '--'}
            sub={q.bookValue ? 'BV: ' + fINR(q.bookValue) : undefined}
            sentiment={getPBsentiment(q.pb)}
          />
          <HeatmapTile
            label="ROE"
            value={q.roe ? q.roe.toFixed(1) + '%' : '--'}
            sub={q.roa ? 'ROA: ' + q.roa.toFixed(1) + '%' : undefined}
            sentiment={getROEsentiment(q.roe)}
          />
          <HeatmapTile
            label="Net Margin"
            value={q.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'}
            sub={q.operatingMargins ? 'OPM: ' + q.operatingMargins.toFixed(1) + '%' : undefined}
            sentiment={getNetMarginSentiment(q.profitMargins)}
          />
          <HeatmapTile
            label="Revenue Growth"
            value={q.revenueGrowth !== null ? (q.revenueGrowth >= 0 ? '+' : '') + q.revenueGrowth.toFixed(1) + '%' : '--'}
            sub="Year-over-year"
            sentiment={getRevGrowthSentiment(q.revenueGrowth)}
          />
          <HeatmapTile
            label="Debt / Equity"
            value={q.debtToEquity?.toFixed(2) || '--'}
            sub="Lower is better"
            sentiment={getDEsentiment(q.debtToEquity)}
          />
          <HeatmapTile
            label="Revenue"
            value={fin.revenue ? fINR(fin.revenue as number) : '--'}
            sentiment="info"
          />
          <HeatmapTile
            label="EBITDA"
            value={fin.ebitda ? fINR(fin.ebitda as number) : '--'}
            sub={fin.revenue && fin.ebitda ? 'Margin: ' + ((fin.ebitda as number) / (fin.revenue as number) * 100).toFixed(1) + '%' : undefined}
            sentiment="info"
          />
          <HeatmapTile
            label="Net Profit"
            value={fin.netProfit ? fINR(fin.netProfit as number) : '--'}
            sub={fin.grossProfits ? 'Gross: ' + fINR(fin.grossProfits as number) : undefined}
            sentiment="info"
          />
        </div>
      </SectionCard>

      {/* Detailed metrics grid below */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionCard title="Valuation Metrics" icon={PieChart}>
          <MetricRow label="P/E Ratio" value={q.pe?.toFixed(1) || '--'} highlight />
          <MetricRow label="Forward P/E" value={q.forwardPE?.toFixed(1) || '--'} />
          <MetricRow label="P/B Ratio" value={q.pb?.toFixed(2) || '--'} />
          <MetricRow label="EPS (TTM)" value={q.eps ? fINR(q.eps) : '--'} />
          <MetricRow label="Book Value" value={q.bookValue ? fINR(q.bookValue) : '--'} />
          <MetricRow label="Dividend Yield" value={q.dividendYield ? q.dividendYield.toFixed(2) + '%' : '--'} />
          <MetricRow label="Payout Ratio" value={q.payoutRatio ? (q.payoutRatio * 100).toFixed(0) + '%' : '--'} />
          <Separator className="my-1.5 bg-slate-800" />
          <MetricRow label="Market Cap" value={fINR(q.marketCap)} highlight />
        </SectionCard>
        <SectionCard title="Profitability & Growth" icon={TrendingUp}>
          <MetricRow label="ROE" value={q.roe ? q.roe.toFixed(1) + '%' : '--'} highlight />
          <MetricRow label="ROA" value={q.roa ? q.roa.toFixed(1) + '%' : '--'} />
          <MetricRow label="Net Profit Margin" value={q.profitMargins ? q.profitMargins.toFixed(1) + '%' : '--'} />
          <MetricRow label="Operating Margin" value={q.operatingMargins ? q.operatingMargins.toFixed(1) + '%' : '--'} />
          <MetricRow label="Revenue Growth" value={pctVal(q.revenueGrowth)} highlight />
          <MetricRow label="Beta" value={q.beta?.toFixed(2) || '--'} />
          <MetricRow label="Current Ratio" value={q.currentRatio?.toFixed(2) || '--'} />
          <MetricRow label="Debt/Equity" value={q.debtToEquity?.toFixed(2) || '--'} />
        </SectionCard>
        <SectionCard title="Financial Highlights" icon={DollarSign}>
          <MetricRow label="Revenue" value={fin.revenue ? fINR(fin.revenue as number) : '--'} highlight />
          <MetricRow label="EBITDA" value={fin.ebitda ? fINR(fin.ebitda as number) : '--'} />
          <MetricRow label="Gross Profit" value={fin.grossProfits ? fINR(fin.grossProfits as number) : '--'} />
          <MetricRow label="Free Cash Flow" value={fin.freeCashflow ? fINR(fin.freeCashflow as number) : '--'} />
          <MetricRow label="Net Profit" value={fin.netProfit ? fINR(fin.netProfit as number) : '--'} />
          <Separator className="my-1.5 bg-slate-800" />
          <MetricRow label="Day Volume" value={fNum(q.volume)} />
          <MetricRow label="Avg Volume" value={fNum(q.avgVolume)} />
          <MetricRow label="Volume Ratio" value={t.volumeRatio?.toFixed(2) || '--'} />
          <MetricRow label="20D Volatility" value={t.volatility20d ? t.volatility20d.toFixed(1) + '%' : '--'} />
        </SectionCard>
        <SectionCard title="Price Details" icon={Activity}>
          <MetricRow label="Open" value={q.open.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="Prev Close" value={q.prevClose.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="Day High" value={q.dayHigh.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="Day Low" value={q.dayLow.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="52W High" value={q.high52w.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="52W Low" value={q.low52w.toLocaleString('en-IN', { minimumFractionDigits: 2 })} />
          <MetricRow label="% From 52W High" value={<span className="text-red-400 font-mono">{q.percentFrom52wHigh.toFixed(1)}%</span>} />
          <MetricRow label="% From 52W Low" value={<span className="text-emerald-400 font-mono">+{q.percentFrom52wLow.toFixed(1)}%</span>} />
        </SectionCard>
        <SectionCard title="Shareholding Pattern" icon={Users} className="md:col-span-2 lg:col-span-2">
          <OwnershipDonut data={own} />
        </SectionCard>
      </div>
    </div>
  );
}