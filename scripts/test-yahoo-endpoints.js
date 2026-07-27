const test = async () => {
  const endpoints = [
    'https://query1.finance.yahoo.com/ws/fundamentals/BATAINDIA.NS',
    'https://query1.finance.yahoo.com/v8/finance/chart/BATAINDIA.NS?range=1y&interval=1d&includePrePost=false&corsDomain=finance.yahoo.com&modules=summaryDetail,defaultKeyStatistics,financialData',
    'https://query1.finance.yahoo.com/v8/finance/chart/BATAINDIA.NS?modules=defaultKeyStatistics,summaryDetail,financialData',
    'https://query2.finance.yahoo.com/ws/fundamentals/BATAINDIA.NS',
  ];
  for (const url of endpoints) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const j = await r.json();
      console.log(r.status, url.split('yahoo.com')[1].slice(0, 60), '→', JSON.stringify(j).slice(0, 200));
    } catch (e) { console.log('ERR', url.slice(60), e.message); }
  }
};
test();
