// Short link CRUD API
// GET    /api/shortlinks          → list all
// POST   /api/shortlinks  { id, url, note }  → create
// DELETE /api/shortlinks?id=xxx   → delete
//
// Auth: X-Admin-Token header must match env.ADMIN_TOKEN (if set)

const PREFIX = 'sl:';
const ID_RE = /^[a-zA-Z0-9_-]{1,60}$/;

function checkAuth(request, env) {
  if (!env.ADMIN_TOKEN) return true; // no token configured = open
  return request.headers.get('X-Admin-Token') === env.ADMIN_TOKEN;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

// ── GET: list all dynamic shortlinks ─────────────────────────────────────────
export async function onRequestGet({ env }) {
  if (!env.RATE_LIMIT) return Response.json([], { headers: cors });

  const list = await env.RATE_LIMIT.list({ prefix: PREFIX, limit: 1000 });
  const links = list.keys.map(({ name, metadata }) => ({
    id: name.slice(PREFIX.length),
    url: metadata?.url || '',
    note: metadata?.note || '',
    createdAt: metadata?.createdAt || '',
  })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return Response.json(links, { headers: cors });
}

// ── POST: create shortlink ────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) {
    return Response.json({ error: '密碼錯誤' }, { status: 401, headers: cors });
  }
  if (!env.RATE_LIMIT) {
    return Response.json({ error: 'KV 未設定' }, { status: 503, headers: cors });
  }

  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: '格式錯誤' }, { status: 400, headers: cors });
  }

  const id = (body.id || '').trim();
  const url = (body.url || '').trim();
  const note = (body.note || '').trim().slice(0, 100);

  if (!ID_RE.test(id)) {
    return Response.json({ error: 'ID 只能用英數字、- 和 _，最多 60 字元' }, { status: 400, headers: cors });
  }
  if (!url.startsWith('http')) {
    return Response.json({ error: '目標網址格式不正確' }, { status: 400, headers: cors });
  }

  // Check duplicate
  const existing = await env.RATE_LIMIT.get(`${PREFIX}${id}`);
  if (existing) {
    return Response.json({ error: `ID "${id}" 已存在` }, { status: 409, headers: cors });
  }

  await env.RATE_LIMIT.put(`${PREFIX}${id}`, url, {
    metadata: { url, note, createdAt: new Date().toISOString() },
  });

  return Response.json({ ok: true, id, url }, { headers: cors });
}

// ── DELETE: remove shortlink ──────────────────────────────────────────────────
export async function onRequestDelete({ request, env }) {
  if (!checkAuth(request, env)) {
    return Response.json({ error: '密碼錯誤' }, { status: 401, headers: cors });
  }
  if (!env.RATE_LIMIT) {
    return Response.json({ error: 'KV 未設定' }, { status: 503, headers: cors });
  }

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return Response.json({ error: '缺少 id' }, { status: 400, headers: cors });

  await env.RATE_LIMIT.delete(`${PREFIX}${id}`);
  return Response.json({ ok: true }, { headers: cors });
}
