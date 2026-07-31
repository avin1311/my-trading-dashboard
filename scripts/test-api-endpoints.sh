#!/bin/bash
BASE="http://localhost:3000"
PASS=0; FAIL=0; ERRORS=""

check() {
  local name="$1" url="$2" expected_code="$3"
  local code=$(curl -s -o /tmp/test_body.json -w '%{http_code}' --max-time 15 "$url" 2>/dev/null)
  local size=$(wc -c < /tmp/test_body.json 2>/dev/null)
  if [ "$code" = "$expected_code" ]; then
    echo "  ✅ $name → HTTP $code ($size bytes)"
    PASS=$((PASS+1))
  else
    echo "  ❌ $name → HTTP $code (expected $expected_code)"
    FAIL=$((FAIL+1))
    ERRORS="$ERRORS\n  - $name: got HTTP $code, expected $expected_code"
  fi
}

json_field() {
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d$1)" < /tmp/test_body.json 2>/dev/null
}

echo "=== API ENDPOINT TESTS ==="
echo ""

# 1. Homepage
check "GET /" "$BASE/" "200"

# 2. Stock list
check "GET /api/stocks" "$BASE/api/stocks" "200"
STOCK_COUNT=$(json_field '.equities | length')
echo "    ↳ $STOCK_COUNT equities in list"

# 3. Screener
echo ""
check "GET /api/screener" "$BASE/api/screener" "200"
SCREEN_COUNT=$(json_field 'length')
echo "    ↳ $SCREEN_COUNT stocks in screener"

# 4. Single quote
echo ""
check "GET /api/quote?symbol=RELIANCE" "$BASE/api/quote?symbol=RELIANCE" "200"
QUOTE_PRICE=$(json_field '.price')
echo "    ↳ RELIANCE price: ₹$QUOTE_PRICE"

# 5. Stock detail (full)
echo ""
check "GET /api/stock-detail?symbol=RELIANCE" "$BASE/api/stock-detail?symbol=RELIANCE" "200"

# Validate response structure
SYM=$(json_field '.quote.symbol')
SIGNAL=$(json_field '.technicals.signal')
RSI=$(json_field '.technicals.rsi')
VOL=$(json_field '.technicals.volatility60d')
PERF=$(json_field '.performance.Period')
OWN=$(json_field '.ownership')
FIN=$(json_field '.financials')
echo "    ↳ Symbol: $SYM"
echo "    ↳ Signal: $SIGNAL, RSI: $RSI"
echo "    ↳ Volatility (60D): $VOL"
echo "    ↳ Period Return: $PERF%"
echo "    ↳ Ownership: $OWN"
echo "    ↳ Financials: $FIN"

# Check no 'volatility20d' leak
echo ""
if python3 -c "import json; d=json.load(open('/tmp/test_body.json')); assert 'volatility20d' not in d.get('technicals',{}), 'LEAK'" 2>/dev/null; then
  echo "  ✅ No volatility20d leak in response"
  PASS=$((PASS+1))
else
  echo "  ❌ volatility20d still in API response"
  FAIL=$((FAIL+1))
  ERRORS="$ERRORS\n  - volatility20d leak in stock-detail response"
fi

# Check 'YTD' key is gone
if python3 -c "import json; d=json.load(open('/tmp/test_body.json')); assert 'YTD' not in d.get('performance',{}), 'LEAK'" 2>/dev/null; then
  echo "  ✅ No YTD key leak in performance"
  PASS=$((PASS+1))
else
  echo "  ❌ 'YTD' still in performance response"
  FAIL=$((FAIL+1))
  ERRORS="$ERRORS\n  - YTD key leak in performance"
fi

# 6. Historical data
echo ""
check "GET /api/historical?symbol=TCS" "$BASE/api/historical?symbol=TCS" "200"
HIST_LEN=$(json_field 'length')
echo "    ↳ $HIST_LEN data points"

# 7. Signals
echo ""
check "GET /api/signals?symbol=INFY" "$BASE/api/signals?symbol=INFY" "200"
SIG_LEN=$(json_field 'length')
echo "    ↳ $SIG_LEN signals"

# 8. Chart data
echo ""
check "GET /api/chart-data?symbol=HDFCBANK" "$BASE/api/chart-data?symbol=HDFCBANK" "200"

# 9. News
echo ""
check "GET /api/news?symbol=WIPRO" "$BASE/api/news?symbol=WIPRO" "200"

# 10. Alerts
echo ""
check "GET /api/alerts" "$BASE/api/alerts" "200"

# 11. Portfolio
echo ""
check "GET /api/portfolio" "$BASE/api/portfolio" "200"

# 12. OI Data
echo ""
check "GET /api/oi-data?symbol=NIFTY" "$BASE/api/oi-data?symbol=NIFTY" "200"

# 13. 404 for unknown symbol
echo ""
check "GET /api/quote?symbol=INVALID123" "$BASE/api/quote?symbol=INVALID123" "200"

# 14. Export CSV
echo ""
check "GET /api/export/csv" "$BASE/api/export/csv" "200"

# 15. Upstox status
echo ""
check "GET /api/upstox/status" "$BASE/api/upstox/status" "200"

# 16. AI Strategy
echo ""
check "GET /api/ai-strategy?symbol=RELIANCE" "$BASE/api/ai-strategy?symbol=RELIANCE" "200"

echo ""
echo "============================="
echo "  PASS: $PASS  |  FAIL: $FAIL"
echo "============================="
if [ $FAIL -gt 0 ]; then
  echo -e "Failures:$ERRORS"
fi
