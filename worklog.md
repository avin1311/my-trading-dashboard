---
Task ID: 1-6
Agent: main
Task: Fix 6 critical dashboard issues - Upstox API, OI price, backtest, news, chart timeframe, options filters

Work Log:
- Diagnosed Upstox /v2/master/contracts returning 404 (deprecated Jun 30, 2025)
- Updated upstox-client.ts: getAllNSEEquities() and getAllFOUnderlyings() now return empty gracefully instead of crashing
- loadInstruments() no longer makes failed API calls to deprecated endpoint
- Updated OI section to use live Yahoo quote price when data source is 'mock' (fixes price mismatch)
- Added "Live" / "OI" source indicator badge on Spot Price KPI card
- Removed auto-fetchSignals on stock selection in use-dashboard-data.ts (was issue #3)
- Added "Run Backtest" button with manual trigger on main page Strategy View
- Added backtest period selector (1M, 3M, 200D, 1Y, 2Y) to Strategy Parameters section
- Updated fetchSignals to accept optional `days` parameter
- Reduced news cache TTL from 10min to 5min, added error caching to prevent API hammering
- Added `source` field to news API responses for frontend visibility
- Rewrote OptionsTab with real OI data, IV filters, OI filters, strike range, and strategy builder
- Strategy builder includes 6 preset strategies: Long Straddle, Long Strangle, Bull Call Spread, Bear Put Spread, Iron Condor, Short Straddle
- Strategy builder shows legs with real LTP/IV/OI from OI data and calculates net premium
- Fixed pre-existing TS error in oi-data/route.ts (change_in_open_interest type cast)
- Build verified clean (no new errors)

Stage Summary:
- All 6 issues addressed
- Upstox fallback now cleanly serves 250+ equities from hardcoded list
- OI price mismatch eliminated by preferring live quote price
- Backtest is now manual (user clicks "Run Backtest") with configurable period
- News feed has shorter cache, error visibility
- Chart timeframe feeds into backtest period selector
- Options tab has strategy filters (IV, OI, range) and strategy builder with P&L