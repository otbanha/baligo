// Comments API
// GET    /api/comments?slug=xxx        → 取得該文章留言
// POST   /api/comments  { slug, name, content } → 新增留言
// DELETE /api/comments?id=xxx          → 刪除（需 X-Admin-Token）

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function ensureTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      slug       TEXT    NOT NULL,
      name       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      approved   INTEGER NOT NULL DEFAULT 1
    )
  `).run();
  await db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug)`
  ).run();
}

// Simple in-memory rate limit (per Cloudflare isolate)
const rateMap = new Map();

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!env.DB) return new Response('DB not configured', { status: 500 });

  await ensureTable(env.DB);

  const url  = new URL(request.url);
  const slug = url.searchParams.get('slug') || '';

  // ── GET ──────────────────────────────────────────────────────
  if (request.method === 'GET') {
    if (!slug) return json({ error: 'slug required' }, 400);
    const { results } = await env.DB.prepare(
      `SELECT id, name, content, created_at
         FROM comments
        WHERE slug = ? AND approved = 1
        ORDER BY created_at ASC
        LIMIT 200`
    ).bind(slug).all();
    return json(results || []);
  }

  // ── POST ─────────────────────────────────────────────────────
  if (request.method === 'POST') {
    const ip  = request.headers.get('CF-Connecting-IP') || 'x';
    const now = Date.now();
    if (now - (rateMap.get(ip) || 0) < 60_000) {
      return json({ error: '請稍後再留言（1 分鐘限一則）' }, 429);
    }

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { slug: s, name, content } = body;
    if (!s || (name?.trim().length < 2) || (content?.trim().length < 5)) {
      return json({ error: '請填寫至少 2 字的姓名與 5 字的留言內容' }, 400);
    }
    if (name.length > 50)    return json({ error: '姓名過長（最多 50 字）' }, 400);
    if (content.length > 1000) return json({ error: '留言過長（最多 1000 字）' }, 400);

    const clean = str => str.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');

    await env.DB.prepare(
      `INSERT INTO comments (slug, name, content, created_at) VALUES (?, ?, ?, ?)`
    ).bind(s, clean(name), clean(content), now).run();

    rateMap.set(ip, now);
    return json({ ok: true });
  }

  // ── DELETE ───────────────────────────────────────────────────
  if (request.method === 'DELETE') {
    if (!env.ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN) {
      return new Response('Unauthorized', { status: 401, headers: CORS });
    }
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'id required' }, 400);
    await env.DB.prepare(`DELETE FROM comments WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }

  return new Response('Method not allowed', { status: 405, headers: CORS });
}
