import { detectPlatform, normalizeUrl, extractDomain } from '../lib/unfurl/validate.js';
import { hashUrl, cacheGet, cachePut } from '../lib/unfurl/cache.js';
import { checkRateLimit } from '../lib/unfurl/ratelimit.js';
import { isAdmin } from '../lib/admin/auth.js';
import { handleYouTube } from '../lib/unfurl/youtube.js';
import { handleThreads } from '../lib/unfurl/threads.js';
import { handleInstagram } from '../lib/unfurl/instagram.js';
import { handleFacebook } from '../lib/unfurl/facebook.js';
import { handleTikTok } from '../lib/unfurl/tiktok.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ERROR_MESSAGES = {
  INVALID_URL: '請輸入有效的網址',
  UNSUPPORTED_PLATFORM: '目前只支援 YouTube、Threads、Instagram、Facebook、TikTok',
  BLOCKED_BY_PLATFORM: '平台限制（Instagram / Threads 需要授權 token），無法抓取此貼文',
  BLOCKED_BY_ADMIN: '這個網址不在本工具的服務範圍內',
  NOT_FOUND: '找不到這篇貼文，可能已被刪除或設為私人',
  UPSTREAM_ERROR: '平台暫時無法連線，請稍後再試',
  TIMEOUT: '連線逾時，請稍後再試',
  RATE_LIMITED: '請稍後再試（每小時最多 5 次）',
  BOT_DETECTED: '驗證失敗，請重新整理頁面再試',
  INTERNAL_ERROR: '系統錯誤，請稍後再試',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function errorResponse(code, platform) {
  return json({
    ok: false,
    error: code,
    message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR,
    ...(platform ? { platform } : {}),
  });
}

/** Verify Cloudflare Turnstile token. Returns true if valid (or secret not configured). */
async function verifyTurnstile(token, secret, origin) {
  if (!secret) return true; // Not configured → skip (dev/staging)
  if (!token) return false;
  try {
    const fd = new FormData();
    fd.append('secret', secret);
    fd.append('response', token);
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: fd,
    });
    const data = await res.json();
    if (!data.success) {
      console.log(`[turnstile-fail] origin=${origin} error=${JSON.stringify(data['error-codes'])}`);
    }
    return data.success === true;
  } catch (e) {
    console.log(`[turnstile-fail] exception origin=${origin} err=${e?.message}`);
    return false;
  }
}

/** Write to UNFURL_RECENT KV (non-fatal). */
async function writeRecent(env, result, hash) {
  if (!env.UNFURL_RECENT) return;
  try {
    const now = new Date();
    const ttlSeconds = 7 * 86400;
    const expiresAt = Math.floor(now.getTime() / 1000) + ttlSeconds;
    const ts = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
    const shortHash = hash.slice(0, 8);
    const key = `recent:${ts}-${shortHash}`;

    const item = {
      id: `${ts}-${shortHash}`,
      platform: result.platform,
      title: result.data.title,
      thumbnail: result.data.media?.[0]?.url ?? null,
      authorName: result.data.author?.name ?? null,
      sourceUrl: result.data.sourceUrl,
      fetchedAt: now.toISOString(),
      hash,
      views: 0,
      likes: 0,
      expiresAt,
    };

    await env.UNFURL_RECENT.put(key, JSON.stringify(item), { expiration: expiresAt });
  } catch {
    // Non-fatal
  }
}

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  // Parse body
  let rawUrl, turnstileToken;
  try {
    const body = await request.json();
    rawUrl = typeof body?.url === 'string' ? body.url.trim() : '';
    turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken : '';
  } catch {
    return errorResponse('INVALID_URL');
  }

  if (!rawUrl) return errorResponse('INVALID_URL');

  // Turnstile bot check
  const origin = request.headers.get('origin') ?? '';
  const turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET ?? '', origin);
  if (!turnstileOk) {
    return json({ ok: false, error: 'BOT_DETECTED', message: ERROR_MESSAGES.BOT_DETECTED });
  }

  // Validate & detect platform
  const detected = detectPlatform(rawUrl);
  if (detected.error) return errorResponse(detected.error);

  const { platform } = detected;
  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return errorResponse('INVALID_URL');

  // SHA-256 hash for cache/blocklist key
  const hash = await hashUrl(normalizedUrl);
  const domain = extractDomain(normalizedUrl);

  // Check blocklist
  if (env.UNFURL_BLOCKLIST) {
    try {
      const blocked = await env.UNFURL_BLOCKLIST.get(`bl:${hash}`);
      if (blocked) {
        console.log(`[unfurl] blocked hash=${hash.slice(0, 8)} domain=${domain}`);
        return errorResponse('BLOCKED_BY_ADMIN', platform);
      }
    } catch {}
  }

  // Check KV cache
  if (env.UNFURL_CACHE) {
    const cached = await cacheGet(env.UNFURL_CACHE, hash);
    if (cached) {
      return json({ ...cached, cached: true });
    }
  }

  // Rate limit check (per IP); admin gets higher quota
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  const adminUser = await isAdmin(request, env.ADMIN_SECRET ?? '').catch(() => false);
  if (env.UNFURL_RATELIMIT) {
    const allowed = await checkRateLimit(env.UNFURL_RATELIMIT, ip, adminUser);
    if (!allowed) {
      console.log(`[unfurl] rate_limited domain=${domain}`);
      return json({ ok: false, error: 'RATE_LIMITED', message: ERROR_MESSAGES.RATE_LIMITED }, 429);
    }
  }

  // Dispatch to platform handler
  let result;
  try {
    switch (platform) {
      case 'youtube':   result = await handleYouTube(normalizedUrl);   break;
      case 'threads':   result = await handleThreads(normalizedUrl);   break;
      case 'instagram': result = await handleInstagram(normalizedUrl, env.INSTAGRAM_TOKEN ?? null); break;
      case 'facebook':  result = await handleFacebook(normalizedUrl);  break;
      case 'tiktok':    result = await handleTikTok(normalizedUrl);    break;
      default: return errorResponse('UNSUPPORTED_PLATFORM');
    }
  } catch (e) {
    console.log(`[unfurl] internal_error domain=${domain} err=${e?.message}`);
    return errorResponse('INTERNAL_ERROR', platform);
  }

  // Handle handler errors
  if (result.error) {
    console.log(`[unfurl] error=${result.error} domain=${domain} hash=${hash.slice(0, 8)}`);
    const errResponse = {
      ok: false,
      error: result.error,
      message: ERROR_MESSAGES[result.error] ?? ERROR_MESSAGES.INTERNAL_ERROR,
      platform,
    };
    if (env.UNFURL_CACHE && result.error !== 'RATE_LIMITED') {
      await cachePut(env.UNFURL_CACHE, hash, errResponse, false);
    }
    return json(errResponse);
  }

  // Success response
  const response = { ...result, cached: false, fetchedAt: new Date().toISOString() };

  if (env.UNFURL_CACHE) {
    context.waitUntil(cachePut(env.UNFURL_CACHE, hash, response, true));
  }
  if (env.UNFURL_RECENT) {
    context.waitUntil(writeRecent(env, result, hash));
  }

  return json(response);
}
