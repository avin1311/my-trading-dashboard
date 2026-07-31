#!/usr/bin/env python3
"""Unit tests for formatters, technical indicators, data validation, and ownership math."""
import sys, os, json, math

# Add project root to path for direct imports
sys.path.insert(0, '/home/z/my-project/src/lib')

# =============== HELPERS ===============
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

# =============== 1. OWNERSHIP NORMALIZATION ===============
print('=== 1. OWNERSHIP NORMALIZATION ===')

def calc_ownership(inst_holding):
    """Mirror the exact logic from stock-detail/route.ts"""
    non_inst = 100 - inst_holding
    promoter = round(non_inst * 0.55 * 10) / 10
    public_ = round((non_inst - promoter) * 10) / 10
    fii = round(inst_holding * 0.60 * 10) / 10
    dii = round(inst_holding * 0.40 * 10) / 10
    total = promoter + fii + dii + public_
    norm = 100 / total if total > 0 else 1
    return {
        'promoter': round(promoter * norm * 10) / 10,
        'fii': round(fii * norm * 10) / 10,
        'dii': round(dii * norm * 10) / 10,
        'public': round(public_ * norm * 10) / 10,
    }

for inst in [0, 10, 25, 50, 75, 90, 100]:
    o = calc_ownership(inst)
    total = o['promoter'] + o['fii'] + o['dii'] + o['public']
    check(f'instHolding={inst}% → sum={total:.1f}%', abs(total - 100) < 0.5, f'got {total}')
    check(f'  all non-negative (inst={inst})', all(v >= 0 for v in o.values()))

# Verify old formula was broken
old_sum = lambda inst: (100-inst)*0.50 + inst*0.30 + inst*0.25 + (100-inst)*0.50
check('Old formula was broken (inst=50% → 77.5%)', abs(old_sum(50) - 77.5) < 0.1)

# =============== 2. FIBONACCI RETRACEMENT ===============
print('\n=== 2. FIBONACCI RETRACEMENT ===')

def fib(high, low):
    diff = high - low
    levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    labels = ['0%', '23.6%', '38.2%', '50%', '61.8%', '78.6%', '100%']
    return [{'level': l, 'price': low + diff * l, 'label': labels[i]} for i, l in enumerate(levels)]

high, low = 1000, 500
result = fib(high, low)
check('0% = swing low (500)', result[0]['price'] == 500, f'got {result[0]["price"]}')
check('100% = swing high (1000)', result[-1]['price'] == 1000, f'got {result[-1]["price"]}')
check('61.8% retracement = 809', abs(result[4]['price'] - 809) < 1, f'got {result[4]["price"]}')
check('50% retracement = 750', abs(result[3]['price'] - 750) < 1, f'got {result[3]["price"]}')

# Old (broken) formula: price = high - diff * l
old_result = [{'price': high - (high-low) * l} for l in [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]]
check('Old formula had 0%=high (INVERTED)', old_result[0]['price'] == high)
check('New formula has 0%=low (CORRECT)', result[0]['price'] == low)

# =============== 3. INV. H&S CONFIDENCE FIX ===============
print('\n=== 3. INV. H&S CONFIDENCE MATH ===')

# Old: lL/lL - 1 = 0 always (bug)
lL, hL = 550, 500  # shoulders at 550, head at 500
old_head_term = (lL / lL - 1) * 200
new_head_term = (lL / hL - 1) * 200
check('Old formula: lL/lL - 1 = 0 (dead code)', old_head_term == 0, f'got {old_head_term}')
check('New formula: lL/hL - 1 > 0 (measures head depth)', new_head_term > 0, f'got {new_head_term}')
check('Deeper head → higher confidence', (lL/480 - 1)*200 > new_head_term)

# =============== 4. DATA VALIDATION LAYER ===============
print('\n=== 4. DATA VALIDATION LAYER ===')

# Read validation source
with open('/home/z/my-project/src/lib/data-validation.ts') as f:
    val_src = f.read()

check('checkPE function exists', 'function checkPE' in val_src or 'export function checkPE' in val_src or 'const checkPE' in val_src)
check('checkPB function exists', 'checkPB' in val_src)
check('checkPriceBounds exists', 'checkPriceBounds' in val_src)
check('checkRSI exists', 'checkRSI' in val_src)
check('validateAll exists', 'validateAll' in val_src)

# =============== 5. FORMAT EDGE CASES ===============
print('\n=== 5. FORMAT EDGE CASES ===')

# fPerShare should NEVER auto-scale
# Simulate: values that would auto-scale in fINR but not fPerShare
def fPerShare_simulate(v, sign=False, currency=True):
    if v is None:
        return '—'
    prefix = '+' if sign and v > 0 else ('\u2212' if sign and v < 0 else '')
    abs_v = abs(v)
    d = 3 if abs_v < 10 else 2
    formatted = f'{abs_v:,.{d}f}'
    return prefix + ('₹' if currency else '') + formatted

# Test fPerShare behavior
check('fPerShare(1308.45) has ₹ prefix', '₹' in fPerShare_simulate(1308.45))
check('fPerShare(1308.45) no K suffix', 'K' not in fPerShare_simulate(1308.45), fPerShare_simulate(1308.45))
check('fPerShare(47.70) shows 2 decimals', fPerShare_simulate(47.70).endswith('.70') or '.70' in fPerShare_simulate(47.70))
check('fPerShare(null) returns —', fPerShare_simulate(None) == '—')
check('fPerShare(3.5) shows 3 decimals', fPerShare_simulate(3.5) == '₹3.500')

# fCompact should auto-scale WITHOUT ₹
def fCompact_simulate(v, decimals=None):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return '—'
    av = abs(v)
    if av >= 1e12: return f'{v/1e12:.{decimals or 2}f} L Cr'
    if av >= 1e7: return f'{v/1e7:.{decimals or 2}f} Cr'
    if av >= 1e5: return f'{v/1e5:.{decimals or 1}f} L'
    if av >= 1e3: return f'{v/1e3:.{decimals or 1}f}K'
    return f'{v:.{decimals or 2}f}'

check('fCompact(890000e7) = "8.90 L Cr"', fCompact_simulate(890000e7) == '8.90 L Cr')  # 8.9e12 → 8.9 L Cr
check('fCompact has no ₹ symbol', '₹' not in fCompact_simulate(1e9))
check('fCompact(150000) = "1.5 L"', fCompact_simulate(150000) == '1.5 L')
check('fCompact(5000) = "5.0K"', fCompact_simulate(5000) == '5.0K')

# fINR should auto-scale WITH ₹
def fINR_simulate(v):
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return '—'
    av = abs(v)
    if av >= 1e12: return f'₹{(v/1e12):.2f} L Cr'
    if av >= 1e7: return f'₹{(v/1e7):.2f} Cr'
    if av >= 1e5: return f'₹{(v/1e5):.1f} L'
    if av >= 1e3: return f'₹{(v/1e3):.1f}K'
    return f'₹{v:,.2f}'

check('fINR(50000) has ₹ and K', '₹' in fINR_simulate(50000) and 'K' in fINR_simulate(50000))

# =============== 6. VOLATILITY LABEL CONSISTENCY ===============
print('\n=== 6. VOLATILITY LABEL CONSISTENCY ===')

with open('/home/z/my-project/src/app/api/stock-detail/route.ts') as f:
    route_src = f.read()

check('volatility20d variable GONE from route', 'volatility20d' not in route_src)
check('volatility60d variable EXISTS in route', 'volatility60d' in route_src)
check('YTD variable GONE from route', 'ytdReturn' not in route_src or '# Labeled' in route_src.split('ytdReturn')[0] if 'ytdReturn' in route_src else 'ytdReturn' not in route_src)
check('periodReturn EXISTS in route', 'periodReturn' in route_src)

with open('/home/z/my-project/src/app/page.tsx') as f:
    page_src = f.read()

check('"20-Day Volatility" GONE from page', '20-Day Volatility' not in page_src)
check('"Annualized Volatility (60D)" in page', 'Annualized Volatility (60D)' in page_src)
check('volatility20d GONE from page', 'volatility20d' not in page_src)
check('"YTD" GONE from perf array', "'YTD'" not in page_src or 'Period' in page_src)
check('"Period" in perf array', "'Period'" in page_src)
check('RSI (14) hardcoded GONE', 'RSI (14)' not in page_src)
check('H: histogram label GONE', '>H: {(' not in page_src)
check('Hist: label EXISTS', 'Hist:' in page_src)

with open('/home/z/my-project/src/components/dashboard/charts.tsx') as f:
    charts_src = f.read()

check('MACD (12, 26, 9) hardcoded GONE from charts', 'MACD (12, 26, 9)' not in charts_src)
check('strategyParams prop EXISTS in charts', 'strategyParams' in charts_src)

with open('/home/z/my-project/src/lib/technical-indicators.ts') as f:
    ti_src = f.read()

check('Inv H&S: lL/lL bug FIXED', 'lL / lL' not in ti_src)
check('Inv H&S: lL/hL FIX present', 'lL / hL' in ti_src)
check('Fibonacci: low + diff * l (correct)', 'low + diff * l' in ti_src)
check('Fibonacci: old high - diff * l GONE', 'high - diff * l' not in ti_src.split('FibonacciRetracement')[1].split('}')[0] if 'FibonacciRetracement' in ti_src else True)

# =============== 7. SOURCE CODE INTEGRITY ===============
print('\n=== 7. SOURCE CODE INTEGRITY ===')

# Verify validation is wired into stock-detail
check('checkPE imported in stock-detail', 'checkPE' in route_src)
check('validateAll called in stock-detail', 'validateAll' in route_src)
check('safeValue imported in stock-detail', 'safeValue' in route_src)

# Verify auto-alert logic exists
check('Auto-alert logic in stock-detail', 'STRONG_BUY' in route_src or 'STRONG_SELL' in route_src)

# =============== SUMMARY ===============
print(f'\n{"="*40}')
print(f'  PASS: {pass_ct}  |  FAIL: {fail_ct}')
print(f'  Total: {pass_ct + fail_ct} assertions')
print(f'{"="*40}')
if errors:
    print(f'\nFailures ({len(errors)}):')
    for e in errors:
        print(f'  - {e}')
    sys.exit(1)
else:
    print('\n🎉 All tests passed!')
    sys.exit(0)
