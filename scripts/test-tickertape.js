const test = async () => {
  const urls = [
    'https://www.tickertape.in/screener/api/companies?slugs=bata-india',
    'https://api.tickertape.in/stocks/bata-india/quote',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });
      const t = await r.text();
      console.log(r.status, t.length, url.slice(0, 80));
      if (t.includes('pe') || t.includes('PE')) console.log('  HAS PE DATA');
      console.log('  Sample:', t.slice(0, 150));
    } catch (e) { console.log('ERR', e.message); }
  }
};
test();
