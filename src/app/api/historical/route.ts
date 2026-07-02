import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/market-data";
import {
  generateSignals,
  runBacktest,
  DEFAULT_PARAMS,
  type StrategyParams,
} from "@/lib/trading-strategy";

// GET /api/historical?symbol=RELIANCE&days=200
// Returns real historical data from Yahoo Finance + strategy signals + backtest
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  const days = Math.min(
    Math.max(Number(searchParams.get("days")) || 200, 30),
    500
  );

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
    const stockData = await getHistoricalData(symbol, days);

    if (stockData.length < 50) {
      return NextResponse.json(
        { error: "Insufficient historical data" },
        { status: 422, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
      );
    }

    const signals = generateSignals(stockData, params);
    const backtest = runBacktest(stockData, signals);

    return NextResponse.json({
      stockData,
      signals,
      backtest,
      params,
      dataSource: "yahoo_finance",
      dataPoints: stockData.length,
      lastDate: stockData[stockData.length - 1]?.date,
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch data: " + err.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
    );
  }
}

