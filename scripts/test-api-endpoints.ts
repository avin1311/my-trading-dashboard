// API Endpoint Tests — run with: npx tsx scripts/test-api-endpoints.ts
const BASE = 'http://127.0.0.1:3000';
let pass = 0, fail = 0;
const errors: string[] = [];

async function check(name: string, url: string, expected: number, validate?: (body: any) => string | null) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const body = await res.json().catch(() => null);
    if (res.status !== expected) {
      console.log(`  ❌ ${name} → HTTP ${res.status} (expected ${expected})`);
      fail++; errors.push(`${name}: HTTP ${res.status}`);
      return null;
    }
    if (validate) {
      const err = validate(body);
      if (err) {
        console.log(`  ❌ ${name} → ${err}`);
        fail++; errors.push(`${name}: ${err}`);
        return null;
      }
    }
    console.log(`  ✅ ${name} → HTTP ${res.status}`);
    pass++;
    return body;
  } catch (e: any) {
    console.log(`  ❌ ${name} → ${e.message}`);
    fail++; errors.push(`${name}: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('=== 1. API ENDPOINT TESTS ===');
  console.log('');

  // Homepage
  await check('GET /', `${BASE}/`, 200);

  // Stock list
  const stocks = await check('GET /api/stocks', `${BASE}/api/stocks`, 200, (b) => {
    if (!b?.equities || b.equities.length < 10) return `Only ${b?.equities?.length || 0} equities`;
    return null;
  });
  if (stocks) console.log(`    ↳ ${stocks.equities.length} equities`);

  // Screener
  const screener = await check('GET /api/screener', `${BASE}/api/screener`, 200, (b) => {
    if (!Array.isArray(b) || b.length === 0) return 'Empty screener';
    return null;
  });
  if (screener) console.log(`    ↳ ${screener.length} stocks`);

  // Quote
  const quote = await check('GET /api/quote?symbol=RELIANCE', `${BASE}/api/quote?symbol=RELIANCE`, 200, (b) => {
    if (!b?.price || b.price <= 0) return `Invalid price: ${b?.price}`;
    return null;
  });
  if (quote) console.log(`    ↳ RELIANCE price: ₹${quote.price}`);

  // Stock detail (the big one — validate ALL fixes)
  const detail = await check('GET /api/stock-detail?symbol=RELIANCE', `${BASE}/api/stock-detail?symbol=RELIANCE`, 200, (b) => {
    const issues: string[] = [];
    // Check volatility20d is GONE
    if ('volatility20d' in (b.technicals || {})) issues.push('volatility20d LEAK in response');
    // Check volatility60d EXISTS
    if (!('volatility60d' in (b.technicals || {}))) issues.push('volatility60d MISSING');
    // Check YTD is GONE from performance
    if ('YTD' in (b.performance || {})) issues.push('YTD LEAK in performance');
    // Check Period EXISTS in performance
    if (!('Period' in (b.performance || {}))) issues.push('Period MISSING from performance');
    // Check ownership sums to ~100
    if (b.ownership && !b.ownership._synthetic) issues.push('ownership._synthetic missing');
    if (b.ownership) {
      const sum = (b.ownership.promoter || 0) + (b.ownership.fii || 0) + (b.ownership.dii || 0) + (b.ownership.public || 0);
      if (Math.abs(sum - 100) > 0.5) issues.push(`ownership sums to ${sum.toFixed(1)}%, not 100%`);
    }
    // Check signal is valid
    const validSignals = ['STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL'];
    if (!validSignals.includes(b.technicals?.signal)) issues.push(`Invalid signal: ${b.technicals?.signal}`);
    // Check RSI in range
    if (b.technicals?.rsi !== null && (b.technicals.rsi < 0 || b.technicals.rsi > 100)) issues.push(`RSI out of range: ${b.technicals.rsi}`);
    return issues.length > 0 ? issues.join('; ') : null;
  });
  if (detail) {
    const t = detail.technicals;
    console.log(`    ↳ Signal: ${t.signal}, RSI: ${t.rsi}`);
    console.log(`    ↳ Volatility60d: ${t.volatility60d}%`);
    console.log(`    ↳ Performance: ${JSON.stringify(detail.performance)}`);
    if (detail.ownership) {
      const o = detail.ownership;
      const sum = o.promoter + o.fii + o.dii + o.public;
      console.log(`    ↳ Ownership: Promoter ${o.promoter}% | FII ${o.fii}% | DII ${o.dii}% | Public ${o.public}% = ${sum}%`);
    }
    if (detail.financials) {
      const f = detail.financials;
      console.log(`    ↳ Revenue: ${f.revenue ? '₹' + f.revenue.toLocaleString() : 'N/A'} | Net Profit: ${f.netProfit ? '~₹' + f.netProfit.toLocaleString() : 'N/A'}`);
    }
  }

  // Historical
  const hist = await check('GET /api/historical?symbol=TCS', `${BASE}/api/historical?symbol=TCS`, 200, (b) => {
    if (!Array.isArray(b) || b.length < 50) return `Only ${Array.isArray(b) ? b.length : 0} data points`;
    return null;
  });
  if (hist) console.log(`    ↳ ${hist.length} data points`);

  // Signals
  const sigs = await check('GET /api/signals?symbol=INFY', `${BASE}/api/signals?symbol=INFY`, 200);
  if (sigs) console.log(`    ↳ ${Array.isArray(sigs) ? sigs.length : 'N/A'} signals`);

  // Chart data
  await check('GET /api/chart-data?symbol=HDFCBANK', `${BASE}/api/chart-data?symbol=HDFCBANK`, 200);

  // News
  await check('GET /api/news?symbol=WIPRO', `${BASE}/api/news?symbol=WIPRO`, 200);

  // Alerts
  await check('GET /api/alerts', `${BASE}/api/alerts`, 200);

  // Portfolio
  await check('GET /api/portfolio', `${BASE}/api/portfolio`, 200);

  // OI Data
  await check('GET /api/oi-data?symbol=NIFTY', `${BASE}/api/oi-data?symbol=NIFTY`, 200);

  // Unknown symbol should still return 200 with fallback
  await check('GET /api/quote?symbol=FAKESTOCK123', `${BASE}/api/quote?symbol=FAKESTOCK123`, 200);

  // CSV Export
  await check('GET /api/export/csv', `${BASE}/api/export/csv`, 200);

  // Upstox status
  await check('GET /api/upstox/status', `${BASE}/api/upstox/status`, 200);

  // AI Strategy
  await check('GET /api/ai-strategy?symbol=RELIANCE', `${BASE}/api/ai-strategy?symbol=RELIANCE`, 200);

  console.log('');
  console.log('=============================');
  console.log(`  PASS: ${pass}  |  FAIL: ${fail}`);
  console.log('=============================');
  if (errors.length > 0) {
    console.log('\nFailures:');
    errors.forEach(e => console.log(`  - ${e}`));
  }
}

main().catch(console.error);
