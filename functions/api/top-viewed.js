/**
 * GET /api/top-viewed
 * Returns top 10 most-viewed items from the past 7 days.
 * Result is cached in the same KV namespace for 1 hour.
 */
const CACHE_KEY = 'meta:top-viewed-cache';
const CACHE_TTL_S = 3600;

function ok(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_S}`,
    },
  });
}

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.UNFURL_RECENT) {
    return ok({ items: [], computedAt: null });
  }

  // Serve from cache if fresh (< 1 hour)
  const cached = await env.UNFURL_RECENT.get(CACHE_KEY, 'json').catch(() => null);
  if (cached?.computedAt) {
    const ageMs = Date.now() - new Date(cached.computedAt).getTime();
    if (ageMs < CACHE_TTL_S * 1000) {
      return ok(cached);
    }
  }

  // Recompute from all recent: keys
  try {
    const { keys } = await env.UNFURL_RECENT.list({ prefix: 'recent:' });

    const items = (
      await Promise.all(keys.map(k => env.UNFURL_RECENT.get(k.name, 'json').catch(() => null)))
    ).filter(Boolean);

    const top = items
      .filter(item => (item.views ?? 0) > 0)
      .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
      .slice(0, 10);

    const result = { items: top, computedAt: new Date().toISOString() };

    // Write cache (non-fatal)
    env.UNFURL_RECENT.put(CACHE_KEY, JSON.stringify(result), { expirationTtl: CACHE_TTL_S })
      .catch(() => {});

    return ok(result);
  } catch (e) {
    console.log(`[top-viewed] error: ${e?.message}`);
    return ok({ items: [], computedAt: null });
  }
}
