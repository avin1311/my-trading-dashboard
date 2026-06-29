import { NextResponse } from "next/server";
import { NSE_STOCKS } from "@/lib/stock-data";

export async function GET() {
  return NextResponse.json(NSE_STOCKS);
}
