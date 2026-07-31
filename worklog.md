# Work Log

---
Task ID: 1
Agent: Main
Task: Data quality audit fixes — Classes 1-4 (scale corruption, unit chaos, metric inconsistencies, backtest DD, signal validation)

Work Log:
- Read all data layer files: market-data.ts, formatters.tsx, trading-strategy.ts, technical-indicators.ts, data-validation.ts, stock-detail/route.ts, page.tsx
- Verified RSI already uses Wilder's smoothing in both trading-strategy.ts and technical-indicators.ts (not simple avg)
- Verified backtest Max DD already computes on equity curve, not price series
- Verified signal logic is NOT inverted (RSI < 30 + stBullish → BUY is correct)

---
Task ID: 2
Agent: Main
Task: Fix Class 1 — Scale corruption in FUNDAMENTALS_DB marketCap values

Work Log:
- Found all marketCap values used `e9` suffix (e.g., `890000e9 = 8.9 × 10^14` for Reliance)
- Actual Reliance mcap is ~₹17.6 Lakh Cr = ~8.8 × 10^12 — the stored value was ~100x too high
- Ran `sed 's/marketCap: \([0-9]*\)e9/marketCap: \1e7/g'` to fix all 70+ entries
- Now `890000e7 = 8.9 × 10^12` ≈ ₹8.9 Lakh Cr (approximately correct for a static fallback)

---
Task ID: 3
Agent: Main
Task: Fix Class 2 & 7 — Unit chaos with fINR used for per-share values

Work Log:
- Added `fPerShare()` formatter: always 2 decimals, ₹ prefix, NO auto-scaling (₹1,308.45 stays, never becomes ₹1.31K)
- Added `fCompact()` formatter: auto-scales WITHOUT ₹ symbol ("8.90 L Cr", "1.34 Cr")
- Replaced fINR → fPerShare for: EPS, book value, target prices (high/mean/median/low), DMAs (50/200), 52w high/low, supertrend values, support/resistance, pivot points, open, prev close, Fibonacci levels
- Replaced fNum → fCompact for market cap in screener and peers tables
- Fixed `fINR(0) + "invested"` bug in portfolio P&L sub-label
- Remaining fINR usages are correct: revenue, EBITDA, net profit, portfolio P&L (all aggregate INR)

---
Task ID: 4
Agent: Main
Task: Fix Class 3 — Net profit calculation and labeling

Work Log:
- Verified profitMargins is consistently stored as percentage (10.8 = 10.8%)
- Yahoo enrichment correctly multiplies raw decimal by 100
- The netProfit = revenue × profitMargins / 100 formula is mathematically correct
- Fixed misleading comment in stock-detail/route.ts
- Added "(est.)" suffix and "~" prefix to Net Profit labels in both overview and fundamentals views

---
Task ID: 5
Agent: Main
Task: Wire data-validation layer into render path

Work Log:
- Added validation imports to stock-detail/route.ts
- Added invariant checks after signal generation: PE, PB, price bounds, RSI
- Failing PE/PB values are nulled out (prevents showing misleading ratios)
- Validation warnings logged to server console
- Build passes successfully

Stage Summary:
- Fixed 3 critical data quality issues (scale, unit chaos, net profit labeling)
- Added 3 new formatters (fPerShare, fCompact, enhanced fPrice docs)
- Wired validation layer into API
- Build passes, zero new errors
- RSI (Wilder's), backtest DD (equity curve), and signal logic were already correct — no changes needed
---
Task ID: 1
Agent: Main Agent
Task: Fix reviewer findings - polling, routing, LIVE/delayed, error states, SSR metadata

Work Log:
- Fixed polling interval from 5s to 30s for stock detail (Yahoo 15min delayed data)
- Changed overview polling from 10s to 60s (indices change slowly)
- Added exponential backoff on HTTP 429 rate-limit responses (doubles up to 300s)
- Renamed header toggle from 'LIVE' to 'POLLING' when not connected to Upstox
- Fixed footer '15min' → '15 min delayed' (added space)
- Created /stock/[symbol] route with SSR generateMetadata (title, description, OG tags)
- Created /screener route with SSR metadata
- Added ?symbol= and ?view= query param handling on root page
- Added 15s timeout to initial overview fetch with AbortController
- Improved error state messaging (mentions rate-limiting)
- Added dynamic document.title update when stock data loads
- Verified all routes return correct status codes and redirect targets
- Verified SSR metadata renders in HTML for /stock/RELIANCE
- Verified POLLING, 30s, and '15 min delayed' in root page SSR HTML

Stage Summary:
- All 4 reviewer findings addressed: routing (done), LIVE/delayed (fixed), 5s polling regression (fixed to 30s), SSR + error state (done)
- Build successful, all routes verified with curl
- Server running on port 3000 via daemon.js
