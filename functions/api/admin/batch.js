/**
 * POST /api/admin/batch  — admin only
 * Batch soft-delete, block, or unblock items.
 *
 * body: { action: 'soft' | 'block' | 'unblock', ids: string[] }
 *   soft/block:  ids are recent-item ids (the part after "recent:")
 *   unblock:     ids are URL hashes (the part after "bl:")
 */
import { isAdmin } from '../../lib/admin/auth.js';
import { cacheDelete } from '../../lib/unfurl/cache.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const admin = await isAdmin(request, env.ADMIN_SECRET ?? '');
  if (!admin) return json({ ok: false, error: 'Forbidden' }, 403);

  let action, ids;
  try {
    const body = await request.json();
    action = body.action;
    ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
  } catch {
    return json({ ok: false, error: 'Invalid body' }, 400);
  }

  if (!['soft', 'block', 'unblock'].includes(action)) {
    return json({ ok: false, error: 'Invalid action' }, 400);
  }
  if (ids.length === 0) return json({ ok: true, success: 0, failed: 0, errors: [] });

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      if (action === 'unblock') {
        // id is the hash
        if (env.UNFURL_BLOCKLIST) {
          await env.UNFURL_BLOCKLIST.delete(`bl:${id}`);
        }
        console.log(`[admin-unblock-batch] hash=${id.slice(0, 8)}`);
        return;
      }

      // soft | block — id is the recent item id
      const key = `recent:${id}`;
      const item = await env.UNFURL_RECENT?.get(key, 'json').catch(() => null);
      if (!item) throw new Error('Not found');

      const { hash, sourceUrl } = item;
      const domain = (() => { try { return new URL(sourceUrl).hostname; } catch { return 'unknown'; } })();

      await env.UNFURL_RECENT?.delete(key).catch(() => {});
      if (hash && env.UNFURL_RECENT) {
        await env.UNFURL_RECENT.delete(`hash:${hash}`).catch(() => {});
      }
      if (env.UNFURL_CACHE && hash) {
        await cacheDelete(env.UNFURL_CACHE, hash);
      }

      if (action === 'block' && env.UNFURL_BLOCKLIST && hash) {
        await env.UNFURL_BLOCKLIST.put(
          `bl:${hash}`,
          JSON.stringify({ blockedAt: new Date().toISOString(), blockedBy: 'admin', sourceUrl }),
          { expirationTtl: 30 * 86400 },
        );
        console.log(`[admin-block-batch] hash=${hash?.slice(0, 8)} domain=${domain}`);
      } else {
        console.log(`[admin-soft-delete-batch] hash=${hash?.slice(0, 8)} domain=${domain}`);
      }
    }),
  );

  let success = 0, failed = 0;
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      success++;
    } else {
      failed++;
      errors.push({ id: ids[i], message: r.reason?.message ?? 'Unknown error' });
    }
  });

  return json({ ok: true, success, failed, errors });
}
