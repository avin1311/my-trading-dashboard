// Try to find Screener.in's actual data API endpoint
const test = async () => {
  const urls = [
    'https://screener.in/api/company/BATAINDIA/',
    'https://screener.in/api/company/BATAINDIA/quote/',
    'https://screener.in/company/BATAINDIA/api/',
    'https://api.screener.in/company/BATAINDIA/',
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(10000),
      });
 const t = await r.text();
      const isJson = t.trim().startsWith('{') || t.trim().startsWith('[');
      console.log(r.status, isJson ? 'JSON' : 'HTML', t.length, url);
      if (isJson) console.log('  Sample:', t.slice(0, 200));
    } catch (e) { console.log('ERR', url, e.message); }
  }
};
test();
