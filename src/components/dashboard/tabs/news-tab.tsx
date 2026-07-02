'use client';

import { Newspaper, Activity, Info, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { fTime } from '@/lib/formatters';
import { SectionCard, MetricRow, SentimentBadge } from '../kpi-card';
import type { LiveQuote, NewsItem } from '@/lib/types';

export function NewsTab({
  q,
  news,
  newsLoading,
  fetchNews,
  selectedSymbol,
}: {
  q: LiveQuote;
  news: NewsItem[];
  newsLoading: boolean;
  fetchNews: (sym: string) => void;
  selectedSymbol: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <SectionCard
          title="Latest News & Headlines"
          icon={Newspaper}
          badge={news.length > 0 && <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-slate-800 border-slate-700 text-slate-400">{news.length} articles</Badge>}
        >
          {newsLoading ? (
            <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 bg-slate-800/50 rounded-lg" />)}</div>
          ) : news.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {news.map((n, i) => (
                  <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 border border-slate-800/50 hover:border-slate-700/50 transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-200 font-medium leading-relaxed group-hover:text-emerald-400 transition-colors line-clamp-2">{n.title}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] text-slate-500">{n.source}</span>
                          <span className="text-slate-700">&middot;</span>
                          <span className="text-[9px] text-slate-600 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{fTime(n.publishedAt)}</span>
                          <SentimentBadge sentiment={n.sentiment} />
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 shrink-0 mt-0.5" />
                    </div>
                  </a>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">No news available. Click Refresh to fetch.</div>
          )}
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => fetchNews(selectedSymbol)} disabled={newsLoading}>
            <RefreshCw className={cn('w-3 h-3 mr-1', newsLoading && 'animate-spin')} /> {newsLoading ? 'Loading...' : 'Refresh News'}
          </Button>
        </SectionCard>
      </div>
      <div className="space-y-4">
        <SectionCard title="News Sentiment" icon={Activity}>
          {news.length > 0 ? (() => {
            const pos = news.filter(n => n.sentiment === 'positive').length;
            const neg = news.filter(n => n.sentiment === 'negative').length;
            const neu = news.length - pos - neg;
            return (
              <div className="space-y-3">
                <div className="text-center">
                  <div className={cn('text-2xl font-bold font-mono', pos > neg ? 'text-emerald-400' : neg > pos ? 'text-red-400' : 'text-amber-400')}>
                    {pos > neg ? 'Bullish' : neg > pos ? 'Bearish' : 'Neutral'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Based on {news.length} headlines</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16">Positive</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: (pos / news.length * 100) + '%' }} /></div>
                    <span className="text-[10px] font-mono text-emerald-400 w-8 text-right">{pos}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16">Neutral</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: (neu / news.length * 100) + '%' }} /></div>
                    <span className="text-[10px] font-mono text-amber-400 w-8 text-right">{neu}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-16">Negative</span>
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: (neg / news.length * 100) + '%' }} /></div>
                    <span className="text-[10px] font-mono text-red-400 w-8 text-right">{neg}</span>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="text-center py-4 text-xs text-slate-500">No news data</div>
          )}
        </SectionCard>
        <SectionCard title="Quick Info" icon={Info}>
          <MetricRow label="Exchange" value={q.exchange || '--'} />
          <MetricRow label="Currency" value={q.currency || 'INR'} />
          <MetricRow label="Sector" value={q.sector || '--'} />
          <MetricRow label="Industry" value={q.industry || '--'} />
          <MetricRow label="Data Source" value="Yahoo Finance (Real-time)" />
          <MetricRow
            label="Last Updated"
            value={
              <span className="flex items-center gap-1 text-[10px]">
                <Clock className="w-3 h-3" />{fTime(new Date().toISOString())}
              </span>
            }
          />
        </SectionCard>
      </div>
    </div>
  );
}