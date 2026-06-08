// GET /api/comments/all — 管理員取得所有留言（需 X-Admin-Token）

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (!env.ADMIN_TOKEN || request.headers.get('X-Admin-Token') !== env.ADMIN_TOKEN) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  if (!env.DB) return new Response('DB not configured', { status: 500 });

  const { results } = await env.DB.prepare(
    `SELECT id, slug, name, content, created_at
       FROM comments
      ORDER BY created_at DESC
      LIMIT 500`
  ).all();

  return new Response(JSON.stringify(results || []), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
