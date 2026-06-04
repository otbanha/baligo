// Featured articles per category — stored in RATE_LIMIT KV under key "config:featured"
// GET  /api/featured   → { "分類": ["id1","id2",...], ... }
// POST /api/featured   → save map (requires X-Admin-Token)

const KV_KEY = 'config:featured';

// Fallback: initial data from src/featured.json (used when KV is empty)
const DEFAULT_FEATURED = {
  "叫車包車": [
    "2024-12-24-676a2ccefd89780001962994",
    "2024-07-07-668aaea7fd89780001981840",
    "2024-06-05-665d6a8efd897800013337a9"
  ],
  "住宿推薦": [
    "2026-03-06-69aa4faefd897800016bbeda",
    "2025-10-19-68f45c39fd8978000150fff0",
    "2025-09-04-68b8d2e3fd897800017acaee"
  ],
  "簽證通關": [
    "2026-02-27-69a10819fd897800019c4849",
    "2025-08-14-689dcce7fd8978000125fc52",
    "2025-08-14-689db40ffd89780001eb2f3e"
  ]
};

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.RATE_LIMIT) return Response.json({});
  const raw = await env.RATE_LIMIT.get(KV_KEY);
  const data = raw ? JSON.parse(raw) : DEFAULT_FEATURED;
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
