const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Assembled list is cached under one KV key so traffic volume no longer multiplies
// into a list() + N get() calls per visitor (this endpoint is hit by both /share
// and the homepage's ShareWallPicks widget on every page view).
const CACHE_KEY = 'meta:recent-unfurls-cache';
const CACHE_TTL_S = 60;
const MAX_ITEMS = 100; // covers the largest `limit` any caller requests

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

    const cached = await env.UNFURL_RECENT.get(CACHE_KEY, 'json').catch(() => null);
    let items;
    if (cached?.computedAt && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_S * 1000) {
      items = cached.items;
    } else {
      // KV list sorts keys lexicographically; our key prefix `recent:YYYYMMDDhhmmss-...`
      // naturally sorts oldest-first, so we reverse to get newest first.
      const { keys } = await env.UNFURL_RECENT.list({ prefix: 'recent:', limit: 1000 });
      const sorted = keys.slice().reverse().slice(0, MAX_ITEMS);
      items = (
        await Promise.all(sorted.map((k) => env.UNFURL_RECENT.get(k.name, 'json').catch(() => null)))
      ).filter(Boolean);

      context.waitUntil(
        env.UNFURL_RECENT.put(CACHE_KEY, JSON.stringify({ items, computedAt: new Date().toISOString() }), { expirationTtl: CACHE_TTL_S }).catch(() => {}),
      );
    }

    // 內層已用 KV 快取，這裡 Cache-Control 縮短到與內層 TTL 一致，避免兩層快取時間不一致造成混淆。
    return json({ items: items.slice(0, limit) }, 200, { 'Cache-Control': `public, max-age=${CACHE_TTL_S}` });
  } catch (e) {
    console.log(`[recent-unfurls] error: ${e?.message}`);
    return json({ items: [] });
  }
}
