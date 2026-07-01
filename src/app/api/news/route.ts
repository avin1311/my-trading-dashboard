import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
}

const newsCache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 10 * 60_000;

async function fetchGoogleNews(query: string): Promise<NewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot)" },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!text || text.length < 100) return [];

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1];
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1].trim() : "";
      const linkMatch = item.match(/<link>(.*?)<\/link>/);
      const link = linkMatch ? linkMatch[1].trim() : "";
      const dateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
      const pubDate = dateMatch ? dateMatch[1].trim() : "";

      if (title && link && title.length > 15) {
        items.push({
          title,
          source: "Google News",
          url: link,
          publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          summary: title.length > 120 ? title.substring(0, 120) + "..." : title,
          sentiment: classifySentiment(title),
        });
      }
    }
    return items.slice(0, 15);
  } catch {
    return [];
  }
}

function classifySentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = ["surge", "rally", "jump", "gain", "rise", "soar", "profit", "beat", "upgrade", "bullish", "growth", "record high", "strong", "outperform", "buy", "boost", "climb"];
  const neg = ["fall", "drop", "crash", "decline", "loss", "miss", "downgrade", "bearish", "weak", "underperform", "sell", "slump", "plunge", "tumble", "cut", "fear", "risk"];
  let ps = 0, ns = 0;
  for (const w of pos) if (lower.includes(w)) ps++;
  for (const w of neg) if (lower.includes(w)) ns++;
  return ps > ns ? "positive" : ns > ps ? "negative" : "neutral";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400 });

  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ news: cached.data, cached: true });
  }

  try {
    const [symNews, mktNews] = await Promise.allSettled([
      fetchGoogleNews(symbol + " stock NSE BSE"),
      fetchGoogleNews("NIFTY Sensex Indian stock market today"),
    ]);
    const all = [
      ...(symNews.status === "fulfilled" ? symNews.value : []),
      ...(mktNews.status === "fulfilled" ? mktNews.value.slice(0, 5) : []),
    ];
    const seen = new Set<string>();
    const unique = all.filter((n) => {
      const k = n.title.substring(0, 40).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    newsCache.set(symbol, { data: unique, timestamp: Date.now() });
    return NextResponse.json({ news: unique, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, news: [] }, { status: 500 });
  }
}