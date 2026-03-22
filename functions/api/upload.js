// Cloudflare R2 image upload endpoint for CMS
// Supports two modes:
//   1. Native R2 binding (env.R2_BUCKET) — configure in Cloudflare Pages dashboard
//   2. S3-compatible API (env.R2_ACCOUNT_ID + keys) — set env vars in Pages settings
//
// Required env vars:
//   R2_PUBLIC_URL  — public base URL, e.g. https://images.gobaligo.id  (both modes)
//   --- S3 mode only ---
//   R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif',
  'image/webp', 'image/avif', 'image/svg+xml',
]);
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

// ── AWS SigV4 helpers ─────────────────────────────────────────────────────────

async function hmac(key, data) {
  const k = key instanceof Uint8Array ? key : new TextEncoder().encode(key);
  const d = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const ck = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', ck, d));
}

async function sha256Hex(data) {
  const d = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  const buf = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toHex(arr) {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function uploadViaS3(env, key, buffer, contentType) {
  const { R2_ACCOUNT_ID: accountId, R2_BUCKET_NAME: bucket,
          R2_ACCESS_KEY_ID: accessKey, R2_SECRET_ACCESS_KEY: secretKey } = env;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key}`;
  const payloadHash = await sha256Hex(buffer);

  const hdrKeys = ['content-type', 'host', 'x-amz-content-sha256', 'x-amz-date'];
  const hdrValues = {
    'content-type': contentType,
    'host': host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };

  const canonicalHeaders = hdrKeys.map(k => `${k}:${hdrValues[k]}`).join('\n') + '\n';
  const signedHeaders = hdrKeys.join(';');
  const canonicalRequest = ['PUT', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');

  const credScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credScope, await sha256Hex(canonicalRequest)].join('\n');

  const kDate    = await hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion  = await hmac(kDate, 'auto');
  const kService = await hmac(kRegion, 's3');
  const kSign    = await hmac(kService, 'aws4_request');
  const signature = toHex(await hmac(kSign, stringToSign));

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKey}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}${canonicalUri}`, {
    method: 'PUT',
    headers: { ...hdrValues, Authorization: authorization },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`R2 S3 API error ${res.status}: ${text}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const isAllowed =
    origin === 'https://gobaligo.id' ||
    origin.endsWith('.gobaligo.id') ||
    origin.includes('localhost');

  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'https://gobaligo.id',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!isAllowed) {
    return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
  }

  // Parse multipart form
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return Response.json({ error: '缺少 file 欄位' }, { status: 400, headers: corsHeaders });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: '不支援的檔案類型' }, { status: 400, headers: corsHeaders });
  }

  if (file.size > MAX_SIZE) {
    return Response.json({ error: '檔案超過 15MB 上限' }, { status: 400, headers: corsHeaders });
  }

  // Build a safe, unique key: images/YYYY-MM/timestamp-filename.ext
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
  const monthDir = new Date().toISOString().slice(0, 7); // e.g. 2026-03
  const key = `images/${monthDir}/${Date.now()}-${safeName}`;

  const buffer = await file.arrayBuffer();

  try {
    if (env.R2_BUCKET) {
      // ✅ Native binding (preferred — set up in Cloudflare Pages dashboard)
      await env.R2_BUCKET.put(key, buffer, {
        httpMetadata: { contentType: file.type },
      });
    } else if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID) {
      // ✅ S3-compatible API (use if binding not configured)
      await uploadViaS3(env, key, buffer, file.type);
    } else {
      return Response.json(
        { error: 'R2 未設定：請在 Pages 環境變數中加入 R2_ACCOUNT_ID 等設定' },
        { status: 503, headers: corsHeaders },
      );
    }
  } catch (err) {
    console.error('[upload] R2 error:', err.message);
    return Response.json({ error: '上傳失敗，請稍後再試' }, { status: 500, headers: corsHeaders });
  }

  const publicUrl = `${(env.R2_PUBLIC_URL || '').replace(/\/$/, '')}/${key}`;
  return Response.json({ url: publicUrl }, { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
