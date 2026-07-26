const testScraper = async () => {
  try {
    const r = await fetch('https://screener.in/company/BATAINDIA/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    const t = await r.text();
    console.log('Status:', r.status, 'Len:', t.length);

    // Extract data-replacekey=value pairs
    const regex = /data-replacekey="([^"]+)"[^>]*>([\d,.\-]+)/g;
    let match;
    const data = {};
    while ((match = regex.exec(t)) !== null) {
      data[match[1]] = match[2];
    }
    const keys = Object.keys(data);
    console.log('Found', keys.length, 'data points');
    keys.forEach(k => console.log(`  ${k}: ${data[k]}`));

    // Also try to find sector/industry
    const sectorMatch = t.match(/<a href="\/company\/\?q=[^"]+"[^>]*>([^<]+)<\/a>/g);
    if (sectorMatch) {
      console.log('\nLinks:');
      sectorMatch.slice(0, 5).forEach(s => console.log(' ', s));
    }
  } catch (e) {
    console.log('ERR', e.message);
  }
};
testScraper();
