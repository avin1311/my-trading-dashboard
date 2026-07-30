---
Task ID: 1
Agent: Main Agent
Task: Diagnose and fix the OAuth "error" when clicking "Connect Upstox for Live Data"

Work Log:
- Read .env file — found UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_REDIRECT_URI were MISSING
- Read /api/upstox/connect/route.ts — found it was returning `NextResponse.json({ url })` instead of redirecting
- Read page.tsx line 1596 — confirmed footer uses `<a href="/api/upstox/connect">` which expects a redirect
- Added Upstox credentials back to .env
- Changed connect route to use `NextResponse.redirect(url)` instead of `NextResponse.json({ url })`
- Started dev server, verified the redirect works (HTTP 307 to Upstox OAuth URL)
- Cleaned up test artifacts, committed and pushed

Stage Summary:
- Root cause: Two issues — (1) .env missing Upstox credentials, (2) connect route returned JSON instead of redirecting
- Fix: Restored .env credentials + changed to NextResponse.redirect()
- Dev server running on port 3000, homepage loads, connect route properly redirects to Upstox OAuth
- Pushed to GitHub: `fix: Upstox connect route now redirects to OAuth instead of returning JSON`---
Task ID: 1
Agent: main
Task: Fix OI data showing SIMULATED when Upstox is connected, fix price inconsistency

Work Log:
- Explored project state: confirmed oi-providers.ts UpstoxProvider used static env var token, /api/oi-data/route.ts had no Upstox integration
- Rewrote UpstoxProvider in oi-providers.ts to use OAuth token via getUpstoxToken() instead of UPSTOX_ACCESS_TOKEN env var
- Added parseUpstoxOptionChain() parser in oi-data/route.ts for Upstox /v2/option/chain response
- Added fetchUpstoxOptionChainDirect() function that calls Upstox API with OAuth token
- Rewrote GET handler in oi-data/route.ts with 3-tier priority: Upstox (when connected) -> NSE -> Mock
- Fixed connect/route.ts hardcoded localhost redirects to use request headers
- Fixed pre-existing TS error in options-tab.tsx (missing `}` in JSX comment)
- Fixed pre-existing TS errors: parseFloat radix, missing await, async function signature
- Verified zero new TS errors in modified files

Stage Summary:
- OI panel will now show 'Live Upstox' badge when Upstox is connected and option chain API returns data
- Data source priority: Upstox -> NSE -> Mock (graceful fallback chain)
- Price inconsistency fixed: Upstox LTP from WS ticks passed as spot price to both Upstox OC and mock fallback
- Files modified: oi-providers.ts, oi-data/route.ts, connect/route.ts, options-tab.tsx
