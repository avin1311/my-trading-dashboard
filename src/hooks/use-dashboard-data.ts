'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  StockInfo, OHLCV, StrategySignal, BacktestResult, StrategyParams,
  StockDetail, MarketOverview, NewsItem, ScreenerResult, SavePoint, ChartDataPoint,
} from '@/lib/types';
import { DEFAULT_PARAMS } from '@/lib/types';

export function useDashboardData() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [equities, setEquities] = useState<StockInfo[]>([]);
  const [indices, setIndices] = useState<StockInfo[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE');
  const [selectedType, setSelectedType] = useState('equity');
  const [signalsLoading, setSignalsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [stockData, setStockData] = useState<OHLCV[]>([]);
  const [signals, setSignals] = useState<StrategySignal[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult | null>(null);
  const [params, setParams] = useState<StrategyParams>({ ...DEFAULT_PARAMS });
  const [recalculating, setRecalculating] = useState(false);
  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [overview, setOverview] = useState<MarketOverview | null>(null);
  const [lastDate, setLastDate] = useState('');
  const [equitySearch, setEquitySearch] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');

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
    setTimeout(() => setSavePoints(prev => prev.filter(p => p.id !== sp.id)), 8000);
  }, []);

  // Initial load
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
      addSavePoint('Market Data Loaded', `${(eq.instruments || []).length} equities, ${(idx.instruments || []).length} indices loaded from Yahoo Finance`);
    }).catch(console.error);
  }, []);

  const fetchDetail = useCallback(async (sym: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch('/api/stock-detail?symbol=' + sym);
      const data = await res.json();
      if (data.quote) {
        setDetail(data);
        addSavePoint(`Loaded ${sym}`, `Price: ${data.quote.price.toLocaleString('en-IN')} | ${data.quote.changePct >= 0 ? '+' : ''}${data.quote.changePct.toFixed(2)}% | Data points: ${data.dataPoints}`);
      }
    } catch {} finally { setDetailLoading(false); }
  }, [addSavePoint]);

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
      addSavePoint('Screener Complete', `Scanned ${data.totalScanned} stocks | ${data.totalMatched} matched | Source: ${data.dataSource}`);
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

  useEffect(() => { fetchDetail(selectedSymbol); fetchSignals(selectedSymbol, params); }, [selectedSymbol]);
  useEffect(() => { if (activeTab === 'news' && news.length === 0) fetchNews(selectedSymbol); }, [activeTab, selectedSymbol]);
  useEffect(() => { if (activeTab === 'screener' && screenerData.length === 0) fetchScreener(); }, [activeTab]);
  useEffect(() => { if (activeTab === 'options' && optionsData.length === 0) fetchOptions(optionsUnderlying); }, [activeTab, optionsUnderlying]);

  const handleRefresh = () => {
    fetchDetail(selectedSymbol);
    fetchSignals(selectedSymbol, params);
    if (activeTab === 'news') fetchNews(selectedSymbol);
  };

  const handleSelect = (sym: string, type: string) => {
    setSelectedSymbol(sym);
    setSelectedType(type);
    setSheetOpen(false);
    setActiveTab('overview');
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
    sheetOpen, setSheetOpen,
    equities, indices, sectors,
    selectedSymbol, selectedType,
    signalsLoading, detailLoading,
    stockData, signals, backtest, params, setParams, recalculating, setRecalculating,
    detail, overview, lastDate,
    equitySearch, setEquitySearch, selectedSector, setSelectedSector,
    activeTab, setActiveTab,
    news, newsLoading,
    screenerData, setScreenerData, screenerCounts, screenerLoading, screenerFilter, setScreenerFilter,
    screenerSector, setScreenerSector, screenerSearched, setScreenerSearched,
    optionsUnderlying, setOptionsUnderlying,
    optionsData, setOptionsData, optionsExpiries, setOptionsExpiries,
    optionsLoading, optionsExpiryFilter, setOptionsExpiryFilter,
    savePoints,
    // Derived
    chartData, visibleData, latestSignal,
    filteredEquities, filteredScreener, filteredOptions,
    q, t, perf, own, fin,
    // Actions
    handleRefresh, handleSelect,
    fetchSignals, fetchNews, fetchScreener, fetchOptions,
  };
}