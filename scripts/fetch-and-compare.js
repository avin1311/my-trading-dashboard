const UPSTOX_MASTER = 'https://api.upstox.com/v2/master/contracts';

async function main() {
  console.log('Fetching Upstox master contracts...');
  const res = await fetch(UPSTOX_MASTER, {
    headers: { 'Accept': 'application/json', 'x-api-version': '2.0' },
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json();
  const instruments = json.data || [];
  console.log(`Total instruments: ${instruments.length}`);

  // Extract all NSE equities
  const nseEq = new Map();
  for (const inst of instruments) {
    if (inst.exchange !== 'NSE' || inst.instrument_type !== 'EQ') continue;
    const sym = (inst.symbol || '').toUpperCase();
    if (!sym || nseEq.has(sym)) continue;
    nseEq.set(sym, { symbol: sym, name: inst.name || sym, lotSize: inst.lot_size || 0 });
  }
  console.log(`NSE Equities: ${nseEq.size}`);

  // Extract F&O underlyings with lot sizes
  const foMap = new Map();
  for (const inst of instruments) {
    if (inst.exchange !== 'NFO') continue;
    if (inst.instrument_type !== 'OPT' && inst.instrument_type !== 'FUT') continue;
    const ts = (inst.trading_symbol || '').toUpperCase();
    const match = ts.match(/^([A-Z]+)\d/);
    if (!match || match[1].length < 2 || match[1].length > 20) continue;
    const underlying = match[1];
    if (!foMap.has(underlying)) {
      foMap.set(underlying, { symbol: underlying, lotSize: inst.lot_size || 0, hasOptions: inst.instrument_type === 'OPT', hasFutures: inst.instrument_type === 'FUT' });
    } else {
      const e = foMap.get(underlying);
      if (inst.instrument_type === 'OPT') e.hasOptions = true;
      if (inst.instrument_type === 'FUT') e.hasFutures = true;
    }
  }
  console.log(`F&O Underlyings: ${foMap.size}`);

  // Load current stock list
  const fs = await import('fs');
  const currentCode = fs.readFileSync('/home/z/my-project/src/lib/stock-list.ts', 'utf-8');
  
  // Extract existing symbols from equities
  const existingSyms = new Set();
  const eqMatches = currentCode.matchAll(/"s":\s*"([A-Z]+)"/g);
  for (const m of eqMatches) existingSyms.add(m[1]);
  console.log(`Existing equities in stock-list.ts: ${existingSyms.size}`);

  // Build priority list: F&O stocks first, then popular NSE stocks
  const foStocks = [];
  const foMissing = [];
  for (const [sym, data] of foMap) {
    if (sym === 'NIFTY' || sym === 'BANKNIFTY' || sym === 'FINNIFTY' || sym === 'NIFTYIT' || sym === 'NIFTYNXT50') continue; // indices
    if (existingSyms.has(sym)) {
      foStocks.push({ ...data, exists: true });
    } else {
      foMissing.push(data);
    }
  }
  console.log(`F&O stocks already in list: ${foStocks.length}`);
  console.log(`F&O stocks MISSING from list: ${foMissing.length}`);

  // Get missing F&O stock details from NSE equities
  const missingWithDetails = [];
  for (const fo of foMissing) {
    const eq = nseEq.get(fo.symbol);
    if (eq) {
      missingWithDetails.push({ ...eq, lotSize: fo.lotSize || eq.lotSize });
    } else {
      missingWithDetails.push({ symbol: fo.symbol, name: fo.symbol, lotSize: fo.lotSize });
    }
  }

  // Also find popular NSE stocks not in F&O but worth adding (top by name recognition)
  const popularMissing = [];
  const popularTargets = [
    'TATAPOWER', 'ADANIPOWER', 'NHPC', 'SJVN', 'IRFC', 'RVNL', 'CONCOR',
    'IRCTC', 'RITES', 'BEL', 'HAL', 'DIXON', 'ZOMATO', 'DELHIVERY', 'PAYTM',
    'PB FINT', 'BAJAJHLDNG', 'TATAINVEST', 'JIOFIN', 'YESBANK', 'SUZLON',
    'VODAIDEA', 'IDBI', 'LICI', 'HDFCAMC', 'ICICIPRULI', 'SBILIFE', 'HDFCLIFE',
    'NAM-INDIA', 'TRENT', 'VBL', 'INDIAMART', 'DRAGONSFL', 'NYKAA',
  ];
  for (const sym of popularTargets) {
    const cleanSym = sym.replace(/[^A-Z]/g, '');
    if (existingSyms.has(cleanSym)) continue;
    const eq = nseEq.get(cleanSym);
    if (eq) popularMissing.push(eq);
  }

  // Output results
  console.log('\n===== MISSING F&O STOCKS TO ADD =====');
  for (const s of missingWithDetails.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    console.log(JSON.stringify(s));
  }

  console.log('\n===== POPULAR NSE STOCKS TO ADD =====');
  for (const s of popularMissing.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    console.log(JSON.stringify(s));
  }

  // Output the current F&O lot sizes for verification
  console.log('\n===== CURRENT F&O LOT SIZES (for existing stocks) =====');
  for (const s of foStocks.sort((a, b) => a.symbol.localeCompare(b.symbol))) {
    console.log(`${s.symbol}: lot=${s.lotSize}`);
  }

  // Save to file for reference
  const output = {
    totalNSEEquities: nseEq.size,
    totalFOUnderlyings: foMap.size,
    existingInList: existingSyms.size,
    foMissing: missingWithDetails,
    popularMissing,
    foExisting: foStocks,
  };
  fs.writeFileSync('/home/z/my-project/scripts/stock-comparison.json', JSON.stringify(output, null, 2));
  console.log('\nSaved comparison to scripts/stock-comparison.json');
}

main().catch(e => { console.error(e); process.exit(1); });
