'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VolumeBucket {
  priceLow: number;
  priceHigh: number;
  volume: number;
  midPrice: number;
}

interface VolumeProfileProps {
  data: { date: string; close: number; volume: number; high: number; low: number }[];
  currentPrice?: number;
}

export function VolumeProfile({ data, currentPrice }: VolumeProfileProps) {
  const buckets = useMemo(() => {
    if (data.length === 0) return [];

    const allLows = data.map(d => d.low);
    const allHighs = data.map(d => d.high);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);

    if (maxPrice === minPrice) return [];

    const bucketCount = 12;
    const range = maxPrice - minPrice;
    const bucketSize = range / bucketCount;

    const b: VolumeBucket[] = [];
    for (let i = 0; i < bucketCount; i++) {
      b.push({
        priceLow: minPrice + i * bucketSize,
        priceHigh: minPrice + (i + 1) * bucketSize,
        volume: 0,
        midPrice: minPrice + (i + 0.5) * bucketSize,
      });
    }

    // Sum volume for each bucket based on close price
    for (const d of data) {
      const idx = Math.min(Math.floor((d.close - minPrice) / bucketSize), bucketCount - 1);
      if (idx >= 0 && idx < bucketCount) {
        b[idx].volume += d.volume;
      }
    }

    return b;
  }, [data]);

  const maxVolume = useMemo(() => Math.max(...buckets.map(b => b.volume), 1), [buckets]);

  if (buckets.length === 0) {
    return <div className="text-xs text-slate-500 text-center py-4">No data for volume profile</div>;
  }

  const price = currentPrice || (data.length > 0 ? data[data.length - 1].close : 0);

  // Determine if current price is within range
  const allLows = buckets.map(b => b.priceLow);
  const allHighs = buckets.map(b => b.priceHigh);
  const globalMin = allLows[0];
  const globalMax = allHighs[allHighs.length - 1];

  return (
    <div className="space-y-1">
      {buckets.map((bucket, i) => {
        const pct = (bucket.volume / maxVolume) * 100;
        const ratio = i / (buckets.length - 1); // 0 = bottom (low), 1 = top (high)

        // Interpolate color from red (low) through amber to green (high)
        const r = Math.round(239 - ratio * 174); // 239 -> 65
        const g = Math.round(68 + ratio * 129); // 68 -> 197
        const b2 = Math.round(68 + ratio * 26); // 68 -> 94
        const barColor = `rgb(${r}, ${g}, ${b2})`;
        const barBg = `rgba(${r}, ${g}, ${b2}, 0.15)`;

        const isCurrentPrice = price >= bucket.priceLow && price < bucket.priceHigh;

        return (
          <div key={i} className="flex items-center gap-2 group">
            {/* Price label */}
            <div className="w-16 text-right shrink-0">
              <span className={cn(
                'text-[9px] font-mono',
                isCurrentPrice ? 'text-white font-bold' : 'text-slate-500'
              )}>
                {bucket.priceLow.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Bar */}
            <div className="flex-1 relative h-4">
              <div
                className="h-full rounded-sm transition-all duration-500 relative overflow-hidden"
                style={{ width: `${pct}%`, backgroundColor: barBg, borderLeft: `2px solid ${barColor}` }}
              >
                {/* Inner fill for visual depth */}
                <div
                  className="absolute inset-0 rounded-sm opacity-40"
                  style={{
                    width: `${Math.min(100, pct * 1.3)}%`,
                    background: `linear-gradient(90deg, transparent, ${barColor}30)`,
                  }}
                />
              </div>
              {/* Current price marker */}
              {isCurrentPrice && (
                <div className="absolute right-0 top-0 bottom-0 flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                </div>
              )}
            </div>

            {/* Volume label */}
            <div className="w-14 text-right shrink-0">
              <span className="text-[9px] font-mono text-slate-600 group-hover:text-slate-400">
                {(bucket.volume / 1e6).toFixed(1)}M
              </span>
            </div>
          </div>
        );
      })}
      {/* Top price label */}
      <div className="flex items-center gap-2 pt-0.5">
        <div className="w-16 text-right shrink-0">
          <span className="text-[9px] font-mono text-slate-500">
            {globalMax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex-1" />
        <div className="w-14 text-right shrink-0 text-[8px] text-slate-700">VOLUME</div>
      </div>
    </div>
  );
}
