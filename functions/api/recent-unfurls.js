const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Assembled list cached in two layers:
// 1. Cloudflare edge cache (CDN) – most requests never touch KV at all
// 2. KV aggregated cache – CACHE_TTL_S freshness, CACHE_STORE_TTL_S expiry
//    (expirationTtl must be >> CACHE_TTL_S to avoid auto-delete every CACHE_TTL_S seconds,
//     which was generating 1440 delete ops/day with the original 60-second TTL)
const CACHE_KEY = 'meta:recent-unfurls-cache';
const CACHE_TTL_S = 300; // logical freshness: 5 minutes
const CACHE_STORE_TTL_S = 3600; // KV expiry: 1 hour (avoids ~1440 auto-deletes/day)
const MAX_ITEMS = 100;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  if (!env.UNFURL_RECENT) {
    return json({ items: [] });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100);

    // Layer 1: Cloudflare edge cache – zero KV ops for cached responses
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    const edgeCached = await cache.match(cacheKey);
    if (edgeCached) return edgeCached;

    // Layer 2: KV aggregated cache
    const kvCached = await env.UNFURL_RECENT.get(CACHE_KEY, 'json').catch(() => null);
    let items;
    if (kvCached?.computedAt && Date.now() - new Date(kvCached.computedAt).getTime() < CACHE_TTL_S * 1000) {
      items = kvCached.items;
    } else {
      // KV list sorts keys lexicographically; our key prefix `recent:YYYYMMDDhhmmss-...`
      // naturally sorts oldest-first, so we reverse to get newest first.
      const { keys } = await env.UNFURL_RECENT.list({ prefix: 'recent:', limit: 1000 });
      const sorted = keys.slice().reverse().slice(0, MAX_ITEMS);
      items = (
        await Promise.all(sorted.map((k) => env.UNFURL_RECENT.get(k.name, 'json').catch(() => null)))
      ).filter(Boolean);

      context.waitUntil(
        env.UNFURL_RECENT.put(
          CACHE_KEY,
          JSON.stringify({ items, computedAt: new Date().toISOString() }),
          { expirationTtl: CACHE_STORE_TTL_S },
        ).catch(() => {}),
      );
    }

    const response = json({ items: items.slice(0, limit) }, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL_S}` });
    // Store in edge cache for subsequent requests at this edge location
    context.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (e) {
    console.log(`[recent-unfurls] error: ${e?.message}`);
    return json({ items: [] });
  }
}
