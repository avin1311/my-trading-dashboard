const test = async () => {
  try {
    const url = 'https://www.moneycontrol.com/india/stockpricequote/footwear/bata-india/BI03';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    const t = await r.text();

    // Extract all table cells that have a numeric value after a label
    // Look for <td>Label</td>\s*<td>value</td> patterns
    const cellRegex = /<td[^>]*>([^<]+)<\/td>\s*<td[^>]*class="[^"]*nsedy[^"]*"[^>]*>([\d,.]+)<\/td>/g;
    let m;
    const found = [];
    while ((m = cellRegex.exec(t)) !== null) {
      found.push({ label: m[1].trim(), value: m[2] });
    }
    console.log('Found', found.length, 'key-value pairs:');
    found.slice(0, 30).forEach(f => console.log(`  ${f.label}: ${f.value}`));
  } catch (e) { console.log('ERR', e.message); }
};
test();
