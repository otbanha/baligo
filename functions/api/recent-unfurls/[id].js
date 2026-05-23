import { isAdmin } from '../../lib/admin/auth.js';
import { cacheDelete } from '../../lib/unfurl/cache.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'DELETE') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // Admin-only
  const admin = await isAdmin(request, env.ADMIN_SECRET ?? '');
  if (!admin) return json({ ok: false, error: 'Forbidden' }, 403);

  const id = params.id;
  if (!id) return json({ ok: false, error: 'Missing id' }, 400);

  if (!env.UNFURL_RECENT) return json({ ok: false, error: 'KV not configured' }, 500);

  const key = `recent:${id}`;

  // Fetch item to get its hash (for blocklist and cache deletion)
  const item = await env.UNFURL_RECENT.get(key, 'json').catch(() => null);
  if (!item) return json({ ok: false, error: 'Not found' }, 404);

  const { hash, sourceUrl } = item;
  const domain = (() => {
    try { return new URL(sourceUrl).hostname; } catch { return 'unknown'; }
  })();

  // Add to blocklist
  if (env.UNFURL_BLOCKLIST && hash) {
    await env.UNFURL_BLOCKLIST.put(
      `bl:${hash}`,
      JSON.stringify({ blockedAt: new Date().toISOString(), blockedBy: 'admin' }),
      { expirationTtl: 30 * 86400 },
    ).catch(() => {});
  }

  // Remove from recent feed
  await env.UNFURL_RECENT.delete(key).catch(() => {});

  // Remove from unfurl cache
  if (env.UNFURL_CACHE && hash) {
    await cacheDelete(env.UNFURL_CACHE, hash);
  }

  console.log(`[admin-delete] hash=${hash?.slice(0, 8)} domain=${domain}`);

  return json({ ok: true });
}
