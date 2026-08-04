
/**
 * Lightweight API write-protection for single-user local deployments.
 * When API_SECRET is set in .env, all POST/DELETE/PATCH requests to
 * protected routes must include `Authorization: Bearer <secret>`.
 *
 * This prevents accidental or malicious writes from other processes on
 * the same machine or network (e.g., Caddy proxy exposure).
 *
 * For localhost-only dev, API_SECRET is typically not set, so the
 * check is skipped — keeping the dev experience frictionless.
 */

const API_SECRET = process.env.API_SECRET || '';

export function requireWriteAuth(request: Request): { authorized: boolean; error?: Response } {
  // No secret configured — allow all writes (localhost dev mode)
  if (!API_SECRET) return { authorized: true };

  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${API_SECRET}`) return { authorized: true };

  return {
    authorized: false,
    error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  };
}
