// Homepage YouTube videos — stored in RATE_LIMIT KV under key "config:videos"
// GET  /api/videos   → ["videoId1", "videoId2", ...]
// POST /api/videos   → save array (requires X-Admin-Token)

const KV_KEY = 'config:videos';

const DEFAULT_VIDEOS = [
  '0fqEvAzAy9A',
  'GivvqCXp11A',
  'H5N5_UuK7TI',
  'EotdDxXHFwE',
  '7JIqxDIyDF0',
  'ePutHL_Ob1Q',
];

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.RATE_LIMIT) return Response.json(DEFAULT_VIDEOS);
  const raw = await env.RATE_LIMIT.get(KV_KEY);
  const data = raw ? JSON.parse(raw) : DEFAULT_VIDEOS;
  return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } });
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
    if (!Array.isArray(data)) throw new Error();
    // Validate each entry is a non-empty string (video ID)
    data = data.map(v => String(v).trim()).filter(Boolean);
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  await env.RATE_LIMIT.put(KV_KEY, JSON.stringify(data));
  return Response.json({ ok: true });
}
