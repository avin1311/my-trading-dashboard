const test = async () => {
  try {
    const url = 'https://www.moneycontrol.com/india/stockpricequote/footwear/bata-india/BI03';
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });
    const t = await r.text();

    // Search for specific patterns that Moneycontrol uses
    // P/E ratio in the key stats area
    const peMatch = t.match(/P\/E[^<]*?<span[^>]*>([\d.]+)<\/span>/);
    const pbMatch = t.match(/Price to Book[^<]*?<span[^>]*>([\d.]+)<\/span>/);
    
    // Try finding the valuation ratio section
    const peIdx = t.indexOf('P/E');
    if (peIdx >= 0) console.log('P/E context:', t.slice(peIdx - 20, peIdx + 80));
    
    const pbIdx = t.indexOf('Price to Book');
    if (pbIdx >= 0) console.log('PB context:', t.slice(pbIdx - 20, pbIdx + 80));

    // Find "dividend yield" near it
    const divIdx = t.toLowerCase().indexOf('dividend yield');
    if (divIdx >= 0) console.log('Div context:', t.slice(divIdx - 10, divIdx + 80));

    // ROE
    const roeIdx = t.indexOf('ROE');
    if (roeIdx >= 0) console.log('ROE context:', t.slice(roeIdx - 10, roeIdx + 60));

    // Market Cap
    const mcIdx = t.indexOf('Market Cap');
    if (mcIdx >= 0) console.log('MC context:', t.slice(mcIdx - 10, mcIdx + 80));

    console.log('\n--- Direct regex ---');
    console.log('PE match:', peMatch?.[1]);
    console.log('PB match:', pbMatch?.[1]);

  } catch (e) { console.log('ERR', e.message); }
};
test();
