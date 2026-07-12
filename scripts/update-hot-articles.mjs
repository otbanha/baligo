#!/usr/bin/env node
/**
 * update-hot-articles.mjs
 *
 * 依「近 7 天瀏覽量」自動挑選 10 篇熱門文章，寫入 /api/hot-articles（KV）。
 * 不足 10 篇時，用全站總瀏覽量排序補齊。
 *
 * 環境變數：
 *   SITE_URL                    預設 https://gobaligo.id
 *   HOT_ARTICLES_CRON_TOKEN     寫入用的專屬 token（需與 Cloudflare Pages env var 相同）
 */

const SITE_URL = process.env.SITE_URL || 'https://gobaligo.id';
const TOKEN = process.env.HOT_ARTICLES_CRON_TOKEN || '';

if (!TOKEN) {
  console.error('缺少 HOT_ARTICLES_CRON_TOKEN，略過更新');
  process.exit(1);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

function normalizeSlug(slug) {
  // pageview 的 slug 已是 /blog/xxx/ 格式，直接比對 article-index 的 url
  return slug.endsWith('/') ? slug : slug + '/';
}

async function main() {
  const [weekly, total, articles] = await Promise.all([
    fetchJson(`${SITE_URL}/api/pageview?range=7d`),
    fetchJson(`${SITE_URL}/api/pageview`),
    fetchJson(`${SITE_URL}/article-index.json`),
  ]);

  const byUrl = new Map(articles.filter(a => a.id && a.title && a.url).map(a => [a.url, a]));

  const picked = [];
  const seen = new Set();

  function addFrom(list) {
    for (const { slug, views } of list) {
      if (picked.length >= 10) break;
      const article = byUrl.get(normalizeSlug(slug));
      if (!article || seen.has(article.id) || views <= 0) continue;
      seen.add(article.id);
      picked.push({ id: article.id, title: article.title });
    }
  }

  addFrom(weekly);
  if (picked.length < 10) addFrom(total); // 補齊：全站總瀏覽量排序

  if (picked.length === 0) {
    console.log('沒有可用的瀏覽量資料，略過更新');
    return;
  }

  const res = await fetch(`${SITE_URL}/api/hot-articles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': TOKEN },
    body: JSON.stringify(picked),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`更新失敗：${data.error || res.status}`);

  console.log(`✓ 已更新 ${picked.length} 篇熱門文章：`);
  picked.forEach((a, i) => console.log(`  ${i + 1}. ${a.title}`));
}

main().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
