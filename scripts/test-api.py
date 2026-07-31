#!/usr/bin/env python3
"""Comprehensive API endpoint tests"""
import json, urllib.request, urllib.error, sys, math

BASE = 'http://127.0.0.1:3000'
pass_ct, fail_ct = 0, 0
errors = []

def check(name, url, expected=200, validate=None):
    global pass_ct, fail_ct
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read().decode())
            if r.status != expected:
                print(f'  ❌ {name} → HTTP {r.status} (expected {expected})')
                fail_ct += 1; errors.append(f'{name}: HTTP {r.status}'); return None
            if validate:
                err = validate(body)
                if err:
                    print(f'  ❌ {name} → {err}')
                    fail_ct += 1; errors.append(f'{name}: {err}'); return None
            print(f'  ✅ {name} → HTTP {r.status}')
            pass_ct += 1; return body
    except Exception as e:
        print(f'  ❌ {name} → {e}')
        fail_ct += 1; errors.append(f'{name}: {e}'); return None

def validate_detail(b):
    issues = []
    t = b.get('technicals', {})
    p = b.get('performance', {})
    o = b.get('ownership')
    # 1. volatility20d must be GONE
    if 'volatility20d' in t:
        issues.append('volatility20d LEAKS in response')
    # 2. volatility60d must exist
    if 'volatility60d' not in t:
        issues.append('volatility60d MISSING')
    # 3. YTD must be GONE
    if 'YTD' in p:
        issues.append('YTD LEAKS in performance')
    # 4. Period must exist
    if 'Period' not in p:
        issues.append('Period MISSING from performance')
    # 5. ownership sums to ~100
    if o:
        total = (o.get('promoter',0) or 0) + (o.get('fii',0) or 0) + (o.get('dii',0) or 0) + (o.get('public',0) or 0)
        if abs(total - 100) > 0.5:
            issues.append(f'ownership sums to {total:.1f}%, not 100%')
        if not o.get('_synthetic'):
            issues.append('ownership._synthetic flag missing')
    # 6. signal is valid
    valid = ['STRONG_BUY','BUY','HOLD','SELL','STRONG_SELL']
    if t.get('signal') not in valid:
        issues.append(f'Invalid signal: {t.get("signal")}')
    # 7. RSI in range
    rsi = t.get('rsi')
    if rsi is not None and (rsi < 0 or rsi > 100):
        issues.append(f'RSI out of range: {rsi}')
    # 8. financials have estimated flag
    f = b.get('financials', {})
    if f and not f.get('_netProfitEstimated'):
        issues.append('_netProfitEstimated flag missing')
    return '; '.join(issues) if issues else None

def main():
    print('=== 1. API ENDPOINT TESTS ===\n')

    check('GET /', f'{BASE}/')

    stocks = check('GET /api/stocks', f'{BASE}/api/stocks', validate=lambda b: None if b and b.get('equities') and len(b['equities']) >= 10 else f'Only {len(b.get("equities",[])) if b else 0} equities')
    if stocks: print(f'    ↳ {len(stocks["equities"])} equities')

    screener = check('GET /api/screener', f'{BASE}/api/screener', validate=lambda b: None if isinstance(b, list) and len(b) > 0 else 'Empty screener')
    if screener: print(f'    ↳ {len(screener)} stocks')

    quote = check('GET /api/quote?symbol=RELIANCE', f'{BASE}/api/quote?symbol=RELIANCE', validate=lambda b: None if b and b.get('price',0) > 0 else f'Bad price: {b.get("price") if b else "null"}')
    if quote: print(f'    ↳ RELIANCE: ₹{quote["price"]}')

    detail = check('GET /api/stock-detail?symbol=RELIANCE', f'{BASE}/api/stock-detail?symbol=RELIANCE', validate=validate_detail)
    if detail:
        t = detail['technicals']
        print(f'    ↳ Signal: {t["signal"]}, RSI: {t["rsi"]}')
        print(f'    ↳ Vol60D: {t.get("volatility60d")}%, Vol20D field: {"LEAKS" if "volatility20d" in t else "gone"}✅')
        print(f'    ↳ Perf keys: {list(detail["performance"].keys())}')
        o = detail.get('ownership')
        if o:
            s = (o.get('promoter',0) or 0) + (o.get('fii',0) or 0) + (o.get('dii',0) or 0) + (o.get('public',0) or 0)
            print(f'    ↳ Ownership sum: {s:.1f}% (Promoter {o.get("promoter")} | FII {o.get("fii")} | DII {o.get("dii")} | Public {o.get("public")})')
        f = detail.get('financials', {})
        if f:
            print(f'    ↳ Net profit estimated: {f.get("_netProfitEstimated")}, Rev: {"yes" if f.get("revenue") else "no"}')

    hist = check('GET /api/historical?symbol=TCS', f'{BASE}/api/historical?symbol=TCS', validate=lambda b: None if isinstance(b, list) and len(b) >= 50 else f'Only {len(b) if isinstance(b, list) else 0} pts')
    if hist: print(f'    ↳ {len(hist)} data points')

    sigs = check('GET /api/signals?symbol=INFY', f'{BASE}/api/signals?symbol=INFY')
    if sigs: print(f'    ↳ {len(sigs) if isinstance(sigs, list) else "N/A"} signals')

    check('GET /api/chart-data?symbol=HDFCBANK', f'{BASE}/api/chart-data?symbol=HDFCBANK')
    check('GET /api/news?symbol=WIPRO', f'{BASE}/api/news?symbol=WIPRO')
    check('GET /api/alerts', f'{BASE}/api/alerts')
    check('GET /api/portfolio', f'{BASE}/api/portfolio')
    check('GET /api/oi-data?symbol=NIFTY', f'{BASE}/api/oi-data?symbol=NIFTY')
    check('GET /api/quote?symbol=FAKE123', f'{BASE}/api/quote?symbol=FAKE123')
    check('GET /api/export/csv', f'{BASE}/api/export/csv')
    check('GET /api/upstox/status', f'{BASE}/api/upstox/status')
    check('GET /api/ai-strategy?symbol=RELIANCE', f'{BASE}/api/ai-strategy?symbol=RELIANCE')

    print(f'\n{"="*30}')
    print(f'  PASS: {pass_ct}  |  FAIL: {fail_ct}')
    print(f'{"="*30}')
    if errors:
        print('\nFailures:')
        for e in errors: print(f'  - {e}')

if __name__ == '__main__':
    main()
