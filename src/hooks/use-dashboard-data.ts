'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  StockInfo, OHLCV, StrategySignal, BacktestResult, StrategyParams,
  StockDetail, MarketOverview, NewsItem, ScreenerResult, SavePoint, ChartDataPoint,
  OptionChainData, FuturesOIData,
} from '@/lib/types';
import { DEFAULT_PARAMS } from '@/lib/types';

export function useDashboardData() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [equities, setEquities] = useState<StockInfo[]>([]);
  const [indices, setIndices] = useState<StockInfo[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [selectedType, setSelectedType] = useState('index');
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [initialLoadError, setInitialLoadError] = useState(false);

  // Auto-refresh ON by default for real-time feel
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [stockData, setStockData] = useState<OHLCV[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState<StrategyParams>({ ...DEFAULT_PARAMS });
  const [recalculating, setRecalculating] = useState(false);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [lastDate, setLastDate] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [equitySearch, setEquitySearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');

  const [news, setNews] = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // Screener state
  const [screenerData, setScreenerData] = useState<ScreenerResult[]>([]);
  const [screenerCounts, setScreenerCounts] = useState<Record<string, number>>({});
  const [screenerTotal, setScreenerTotal] = useState(0);
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerFilter, setScreenerFilter] = useState<string[]>([]);
  const [screenerSector, setScreenerSector] = useState<string[]>([]);
  const [screenerSearched, setScreenerSearched] = useState('');

  // Options state
  const [optionsUnderlying, setOptionsUnderlying] = useState('NIFTY');
  const [optionsData, setOptionsData] = useState<any[]>([]);
  const [optionsExpiries, setOptionsExpiries] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsExpiryFilter, setOptionsExpiryFilter] = useState('');

  // OI (Open Interest) state
  const [oiUnderlying, setOiUnderlying] = useState('NIFTY');
  const [oiOptionData, setOiOptionData] = useState<OptionChainData | null>(null);
  const [oiFuturesData, setOiFuturesData] = useState<FuturesOIData | null>(null);
  const [oiLoading, setOiLoading] = useState(false);
  const [oiExpiryFilter, setOiExpiryFilter] = useState('');
  const [oiUnderlyings, setOiUnderlyings] = useState<string[]>([]);
  const [oiLastUpdated, setOiLastUpdated] = useState<string>('');

  // Backtest configuration
  const [backtestDays, setBacktestDays] = useState(200);

  // Save points
  const [savePoints, setSavePoints] = useState<SavePoint[]>([]);
  const spId = useRef(0);
  const addSavePoint = useCallback((label: string, detail: string) => {
    spId.current++;
    const sp: SavePoint = {
      id: spId.current, label, detail,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setSavePoints(prev => [...prev.slice(-2), sp]);
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setTimeout(() => setSavePoints(prev => prev.filter(p => p.id !== sp.id)), 4000);
  }, []);

  // Initial load — fetch stocks, indices, overview
  useEffect(() => {
    Promise.all([
      fetch('/api/stocks?type=equity').then(r => r.ok ? r.json() : Promise.reject(new Error(`Stocks API ${r.status}`))).catch(() => ({ instruments: [], sectors: [] })),
      fetch('/api/stocks?type=index').then(r => r.ok ? r.json() : Promise.reject(new Error(`Indices API ${r.status}`))).catch(() => ({ instruments: [] })),
      fetch('/api/quote?overview=true').then(r => r.ok ? r.json() : Promise.reject(new Error(`Overview API ${r.status}`))).catch(() => null),
    ]).then(([eq, idx, ov]: any[]) => {
      setEquities(eq.instruments || []);
      setIndices(idx.instruments || []);
      setSectors(eq.sectors || []);
      if (ov) setOverview(ov);
      addSavePoint('Market Data Loaded', `${(eq.instruments || []).length} equities, ${(idx.instruments || []).length} indices loaded`);
    }).catch(console.error);
  }, []);

  const fetchDetail = useCallback(async (sym: string) => {
    setDetailLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const res = await fetch('/api/stock-detail?symbol=' + sym, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`stock-detail API ${res.status}`);
      const data = await res.json();
      if (data.quote) {
        setDetail(data);
        addSavePoint(`Loaded ${sym}`, `Price: ₹${data.quote.price.toLocaleString('en-IN')} | ${data.quote.changePct >= 0 ? '+' : ''}${data.quote.changePct.toFixed(2)}%`);
      }
    } catch (err: any) {
      console.warn('[fetchDetail]', err?.name === 'AbortError' ? 'Request timed out' : err);
      // Only mark initial load error if we have no detail yet (first load attempt)
      setDetail(prev => { if (!prev) setInitialLoadError(true); return prev; });
    } finally { setDetailLoading(false); }
  }, [addSavePoint]);

  // Silent fetch — no save points, no loading spinner
  const silentFetchDetail = useCallback(async (sym: string) => {
    try {
      const res = await fetch('/api/stock-detail?symbol=' + sym);
      if (!res.ok) return;
      const data = await res.json();
      if (data.quote) {
        setDetail(data);
      }
    } catch {}
  }, []);

  const fetchSignals = useCallback(async (sym: string, p: StrategyParams, days = 200) => {
    setSignalsLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const sp = new URLSearchParams({ symbol: sym, days: String(days) });
      for (const [k, v] of Object.entries(p)) sp.append(k, String(v));
      const res = await fetch('/api/signals?' + sp.toString(), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`signals API ${res.status}`);
      const data = await res.json();
      setStockData(data.stockData || []);
      setSignals(data.signals || []);
      setBacktest(data.backtest || null);
      setParams(data.params || DEFAULT_PARAMS);
      setLastDate(data.lastDate || '');
      if (data.signals?.length > 0) {
        const last = data.signals[data.signals.length - 1];
        addSavePoint('Signals Calculated', `${last.signal} | RSI: ${last.rsi?.toFixed(1)} | ST: ${last.supertrendDir === 1 ? 'Bullish' : 'Bearish'}`);
      }
    } catch (err: any) {
      console.warn('[fetchSignals]', err?.name === 'AbortError' ? 'Request timed out' : err);
    } finally { setSignalsLoading(false); setRecalculating(false); }
  }, [addSavePoint]);

  const fetchNews = useCallback(async (sym: string) => {
    setNewsLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch('/api/news?symbol=' + sym, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`news API ${res.status}`);
      const data = await res.json();
      if (data.news) setNews(data.news);
    } catch (err: any) {
      console.warn('[fetchNews]', err?.name === 'AbortError' ? 'Request timed out' : err);
    } finally { setNewsLoading(false); }
  }, []);

  const [screenerError, setScreenerError] = useState(false);

  const fetchScreener = useCallback(async () => {
    setScreenerLoading(true);
    setScreenerError(false);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5 min max
      // Always fetch ALL signals — filtering is done client-side via filteredScreener
      const sp = new URLSearchParams({ limit: '0' });
      if (screenerSector !== 'all') sp.append('sector', screenerSector);
      const res = await fetch('/api/screener?' + sp.toString(), { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`screener API ${res.status}`);
      const data = await res.json();
      setScreenerData(data.results || []);
      setScreenerCounts(data.signalCounts || {});
      setScreenerTotal(data.totalScanned || 0);
      addSavePoint('Screener Complete', `Scanned ${data.totalScanned} stocks | ${data.totalMatched} matched`);
    } catch (err: any) {
      console.warn('[fetchScreener]', err?.name === 'AbortError' ? 'Screener timed out (5min)' : err);
      setScreenerError(true);
    } finally { setScreenerLoading(false); }
  // screener sector filter is client-side only now
  }, [addSavePoint]);

  const fetchOptions = useCallback(async (underlying: string) => {
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/stocks?type=option&underlying=${underlying}`);
      if (!res.ok) throw new Error(`options API ${res.status}`);
      const data = await res.json();
      setOptionsData(data.instruments || []);
      setOptionsExpiries(data.expiryDates || []);
      if (data.expiryDates?.length > 0) setOptionsExpiryFilter(data.expiryDates[0]);
    } catch (err) { console.warn('[fetchOptions]', err); } finally { setOptionsLoading(false); }
  }, []);

  // When symbol changes (or on first mount): fetch detail + news + signals
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (!selectedSymbol) return;
    setInitialLoadError(false);
    // On first mount with default symbol, always fetch
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchDetail(selectedSymbol);
      fetchNews(selectedSymbol);
      fetchSignals(selectedSymbol, params, backtestDays);
      return;
    }
    fetchDetail(selectedSymbol);
    fetchNews(selectedSymbol);
    fetchSignals(selectedSymbol, params, backtestDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSymbol]);

  // Auto-switch OI underlying when selected symbol is a known index
  useEffect(() => {
    if (!selectedSymbol) return;
    const upper = selectedSymbol.toUpperCase();
    const indexNames = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'NIFTYIT', 'NIFTYMIDCAP', 'NIFTYBANK'];
    if (indexNames.includes(upper)) {
      setOiUnderlying(upper);
    }
  }, [selectedSymbol]);

  // Fetch screener on first load — delay 3s to not compete with initial stock data fetches
  useEffect(() => { const t = setTimeout(() => fetchScreener(), 3000); return () => clearTimeout(t); }, []);

  // Fetch options on demand
  useEffect(() => { if (optionsData.length === 0) fetchOptions(optionsUnderlying); }, [optionsUnderlying]);

  const fetchOIData = useCallback(async (underlying: string, expiry?: string, liveSpotPrice?: number) => {
    setOiLoading(true);
    try {
      const sp = new URLSearchParams({ underlying, type: 'both' });
      if (expiry) sp.append('expiry', expiry);
      // Pass live spot price from Upstox WS tick so mock OI uses correct strikes
      if (liveSpotPrice && liveSpotPrice > 0) sp.append('spot', String(liveSpotPrice));
      const res = await fetch('/api/oi-data?' + sp.toString());
      if (!res.ok) throw new Error(`oi-data API ${res.status}`);
      const data = await res.json();
      if (data.option) {
        setOiOptionData(data.option);
        if (data.option.expiryDates?.length > 0 && !oiExpiryFilter) {
          setOiExpiryFilter(data.option.expiryDates[0]);
        }
      }
      if (data.futures) setOiFuturesData(data.futures);
      if (data.underlyings) setOiUnderlyings(data.underlyings);
      if (data.lastUpdated) setOiLastUpdated(data.lastUpdated);
      addSavePoint('OI Data Loaded', `${underlying} | PCR: ${data.option?.pcr?.toFixed(2) || 'N/A'} | MaxPain: ${data.option?.maxPain?.toLocaleString('en-IN') || 'N/A'}`);
    } catch (err) { console.warn('[fetchOIData]', err); } finally { setOiLoading(false); }
  }, [addSavePoint, oiExpiryFilter]);

  // Fetch OI on underlying change
  useEffect(() => {
    // Try to get live price from window.__upstoxLiveTicks if available
    // (set by page.tsx before calling fetchOIData)
    fetchOIData(oiUnderlying);
  }, [oiUnderlying]);

  // Auto-switch OI underlying when selected stock is an F&O underlying
  useEffect(() => {
    if (!selectedSymbol) return;
    let target = selectedSymbol.toUpperCase();
    // Map index display names to OI underlyings
    if (selectedType === 'index') {
      const idxMap: Record<string, string> = { 'NIFTY 50': 'NIFTY', 'NIFTY BANK': 'BANKNIFTY', 'NIFTY FIN SERVICE': 'FINNIFTY', 'NIFTY IT': 'NIFTYIT', 'NIFTY NEXT 50': 'NIFTYNXT50' };
      target = idxMap[selectedSymbol.toUpperCase()] || selectedSymbol.toUpperCase();
    }
    if (oiUnderlyings.length > 0 && oiUnderlyings.includes(target) && oiUnderlying !== target) {
      setOiUnderlying(target);
      setOiExpiryFilter('');
    }
  }, [selectedSymbol, selectedType, oiUnderlyings]);

  // Re-fetch OI when expiry filter changes
  useEffect(() => { if (oiExpiryFilter && oiUnderlying) fetchOIData(oiUnderlying, oiExpiryFilter); }, [oiExpiryFilter]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh || !selectedSymbol) return;
    const detailInterval = setInterval(() => {
      silentFetchDetail(selectedSymbol);
    }, refreshInterval * 1000);
    const overviewInterval = setInterval(() => {
      fetch('/api/quote?overview=true').then(r => r.ok ? r.json() : null).then((ov: any) => {
        if (ov) setOverview(ov);
      }).catch(() => {});
    }, 60000);
    return () => {
      clearInterval(detailInterval);
      clearInterval(overviewInterval);
    };
  }, [autoRefresh, refreshInterval, selectedSymbol, silentFetchDetail]);

  const handleRefresh = () => {
    if (!selectedSymbol) return;
    fetchDetail(selectedSymbol);
    fetchSignals(selectedSymbol, params);
    fetchNews(selectedSymbol);
    fetchScreener();
  };

  const handleSelect = (sym: string, type: string) => {
    setSelectedSymbol(sym);
    setSelectedType(type);
    setSheetOpen(false);
    setNews([]);
    // Don't clear screenerData — it's independent of selected stock
    // Re-fetch screener in background to keep it fresh
    fetchScreener();
  };

  const chartData = useMemo(() => {
    const m = new Map(signals.map(s => [s.date, s]));
    return stockData.map(d => {
      const s = m.get(d.date);
      return {
        ...d,
        supertrend: s?.supertrend ?? null,
        supertrendDir: s?.supertrendDir ?? null,
        rsi: s?.rsi ?? null,
        macd: s?.macd ?? null,
        macdSignal: s?.macdSignal ?? null,
        macdHistogram: s?.macdHistogram ?? null,
        signal: s?.signal ?? null,
      };
    });
  }, [stockData, signals]);

  const visibleData = useMemo(() => {
    const max = 100;
    const end = chartData.length;
    return chartData.slice(Math.max(0, end - max), end);
  }, [chartData]);

  const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  const filteredEquities = useMemo(() => {
    let list = equities;
    if (equitySearch) {
      const q = equitySearch.toLowerCase();
      list = list.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    if (selectedSector !== 'all') list = list.filter(s => s.sector === selectedSector);
    return list;
  }, [equities, equitySearch, selectedSector]);

  const filteredScreener = useMemo(() => {
    let d = screenerData;
    // Client-side multi-select signal filter
    if (screenerFilter.length > 0) {
      const signalSet = new Set(screenerFilter);
      d = d.filter(s => signalSet.has(s.signal));
    }
    // Client-side multi-select sector filter
    if (screenerSector.length > 0) {
      const sectorSet = new Set(screenerSector);
      d = d.filter(s => sectorSet.has(s.sector));
    }
    if (screenerSearched) {
      const q = screenerSearched.toLowerCase();
      d = d.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return d;
  }, [screenerData, screenerSearched, screenerFilter, screenerSector]);

  const filteredOptions = useMemo(() => {
    if (!optionsExpiryFilter) return optionsData;
    return optionsData.filter(o => o.expiry === optionsExpiryFilter);
  }, [optionsData, optionsExpiryFilter]);

  const q = detail?.quote || null;
  const t = detail?.technicals || {};
  const perf = detail?.performance || {};
  const own = detail?.ownership || {};
  const fin = detail?.financials || {};

  return {
    // State
    autoRefresh, setAutoRefresh, refreshInterval, setRefreshInterval,
    sheetOpen, setSheetOpen,
    equities, indices, sectors,
    selectedSymbol, selectedType,
    signalsLoading, detailLoading, initialLoadError, setInitialLoadError,
    stockData, signals, backtest, params, setParams, recalculating, setRecalculating,
    detail, overview, lastDate, lastUpdated,
    equitySearch, setEquitySearch, selectedSector, setSelectedSector,
    news, newsLoading,
    screenerData, setScreenerData, screenerCounts, screenerTotal, screenerLoading, screenerError, screenerFilter, setScreenerFilter,
    screenerSector, setScreenerSector, screenerSearched, setScreenerSearched,
    optionsUnderlying, setOptionsUnderlying,
    optionsData, setOptionsData, optionsExpiries, setOptionsExpiries,
    optionsLoading, optionsExpiryFilter, setOptionsExpiryFilter,
    oiUnderlying, setOiUnderlying,
    oiOptionData, oiFuturesData,
    oiLoading, oiExpiryFilter, setOiExpiryFilter,
    oiUnderlyings,
    oiLastUpdated,
    backtestDays, setBacktestDays,
    savePoints,
    // Derived
    chartData, visibleData, latestSignal,
    filteredEquities, filteredScreener, filteredOptions,
    q, t, perf, own, fin,
    // Actions
    handleRefresh, handleSelect,
    fetchSignals, fetchNews, fetchScreener, fetchOptions, fetchOIData,
    silentFetchDetail,
  };
}