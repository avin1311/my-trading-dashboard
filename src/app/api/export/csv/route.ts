import { NextRequest, NextResponse } from "next/server";
import { getHistoricalData } from "@/lib/market-data";
import { generateSignals, runBacktest } from "@/lib/trading-strategy";
import type { OHLCV } from "@/lib/stock-data";

function csvSafe(val: string | number | null | undefined): string {
  if (val == null) return '""';
  const s = String(val);
  // Prevent formula injection in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s.replace(/"/g, '""') + '"';
  return '"' + s.replace(/"/g, '""') + '"';
}

// GET /api/export/csv?symbol=RELIANCE&days=200&type=signals|backtest|both
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").toUpperCase().trim();
  const days = Math.min(Math.max(parseInt(searchParams.get("days") || "200", 10), 30), 1000);
  const type = searchParams.get("type") || "both";

  if (!symbol) {
    return NextResponse.json({ error: "Missing required query parameter: symbol" }, { status: 400 });
  }

  if (!["signals", "backtest", "both"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Must be: signals, backtest, or both" }, { status: 400 });
  }

  try {
    const historicalData = await getHistoricalData(symbol, days);

    if (!historicalData || historicalData.length === 0) {
      return NextResponse.json({ error: `No historical data found for symbol: ${symbol}` }, { status: 404 });
    }

    // HistoricalDataPoint is structurally identical to OHLCV
    const ohlcvData = historicalData as unknown as OHLCV[];

    const signals = generateSignals(ohlcvData);
    const backtest = runBacktest(ohlcvData, signals);

    const lines: string[] = [];
    const today = new Date().toISOString().split("T")[0];

    if (type === "signals" || type === "both") {
      lines.push("Date,Close,Signal,Supertrend,SupertrendDir,RSI,MACD,MACDSignal,MACDHistogram,Reason");
      for (const s of signals) {
        lines.push(
          [
            csvSafe(s.date),
            csvSafe(s.close),
            csvSafe(s.signal),
            csvSafe(s.supertrend),
            csvSafe(s.supertrendDir),
            csvSafe(s.rsi),
            csvSafe(s.macd),
            csvSafe(s.macdSignal),
            csvSafe(s.macdHistogram),
            csvSafe(s.reason),
          ].join(",")
        );
      }

      if (type === "both") {
        lines.push("");
      }
    }

    if (type === "backtest" || type === "both") {
      lines.push("EntryDate,ExitDate,Type,EntryPrice,ExitPrice,PnL,PnL%,Signal");
      for (const t of backtest.trades) {
        lines.push(
          [
            csvSafe(t.entryDate),
            csvSafe(t.exitDate),
            csvSafe(t.type),
            csvSafe(t.entryPrice),
            csvSafe(t.exitPrice),
            csvSafe(t.pnl),
            csvSafe(t.pnlPct),
            csvSafe(t.signal),
          ].join(",")
        );
      }
    }

    const csvContent = lines.join("\n") + "\n";
    const filename = `${symbol}_${type}_${today}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[export/csv]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
