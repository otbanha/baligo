/**
 * POST /api/check-duplicate
 * Checks if a URL already exists in UNFURL_RECENT or is blocklisted.
 * Does NOT require Turnstile. Has its own light rate limit (30/min/IP).
 */
import { normalizeUrl } from '../lib/unfurl/validate.js';
import { hashUrl } from '../lib/unfurl/cache.js';

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

/** 30 requests / minute / IP using UNFURL_RATELIMIT KV */
async function checkDupRateLimit(kv, ip) {
  if (!kv) return true;
  try {
    const key = `rl:dup:${ip}`;
    const raw = await kv.get(key, 'text');
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= 30) return false;
    await kv.put(key, String(count + 1), { expirationTtl: 60 });
    return true;
  } catch {
    return true; // fail open
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  let rawUrl;
  try {
    const body = await request.json();
    rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
  } catch {
    return json({ isDuplicate: false, isBlocked: false });
  }

  if (!rawUrl) return json({ isDuplicate: false, isBlocked: false });

  // Rate limit (light — query only, no writes)
  const ip = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')
    ?? 'unknown';
  const allowed = await checkDupRateLimit(env.UNFURL_RATELIMIT, ip);
  if (!allowed) return json({ isDuplicate: false, isBlocked: false, rateLimited: true });

  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return json({ isDuplicate: false, isBlocked: false });

  const hash = await hashUrl(normalizedUrl);

  // 1. Check blocklist first
  if (env.UNFURL_BLOCKLIST) {
    const blocked = await env.UNFURL_BLOCKLIST.get(`bl:${hash}`).catch(() => null);
    if (blocked) return json({ isDuplicate: false, isBlocked: true });
  }

  // 2. Check reverse index in UNFURL_RECENT (O(1))
  if (env.UNFURL_RECENT) {
    const existing = await env.UNFURL_RECENT.get(`hash:${hash}`, 'json').catch(() => null);
    if (existing) {
      return json({
        isDuplicate: true,
        isBlocked: false,
        existingItem: {
          id: existing.id,
          title: existing.title ?? null,
          fetchedAt: existing.fetchedAt ?? null,
          sourceUrl: existing.sourceUrl ?? null,
        },
      });
    }
  }

  return json({ isDuplicate: false, isBlocked: false });
}
