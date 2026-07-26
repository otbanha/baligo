// Page view counter using Cloudflare KV
// Total counts stored as metadata on key `pv:/blog/slug/` so list() returns all in one call.
// Daily counts stored the same way, one key per article per day: `pvs:YYYY-MM-DD:/blog/slug/`.
// POST /api/pageview  { slug: "/blog/..." }  → increments total + today's daily count
// GET  /api/pageview                          → returns [{ slug, views }] sorted by views desc (total)
// GET  /api/pageview?range=7d                 → returns top slugs aggregated over last 7 days
//
// 日計數為什麼是一篇一把 key：舊版把整天的資料塞在一個 `pvd:YYYY-MM-DD` JSON 裡，
// 每次計數都得整包讀出改寫回。KV 是最終一致的，兩個並發寫入會用各自的舊快照互相
// 覆蓋——受害的不只是自己那篇，是整包裡其他幾百篇的增量一起被還原。改成每篇一把
// key 之後，寫入次數不變（一樣 2 讀 2 寫），但衝突範圍縮到「同一篇同一天」而已。

import { listAllKeys } from '../lib/kv.js';

const PREFIX = 'pv:';
const SLUG_DAY_PREFIX = 'pvs:'; // pvs:YYYY-MM-DD:/blog/slug/ → metadata.views
const LEGACY_DAY_PREFIX = 'pvd:'; // 舊的整包 JSON 日桶，9 天 TTL 到期後就沒了，2026-08-05 起可刪除相關程式碼
const DAY_TTL = 9 * 24 * 60 * 60; // keep daily counts 9 days so the 7d window is always complete

// 換日基準 UTC+7。用 UTC 切的話等於每天早上才換日，跟看報表的人對不上。
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;
function dayStr(date = new Date()) {
  return new Date(date.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.PAGEVIEW_KV) return new Response('ok');

  let slug;
  try {
    const body = await request.json();
    slug = (body.slug || '').trim();
  } catch {
    return new Response('bad request', { status: 400 });
  }

  if (!slug || !slug.startsWith('/blog/') || slug.length > 120) {
    return new Response('ok'); // silently ignore invalid slugs
  }

  // Probabilistic write: only write 1 in 20 requests, increment by 20 each time.
  // Statistically accurate while reducing KV writes by ~95%.
  if (Math.random() >= 0.05) {
    return new Response('ok');
  }

  const key = PREFIX + slug;
  const dayKey = `${SLUG_DAY_PREFIX}${dayStr()}:${slug}`;

  // Update total count and today's count in parallel
  const [existing, dayExisting] = await Promise.all([
    env.PAGEVIEW_KV.getWithMetadata(key),
    env.PAGEVIEW_KV.getWithMetadata(dayKey),
  ]);

  const count = ((existing.metadata && existing.metadata.views) || 0) + 20;
  const dayCount = ((dayExisting.metadata && dayExisting.metadata.views) || 0) + 20;

  await Promise.all([
    env.PAGEVIEW_KV.put(key, '', { metadata: { views: count } }),
    env.PAGEVIEW_KV.put(dayKey, '', { metadata: { views: dayCount }, expirationTtl: DAY_TTL }),
  ]);

  return new Response('ok');
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.PAGEVIEW_KV) return Response.json([]);

  const url = new URL(request.url);

  // ── 近7天模式 ─────────────────────────────────────────────────────────────
  if (url.searchParams.get('range') === '7d') {
    const now = Date.now();
    const dates = Array.from({ length: 7 }, (_, i) => dayStr(new Date(now - i * 86400000)));

    const agg = {};

    // 每篇一把 key，views 放 metadata，所以 list() 就拿得到，不必逐把 get
    const perDay = await Promise.all(
      dates.map(d => listAllKeys(env.PAGEVIEW_KV, `${SLUG_DAY_PREFIX}${d}:`)),
    );
    dates.forEach((date, i) => {
      const cut = SLUG_DAY_PREFIX.length + date.length + 1;
      for (const { name, metadata } of perDay[i]) {
        const views = (metadata && metadata.views) || 0;
        if (views > 0) agg[name.slice(cut)] = (agg[name.slice(cut)] || 0) + views;
      }
    });

    // 舊的整包 JSON 日桶殘留資料，跟新格式的時間區間不重疊所以直接相加。
    // 最後一筆寫入 + 9 天 TTL 到期後這段就沒作用了，2026-08-05 起可整段刪除。
    const legacy = await Promise.all(
      dates.map(d => env.PAGEVIEW_KV.get(LEGACY_DAY_PREFIX + d, 'json').catch(() => null)),
    );
    for (const data of legacy) {
      if (!data) continue;
      for (const [slug, views] of Object.entries(data)) {
        agg[slug] = (agg[slug] || 0) + views;
      }
    }

    const results = Object.entries(agg)
      .map(([slug, views]) => ({ slug, views }))
      .sort((a, b) => b.views - a.views);

    return Response.json(results, { headers: { 'Cache-Control': 'no-store' } });
  }

  // ── 總瀏覽量模式（預設）────────────────────────────────────────────────────
  // 必須分頁：pv: key 數已超過 1000，單頁 list() 會把字典序排在截斷點之後的
  // slug 整批吃掉（在索引頁顯示 0 次）。
  const entries = [];
  for (const { name, metadata } of await listAllKeys(env.PAGEVIEW_KV, PREFIX)) {
    const views = (metadata && metadata.views) || 0;
    if (views > 0) entries.push({ slug: name.slice(PREFIX.length), views });
  }

  const results = entries.sort((a, b) => b.views - a.views);

  return Response.json(results, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
