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
- Pushed to GitHub: `fix: Upstox connect route now redirects to OAuth instead of returning JSON`