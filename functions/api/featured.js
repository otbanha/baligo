// Featured articles per category — stored in RATE_LIMIT KV under key "config:featured"
// GET  /api/featured   → { "分類": ["id1","id2",...], ... }
// POST /api/featured   → save map (requires X-Admin-Token)

const KV_KEY = 'config:featured';

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.RATE_LIMIT) return Response.json({});
  const raw = await env.RATE_LIMIT.get(KV_KEY);
  const data = raw ? JSON.parse(raw) : {};
  return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.RATE_LIMIT) return Response.json({ error: 'KV not configured' }, { status: 500 });

  let data;
  try {
    data = await request.json();
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  await env.RATE_LIMIT.put(KV_KEY, JSON.stringify(data));
  return Response.json({ ok: true });
}
