// Yahoo Finance crumb-based auth for v7 quote endpoint
const test = async () => {
  try {
    // Step 1: Get crumb
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    const crumb = await crumbRes.text();
    console.log('Crumb:', crumb);

    // Step 2: Use crumb to fetch quote
    const cookie = crumbRes.headers.get('set-cookie') || '';
    console.log('Cookie:', cookie.slice(0, 80));

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=BATAINDIA.NS&crumb=${encodeURIComponent(crumb)}&fields=peRatio,priceToBook,beta,trailingEps,bookValue,dividendYield,returnOnEquity,returnOnAssets,revenueGrowth,profitMargins,operatingMargins,currentRatio,totalRevenue,ebitda,grossProfits,freeCashflow,debtToEquity,sector,industry,marketCap,heldPercentInstitutions,forwardPE,fiftyTwoWeekHigh,fiftyTwoWeekLow,regularMarketVolume`;

    const r2 = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
      signal: AbortSignal.timeout(10000),
    });
    console.log('Quote status:', r2.status);
    const j = await r2.json();
    const q = j.quoteResponse?.result?.[0];
    if (q) {
      console.log('Symbol:', q.symbol);
      console.log('PE:', q.peRatio);
      console.log('PB:', q.priceToBook);
      console.log('Beta:', q.beta);
      console.log('EPS:', q.trailingEps);
      console.log('BookValue:', q.bookValue);
      console.log('DivYield:', q.dividendYield);
      console.log('ROE:', q.returnOnEquity);
      console.log('ROA:', q.returnOnAssets);
      console.log('RevGrowth:', q.revenueGrowth);
      console.log('ProfitMargin:', q.profitMargins);
      console.log('OpMargin:', q.operatingMargins);
      console.log('DebtEq:', q.debtToEquity);
      console.log('CurrRatio:', q.currentRatio);
      console.log('Revenue:', q.totalRevenue);
      console.log('EBITDA:', q.ebitda);
      console.log('GrossProf:', q.grossProfits);
      console.log('FCF:', q.freeCashflow);
      console.log('Sector:', q.sector);
      console.log('Industry:', q.industry);
      console.log('MktCap:', q.marketCap);
      console.log('InstHold:', q.heldPercentInstitutions);
      console.log('52W High:', q.fiftyTwoWeekHigh);
      console.log('52W Low:', q.fiftyTwoWeekLow);
    } else {
      console.log('No result. Full response:', JSON.stringify(j).slice(0, 300));
    }
  } catch (e) { console.log('ERR', e.message); }
};
test();
