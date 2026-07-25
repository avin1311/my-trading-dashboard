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
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [selectedType, setSelectedType] = useState('equity');
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);

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
  const [screenerLoading, setScreenerLoading] = useState(false);
  const [screenerFilter, setScreenerFilter] = useState('ALL');
  const [screenerSector, setScreenerSector] = useState('all');
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

  // Save points
  const [savePoints, setSavePoints] = useState<SavePoint[]>([]);
  const spId = useRef(0);
  const addSavePoint = useCallback((label: string, detail: string) => {
    spId.current++;
    const sp: SavePoint = {
      id: spId.current, label, detail,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setSavePoints(prev => [...prev.slice(-5), sp]);
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setTimeout(() => setSavePoints(prev => prev.filter(p => p.id !== sp.id)), 8000);
  }, []);

  // Initial load — fetch stocks, indices, overview
  useEffect(() => {
    Promise.all([
      fetch('/api/stocks?type=equity').then(r => r.json()),
      fetch('/api/stocks?type=index').then(r => r.json()),
      fetch('/api/quote?overview=true').then(r => r.json()).catch(() => null),
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
      const res = await fetch('/api/stock-detail?symbol=' + sym);
      const data = await res.json();
      if (data.quote) {
        setDetail(data);
        addSavePoint(`Loaded ${sym}`, `Price: ₹${data.quote.price.toLocaleString('en-IN')} | ${data.quote.changePct >= 0 ? '+' : ''}${data.quote.changePct.toFixed(2)}%`);
      }
    } catch {} finally { setDetailLoading(false); }
  }, [addSavePoint]);

  // Silent fetch — no save points, no loading spinner
  const silentFetchDetail = useCallback(async (sym: string) => {
    try {
      const res = await fetch('/api/stock-detail?symbol=' + sym);
      const data = await res.json();
      if (data.quote) {
        setDetail(data);
      }
    } catch {}
  }, []);

  const fetchSignals = useCallback(async (sym: string, p: StrategyParams) => {
    setSignalsLoading(true);
    try {
      const sp = new URLSearchParams({ symbol: sym, days: '200' });
      for (const [k, v] of Object.entries(p)) sp.append(k, String(v));
      const res = await fetch('/api/signals?' + sp.toString());
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
    } catch {} finally { setSignalsLoading(false); setRecalculating(false); }
  }, [addSavePoint]);

  const fetchNews = useCallback(async (sym: string) => {
    setNewsLoading(true);
    try {
      const res = await fetch('/api/news?symbol=' + sym);
      const data = await res.json();
      if (data.news) setNews(data.news);
    } catch {} finally { setNewsLoading(false); }
  }, []);

  const fetchScreener = useCallback(async () => {
    setScreenerLoading(true);
    try {
      const sp = new URLSearchParams({ limit: '60' });
      if (screenerFilter !== 'ALL') sp.append('signal', screenerFilter);
      if (screenerSector !== 'all') sp.append('sector', screenerSector);
      const res = await fetch('/api/screener?' + sp.toString());
      const data = await res.json();
      setScreenerData(data.results || []);
      setScreenerCounts(data.signalCounts || {});
      addSavePoint('Screener Complete', `Scanned ${data.totalScanned} stocks | ${data.totalMatched} matched`);
    } catch {} finally { setScreenerLoading(false); }
  }, [screenerFilter, screenerSector, addSavePoint]);

  const fetchOptions = useCallback(async (underlying: string) => {
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/stocks?type=option&underlying=${underlying}`);
      const data = await res.json();
      setOptionsData(data.instruments || []);
      setOptionsExpiries(data.expiryDates || []);
      if (data.expiryDates?.length > 0) setOptionsExpiryFilter(data.expiryDates[0]);
    } catch {} finally { setOptionsLoading(false); }
  }, []);

  // When symbol changes: fetch detail + signals + news
  useEffect(() => {
    if (!selectedSymbol) return;
    fetchDetail(selectedSymbol);
    fetchSignals(selectedSymbol, params);
    fetchNews(selectedSymbol);
  }, [selectedSymbol]);

  // Fetch screener on first load
  useEffect(() => { fetchScreener(); }, []);

  // Fetch options on demand
  useEffect(() => { if (optionsData.length === 0) fetchOptions(optionsUnderlying); }, [optionsUnderlying]);

  const fetchOIData = useCallback(async (underlying: string, expiry?: string) => {
    setOiLoading(true);
    try {
      const sp = new URLSearchParams({ underlying, type: 'both' });
      if (expiry) sp.append('expiry', expiry);
      const res = await fetch('/api/oi-data?' + sp.toString());
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
    } catch {} finally { setOiLoading(false); }
  }, [addSavePoint, oiExpiryFilter]);

  // Fetch OI on underlying change
  useEffect(() => { fetchOIData(oiUnderlying); }, [oiUnderlying]);

  // Re-fetch OI when expiry filter changes
  useEffect(() => { if (oiExpiryFilter && oiUnderlying) fetchOIData(oiUnderlying, oiExpiryFilter); }, [oiExpiryFilter]);

  // Auto-refresh polling
  useEffect(() => {
    if (!autoRefresh || !selectedSymbol) return;
    const detailInterval = setInterval(() => {
      silentFetchDetail(selectedSymbol);
    }, refreshInterval * 1000);
    const overviewInterval = setInterval(() => {
      fetch('/api/quote?overview=true').then(r => r.json()).then((ov: any) => {
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
    setScreenerData([]);
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
    if (screenerSearched) {
      const q = screenerSearched.toLowerCase();
      d = d.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
    }
    return d;
  }, [screenerData, screenerSearched]);

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
    signalsLoading, detailLoading,
    stockData, signals, backtest, params, setParams, recalculating, setRecalculating,
    detail, overview, lastDate, lastUpdated,
    equitySearch, setEquitySearch, selectedSector, setSelectedSector,
    news, newsLoading,
    screenerData, setScreenerData, screenerCounts, screenerLoading, screenerFilter, setScreenerFilter,
    screenerSector, setScreenerSector, screenerSearched, setScreenerSearched,
    optionsUnderlying, setOptionsUnderlying,
    optionsData, setOptionsData, optionsExpiries, setOptionsExpiries,
    optionsLoading, optionsExpiryFilter, setOptionsExpiryFilter,
    oiUnderlying, setOiUnderlying,
    oiOptionData, oiFuturesData,
    oiLoading, oiExpiryFilter, setOiExpiryFilter,
    oiUnderlyings,
    oiLastUpdated,
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