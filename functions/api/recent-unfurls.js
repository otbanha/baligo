const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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

    // KV list sorts keys lexicographically; our key prefix `recent:YYYYMMDDhhmmss-...`
    // naturally sorts oldest-first, so we reverse to get newest first.
    // Items are permanent (no TTL), so we fetch up to 1000 keys to always get the latest N.
    const { keys } = await env.UNFURL_RECENT.list({ prefix: 'recent:', limit: 1000 });
    const sorted = keys.slice().reverse().slice(0, limit);

    const items = await Promise.all(
      sorted.map((k) => env.UNFURL_RECENT.get(k.name, 'json').catch(() => null)),
    );

    // KV list 有成本，每 12 小時讓 CDN 快取一次即可，不需每位訪客都打 KV。
    return json({ items: items.filter(Boolean) }, 200, { 'Cache-Control': 'public, max-age=43200' });
  } catch (e) {
    console.log(`[recent-unfurls] error: ${e?.message}`);
    return json({ items: [] });
  }
}
