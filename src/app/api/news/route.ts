import { NextRequest, NextResponse } from "next/server";

interface NewsItem {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
}

const CACHE_MAX = 500;
const newsCache = new Map<string, { data: NewsItem[]; timestamp: number; error?: string }>();
const CACHE_TTL = 5 * 60_000; // 5 min (reduced from 10 for freshness)

// Decode HTML entities that Google News RSS commonly returns
function decodeEntities(s: string): string {
  if (!s) return "";
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

// Strip HTML tags from a string (Google News <description> often contains markup)
function stripHtml(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function classifySentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const pos = ["surge", "rally", "jump", "gain", "rise", "soar", "profit", "beat", "upgrade", "bullish", "growth", "record high", "strong", "outperform", "buy", "boost", "climb", "approve", "win", "award", "deal"];
  const neg = ["fall", "drop", "crash", "decline", "loss", "miss", "downgrade", "bearish", "weak", "underperform", "sell", "slump", "plunge", "tumble", "cut", "fear", "risk", "fraud", "probe", "lawsuit", "ban", "fine", "default"];
  let ps = 0, ns = 0;
  for (const w of pos) if (lower.includes(w)) ps++;
  for (const w of neg) if (lower.includes(w)) ns++;
  return ps > ns ? "positive" : ns > ps ? "negative" : "neutral";
}

// Extracts an item's first matching tag value (raw, including CDATA)
function extractTag(item: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = item.match(re);
  return m ? m[1] : "";
}

// Google News RSS often wraps the actual story URL inside a redirect like:
// https://news.google.com/rss/articles/CBM.../stories...
// We try to extract the underlying URL when possible; otherwise we keep the
// Google News link which still works for the user.
function unwrapGoogleNewsUrl(rawLink: string): string {
  const link = rawLink.trim();
  if (!link) return link;
  // Try to find a "url=" query param
  const m = link.match(/[?&]url=([^&]+)/);
  if (m) {
    try { return decodeURIComponent(m[1]); } catch { /* ignore */ }
  }
  return link;
}

/**
 * Fetch news from Google News RSS. Each <item> contains:
 *   <title>, <link>, <pubDate>, <description>, <source url="...">Name</source>
 * The <source> tag gives us the actual publication name (e.g. Reuters, ET Markets).
 */
async function fetchGoogleNews(query: string, limit = 20): Promise<NewsItem[]> {
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

      const rawTitle = extractTag(item, "title");
      const rawLink = extractTag(item, "link");
      const rawDate = extractTag(item, "pubDate");
      const rawDesc = extractTag(item, "description");
      const rawSource = extractTag(item, "source");

      const title = decodeEntities(rawTitle);
      if (!title || title.length < 15) continue;

      // Source: prefer the <source> tag content (the actual publication name);
      // fall back to a sensible default.
      const sourceName = decodeEntities(rawSource).replace(/<[^>]*>/g, "").trim() || "Google News";

      const link = unwrapGoogleNewsUrl(rawLink);
      const summary = stripHtml(rawDesc) || (title.length > 140 ? title.substring(0, 140) + "..." : title);

      let publishedAt: string;
      if (rawDate) {
        const d = new Date(rawDate.trim());
        publishedAt = isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } else {
        publishedAt = new Date().toISOString();
      }

      items.push({
        title,
        source: sourceName,
        url: link || "https://news.google.com",
        publishedAt,
        summary,
        sentiment: classifySentiment(title + " " + summary),
      });

      if (items.length >= limit) break;
    }
    return items;
  } catch {
    return [];
  }
}

/**
 * Fallback: try to fetch a few headlines from Moneycontrol's RSS feeds.
 * Moneycontrol provides category-based RSS feeds we can parse the same way.
 */
async function fetchMoneycontrolFallback(limit = 10): Promise<NewsItem[]> {
  const feeds = [
    "https://www.moneycontrol.com/rss/latestnews.xml",
    "https://www.moneycontrol.com/rss/markets.xml",
  ];
  const out: NewsItem[] = [];
  for (const feed of feeds) {
    if (out.length >= limit) break;
    try {
      const res = await fetch(feed, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Bot)" },
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      if (!text || text.length < 100) continue;
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(text)) !== null && out.length < limit) {
        const item = match[1];
        const title = decodeEntities(extractTag(item, "title"));
        const link = extractTag(item, "link").trim();
        const rawDate = extractTag(item, "pubDate");
        const desc = stripHtml(extractTag(item, "description"));
        if (!title || title.length < 15) continue;
        let publishedAt = new Date().toISOString();
        if (rawDate) {
          const d = new Date(rawDate.trim());
          if (!isNaN(d.getTime())) publishedAt = d.toISOString();
        }
        out.push({
          title,
          source: "Moneycontrol",
          url: link || "https://www.moneycontrol.com",
          publishedAt,
          summary: desc || (title.length > 140 ? title.substring(0, 140) + "..." : title),
          sentiment: classifySentiment(title + " " + desc),
        });
      }
    } catch {
      // skip this feed
    }
  }
  return out;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "symbol is required" }, { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });

  const cached = newsCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json({ news: cached.data, cached: true, source: 'cache' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }
  if (cached && cached.error && Date.now() - cached.timestamp < 60_000) {
    // Return cached error for 1 min to avoid hammering the API
    return NextResponse.json({ news: [], cached: true, error: cached.error, source: 'error_cache' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }

  try {
    // Primary: Google News RSS — symbol-specific + general market
    const [symNews, mktNews, mcFallback] = await Promise.allSettled([
      fetchGoogleNews(symbol + " stock NSE BSE India", 20),
      fetchGoogleNews("NSE stocks market India", 10),
      fetchMoneycontrolFallback(10),
    ]);

    const symItems = symNews.status === "fulfilled" ? symNews.value : [];
    const mktItems = mktNews.status === "fulfilled" ? mktNews.value : [];
    const mcItems = mcFallback.status === "fulfilled" ? mcFallback.value : [];

    // Combine: prefer symbol-specific news, then market news, then Moneycontrol fallback
    const all = [...symItems, ...mktItems, ...mcItems];

    // De-duplicate by normalized title prefix
    const seen = new Set<string>();
    const unique = all.filter((n) => {
      const k = n.title.substring(0, 50).toLowerCase().replace(/[^a-z0-9 ]/g, "");
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    // Sort by date descending (latest first)
    unique.sort((a, b) => {
      const da = new Date(a.publishedAt).getTime();
      const db = new Date(b.publishedAt).getTime();
      return db - da;
    });

    // Return latest 20
    const finalNews = unique.slice(0, 20);

    newsCache.set(symbol, { data: finalNews, timestamp: Date.now() });
    if (newsCache.size > CACHE_MAX) {
      // Evict oldest 50% of entries
      const keysToDelete = Array.from(newsCache.keys()).slice(0, Math.floor(CACHE_MAX / 2));
      keysToDelete.forEach(k => newsCache.delete(k));
    }
    return NextResponse.json({ news: finalNews, cached: false, source: 'live' }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  } catch (err: any) {
    console.error('[news]', err);
    newsCache.set(symbol, { data: [], timestamp: Date.now(), error: 'Internal server error' });
    return NextResponse.json({ error: 'Internal server error', news: [], source: 'error' }, { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } });
  }
}
