/**
 * GET /api/blocklist  — admin only
 * Returns all blocklisted URLs.
 */
import { isAdmin } from '../lib/admin/auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const admin = await isAdmin(request, env.ADMIN_SECRET ?? '');
  if (!admin) return json({ ok: false, error: 'Forbidden' }, 403);

  if (!env.UNFURL_BLOCKLIST) return json({ items: [] });

  try {
    const { keys } = await env.UNFURL_BLOCKLIST.list({ prefix: 'bl:' });

    const items = await Promise.all(
      keys.map(async (k) => {
        const val = await env.UNFURL_BLOCKLIST.get(k.name, 'json').catch(() => null);
        if (!val) return null;
        const hash = k.name.replace(/^bl:/, '');
        return {
          hash,
          sourceUrl: val.sourceUrl ?? null,
          blockedAt: val.blockedAt ?? null,
          blockedBy: val.blockedBy ?? 'admin',
          // KV expiration metadata (may not be present in all environments)
          expiresAt: k.expiration ? new Date(k.expiration * 1000).toISOString() : null,
        };
      }),
    );

    const sorted = items
      .filter(Boolean)
      .sort((a, b) => {
        if (!a.blockedAt) return 1;
        if (!b.blockedAt) return -1;
        return b.blockedAt.localeCompare(a.blockedAt);
      });

    return json({ items: sorted });
  } catch (e) {
    console.log(`[blocklist] error: ${e?.message}`);
    return json({ items: [] });
  }
}
