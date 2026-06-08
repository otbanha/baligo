// Hot articles config — stored in RATE_LIMIT KV under key "config:hot-articles"
// GET  /api/hot-articles          → [{ id, title }]
// POST /api/hot-articles          → save list (requires X-Admin-Token)

const KV_KEY = 'config:hot-articles';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.RATE_LIMIT) return Response.json([]);

  const raw = await env.RATE_LIMIT.get(KV_KEY);
  const list = raw ? JSON.parse(raw) : [];
  return Response.json(list, { headers: { 'Cache-Control': 'public, max-age=300' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.RATE_LIMIT) return Response.json({ error: 'KV not configured' }, { status: 500 });

  let list;
  try {
    list = await request.json();
    if (!Array.isArray(list)) throw new Error('expected array');
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  await env.RATE_LIMIT.put(KV_KEY, JSON.stringify(list));
  return Response.json({ ok: true });
}
