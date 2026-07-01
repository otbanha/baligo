// Page view counter using Cloudflare KV
// Total counts stored as metadata on key `pv:/blog/slug/` so list() returns all in one call.
// Daily counts stored as JSON value on key `pvd:YYYY-MM-DD` → { "/blog/slug/": N, ... }
// POST /api/pageview  { slug: "/blog/..." }  → increments total + today's daily bucket
// GET  /api/pageview                          → returns [{ slug, views }] sorted by views desc (total)
// GET  /api/pageview?range=7d                 → returns top slugs aggregated over last 7 days

const PREFIX = 'pv:';
const DAY_PREFIX = 'pvd:';
const DAY_TTL = 9 * 24 * 60 * 60; // keep daily buckets 9 days so 7d window is always complete

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.PAGEVIEW_KV) return new Response('ok');

  let slug;
  try {
    const body = await request.json();
    slug = (body.slug || '').trim();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  if (!slug || !slug.startsWith('/blog/') || slug.length > 120) {
    return new Response('ok'); // silently ignore invalid slugs
  }

  // Probabilistic write: only write 1 in 20 requests, increment by 20 each time.
  // Statistically accurate while reducing KV writes by ~95%.
  if (Math.random() >= 0.05) {
    return new Response('ok');
  }

  const key = PREFIX + slug;
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dayKey = DAY_PREFIX + dateStr;

  // Update total count and daily bucket in parallel
  const [existing, dayData] = await Promise.all([
    env.PAGEVIEW_KV.getWithMetadata(key),
    env.PAGEVIEW_KV.get(dayKey, 'json'),
  ]);

  const count = ((existing.metadata && existing.metadata.views) || 0) + 20;
  const day = dayData || {};
  day[slug] = (day[slug] || 0) + 20;

  await Promise.all([
    env.PAGEVIEW_KV.put(key, '', { metadata: { views: count } }),
    env.PAGEVIEW_KV.put(dayKey, JSON.stringify(day), { expirationTtl: DAY_TTL }),
  ]);

  return new Response('ok');
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.PAGEVIEW_KV) return Response.json([]);

  const url = new URL(request.url);

  // ── 近7天模式 ─────────────────────────────────────────────────────────────
  if (url.searchParams.get('range') === '7d') {
    const today = new Date();
    const keys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      return DAY_PREFIX + d.toISOString().slice(0, 10);
    });

    const days = await Promise.all(keys.map(k => env.PAGEVIEW_KV.get(k, 'json')));

    const agg = {};
    days.forEach(data => {
      if (!data) return;
      for (const [slug, views] of Object.entries(data)) {
        agg[slug] = (agg[slug] || 0) + views;
      }
    });

    const results = Object.entries(agg)
      .map(([slug, views]) => ({ slug, views }))
      .sort((a, b) => b.views - a.views);

    return Response.json(results, { headers: { 'Cache-Control': 'no-store' } });
  }

  // ── 總瀏覽量模式（預設）────────────────────────────────────────────────────
  const list = await env.PAGEVIEW_KV.list({ prefix: PREFIX, limit: 1000 });
  const results = list.keys
    .map(({ name, metadata }) => ({
      slug: name.slice(PREFIX.length),
      views: (metadata && metadata.views) || 0,
    }))
    .filter(r => r.views > 0)
    .sort((a, b) => b.views - a.views);

  return Response.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
