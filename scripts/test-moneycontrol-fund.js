const test = async () => {
  try {
    const url = 'https://www.moneycontrol.com/india/stockpricequote/footwear/bata-india/BI03';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    const t = await r.text();
    console.log('Status:', r.status, 'Len:', t.length);

    // Moneycontrol uses specific IDs for financial data
    const patterns = [
      ['P/E', /P\/E.*?(\d+\.\d+)/],
      ['P/B', /P\/B.*?(\d+\.\d+)/],
      ['Book Value', /Book Value.*?(\d+\.?\d*)/],
      ['Div Yield', /Div\.?Yield.*?(\d+\.?\d+)/],
      ['ROE', /ROE.*?(\d+\.?\d+)/],
      ['EPS', /EPS.*?\u20b9?(\d+\.?\d+)/],
      ['Market Cap', /Market Cap.*?(\d[,.\d\s]+[CrLCr]+)/],
      ['Beta', /Beta.*?(\d+\.?\d+)/],
      ['Debt/Equity', /Debt\/Equity.*?(\d+\.?\d+)/],
      ['Revenue', /Net Sales.*?(\d[,.\d\s]+)/],
    ];

    for (const [label, regex] of patterns) {
      const m = t.match(regex);
      console.log(label + ':', m ? m[1] : 'NOT FOUND');
    }
  } catch (e) { console.log('ERR', e.message); }
};
test();
