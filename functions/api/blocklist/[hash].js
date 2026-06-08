/**
 * DELETE /api/blocklist/:hash  — admin only
 * Removes a URL from the blocklist.
 */
import { isAdmin } from '../../lib/admin/auth.js';

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

  const admin = await isAdmin(request, env.ADMIN_SECRET ?? '');
  if (!admin) return json({ ok: false, error: 'Forbidden' }, 403);

  const hash = params.hash;
  if (!hash) return json({ ok: false, error: 'Missing hash' }, 400);

  if (!env.UNFURL_BLOCKLIST) return json({ ok: false, error: 'KV not configured' }, 500);

  await env.UNFURL_BLOCKLIST.delete(`bl:${hash}`).catch(() => {});
  console.log(`[admin-unblock] hash=${hash.slice(0, 8)}`);

  return json({ ok: true });
}
