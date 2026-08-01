import { NextRequest, NextResponse } from "next/server";
import { getLiveQuote, getHistoricalData, getSectorPeers } from "@/lib/market-data";
import { generateSignals } from "@/lib/trading-strategy";
import { DEFAULT_PARAMS } from "@/lib/trading-strategy";
import { stockList } from "@/lib/stock-list";
import { checkPE, checkPB, checkPriceBounds, checkRSI, validateAll, safeValue } from "@/lib/data-validation";
import { db } from "@/lib/db";

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

    // ==================== DERIVED FIELDS ====================
    // Always recompute P/B from live price / bookValue.
    // FUNDAMENTALS_DB pb can be stale (bookValue changes quarterly).
    if (quote.bookValue && quote.bookValue > 0 && quote.price) {
      quote.pb = Math.round((quote.price / quote.bookValue) * 100) / 100;
    }

    // ==================== DATA VALIDATION ====================
    // Run invariants — invalidate fields that fail, log warnings
    const valPE = checkPE(quote.pe, quote.price, quote.eps || 0);
    const valPB = checkPB(quote.pb, quote.price, quote.bookValue || 0);
    const valPrice = checkPriceBounds(quote.price, quote.dayLow, quote.dayHigh, quote.low52w, quote.high52w);
    const valRSI = checkRSI(latestSignal?.rsi ?? null);
    const valError = validateAll([valPE, valPB, valPrice, valRSI]);
    if (valError) console.warn(`[validate] ${symbol}: ${valError}`);
    // Null out PE/PB if they fail cross-check (prevents showing misleading ratios)
    if (!valPE.valid) quote.pe = null;
    if (!valPB.valid) quote.pb = null;

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
    // Fallback: if getSectorPeers returned empty, build peers from local stockList
    if ((!peers || peers.length < 2) && quote.sector) {
      try {
        const sectorUpper = quote.sector.toUpperCase();
        const localPeers = stockList.equities
          .filter((e: any) => e.s !== symbol && (e.sec?.toUpperCase() === sectorUpper || e.sec?.toUpperCase().includes(sectorUpper) || sectorUpper.includes(e.sec?.toUpperCase())))
          .slice(0, 8);
        if (localPeers.length >= 2) {
          // Fetch live quotes for local peers in parallel
          const peerQuotes = await Promise.allSettled(
            localPeers.map((e: any) => getLiveQuote(e.s).catch(() => null))
          );
          peers = peerQuotes
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value)
            .map(r => ({
              symbol: r.value.symbol,
              name: r.value.name,
              price: r.value.price,
              changePct: r.value.changePct,
              marketCap: r.value.marketCap,
              pe: r.value.pe,
              pb: r.value.pb,
              roe: r.value.roe,
              revenueGrowth: r.value.revenueGrowth,
            }));
        }
      } catch {
        // final fallback — use local data without live quotes
        if (!peers || peers.length < 2) {
          const sectorUpper = quote.sector.toUpperCase();
          const localPeers = stockList.equities
            .filter((e: any) => e.s !== symbol && (e.sec?.toUpperCase() === sectorUpper || e.sec?.toUpperCase().includes(sectorUpper) || sectorUpper.includes(e.sec?.toUpperCase())))
            .slice(0, 8);
          if (localPeers.length >= 2) {
            peers = localPeers.map((e: any) => ({
              symbol: e.s,
              name: e.n,
              price: 0,
              changePct: 0,
              marketCap: 0,
              pe: null,
              pb: null,
              roe: null,
              revenueGrowth: null,
            }));
          }
        }
      }
    }

    // Annualized volatility from 60-day sample (label should say 60D, not 20D)
    const returns = [];
    for (let i = 1; i < recentCloses.length; i++) {
      returns.push(Math.log(recentCloses[i] / recentCloses[i - 1]));
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - avgReturn) ** 2, 0) / returns.length;
    const volatility60d = Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100; // annualized %

    // Volume analysis
    const avgVol20 = recentData.length >= 20
      ? recentData.slice(-20).reduce((a, d) => a + d.volume, 0) / 20
      : 0;
    const volumeRatio = avgVol20 > 0 ? Math.round((quote.volume / avgVol20) * 100) / 100 : 0;

    // Ownership breakdown (approximate — labeled as such)
    // NOTE: This is synthetic from instHolding. Real ownership requires exchange filings.
    // Four segments normalized to sum to 100%.
    const ownership = quote.instHolding
      ? (() => {
          const nonInst = 100 - quote.instHolding;
          const promoter = Math.round(nonInst * 0.55 * 10) / 10;
          const public_ = Math.round((nonInst - promoter) * 10) / 10;
          const fii = Math.round(quote.instHolding * 0.60 * 10) / 10;
          const dii = Math.round(quote.instHolding * 0.40 * 10) / 10;
          // Final normalization to ensure sum = 100%
          const total = promoter + fii + dii + public_;
          const norm = total > 0 ? 100 / total : 1;
          return {
            promoter: Math.round(promoter * norm * 10) / 10,
            fii: Math.round(fii * norm * 10) / 10,
            dii: Math.round(dii * norm * 10) / 10,
            public: Math.round(public_ * norm * 10) / 10,
            _synthetic: true,
          };
        })()
      : null;

    // Financial highlights
    // netProfit is derived: revenue × profitMargins / 100.
    // profitMargins is net profit margin (%) from FUNDAMENTALS_DB or Yahoo v6 (consistent).
    // This is an approximation — real net profit includes exceptional items, tax adjustments, etc.
    const financials = {
      revenue: quote.totalRevenue,
      ebitda: quote.ebitda,
      grossProfits: quote.grossProfits,
      freeCashflow: quote.freeCashflow,
      opm: quote.operatingMargins ?? null,
      netMargin: quote.profitMargins ?? null,
      netProfit: quote.profitMargins && quote.totalRevenue
        ? Math.round(quote.totalRevenue * quote.profitMargins / 100)
        : null,
      _netProfitEstimated: true,
    };

    // ==================== AUTO-ALERT ON STRONG SIGNALS ====================
    // Auto-create an alert when a STRONG_BUY or STRONG_SELL signal appears.
    // Avoids duplicates: only creates if no untriggered alert for this
    // symbol+direction exists in the last 24 hours.
    let autoAlertCreated = false;
    if (latestSignal && (latestSignal.signal === 'STRONG_BUY' || latestSignal.signal === 'STRONG_SELL')) {
      try {
        const isBuy = latestSignal.signal === 'STRONG_BUY';
        const direction = isBuy ? 'above' : 'below';
        const signalLabel = isBuy ? 'Auto: Strong Buy Signal' : 'Auto: Strong Sell Signal';
        const dayAgo = new Date(Date.now() - 24 * 3600_000);

        const existing = await db.priceAlert.findFirst({
          where: { symbol, condition: direction, triggered: false, createdAt: { gte: dayAgo } },
        });

        if (!existing) {
          const buffer = isBuy ? 1.005 : 0.995;
          const targetPrice = Math.round(quote.price * buffer * 100) / 100;
          await db.priceAlert.create({
            data: {
              symbol, name: signalLabel, condition: direction,
              targetPrice, note: `Auto: ${latestSignal.reason}`,
            },
          });
          autoAlertCreated = true;
          console.log(`[auto-alert] ${direction} ${symbol} @ ${targetPrice} (${latestSignal.signal})`);
        }
      } catch (e: any) {
        console.warn(`[auto-alert] Failed for ${symbol}:`, e.message);
      }
    }

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
    // Period return: from oldest data point to current price.
    // Labeled "Period" (not YTD) since histData[0] is the oldest fetched candle, not Jan 1.
    const periodReturn = histData.length >= 1
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
        volatility60d,
        volumeRatio,
        signalReason: latestSignal?.reason || "",
      },
      performance: {
        "1W": perf1w,
        "1M": perf1m,
        "3M": perf3m,
        "6M": perf6m,
        "1Y": perf1y,
        "Period": periodReturn,
      },
      ownership,
      financials,
      peers,
      dataPoints: histData.length,
      lastDate: histData.length > 0 ? histData[histData.length - 1].date : null,
      autoAlertCreated,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch stock detail: " + err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }
}

