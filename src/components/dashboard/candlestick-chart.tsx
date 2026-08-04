'use client';

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  createChart,
  type IChartApi,
  ColorType,
  CrosshairMode,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type ISeriesApi,
  type SeriesType,
} from 'lightweight-charts';
import {
  type OHLCV, toHeikinAshi, toRenko,
  SMA, EMA, BollingerBands, RSI, MACD, VWAP, Supertrend,
  FibonacciRetracement, detectPatterns,
  type DetectedPattern, type BollingerBandsResult,
} from '@/lib/technical-indicators';

// ==================== TYPES ====================

export type ChartType = 'candle' | 'heikin_ashi' | 'renko' | 'line' | 'hollow_candle';

export type IndicatorId = 'sma_9' | 'sma_20' | 'sma_50' | 'sma_200' | 'ema_9' | 'ema_21' | 'ema_50' | 'ema_200' | 'bb' | 'vwap' | 'supertrend' | 'rsi' | 'macd' | 'stoch' | 'fib';

export interface IndicatorConfig {
  id: IndicatorId;
  label: string;
  color: string;
  shortLabel: string;
  panel?: 'price' | 'rsi' | 'macd';
}

export const INDICATOR_LIST: IndicatorConfig[] = [
  { id: 'sma_9', label: 'SMA 9', color: '#fbbf24', shortLabel: 'SMA9' },
  { id: 'sma_20', label: 'SMA 20', color: '#f97316', shortLabel: 'SMA20' },
  { id: 'sma_50', label: 'SMA 50', color: '#a78bfa', shortLabel: 'SMA50' },
  { id: 'sma_200', label: 'SMA 200', color: '#f472b6', shortLabel: 'SMA200' },
  { id: 'ema_9', label: 'EMA 9', color: '#60a5fa', shortLabel: 'EMA9' },
  { id: 'ema_21', label: 'EMA 21', color: '#34d399', shortLabel: 'EMA21' },
  { id: 'ema_50', label: 'EMA 50', color: '#c084fc', shortLabel: 'EMA50' },
  { id: 'ema_200', label: 'EMA 200', color: '#fb7185', shortLabel: 'EMA200' },
  { id: 'bb', label: 'Bollinger Bands', color: '#818cf8', shortLabel: 'BB' },
  { id: 'vwap', label: 'VWAP', color: '#2dd4bf', shortLabel: 'VWAP' },
  { id: 'supertrend', label: 'Supertrend', color: '#f59e0b', shortLabel: 'ST' },
  { id: 'rsi', label: 'RSI (14)', color: '#a855f7', shortLabel: 'RSI', panel: 'rsi' },
  { id: 'macd', label: 'MACD (12,26,9)', color: '#3b82f6', shortLabel: 'MACD', panel: 'macd' },
  { id: 'stoch', label: 'Stochastic', color: '#ec4899', shortLabel: 'Stoch', panel: 'rsi' },
  { id: 'fib', label: 'Fibonacci Levels', color: '#fbbf24', shortLabel: 'Fib' },
];

export const CHART_TYPES: { id: ChartType; label: string; icon: string }[] = [
  { id: 'candle', label: 'Candlestick', icon: '🕯' },
  { id: 'hollow_candle', label: 'Hollow', icon: '⬜' },
  { id: 'heikin_ashi', label: 'Heikin-Ashi', icon: '📈' },
  { id: 'renko', label: 'Renko', icon: '🧱' },
  { id: 'line', label: 'Line', icon: '〰' },
];

export type DrawingTool = 'crosshair' | 'trendline' | 'hline' | 'rectangle';

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveTickProp {
  ltp: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  timestamp: number;
}

interface SignalDataPoint {
  date: string;
  signal: string | null;
  low: number;
  high: number;
}

interface CandlestickChartProps {
  symbol: string;
  interval: string;
  height?: number;
  chartType?: ChartType;
  activeIndicators?: IndicatorId[];
  activeTool?: DrawingTool;
  onPatternsDetected?: (patterns: DetectedPattern[]) => void;
  liveTick?: LiveTickProp | null;
  signalData?: SignalDataPoint[];
}

// ==================== INDICATOR COMPUTATION ====================

interface ComputedIndicators {
  bollingerBands: BollingerBandsResult | null;
  rsiValues: (number | null)[];
  macdResult: ReturnType<typeof MACD> | null;
  stochResult: ReturnType<typeof import('@/lib/technical-indicators').Stochastic> | null;
  supertrendResult: ReturnType<typeof Supertrend> | null;
  vwapValues: (number | null)[];
  fibLevels: { level: number; price: number; label: string }[];
  maLines: { id: IndicatorId; values: (number | null)[]; color: string; shortLabel: string }[];
  patterns: DetectedPattern[];
}

function computeAllIndicators(data: OHLCV[], activeIds: IndicatorId[]): ComputedIndicators {
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const result: ComputedIndicators = {
    bollingerBands: null, rsiValues: [], macdResult: null, stochResult: null,
    supertrendResult: null, vwapValues: [], fibLevels: [], maLines: [], patterns: []
  };

  // Moving Averages
  const maMap: Record<string, { values: (number | null)[]; color: string; shortLabel: string }> = {};
  for (const id of activeIds) {
    if (id.startsWith('sma_')) {
      const period = parseInt(id.split('_')[1]);
      maMap[id] = { values: SMA(closes, period), color: INDICATOR_LIST.find(i => i.id === id)?.color || '#fff', shortLabel: `SMA${period}` };
    } else if (id.startsWith('ema_')) {
      const period = parseInt(id.split('_')[1]);
      maMap[id] = { values: EMA(closes, period), color: INDICATOR_LIST.find(i => i.id === id)?.color || '#fff', shortLabel: `EMA${period}` };
    }
  }
  result.maLines = Object.entries(maMap).map(([id, v]) => ({ id: id as IndicatorId, ...v }));

  if (activeIds.includes('bb')) result.bollingerBands = BollingerBands(closes);
  if (activeIds.includes('rsi')) result.rsiValues = RSI(closes);
  if (activeIds.includes('macd')) result.macdResult = MACD(closes);
  if (activeIds.includes('stoch')) {
    const { Stochastic } = require('@/lib/technical-indicators');
    result.stochResult = Stochastic(highs, lows, closes);
  }
  if (activeIds.includes('supertrend')) result.supertrendResult = Supertrend(highs, lows, closes);
  if (activeIds.includes('vwap')) result.vwapValues = VWAP(data);
  if (activeIds.includes('fib')) {
    const lookback = data.slice(-60);
    const fibHigh = Math.max(...lookback.map(d => d.high));
    const fibLow = Math.min(...lookback.map(d => d.low));
    result.fibLevels = FibonacciRetracement(fibHigh, fibLow);
  }
  result.patterns = detectPatterns(data);
  return result;
}

// ==================== MAIN COMPONENT ====================

export default function CandlestickChart({
  symbol, interval, height = 520, chartType = 'candle',
  activeIndicators = [], activeTool: activeToolProp = 'crosshair', onPatternsDetected, liveTick, signalData
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchIdRef = useRef(0);
  // Refs to update live candle from outside the main useEffect
  const priceSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const isLineRef = useRef(false);
  const lastCandleRef = useRef<{ time: Time; open: number; high: number; low: number; close: number; volume: number } | null>(null);

  // Drawing state
  const [activeTool, setActiveTool] = useState<DrawingTool>('crosshair');
  const [drawings, setDrawings] = useState<{
    type: string; points: { x: number; y: number }[]; color: string; time?: Time; price?: number;
  }[]>([]);
  const drawingRef = useRef<{ type: string; points: { x: number; y: number }[]; color: string; time?: Time; price?: number }[]>([]);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const drawColorRef = useRef('#60a5fa');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fetchData = useCallback(async (sym: string, intv: string, id: number) => {
    try {
      const res = await fetch(`/api/chart-data?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(intv)}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (fetchIdRef.current !== id) return;
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

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    // Determine sub-chart heights
    const showRSI = activeIndicators.includes('rsi') || activeIndicators.includes('stoch');
    const showMACD = activeIndicators.includes('macd');
    const mainH = height - (showRSI ? 100 : 0) - (showMACD ? 80 : 0);

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e1a' },
        textColor: '#94a3b8',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        fontSize: 11,
      },
      grid: { vertLines: { color: 'rgba(30, 41, 59, 0.4)' }, horzLines: { color: 'rgba(30, 41, 59, 0.4)' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e40af' }, horzLine: { color: 'rgba(59, 130, 246, 0.4)', labelBackgroundColor: '#1e40af' } },
      rightPriceScale: { borderColor: 'rgba(30, 41, 59, 0.6)', scaleMargins: { top: 0.05, bottom: showMACD ? 0.45 : showRSI ? 0.25 : 0.25 } },
      timeScale: { borderColor: 'rgba(30, 41, 59, 0.6)', timeVisible: ['1', '5', '15', '60', '240'].includes(interval), secondsVisible: false },
      handleScroll: { vertTouchDrag: false },
    });
    chartRef.current = chart;

    // ---- Create series ----
    const isLine = chartType === 'line';
    const isHollow = chartType === 'hollow_candle';
    isLineRef.current = isLine;
    const priceSeries = chart.addSeries(isLine ? LineSeries : CandlestickSeries, {
      ...(isLine ? {
        color: '#3b82f6', lineWidth: 2, priceLineVisible: true,
        lastValueVisible: true, crosshairMarkerVisible: true,
      } : {
        upColor: '#10b981', downColor: '#ef4444',
        borderUpColor: isHollow ? '#10b981' : '#10b981',
        borderDownColor: isHollow ? '#ef4444' : '#ef4444',
        wickUpColor: '#10b981', wickDownColor: '#ef4444',
      }),
    });
    priceSeriesRef.current = priceSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' }, priceScaleId: 'volume',
    });
    volumeSeriesRef.current = volumeSeries;
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // ---- Indicator series ----
    const indicatorSeries: Record<string, ISeriesApi<SeriesType>> = {};
    const bbSeries: { upper: ISeriesApi<SeriesType> | null; middle: ISeriesApi<SeriesType> | null; lower: ISeriesApi<SeriesType> | null } = { upper: null, middle: null, lower: null };
    let stSeries: ISeriesApi<SeriesType> | null = null;
    let rsiSeries: ISeriesApi<SeriesType> | null = null;
    let stochKSeries: ISeriesApi<SeriesType> | null = null;
    let stochDSeries: ISeriesApi<SeriesType> | null = null;
    let macdLineSeries: ISeriesApi<SeriesType> | null = null;
    let macdSigSeries: ISeriesApi<SeriesType> | null = null;
    let macdHistSeries: ISeriesApi<SeriesType> | null = null;

    // Pre-create MA line series
    for (const indId of activeIndicators) {
      if (indId.startsWith('sma_') || indId.startsWith('ema_')) {
        const cfg = INDICATOR_LIST.find(i => i.id === indId);
        if (cfg) {
          indicatorSeries[indId] = chart.addSeries(LineSeries, {
            color: cfg.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: true,
            crosshairMarkerVisible: false,
          });
        }
      }
    }

    // Bollinger Bands
    if (activeIndicators.includes('bb')) {
      bbSeries.upper = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      bbSeries.middle = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
      bbSeries.lower = chart.addSeries(LineSeries, { color: '#818cf8', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    }

    // VWAP
    if (activeIndicators.includes('vwap')) {
      indicatorSeries['vwap'] = chart.addSeries(LineSeries, { color: '#2dd4bf', lineWidth: 2, priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false });
    }

    // Supertrend
    if (activeIndicators.includes('supertrend')) {
      stSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    }

    // RSI sub-chart
    if (showRSI) {
      rsiSeries = chart.addSeries(LineSeries, {
        color: '#a855f7', lineWidth: 2, priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: false, priceScaleId: 'rsi',
      });
      chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: showMACD ? 0.72 : 0.8, bottom: showMACD ? 0.55 : 0 },
        autoScale: true, visible: true,
      });
    }

    // Stochastic on RSI panel
    if (activeIndicators.includes('stoch') && rsiSeries) {
      stochKSeries = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceScaleId: 'rsi' });
      stochDSeries = chart.addSeries(LineSeries, { color: '#f97316', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceScaleId: 'rsi' });
    }

    // MACD sub-chart
    if (showMACD) {
      macdHistSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'price', precision: 2, minMove: 0.01 }, priceScaleId: 'macd' });
      macdLineSeries = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceScaleId: 'macd' });
      macdSigSeries = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, priceScaleId: 'macd' });
      chart.priceScale('macd').applyOptions({
        scaleMargins: { top: 0, bottom: 0.02 }, autoScale: true, visible: true,
      });
    }

    // ---- Fetch data and render ----
    fetchData(symbol, interval, id).then((rawData) => {
      if (!rawData || fetchIdRef.current !== id) return;
      if (rawData.length === 0) { setError('No chart data available'); setLoading(false); return; }

      // Transform data based on chart type
      let displayData: OHLCV[] = [...rawData];
      if (chartType === 'heikin_ashi') displayData = toHeikinAshi(rawData);
      else if (chartType === 'renko') displayData = toRenko(rawData);

      // Set price data
      if (isLine) {
        const lineData: LineData[] = displayData.map(d => ({ time: d.time as Time, value: d.close }));
        (priceSeries as ISeriesApi<'Line'>).setData(lineData);
      } else if (isHollow) {
        const candleData: CandlestickData[] = displayData.map(d => ({
          time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close,
        }));
        (priceSeries as ISeriesApi<'Candlestick'>).setData(candleData);
        // Hollow candles: body border = green/red, body fill = transparent for bullish
        try { (priceSeries as any).applyOptions({ hollowCandle: true }); } catch (_e) { /* v5 may not support hollow natively, already styled */ }
      } else {
        const candleData: CandlestickData[] = displayData.map(d => ({
          time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close,
        }));
        (priceSeries as ISeriesApi<'Candlestick'>).setData(candleData);
      }

      // Volume (always from raw data)
      const volData: HistogramData[] = rawData.map(d => ({
        time: d.time as Time, value: d.volume,
        color: d.close >= d.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      }));
      volumeSeries.setData(volData);

      // Compute and set indicators
      const indicators = computeAllIndicators(rawData, activeIndicators);

      // Moving Averages
      for (const ma of indicators.maLines) {
        const s = indicatorSeries[ma.id];
        if (s) {
          const pts: LineData[] = [];
          for (let i = 0; i < rawData.length; i++) {
            if (ma.values[i] !== null) pts.push({ time: rawData[i].time as Time, value: ma.values[i]! });
          }
          (s as ISeriesApi<'Line'>).setData(pts);
        }
      }

      // Bollinger Bands
      if (indicators.bollingerBands && bbSeries.upper && bbSeries.middle && bbSeries.lower) {
        const toPts = (arr: (number | null)[]) => {
          const pts: LineData[] = [];
          for (let i = 0; i < rawData.length; i++) {
            if (arr[i] !== null) pts.push({ time: rawData[i].time as Time, value: arr[i]! });
          }
          return pts;
        };
        (bbSeries.upper as ISeriesApi<'Line'>).setData(toPts(indicators.bollingerBands.upper));
        (bbSeries.middle as ISeriesApi<'Line'>).setData(toPts(indicators.bollingerBands.middle));
        (bbSeries.lower as ISeriesApi<'Line'>).setData(toPts(indicators.bollingerBands.lower));
      }

      // VWAP
      if (indicatorSeries['vwap']) {
        const pts: LineData[] = [];
        for (let i = 0; i < rawData.length; i++) {
          if (indicators.vwapValues[i] !== null) pts.push({ time: rawData[i].time as Time, value: indicators.vwapValues[i]! });
        }
        (indicatorSeries['vwap'] as ISeriesApi<'Line'>).setData(pts);
      }

      // Supertrend
      if (indicators.supertrendResult && stSeries) {
        const pts: LineData[] = [];
        for (let i = 0; i < rawData.length; i++) {
          if (indicators.supertrendResult.values[i] !== null) {
            pts.push({
              time: rawData[i].time as Time,
              value: indicators.supertrendResult.values[i]!,
              color: indicators.supertrendResult.directions[i] === 1 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)',
            });
          }
        }
        (stSeries as ISeriesApi<'Line'>).setData(pts);
      }

      // RSI
      if (rsiSeries && indicators.rsiValues.length > 0) {
        const pts: LineData[] = [];
        for (let i = 0; i < rawData.length; i++) {
          if (indicators.rsiValues[i] !== null) pts.push({ time: rawData[i].time as Time, value: indicators.rsiValues[i]! });
        }
        (rsiSeries as ISeriesApi<'Line'>).setData(pts);
      }

      // Stochastic
      if (stochKSeries && stochDSeries && indicators.stochResult) {
        const kPts: LineData[] = [], dPts: LineData[] = [];
        for (let i = 0; i < rawData.length; i++) {
          if (indicators.stochResult.k[i] !== null) kPts.push({ time: rawData[i].time as Time, value: indicators.stochResult.k[i]! });
          if (indicators.stochResult.d[i] !== null) dPts.push({ time: rawData[i].time as Time, value: indicators.stochResult.d[i]! });
        }
        (stochKSeries as ISeriesApi<'Line'>).setData(kPts);
        (stochDSeries as ISeriesApi<'Line'>).setData(dPts);
      }

      // MACD
      if (macdLineSeries && macdSigSeries && macdHistSeries && indicators.macdResult) {
        const mPts: LineData[] = [], sPts: LineData[] = [], hPts: HistogramData[] = [];
        for (let i = 0; i < rawData.length; i++) {
          if (indicators.macdResult.macd[i] !== null) mPts.push({ time: rawData[i].time as Time, value: indicators.macdResult.macd[i]! });
          if (indicators.macdResult.signal[i] !== null) sPts.push({ time: rawData[i].time as Time, value: indicators.macdResult.signal[i]! });
          if (indicators.macdResult.histogram[i] !== null) {
            hPts.push({
              time: rawData[i].time as Time, value: indicators.macdResult.histogram[i]!,
              color: (indicators.macdResult.histogram[i]!) >= 0 ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)',
            });
          }
        }
        (macdLineSeries as ISeriesApi<'Line'>).setData(mPts);
        (macdSigSeries as ISeriesApi<'Line'>).setData(sPts);
        (macdHistSeries as ISeriesApi<'Histogram'>).setData(hPts);
      }

      // Fibonacci levels — draw as price lines
      if (indicators.fibLevels.length > 0) {
        for (const fib of indicators.fibLevels) {
          const fibColor = fib.level === 0.618 ? '#fbbf24' : fib.level === 0.382 ? '#f97316' : 'rgba(251,191,36,0.3)';
          priceSeries.createPriceLine({
            price: fib.price, color: fibColor, lineWidth: fib.level === 0.618 || fib.level === 0.382 ? 1 : 1,
            lineStyle: fib.level === 0.5 ? LineStyle.Dashed : LineStyle.Dotted,
            axisLabelVisible: true, title: ` ${fib.label} `,
          });
        }
      }

      // Pattern markers
      for (const pat of indicators.patterns) {
        if (pat.endIndex >= rawData.length) continue;
        const patData = rawData[pat.endIndex];
        if (!patData) continue;
        const color = pat.direction === 'bullish' ? '#10b981' : pat.direction === 'bearish' ? '#ef4444' : '#f59e0b';
        priceSeries.createPriceLine({
          price: patData.high, color, lineWidth: 1, lineStyle: LineStyle.Dashed,
          axisLabelVisible: true, title: ` ${pat.name} `,
        });
      }

      // Buy/Sell signal markers from strategy engine
      if (signalData && signalData.length > 0) {
        // Build a date→signal map for O(1) lookup
        const signalMap = new Map<string, { signal: string; low: number; high: number }>();
        for (const sd of signalData) {
          if (sd.signal && sd.signal !== 'HOLD') signalMap.set(sd.date, { signal: sd.signal, low: sd.low, high: sd.high });
        }
        const markers: any[] = [];
        for (let i = 0; i < rawData.length; i++) {
          const dateStr = new Date(rawData[i].time * 1000).toISOString().split('T')[0];
          const sig = signalMap.get(dateStr);
          if (!sig) continue;
          const isBuy = sig.signal === 'STRONG_BUY' || sig.signal === 'BUY';
          markers.push({
            time: rawData[i].time as Time,
            position: isBuy ? 'belowBar' as const : 'aboveBar' as const,
            color: isBuy ? '#10b981' : '#ef4444',
            shape: isBuy ? 'arrowUp' as const : 'arrowDown' as const,
            text: sig.signal.replace('_', ' '),
          });
        }
        if (markers.length > 0) {
          (priceSeries as any).setMarkers(markers);
        }
      }

      onPatternsDetected?.(indicators.patterns);
      chart.timeScale().fitContent();
      // Store last candle for live updates
      const lastRaw = rawData[rawData.length - 1];
      if (lastRaw) {
        lastCandleRef.current = {
          time: lastRaw.time as Time,
          open: lastRaw.open,
          high: lastRaw.high,
          low: lastRaw.low,
          close: lastRaw.close,
          volume: lastRaw.volume,
        };
      }
      setLoading(false);
    });

    // ---- Drawing tools (canvas overlay) ----
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;';
    canvasRef.current = canvas;
    container.appendChild(canvas);

    const drawCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (const d of drawingRef.current) {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(d.type === 'trendline' ? [] : [4, 2]);
        ctx.beginPath();
        if (d.type === 'trendline' && d.points.length === 2) {
          ctx.moveTo(d.points[0].x, d.points[0].y);
          ctx.lineTo(d.points[1].x, d.points[1].y);
        } else if (d.type === 'hline' && d.points.length >= 1) {
          ctx.moveTo(0, d.points[0].y);
          ctx.lineTo(rect.width, d.points[0].y);
        } else if (d.type === 'rectangle' && d.points.length === 2) {
          const x = Math.min(d.points[0].x, d.points[1].x);
          const y = Math.min(d.points[0].y, d.points[1].y);
          const w = Math.abs(d.points[1].x - d.points[0].x);
          const h = Math.abs(d.points[1].y - d.points[0].y);
          ctx.fillStyle = d.color.replace(')', ',0.08)').replace('rgb', 'rgba');
          ctx.fillRect(x, y, w, h);
          ctx.strokeRect(x, y, w, h);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const getChartPoint = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onMouseDown = (e: MouseEvent) => {
      if (activeTool === 'crosshair') return;
      isDrawingRef.current = true;
      const pt = getChartPoint(e);
      drawStartRef.current = pt;
      if (activeTool === 'hline') {
        drawingRef.current = [...drawingRef.current, { type: 'hline', points: [pt], color: drawColorRef.current }];
        setDrawings([...drawingRef.current]);
        drawCanvas();
        isDrawingRef.current = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDrawingRef.current || !drawStartRef.current) return;
      const pt = getChartPoint(e);
      if (activeTool === 'trendline' || activeTool === 'rectangle') {
        // Update last drawing in progress
        const last = drawingRef.current[drawingRef.current.length - 1];
        if (last && last.points.length === 1) {
          last.points = [drawStartRef.current, pt];
        } else {
          drawingRef.current = [...drawingRef.current, { type: activeTool, points: [drawStartRef.current, pt], color: drawColorRef.current }];
        }
        setDrawings([...drawingRef.current]);
        drawCanvas();
      }
    };

    const onMouseUp = () => {
      isDrawingRef.current = false;
      drawStartRef.current = null;
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);

    // Draw color cycle
    const drawColors = ['#60a5fa', '#f59e0b', '#10b981', '#ef4444', '#a855f7', '#ec4899'];
    let colorIdx = 0;
    container.addEventListener('mousedown', () => {
      if (activeTool !== 'crosshair') {
        drawColorRef.current = drawColors[colorIdx % drawColors.length];
        colorIdx++;
      }
    });

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) { chart.applyOptions({ width: entry.contentRect.width }); drawCanvas(); }
    });
    ro.observe(container);

    return () => {
      fetchIdRef.current++;
      ro.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
      if (canvasRef.current) { try { container.removeChild(canvasRef.current); } catch (_e) {} canvasRef.current = null; }
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [symbol, interval, chartType, activeIndicators, height, fetchData, onPatternsDetected]);

  // ---- Live tick: update last candle in real-time ----
  useEffect(() => {
    if (!liveTick || !priceSeriesRef.current || !lastCandleRef.current || loading) return;
    // Only update for intraday intervals
    const isIntraday = ['1', '5', '15', '60', '240'].includes(interval);
    if (!isIntraday) return;

    const ps = priceSeriesRef.current;
    const vs = volumeSeriesRef.current;
    const prev = lastCandleRef.current;

    // Determine candle time bucket from tick timestamp
    const tickDate = new Date(liveTick.timestamp);
    let candleTime: Time;
    const intvMin = parseInt(interval) || 1;
    if (intvMin <= 60) {
      // Minute-based: round down to interval
      const minutes = Math.floor(tickDate.getHours() * 60 + tickDate.getMinutes()) / intvMin;
      const bucketMinutes = Math.floor(minutes) * intvMin;
      const h = Math.floor(bucketMinutes / 60);
      const m = bucketMinutes % 60;
      candleTime = {
        year: tickDate.getFullYear(),
        month: tickDate.getMonth() + 1,
        day: tickDate.getDate(),
        hour: h, minute: m,
      } as Time;
    } else {
      candleTime = prev.time;
    }

    if (candleTime === prev.time) {
      // Same candle — update it
      const updatedCandle = {
        time: candleTime,
        open: prev.open,
        high: Math.max(prev.high, liveTick.high || liveTick.ltp),
        low: Math.min(prev.low, liveTick.low || liveTick.ltp),
        close: liveTick.ltp,
        volume: liveTick.volume || prev.volume,
      };
      try {
        if (isLineRef.current) {
          (ps as ISeriesApi<'Line'>).update({ time: candleTime, value: liveTick.ltp });
        } else {
          (ps as ISeriesApi<'Candlestick'>).update(updatedCandle);
        }
        if (vs) {
          (vs as ISeriesApi<'Histogram'>).update({
            time: candleTime,
            value: updatedCandle.volume,
            color: liveTick.ltp >= prev.open ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          });
        }
      } catch (_e) { /* ignore if time key mismatch */ }
      lastCandleRef.current = updatedCandle;
    }
  }, [liveTick, interval, loading]);

  const clearDrawings = () => {
    drawingRef.current = [];
    setDrawings([]);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  return (
    <div className="relative w-full">
      <div ref={containerRef} style={{ width: '100%', height, cursor: activeTool === 'crosshair' ? 'crosshair' : activeTool === 'trendline' ? 'crosshair' : activeTool === 'hline' ? 'row-resize' : 'crosshair' }} />
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
      {/* Drawing clear button */}
      {drawings.length > 0 && (
        <button
          onClick={clearDrawings}
          className="absolute top-2 right-2 z-20 text-[9px] px-2 py-1 rounded bg-slate-800/90 border border-slate-700/50 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
        >
          Clear Drawings
        </button>
      )}
    </div>
  );
}

// Export drawing tool setter hook
export function useDrawingTools() {
  return { tools: ['crosshair', 'trendline', 'hline', 'rectangle'] as DrawingTool[] };
}
