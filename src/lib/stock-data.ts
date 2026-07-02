// NSE Stock Types and Helpers
// The canonical stock list is in stock-list.ts (used by API routes).

export interface StockInfo {
  symbol: string;
  name: string;
  sector: string;
  basePrice: number;
  volatility: number;
  type: "equity" | "index" | "option";
  underlying?: string;
  strikePrice?: number;
  optionType?: "CE" | "PE";
  expiry?: string;
  lotSize?: number;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}