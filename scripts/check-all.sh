#!/bin/bash
# Comprehensive check of NSE Analytics Dashboard
# set -e  # removed to prevent abort on non-fatal curl exits

BASE="http://127.0.0.1:3000"
PASS=0
FAIL=0
SKIP=0

pass() { echo "  ✅ PASS: $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ FAIL: $1"; FAIL=$((FAIL+1)); }
skip() { echo "  ⏭️  SKIP: $1"; SKIP=$((SKIP+1)); }

echo ""
echo "=============================="
echo " NSE ANALYTICS - FULL CHECK"
echo "=============================="

# ---- ROUTE CHECKS ----
echo ""
echo "--- ROUTES ---"

# Root
CODE=$(curl -s --max-time 10 -o /tmp/root.html -w '%{http_code}' "$BASE/")
if [ "$CODE" = "200" ]; then pass "GET / → 200"; else fail "GET / → $CODE"; fi

# SSR: POLLING label (not LIVE)
if grep -q 'POLLING' /tmp/root.html; then pass "SSR: POLLING label present"; else fail "SSR: POLLING label missing"; fi
if grep -q '>LIVE<' /tmp/root.html; then fail "SSR: LIVE label still present"; else pass "SSR: No LIVE label"; fi

# SSR: 30s refresh
if grep -q '30' /tmp/root.html | grep -q 's<'; then
  # Check more precisely
  if grep -qP 'Auto-refresh.*?30.*?s' /tmp/root.html; then pass "SSR: Auto-refresh 30s"; else fail "SSR: Auto-refresh 30s text not found"; fi
else
  # The HTML has "30" and "s" but split by React comments
  if grep -q 'Auto-refresh' /tmp/root.html && grep -q '>30<' /tmp/root.html; then pass "SSR: Auto-refresh 30s"; else fail "SSR: Auto-refresh 30s not found"; fi
fi

# SSR: 15 min delayed
if grep -q '15 min delayed' /tmp/root.html; then pass "SSR: 15 min delayed text"; else fail "SSR: 15 min delayed text missing"; fi

# /stock/RELIANCE → 307 redirect
REDIR=$(curl -s --max-time 10 -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/stock/RELIANCE")
if echo "$REDIR" | grep -q '307.*symbol=RELIANCE'; then pass "/stock/RELIANCE → 307 → /?symbol=RELIANCE"; else fail "/stock/RELIANCE: $REDIR"; fi

# /stock/RELIANCE metadata in redirect page
META_HTML=$(curl -s --max-time 10 "$BASE/stock/RELIANCE" 2>/dev/null || true)
if echo "$META_HTML" | grep -qi 'Reliance.*Analytics'; then pass "/stock/RELIANCE SSR metadata (title)"; else fail "/stock/RELIANCE metadata missing"; fi

# /screener → 307 redirect
REDIR=$(curl -s --max-time 10 -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/screener")
if echo "$REDIR" | grep -q '307.*view=screener'; then pass "/screener → 307 → /?view=screener"; else fail "/screener: $REDIR"; fi

# Invalid symbol → redirect to /
REDIR=$(curl -s --max-time 10 -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/stock/BAD%3C%3Exyz")
if echo "$REDIR" | grep -q '307' && ! echo "$REDIR" | grep -q 'BAD'; then pass "Invalid symbol → 307 → /"; else fail "Invalid symbol: $REDIR"; fi

# ---- API CHECKS ----
echo ""
echo "--- APIs ---"

# /api/quote?symbol=RELIANCE
if curl -s --max-time 20 -o /tmp/quote.json "$BASE/api/quote?symbol=RELIANCE"; then
  if python3 -c "import json; d=json.load(open('/tmp/quote.json')); assert d.get('quote',{}).get('symbol')=='RELIANCE'" 2>/dev/null; then
    pass "/api/quote?symbol=RELIANCE returns valid JSON with RELIANCE"
  else
    fail "/api/quote?symbol=RELIANCE JSON parse error or wrong symbol"
  fi
else
  fail "/api/quote?symbol=RELIANCE fetch failed"
fi

sleep 2

# /api/stocks?type=equity
if curl -s --max-time 15 -o /tmp/stocks.json "$BASE/api/stocks?type=equity"; then
  COUNT=$(python3 -c "import json; d=json.load(open('/tmp/stocks.json')); print(len(d) if isinstance(d,list) else 'err')" 2>/dev/null)
  if [ "$COUNT" != "err" ] && [ "$COUNT" -gt 0 ] 2>/dev/null; then
    pass "/api/stocks?type=equity → $COUNT stocks"
  else
    fail "/api/stocks?type=equity invalid response"
  fi
else
  fail "/api/stocks?type=equity fetch failed"
fi

sleep 2

# /api/screener
if curl -s --max-time 20 -o /tmp/screener.json "$BASE/api/screener"; then
  if python3 -c "import json; d=json.load(open('/tmp/screener.json')); print('ok')" 2>/dev/null | grep -q 'ok'; then
    pass "/api/screener returns valid JSON"
  else
    fail "/api/screener JSON parse error"
  fi
else
  fail "/api/screener fetch failed"
fi

sleep 2

# /api/stock-detail?symbol=RELIANCE (heavy)
if curl -s --max-time 60 -o /tmp/detail.json "$BASE/api/stock-detail?symbol=RELIANCE"; then
  python3 << 'PYCHECK'
import json, sys
try:
    with open('/tmp/detail.json') as f:
        d = json.load(f)
    q = d['quote']
    t = d['technicals']
    own = d['ownership']
    fin = d['financials']
    perf = d['performance']
    
    issues = []
    
    # 1. Price exists and positive
    price = q.get('price')
    if not price or price <= 0: issues.append(f'price={price}')
    
    # 2. Market cap in reasonable range (5-30 Lakh Cr for Reliance)
    mcap = q.get('marketCap')
    if mcap:
        lcr = mcap / 1e12
        if not (5 < lcr < 30): issues.append(f'mcap={lcr:.1f} L Cr')
    else:
        issues.append('mcap missing')
    
    # 3. P/B = price / bookValue
    pb = q.get('pb')
    bv = q.get('bookValue')
    if pb and bv and price:
        expected = price / bv
        if abs(pb - expected) > 0.1: issues.append(f'PB mismatch: {pb} vs {expected:.2f}')
    
    # 4. Ownership sums to 100%
    total_own = sum(own.get(k, 0) for k in ['promoter', 'fii', 'dii', 'public'])
    if abs(total_own - 100) > 0.1: issues.append(f'ownership={total_own:.1f}%')
    
    # 5. RSI in (0, 100)
    rsi = t.get('rsi')
    if not rsi or not (0 < rsi < 100): issues.append(f'rsi={rsi}')
    
    # 6. Net profit = revenue * netMargin / 100
    rev = fin.get('revenue')
    nm = fin.get('netMargin')
    np_val = fin.get('netProfit')
    if rev and nm and np_val:
        expected_np = rev * nm / 100
        ratio = np_val / expected_np if expected_np else 0
        if not (0.8 < ratio < 1.2): issues.append(f'NP ratio={ratio:.2f}')
    
    # 7. Volatility60d exists
    vol = t.get('volatility60d') or perf.get('volatility60d')
    if not vol or not (0 < vol < 100): issues.append(f'volatility60d={vol}')
    
    # 8. Performance periods present
    for p in ['1W', '1M', '3M', '6M']:
        if perf.get(p) is None: issues.append(f'{p} return missing')
    
    # 9. Signal is valid
    sig = t.get('signal')
    if sig not in ['BUY', 'SELL', 'HOLD', 'NEUTRAL']: issues.append(f'signal={sig}')
    
    # 10. Supertrend value exists
    if not t.get('supertrend'): issues.append('supertrend missing')
    
    if issues:
        for i in issues:
            print(f'ISSUE: {i}')
        sys.exit(1)
    else:
        print('ALL INVARIANTS PASS')
        sys.exit(0)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
PYCHECK
  if [ $? -eq 0 ]; then
    pass "/api/stock-detail?symbol=RELIANCE all 10 invariants"
  else
    fail "/api/stock-detail?symbol=RELIANCE some invariants failed"
  fi
else
  fail "/api/stock-detail?symbol=RELIANCE fetch failed"
fi

# ---- SUMMARY ----
echo ""
echo "=============================="
echo " RESULTS: $PASS pass, $FAIL fail, $SKIP skip"
echo "=============================="

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL CHECKS PASSED"
else
  echo "⚠️  $FAIL check(s) failed"
fi

# Server alive?
ps -p 2267 -o pid,stat 2>/dev/null && echo "
Server PID 2267: ALIVE" || echo "
Server PID 2267: DEAD"
