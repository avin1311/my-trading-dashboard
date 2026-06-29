import { NextRequest, NextResponse } from "next/server";
import { NSE_STOCKS, generateStockData } from "@/lib/stock-data";

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
  const data = generateStockData(stock, days);

  return NextResponse.json({ stockInfo: stock, data });
}