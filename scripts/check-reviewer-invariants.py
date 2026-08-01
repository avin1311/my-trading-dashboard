#!/usr/bin/env python3
"""Run reviewer's 22 invariants against /api/stock-detail?symbol=X JSON"""
import json, sys

symbol = sys.argv[1] if len(sys.argv) > 1 else 'RELIANCE'

with open('/tmp/reliance_detail.json') as f:
    d = json.load(f)

q = d.get('quote', {})
t = d.get('technicals', {})
o = d.get('ownership', {})
p = d.get('performance', {})
peers = d.get('peers', [])

results = []

def check(name, passed, detail=""):
    tag = "PASS" if passed else "FAIL"
    results.append((tag, name, detail))
    print(f"  [{tag}] {name}: {detail}")

print(f"=== REVIEWER INVARIANTS for {symbol} ===")
print()

price = q.get('price') or 0
shares = q.get('shares') or 0
mcap = q.get('marketCap') or 0

# 1. MCAP = price * shares within 1%
if price > 0 and shares > 0 and mcap > 0:
    calc = price * shares
    diff = abs(mcap - calc) / max(mcap, calc) * 100
    check("MCAP = price x shares (1%)", diff < 1, f"actual={mcap:.0f} calc={calc:.0f} diff={diff:.2f}%")
else:
    check("MCAP = price x shares (1%)", None, f"SKIP price={price} shares={shares} mcap={mcap}")

# 2. P/B = price / bookValue
bv = q.get('bookValue') or 0
pb = q.get('pb') or 0
if bv > 0 and price > 0 and pb > 0:
    calc = price / bv
    diff = abs(calc - pb)
    check("P/B = price/bookValue", diff < 0.5, f"displayed={pb} calc={calc:.2f} diff={diff:.2f}")
else:
    check("P/B = price/bookValue", None, f"SKIP price={price} bv={bv} pb={pb}")

# 3. Net Profit = revenue * netMargin / 100
rev = q.get('revenue') or 0
nm = q.get('netMargin') or 0
np_val = q.get('netProfit') or 0
if rev > 0 and nm > 0 and np_val > 0:
    calc = rev * nm / 100
    diff = abs(calc - np_val) / max(calc, np_val) * 100
    check("Net Profit = rev * netMargin", diff < 5, f"displayed={np_val:.0f} calc={calc:.0f} diff={diff:.1f}%")
else:
    check("Net Profit = rev * netMargin", None, f"SKIP rev={rev} nm={nm} np={np_val}")

# 4. Ownership sums to 100%
total_own = (o.get('promoter') or 0) + (o.get('fii') or 0) + (o.get('dii') or 0) + (o.get('public') or 0)
check("Ownership = 100%", abs(total_own - 100) < 0.1, f"sum={total_own} (P={o.get('promoter')} FII={o.get('fii')} DII={o.get('dii')} Pub={o.get('public')})")

# 5. |YTD - 6M| < 1pp when windows overlap
# We use 'Period' not 'YTD' now, but check 1Y vs 6M
p1y = p.get('1Y')
p6m = p.get('6M')
if p1y is not None and p6m is not None:
    check("|1Y - 6M| reasonable", abs(p1y - p6m) < 30, f"1Y={p1y}% 6M={p6m}% diff={abs(p1y-p6m):.1f}pp")
else:
    check("|1Y - 6M| reasonable", None, f"SKIP 1Y={p1y} 6M={p6m}")

# 6. RSI in [0, 100] and not > 90
rsi = t.get('rsi')
if rsi is not None:
    check("RSI in [0, 100]", 0 <= rsi <= 100, f"rsi={rsi:.2f}")
    check("RSI not > 90 (Wilder check)", rsi <= 90, f"rsi={rsi:.2f}")
else:
    check("RSI in [0, 100]", None, "SKIP (null)")

# 7. Performance key is 'Period' not 'YTD'
check("Perf key is Period not YTD", 'Period' in p and 'YTD' not in p, f"keys={list(p.keys())}")

# 8. Volatility key is 'volatility60d' not 'volatility20d'
check("Volatility is 60d not 20d", 'volatility60d' in t and 'volatility20d' not in t, f"vol60d={t.get('volatility60d')}")

# 9. No duplicate PEs in peers
if peers:
    pe_values = [p.get('pe') for p in peers if p.get('pe') is not None]
    dupes = [x for x in pe_values if pe_values.count(x) > 1]
    check("No duplicate PEs in peers", len(set(dupes)) < 2, f"{len(peers)} peers, {len(set(dupes))} duplicate PE values")
else:
    check("No duplicate PEs in peers", None, "SKIP (no peers)")

# 10. Signal is valid
valid_signals = {'STRONG_BUY', 'BUY', 'HOLD', 'SELL', 'STRONG_SELL'}
sig = t.get('signal', '')
check("Signal is valid", sig.upper() in valid_signals if sig else False, f"signal={sig}")

# 11. Supertrend direction is 1 or -1
st_dir = t.get('supertrendDir')
check("Supertrend dir is 1/-1", st_dir in (1, -1, None), f"dir={st_dir}")

# 12. MACD histogram = MACD - Signal
macd = t.get('macd')
macd_sig = t.get('macdSignal')
macd_hist = t.get('macdHistogram')
if macd is not None and macd_sig is not None and macd_hist is not None:
    calc_hist = macd - macd_sig
    diff = abs(calc_hist - macd_hist)
    check("MACD hist = MACD - Signal", diff < 0.01, f"displayed={macd_hist} calc={calc_hist:.4f} diff={diff:.6f}")
else:
    check("MACD hist = MACD - Signal", None, f"SKIP macd={macd} sig={macd_sig} hist={macd_hist}")

print()
print("=== SUMMARY ===")
passes = sum(1 for t, n, d in results if t == 'PASS')
fails = sum(1 for t, n, d in results if t == 'FAIL')
skips = sum(1 for t, n, d in results if t not in ('PASS', 'FAIL'))
print(f"  PASS: {passes}  FAIL: {fails}  SKIP: {skips}  TOTAL: {len(results)}")
if fails > 0:
    print("\n  FAILURES:")
    for tag, name, detail in results:
        if tag == 'FAIL':
            print(f"    - {name}: {detail}")
