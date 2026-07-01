import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData, getLiveQuote } from "@/lib/market-data";
import {
  generateSignals,
  runBacktest,
  DEFAULT_PARAMS,
  type StrategyParams,
} from "@/lib/trading-strategy";

// GET /api/signals?symbol=RELIANCE&days=200
// Always uses real Yahoo Finance data for equities and indices
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
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

  try {
    // Always fetch real data from Yahoo Finance
    const stockData = await getHistoricalData(symbol, days);

    if (stockData.length < 50) {
      return NextResponse.json(
        { error: "Insufficient historical data from Yahoo Finance" },
        { status: 422 }
      );
    }

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
      stockInfo: {
        symbol,
        name: liveQuote?.name || symbol,
        sector: liveQuote?.sector || "",
        basePrice: liveQuote?.price || stockData[stockData.length - 1]?.close || 0,
        type: liveQuote?.type || "equity",
      },
      params,
      stockData,
      dataSource: "yahoo_finance",
      dataPoints: stockData.length,
      lastDate: stockData[stockData.length - 1]?.date,
      liveQuote,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch data: " + err.message },
      { status: 500 }
    );
  }
}