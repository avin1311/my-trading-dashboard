import { NextRequest, NextResponse } from "next/server";
import { NSE_STOCKS, generateStockData, generateOptionsChain } from "@/lib/stock-data";
import { getHistoricalData, getLiveQuote } from "@/lib/market-data";
import {
  generateSignals,
  runBacktest,
  DEFAULT_PARAMS,
  type StrategyParams,
} from "@/lib/trading-strategy";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const useRealData = searchParams.get("real") !== "false"; // Default true

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const stock = NSE_STOCKS.find((s) => s.symbol === symbol);
  if (!stock) {
    // Try options chains
    for (const underlyingSymbol of [
      "NIFTY", "BANKNIFTY", "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    ]) {
      const chain = generateOptionsChain(underlyingSymbol);
      const found = chain.find((o) => o.symbol === symbol);
      if (found) {
        // Options always use generated data
        return handleGeneratedData(found, searchParams);
      }
    }
    return NextResponse.json({ error: "Instrument not found" }, { status: 404 });
  }

  const days = Math.min(Math.max(Number(searchParams.get("days")) || 200, 30), 500);

  const params: StrategyParams = {
    supertrendPeriod: Number(searchParams.get("supertrendPeriod")) || DEFAULT_PARAMS.supertrendPeriod,
    supertrendMultiplier: Number(searchParams.get("supertrendMultiplier")) || DEFAULT_PARAMS.supertrendMultiplier,
    rsiPeriod: Number(searchParams.get("rsiPeriod")) || DEFAULT_PARAMS.rsiPeriod,
    rsiOverbought: Number(searchParams.get("rsiOverbought")) || DEFAULT_PARAMS.rsiOverbought,
    rsiOversold: Number(searchParams.get("rsiOversold")) || DEFAULT_PARAMS.rsiOversold,
    macdFast: Number(searchParams.get("macdFast")) || DEFAULT_PARAMS.macdFast,
    macdSlow: Number(searchParams.get("macdSlow")) || DEFAULT_PARAMS.macdSlow,
    macdSignal: Number(searchParams.get("macdSignal")) || DEFAULT_PARAMS.macdSignal,
  };

  // Try real data first (for equities and indices)
  if (useRealData && stock.type !== "option") {
    try {
      const stockData = await getHistoricalData(symbol, days);
      if (stockData.length >= 50) {
        const signals = generateSignals(stockData, params);
        const backtest = runBacktest(stockData, signals);

        // Also get live quote for current info
        let liveQuote = null;
        try {
          liveQuote = await getLiveQuote(symbol);
        } catch {}

        return NextResponse.json({
          signals,
          backtest,
          stockInfo: { ...stock, basePrice: liveQuote?.price || stock.basePrice },
          params,
          stockData,
          dataSource: "yahoo_finance_realtime",
          dataPoints: stockData.length,
          lastDate: stockData[stockData.length - 1]?.date,
          liveQuote,
        });
      }
    } catch (err: any) {
      console.error("Real data failed, falling back to generated:", err.message);
    }
  }

  // Fallback to generated data
  return handleGeneratedData(stock, searchParams);
}

function handleGeneratedData(
  stock: any,
  searchParams: URLSearchParams
) {
  const days = Math.min(Math.max(Number(searchParams.get("days")) || 200, 30), 500);
  const params: StrategyParams = {
    supertrendPeriod: Number(searchParams.get("supertrendPeriod")) || DEFAULT_PARAMS.supertrendPeriod,
    supertrendMultiplier: Number(searchParams.get("supertrendMultiplier")) || DEFAULT_PARAMS.supertrendMultiplier,
    rsiPeriod: Number(searchParams.get("rsiPeriod")) || DEFAULT_PARAMS.rsiPeriod,
    rsiOverbought: Number(searchParams.get("rsiOverbought")) || DEFAULT_PARAMS.rsiOverbought,
    rsiOversold: Number(searchParams.get("rsiOversold")) || DEFAULT_PARAMS.rsiOversold,
    macdFast: Number(searchParams.get("macdFast")) || DEFAULT_PARAMS.macdFast,
    macdSlow: Number(searchParams.get("macdSlow")) || DEFAULT_PARAMS.macdSlow,
    macdSignal: Number(searchParams.get("macdSignal")) || DEFAULT_PARAMS.macdSignal,
  };

  const data = generateStockData(stock, days);
  const signals = generateSignals(data, params);
  const backtest = runBacktest(data, signals);

  return NextResponse.json({
    signals,
    backtest,
    stockInfo: stock,
    params,
    stockData: data,
    dataSource: "simulated",
    dataPoints: data.length,
  });
}