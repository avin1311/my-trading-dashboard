const testYahoo = async () => {
  try {
    // Try v8 chart with modules param
    const url = 'https://query1.finance.yahoo.com/v8/finance/chart/BATAINDIA.NS?range=1d&interval=1d&includePrePost=false&corsDomain=finance.yahoo.com';
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const j = await r.json();
    const m = j.chart?.result?.[0]?.meta;
    console.log('All meta keys:', Object.keys(m).join(', '));
    console.log('\nUseful:');
    console.log('  symbol:', m.symbol);
    console.log('  shortName:', m.shortName);
    console.log('  regularMarketPrice:', m.regularMarketPrice);
    console.log('  fiftyTwoWeekHigh:', m.fiftyTwoWeekHigh);
    console.log('  regularMarketVolume:', m.regularMarketVolume);
  }
  catch (e) { console.log('ERR', e.message); }
};
testYahoo();
