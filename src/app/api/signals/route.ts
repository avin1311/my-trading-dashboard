import { NextRequest, NextResponse } from "next/server";
import { NSE_STOCKS, generateStockData } from "@/lib/stock-data";
import {
  generateSignals,
  runBacktest,
  DEFAULT_PARAMS,
  type StrategyParams,
} from "@/lib/trading-strategy";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const stock = NSE_STOCKS.find((s) => s.symbol === symbol);
  if (!stock) {
    return NextResponse.json({ error: "Stock not found" }, { status: 404 });
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

  const data = generateStockData(stock, days);
  const signals = generateSignals(data, params);
  const backtest = runBacktest(data, signals);

  return NextResponse.json({
    signals,
    backtest,
    stockInfo: stock,
    params,
    stockData: data,
  });
}