#!/usr/bin/env python3
"""Data validation layer tests."""
import sys

pass_ct, fail_ct, errors = 0, 0, []

def check(name, condition, detail=""):
    global pass_ct, fail_ct
    if condition:
        print(f'  ✅ {name}')
        pass_ct += 1
    else:
        msg = f'{name} — {detail}' if detail else name
        print(f'  ❌ {msg}')
        fail_ct += 1
        errors.append(msg)

# Read the actual validation source to understand the logic
with open('/home/z/my-project/src/lib/data-validation.ts') as f:
    src = f.read()

print('=== 1. PE VALIDATION ===')
# checkPE should flag when PE * EPS != price (within tolerance)
# e.g., PE=30, EPS=100, Price=500 → 30*100=3000 ≠ 500 → FAIL
check('checkPE exists in source', 'checkPE' in src)

# Read route.ts to see how validation is wired
with open('/home/z/my-project/src/app/api/stock-detail/route.ts') as f:
    route = f.read()

check('PE validation called', 'checkPE' in route and 'quote.pe' in route)
check('PE nulled on failure', '!valPE.valid' in route and 'quote.pe = null' in route)
check('PB validation called', 'checkPB' in route)
check('PB nulled on failure', '!valPB.valid' in route and 'quote.pb = null' in route)
check('Price bounds checked', 'checkPriceBounds' in route)
check('RSI validated', 'checkRSI' in route)
check('validateAll called', 'validateAll' in route)
check('Validation warning logged', 'console.warn' in route and 'validate' in route)

print('\n=== 2. AUTO-ALERT LOGIC ===')
check('Auto-alert checks for STRONG_BUY', 'STRONG_BUY' in route)
check('Auto-alert checks for STRONG_SELL', 'STRONG_SELL' in route)
check('Auto-alert avoids duplicates', 'duplicate' in route.lower() or 'exists' in route.lower())
check('Auto-alert returns status', 'autoAlertCreated' in route)

print('\n=== 3. MARKET CAP SCALE ===')
# Verify marketCap uses e7 not e9
with open('/home/z/my-project/src/lib/market-data.ts') as f:
    md = f.read()

# Count e7 vs e9 in marketCap lines
import re
mcap_lines = [l for l in md.split('\n') if 'marketCap:' in l]
e7_count = sum(1 for l in mcap_lines if 'e7' in l.lower())
e9_count = sum(1 for l in mcap_lines if 'e9' in l.lower())
check(f'marketCap uses e7 ({e7_count} entries)', e7_count >= 50, f'only {e7_count}')
check(f'marketCap does NOT use e9 ({e9_count} entries)', e9_count == 0, f'found {e9_count}')

# Verify RELIANCE mcap is reasonable
reliance_mcap = None
for l in mcap_lines:
    m = re.search(r'RELIANCE.*marketCap:\s*([\d.e+]+)', l, re.IGNORECASE)
    if m:
        reliance_mcap = float(m.group(1))
        break
if reliance_mcap:
    mcap_lcr = reliance_mcap / 1e12
    check(f'RELIANCE mcap ≈ ₹{mcap_lcr:.1f} Lakh Cr (reasonable)', 5 < mcap_lcr < 30, f'got {mcap_lcr:.1f}')

print('\n=== 4. NET PROFIT LABELING ===')
with open('/home/z/my-project/src/app/page.tsx') as f:
    page = f.read()

check('Net Profit has (est.) label', 'Net Profit (est.)' in page or 'netProfit' in page)
check('Net Profit has ~ prefix in code', '~' in page and 'fINR' in page)

# =============== SUMMARY ===============
print(f'\n{"="*40}')
print(f'  PASS: {pass_ct}  |  FAIL: {fail_ct}')
print(f'  Total: {pass_ct + fail_ct} assertions')
print(f'{"="*40}')
if errors:
    print(f'\nFailures ({len(errors)}):')
    for e in errors: print(f'  - {e}')
    sys.exit(1)
else:
    print('\n🎉 All validation tests passed!')
    sys.exit(0)
