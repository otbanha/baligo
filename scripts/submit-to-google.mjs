#!/usr/bin/env node
/**
 * submit-to-google.mjs
 *
 * 向 Google Indexing API 提交網址，請求 Google 盡快重新檢索（建立索引）。
 * 零外部依賴：用 Node 內建 crypto 簽 JWT、global fetch 呼叫 API。
 *
 * 用法：
 *   node scripts/submit-to-google.mjs <url1> <url2> ...
 *   echo "url1\nurl2" | node scripts/submit-to-google.mjs   # 從 stdin 讀
 *
 * 環境變數：
 *   GOOGLE_INDEXING_CREDENTIALS  service account JSON（整份字串）。未設定時略過、exit 0。
 *   VERIFY_200=true              提交前先確認該 URL 回傳 200（跳過 404/301），預設 true。
 *   MAX_SUBMIT=100               單次最多提交數（Indexing API 預設配額 200/天）。
 *
 * 注意：Indexing API 官方文件僅明列支援 JobPosting / BroadcastEvent，
 * 但對一般網頁的「請求重新檢索」實務上有效，屬廣泛使用的灰色地帶。
 */

import crypto from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/indexing';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish';

const VERIFY_200 = (process.env.VERIFY_200 ?? 'true') !== 'false';
const MAX_SUBMIT = parseInt(process.env.MAX_SUBMIT ?? '100', 10);

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

/** 蒐集要提交的 URL：CLI 參數 + stdin（換行或逗號分隔），去重、保序。 */
async function collectUrls() {
  const fromArgs = process.argv.slice(2);
  const fromStdin = (await readStdin()).split(/[\s,]+/);
  const seen = new Set();
  const urls = [];
  for (const raw of [...fromArgs, ...fromStdin]) {
    const u = raw.trim();
    if (!u || !/^https?:\/\//.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  return urls;
}

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: creds.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(creds.private_key).toString('base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`取得 access token 失敗：${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

/**
 * 不跟隨轉址，僅接受真正的 200（避開 301 舊網址、404）。
 * 一定要帶 Accept-Language: zh-TW，否則 functions/_middleware.js 的語系偵測
 * 對沒有這個標頭的請求（Node fetch 預設不送）會判成 'en' 導致 302 轉到
 * /en/ 版本，誤判成「非 200」而被略過提交。
 */
async function isLive(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'Accept-Language': 'zh-TW,zh;q=0.9' },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function submit(token, url) {
  const res = await fetch(PUBLISH_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, type: 'URL_UPDATED' }),
  });
  return { url, ok: res.ok, status: res.status, body: res.ok ? '' : await res.text() };
}

async function main() {
  const credsRaw = process.env.GOOGLE_INDEXING_CREDENTIALS;
  if (!credsRaw || !credsRaw.trim()) {
    console.log('⏭️  未設定 GOOGLE_INDEXING_CREDENTIALS，略過 Google 提交。');
    return;
  }

  let urls = await collectUrls();
  if (urls.length === 0) {
    console.log('ℹ️  沒有要提交的 URL。');
    return;
  }

  let creds;
  try {
    creds = JSON.parse(credsRaw);
  } catch {
    console.error('❌ GOOGLE_INDEXING_CREDENTIALS 不是合法 JSON。');
    process.exitCode = 1;
    return;
  }

  // 先過濾出真正 live 的 URL
  if (VERIFY_200) {
    const checked = await Promise.all(urls.map(async (u) => ({ u, live: await isLive(u) })));
    const skipped = checked.filter((c) => !c.live).map((c) => c.u);
    urls = checked.filter((c) => c.live).map((c) => c.u);
    skipped.forEach((u) => console.log(`⏭️  略過（非 200）：${u}`));
  }

  if (urls.length === 0) {
    console.log('ℹ️  沒有 live 的 URL 可提交。');
    return;
  }

  if (urls.length > MAX_SUBMIT) {
    console.log(`⚠️  共 ${urls.length} 筆，超過上限 ${MAX_SUBMIT}，只提交前 ${MAX_SUBMIT} 筆。`);
    urls = urls.slice(0, MAX_SUBMIT);
  }

  const token = await getAccessToken(creds);

  let ok = 0;
  const failures = [];
  for (const url of urls) {
    const r = await submit(token, url);
    if (r.ok) {
      ok++;
      console.log(`✅ ${url}`);
    } else {
      failures.push(r);
      console.log(`❌ ${url} — ${r.status} ${r.body}`);
    }
  }

  console.log(`\n📊 提交完成：成功 ${ok} / 共 ${urls.length}`);
  if (failures.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('❌ 執行錯誤：', err.message);
  process.exitCode = 1;
});
