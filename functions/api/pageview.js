// Page view counter using Cloudflare KV
// Counts stored as metadata on key `pv:/blog/slug/` so list() returns all in one call.
// POST /api/pageview  { slug: "/blog/..." }  → increments counter
// GET  /api/pageview                          → returns [{ slug, views }] sorted by views desc

const PREFIX = 'pv:';

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

  const key = PREFIX + slug;
  // Probabilistic write: only write 1 in 20 requests, increment by 20 each time.
  // Statistically accurate while reducing KV writes by ~95%.
  if (Math.random() >= 0.05) {
    return new Response('ok');
  }
  const existing = await env.PAGEVIEW_KV.getWithMetadata(key);
  const count = ((existing.metadata && existing.metadata.views) || 0) + 20;
  await env.PAGEVIEW_KV.put(key, '', { metadata: { views: count } });

  return new Response('ok');
}

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.PAGEVIEW_KV) return Response.json([]);

  // list() returns all keys + metadata in one round-trip — no per-key gets needed
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
