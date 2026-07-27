const test = async () => {
  try {
    const url = 'https://www.moneycontrol.com/india/stockpricequote/footwear/bata-india/BI03';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    const t = await r.text();

    // Find ALL <td>Label</td>\n<td class="nsedy ...">VALUE</td> patterns
    const cellRegex = /<td[^>]*>([^<]+)<\/td>\s*<td[^>]*class="nsedy[^"]*"[^>]*>([\d,.\-]+)<\/td>/g;
    let m;
    const found = [];
    while ((m = cellRegex.exec(t)) !== null) {
      found.push({ label: m[1].trim(), value: m[2] });
    }
    console.log('nsedy pairs:', found.length);
    found.forEach(f => console.log(`  ${f.label}: ${f.value}`));

    // Also try to find P/E specifically
    const pePatterns = [
      /P\/E[^0-9]*?(\d+\.\d+)/,
      /price-to-earnings[^0-9]*?(\d+\.\d+)/i,
    ];
    pePatterns.forEach((p, i) => {
      const m2 = t.match(p);
      console.log(`PE pattern ${i}:`, m2?.[1]);
    });

    // Look for numeric data in key stats area
    const statsIdx = t.indexOf('Key Statistics');
    if (statsIdx > 0) {
      const section = t.slice(statsIdx, statsIdx + 3000);
      const nums = section.match(/>(\d+\.\d+)</g);
      console.log('\nKey Statistics numbers:', nums?.slice(0, 20));
    }

  } catch (e) { console.log('ERR', e.message); }
};
test();
