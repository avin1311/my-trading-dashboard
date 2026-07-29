'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  ColorType,
  CrosshairMode,
  type CandlestickData,
  type HistogramData,
  type Time,
  LineStyle,
} from 'lightweight-charts';

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  interval: string; // TV interval key: '1', '5', '15', '60', '240', 'D', 'W', 'M'
  height?: number;
  supertrendData?: Array<{ date: string; supertrend: number | null; supertrendDir: number | null }>;
}

export default function CandlestickChart({ symbol, interval, height = 520, supertrendData }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const stLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async (symbol: string, interval: string, id: number) => {
    try {
      const res = await fetch(`/api/chart-data?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (fetchIdRef.current !== id) return; // stale
      return json.data as ChartData[];
    } catch (e: any) {
      if (fetchIdRef.current !== id) return;
      setError(e.message);
      return null;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const id = ++fetchIdRef.current;
    setLoading(true);
    setError('');

    // Create chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e1a' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e40af' },
        horzLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e40af' },
      },
      rightPriceScale: {
        borderColor: 'rgba(30, 41, 59, 0.6)',
        scaleMargins: { top: 0.05, bottom: 0.25 },
      },
      timeScale: {
        borderColor: 'rgba(30, 41, 59, 0.6)',
        timeVisible: ['1', '5', '15', '60', '240'].includes(interval),
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // Volume series
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // Supertrend line
    const stLine = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    stLineRef.current = stLine;

    // Fetch data
    fetchData(symbol, interval, id).then((data) => {
      if (!data || fetchIdRef.current !== id) return;

      if (data.length === 0) {
        setError('No chart data available');
        setLoading(false);
        return;
      }

      const candleData: CandlestickData[] = data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));
      candleSeries.setData(candleData);

      const volumeData: HistogramData[] = data.map((d) => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)',
      }));
      volumeSeries.setData(volumeData);

      // Supertrend overlay from signal data
      if (supertrendData && supertrendData.length > 0) {
        const stPoints: Array<{ time: Time; value: number; color: string }> = [];
        for (const st of supertrendData) {
          if (st.supertrend == null) continue;
          const ts = Math.floor(new Date(st.date).getTime() / 1000);
          // Find the matching candle time
          const match = data.find((d) => {
            const dt = new Date(d.time * 1000);
            return dt.toISOString().split('T')[0] === st.date;
          });
          if (match) {
            stPoints.push({
              time: match.time as Time,
              value: st.supertrend,
              color: st.supertrendDir === 1 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)',
            });
          }
        }
        if (stPoints.length > 0) {
          stLine.setData(stPoints);
        }
      }

      chart.timeScale().fitContent();
      setLoading(false);
    });

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        chart.applyOptions({ width });
      }
    });
    ro.observe(container);

    return () => {
      fetchIdRef.current++;
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [symbol, interval, fetchData, supertrendData]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} style={{ width: '100%', height }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]/80 rounded-b-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400">Loading {symbol} chart...</span>
          </div>
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0e1a]/80 rounded-b-lg">
          <span className="text-xs text-red-400">Error: {error}</span>
        </div>
      )}
    </div>
  );
}
