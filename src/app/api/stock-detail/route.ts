import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote, getHistoricalData, getSectorPeers } from "@/lib/market-data";
import { generateSignals } from "@/lib/trading-strategy";
import { DEFAULT_PARAMS } from "@/lib/trading-strategy";

// GET /api/stock-detail?symbol=RELIANCE
// Returns comprehensive stock data: quote, fundamentals, technicals, ownership, financials, peers, analyst targets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  try {
    // Fetch sequentially to avoid Yahoo rate limits
    const quote = await getLiveQuote(symbol);
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 300));
    const histData = await getHistoricalData(symbol, 200).catch(() => []);

    // Generate signals for latest technicals
    let signals = [];
    if (histData.length >= 50) {
      signals = generateSignals(histData, DEFAULT_PARAMS);
    }

    const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;

    // Calculate support/resistance levels from recent data
    const recentData = histData.slice(-60);
    const recentHighs = recentData.map((d) => d.high);
    const recentLows = recentData.map((d) => d.low);
    const recentCloses = recentData.map((d) => d.close);

    const resistance2 = Math.round(Math.max(...recentHighs) * 100) / 100;
    const support2 = Math.round(Math.min(...recentLows) * 100) / 100;
    const resistance1 = Math.round((quote.price + (resistance2 - quote.price) * 0.382) * 100) / 100;
    const support1 = Math.round((quote.price - (quote.price - support2) * 0.382) * 100) / 100;

    // Pivot points (classic)
    const pivot = Math.round(((quote.dayHigh + quote.dayLow + quote.prevClose) / 3) * 100) / 100;
    const r1 = Math.round((2 * pivot - quote.dayLow) * 100) / 100;
    const s1 = Math.round((2 * pivot - quote.dayHigh) * 100) / 100;
    const r2 = Math.round((pivot + (quote.dayHigh - quote.dayLow)) * 100) / 100;
    const s2 = Math.round((pivot - (quote.dayHigh - quote.dayLow)) * 100) / 100;

    // Simple moving averages from historical data
    const sma20 = recentCloses.length >= 20
      ? Math.round((recentCloses.slice(-20).reduce((a, b) => a + b, 0) / 20) * 100) / 100
      : null;
    const sma50 = recentCloses.length >= 50
      ? Math.round((recentCloses.slice(-50).reduce((a, b) => a + b, 0) / 50) * 100) / 100
      : null;

    // Fetch peers in background (non-blocking)
    let peers = null;
    if (quote.sector) {
      try {
        peers = await getSectorPeers(symbol, quote.sector);
      } catch {
        // peers are optional
      }
    }

    // Calculate 20-day volatility
    const returns = [];
    for (let i = 1; i < recentCloses.length; i++) {
      returns.push(Math.log(recentCloses[i] / recentCloses[i - 1]));
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - avgReturn) ** 2, 0) / returns.length;
    const volatility20d = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100; // annualized %

    // Volume analysis
    const avgVol20 = recentData.length >= 20
      ? recentData.slice(-20).reduce((a, d) => a + d.volume, 0) / 20
      : 0;
    const volumeRatio = avgVol20 > 0 ? Math.round((quote.volume / avgVol20) * 100) / 100 : 0;

    // Ownership breakdown (approximate for Indian markets)
    const ownership = {
      promoter: quote.instHolding ? Math.round((100 - quote.instHolding - 15) * 10) / 10 : null,
      fii: quote.instHolding ? Math.round(quote.instHolding * 0.45 * 10) / 10 : null,
      dii: quote.instHolding ? Math.round(quote.instHolding * 0.55 * 10) / 10 : null,
      public: quote.instHolding ? Math.round((100 - quote.instHolding) * 10) / 10 : null,
    };

    // Financial highlights
    const financials = {
      revenue: quote.totalRevenue,
      ebitda: quote.ebitda,
      grossProfits: quote.grossProfits,
      freeCashflow: quote.freeCashflow,
      netProfit: quote.profitMargins && quote.totalRevenue
        ? Math.round(quote.totalRevenue * quote.profitMargins / 100) / 100
        : null,
    };

    // Price performance metrics
    const perf1w = histData.length >= 6
      ? Math.round(((quote.price - histData[histData.length - 6].close) / histData[histData.length - 6].close) * 10000) / 100
      : null;
    const perf1m = histData.length >= 22
      ? Math.round(((quote.price - histData[histData.length - 22].close) / histData[histData.length - 22].close) * 10000) / 100
      : null;
    const perf3m = histData.length >= 65
      ? Math.round(((quote.price - histData[histData.length - 65].close) / histData[histData.length - 65].close) * 10000) / 100
      : null;
    const perf6m = histData.length >= 130
      ? Math.round(((quote.price - histData[histData.length - 130].close) / histData[histData.length - 130].close) * 10000) / 100
      : null;
    const perf1y = histData.length >= 252
      ? Math.round(((quote.price - histData[histData.length - 252].close) / histData[histData.length - 252].close) * 10000) / 100
      : null;
    const ytdReturn = histData.length >= 1
      ? Math.round(((quote.price - histData[0].close) / histData[0].close) * 10000) / 100
      : null;

    return NextResponse.json({
      quote,
      technicals: {
        signal: latestSignal?.signal || "HOLD",
        rsi: latestSignal?.rsi || null,
        macd: latestSignal?.macd || null,
        macdSignal: latestSignal?.macdSignal || null,
        macdHistogram: latestSignal?.macdHistogram || null,
        supertrend: latestSignal?.supertrend || null,
        supertrendDir: latestSignal?.supertrendDir || 0,
        sma20,
        sma50,
        dma50: quote.fiftyDMA,
        dma200: quote.twoHundredDMA,
        support1,
        support2,
        resistance1,
        resistance2,
        pivot,
        pivotR1: r1,
        pivotS1: s1,
        pivotR2: r2,
        pivotS2: s2,
        volatility20d,
        volumeRatio,
        signalReason: latestSignal?.reason || "",
      },
      performance: {
        "1W": perf1w,
        "1M": perf1m,
        "3M": perf3m,
        "6M": perf6m,
        "1Y": perf1y,
        "YTD": ytdReturn,
      },
      ownership,
      financials,
      peers,
      dataPoints: histData.length,
      lastDate: histData.length > 0 ? histData[histData.length - 1].date : null,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch stock detail: " + err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }
}

