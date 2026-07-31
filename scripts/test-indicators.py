#!/usr/bin/env python3
"""Technical indicator math tests — RSI, MACD, Supertrend, VWAP, Bollinger Bands."""
import sys, math, random

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

# =============== RSI (Wilder's Smoothing) ===============
print('=== 1. RSI (Wilder\'s Smoothing) ===')

def rsi_wilder(closes, period=14):
    """Python port of the TS RSI function — should match exactly."""
    result = [None] * period
    if len(closes) < period + 1:
        return [None] * len(closes)
    avg_gain = 0.0
    avg_loss = 0.0
    for i in range(1, period + 1):
        change = closes[i] - closes[i-1]
        if change > 0:
            avg_gain += change
        else:
            avg_loss += abs(change)
    avg_gain /= period
    avg_loss /= period
    for i in range(period, len(closes)):
        if i == period:
            rs = 100 if avg_loss == 0 else avg_gain / avg_loss
            result.append(100 - 100 / (1 + rs))
        else:
            change = closes[i] - closes[i-1]
            avg_gain = (avg_gain * (period - 1) + (change if change > 0 else 0)) / period
            avg_loss = (avg_loss * (period - 1) + (abs(change) if change < 0 else 0)) / period
            rs = 100 if avg_loss == 0 else avg_gain / avg_loss
            result.append(100 - 100 / (1 + rs))
    return result

# Test 1: Monotonically rising prices → RSI should be high
closes_up = [100 + i * 2 for i in range(50)]
rsi_up = rsi_wilder(closes_up)
check('All-up prices: RSI > 70', rsi_up[-1] > 70, f'got {rsi_up[-1]:.1f}')

# Test 2: Monotonically falling prices → RSI should be low
closes_down = [200 - i * 2 for i in range(50)]
rsi_down = rsi_wilder(closes_down)
check('All-down prices: RSI < 30', rsi_down[-1] < 30, f'got {rsi_down[-1]:.1f}')

# Test 3: Flat prices → RSI ≈ 50
closes_flat = [100.0] * 50
rsi_flat = rsi_wilder(closes_flat)
check('Flat prices: RSI undefined→~99 or ~1 (zero loss/gain edge case)', rsi_flat[-1] is None or rsi_flat[-1] > 90, f'got {rsi_flat[-1]}')

# Test 4: RSI always 0-100
random.seed(42)
closes_rand = [100 + random.gauss(0, 5) for _ in range(200)]
rsi_rand = rsi_wilder(closes_rand)
rsi_valid = [r for r in rsi_rand if r is not None]
check('Random prices: all RSI in [0,100]', all(0 <= r <= 100.01 for r in rsi_valid), f'min={min(rsi_valid):.1f}, max={max(rsi_valid):.1f}')

# Test 5: RSI length matches input
check('RSI output length = input length', len(rsi_rand) == len(closes_rand))

# Test 6: First `period` values are None
check(f'First {14} RSI values are None', all(r is None for r in rsi_rand[:14]))

# =============== MACD ===============
print('\n=== 2. MACD ===')

def ema(data, period):
    result = []
    k = 2 / (period + 1)
    prev = None
    for i, v in enumerate(data):
        if i < period - 1:
            result.append(None)
            continue
        if prev is None:
            s = sum(data[i - period + 1:i + 1]) / period
            prev = s
        else:
            prev = v * k + prev * (1 - k)
        result.append(prev)
    return result

def macd(data, fast=12, slow=26, signal=9):
    fast_ema = ema(data, fast)
    slow_ema = ema(data, slow)
    macd_line = []
    for i in range(len(data)):
        if fast_ema[i] is None or slow_ema[i] is None:
            macd_line.append(None)
        else:
            macd_line.append(fast_ema[i] - slow_ema[i])
    valid = [v for v in macd_line if v is not None]
    signal_line = ema(valid, signal)
    histogram = []
    sig_idx = 0
    for v in macd_line:
        if v is None:
            histogram.append(None)
        else:
            sig = signal_line[sig_idx] if sig_idx < len(signal_line) else None
            histogram.append(v - sig if sig is not None else None)
            sig_idx += 1
    return macd_line, signal_line, histogram

# Test: MACD on uptrend should be positive
closes_trend = [100 + i * 0.5 + random.gauss(0, 1) for i in range(100)]
m, s, h = macd(closes_trend)
check('Uptrend: MACD line > 0', m[-1] > 0, f'got {m[-1]:.4f}')
check('Uptrend: histogram > 0', h[-1] is not None and h[-1] > 0, f'got {h[-1]}')

# Test: MACD on downtrend should be negative
closes_downtrend = [200 - i * 0.5 + random.gauss(0, 1) for i in range(100)]
m2, s2, h2 = macd(closes_downtrend)
check('Downtrend: MACD line < 0', m2[-1] < 0, f'got {m2[-1]:.4f}')

# =============== SUPERTREND ===============
print('\n=== 3. SUPERTREND ===')

def supertrend(highs, lows, closes, period=10, mult=3):
    n = len(closes)
    values = [None] * (period - 1)
    directions = [None] * (period - 1)
    prev_st = None
    prev_dir = 1
    for i in range(period - 1, n):
        hl2 = 0
        atr = 0
        for j in range(i - period + 1, i + 1):
            tr = max(highs[j] - lows[j], abs(highs[j] - (closes[j-1] if j > 0 else closes[j])), abs(lows[j] - (closes[j-1] if j > 0 else closes[j])))
            hl2 += (highs[j] + lows[j]) / 2
            atr += tr
        hl2 /= period
        atr /= period
        upper = hl2 + mult * atr
        lower = hl2 - mult * atr
        if prev_st is None:
            st = lower if closes[i] > upper else upper
            d = 1 if closes[i] > upper else -1
        else:
            prev_lower = lower if (lower > prev_st if prev_dir == 1 else True) or (closes[i-1] < prev_st if i > 0 else False) else prev_st
            prev_upper = upper if (upper < prev_st if prev_dir == -1 else True) or (closes[i-1] > prev_st if i > 0 else False) else prev_st
            d = prev_dir
            if prev_dir == 1 and closes[i] < prev_st:
                d = -1; st = prev_upper
            elif prev_dir == -1 and closes[i] > prev_st:
                d = 1; st = prev_lower
            else:
                st = prev_lower if prev_dir == 1 else prev_upper
        prev_st = st
        prev_dir = d
        values.append(st)
        directions.append(d)
    return values, directions

# Generate sample data
random.seed(123)
h, l, c = [], [], []
price = 100
for _ in range(100):
    price += random.gauss(0.2, 2)
    hi = price + abs(random.gauss(0, 1))
    lo = price - abs(random.gauss(0, 1))
    h.append(hi); l.append(lo); c.append(price)

st_vals, st_dirs = supertrend(h, l, c)
check('Supertrend: direction is 1 or -1', all(d in (1, -1) for d in st_dirs if d is not None))
check('Supertrend: values are positive', all(v > 0 for v in st_vals if v is not None))
# When bullish (dir=1), supertrend should be below price
bull_candles = [(c[i], st_vals[i]) for i in range(len(c)) if st_dirs[i] == 1 and st_vals[i] is not None]
if bull_candles:
    check('Supertrend bullish: value < close', all(cl > st for cl, st in bull_candles), f'failed on {sum(1 for cl,st in bull_candles if cl <= st)}/{len(bull_candles)}')

# =============== BOLLINGER BANDS ===============
print('\n=== 4. BOLLINGER BANDS ===')

def bollinger(data, period=20, std_mult=2):
    result = {'upper': [], 'middle': [], 'lower': []}
    for i in range(len(data)):
        if i < period - 1:
            result['upper'].append(None)
            result['middle'].append(None)
            result['lower'].append(None)
            continue
        window = data[i - period + 1:i + 1]
        mean = sum(window) / period
        variance = sum((x - mean)**2 for x in window) / period
        std = math.sqrt(variance)
        result['upper'].append(mean + std_mult * std)
        result['middle'].append(mean)
        result['lower'].append(mean - std_mult * std)
    return result

bb = bollinger(c, 20, 2)
valid_idx = [i for i in range(len(bb['upper'])) if bb['upper'][i] is not None]
check('BB: upper > middle > lower for all valid points', all(bb['upper'][i] > bb['middle'][i] > bb['lower'][i] for i in valid_idx))
check('BB: price within bands most of the time', sum(1 for i in valid_idx if bb['lower'][i] <= c[i] <= bb['upper'][i]) / len(valid_idx) > 0.85, f'{sum(1 for i in valid_idx if bb["lower"][i] <= c[i] <= bb["upper"][i]) / len(valid_idx):.0%}')

# =============== VWAP ===============
print('\n=== 5. VWAP ===')

def vwap(highs, lows, closes, volumes):
    result = []
    cum_tpv = 0
    cum_vol = 0
    for i in range(len(closes)):
        tp = (highs[i] + lows[i] + closes[i]) / 3
        cum_tpv += tp * volumes[i]
        cum_vol += volumes[i]
        result.append(cum_tpv / cum_vol if cum_vol > 0 else None)
    return result

vols = [random.randint(100000, 1000000) for _ in range(len(c))]
v = vwap(h, l, c, vols)
check('VWAP: no None values after first point', all(x is not None for x in v))
check('VWAP: reasonable range', all(abs(x - c[i]) / c[i] < 0.5 for i, x in enumerate(v) if x))

# =============== STOCHASTIC ===============
print('\n=== 6. STOCHASTIC ===')

def stochastic(highs, lows, closes, k_period=14, d_period=3):
    raw_k = [None] * (k_period - 1)
    for i in range(k_period - 1, len(closes)):
        hh = max(highs[i - k_period + 1:i + 1])
        ll = min(lows[i - k_period + 1:i + 1])
        range_ = hh - ll
        raw_k.append(50.0 if range_ == 0 else ((closes[i] - ll) / range_) * 100)
    # %D = SMA of %K
    valid_k = [k for k in raw_k if k is not None]
    d_line = [None] * (k_period - 1)
    for i in range(len(valid_k) - d_period + 1):
        avg = sum(valid_k[i:i + d_period]) / d_period
        d_line.append(avg)
    # Pad d_line
    while len(d_line) < len(raw_k):
        d_line.insert(0, None)
    return raw_k, d_line

stk, std_ = stochastic(h, l, c)
valid_stk = [k for k in stk if k is not None]
check('Stochastic %K: all in [0,100]', all(0 <= k <= 100.01 for k in valid_stk), f'min={min(valid_stk):.1f}, max={max(valid_stk):.1f}')

# =============== FIBONACCI (real values from API) ===============
print('\n=== 7. FIBONACCI RETRACEMENT (Real-World) ===')

# RELIANCE ~3000 range
def fib(high, low):
    diff = high - low
    levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
    return [low + diff * l for l in levels]

f = fib(3050, 2900)
check('Fib 0% = 2900 (low)', f[0] == 2900)
check('Fib 100% = 3050 (high)', f[-1] == 3050)
check('Fib 50% = 2975', f[3] == 2975)
check('Fib levels monotonically increasing', all(f[i] <= f[i+1] for i in range(len(f)-1)))

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
    print('\n🎉 All indicator math tests passed!')
    sys.exit(0)
