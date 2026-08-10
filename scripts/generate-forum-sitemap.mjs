#!/usr/bin/env node
/**
 * 產生 community.gobaligo.id（phpBB 3.3）的 sitemap.xml
 *
 * phpBB 本身沒有 sitemap 功能，官方做法是裝擴充套件。這個站規模很小
 * （目前 56 主題 / 9 個版面），直接爬版面頁把主題列出來就夠，不必為了
 * 一個檔案去裝擴充、動 PHP。
 *
 * 產物：forum-assets/sitemap.xml
 * 這個 repo 沒有論壇的部署流程 —— 跟 robots.txt 一樣要手動 FTP 上傳到
 * phpBB 根目錄。主題有明顯增加時重跑一次即可。
 *
 * 用法：node scripts/generate-forum-sitemap.mjs
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://community.gobaligo.id/';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'forum-assets', 'sitemap.xml');
const TOPICS_PER_PAGE = 25;   // phpBB 預設
const MAX_PAGES = 20;         // 保險絲，避免分頁解析出錯時無限迴圈

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'user-agent': 'gobaligo-sitemap-generator (+https://gobaligo.id)' },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.text();
}

/** 版面 id：從論壇首頁抓 */
async function listForums() {
  const html = await get('');
  const ids = [...new Set([...html.matchAll(/viewforum\.php\?f=(\d+)/g)].map((m) => m[1]))];
  return ids.sort((a, b) => Number(a) - Number(b));
}

/** 某個版面底下的所有主題 id（含分頁）*/
async function listTopics(forumId) {
  const topics = new Set();

  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * TOPICS_PER_PAGE;
    const html = await get(`viewforum.php?f=${forumId}${start ? `&start=${start}` : ''}`);
    const found = [...html.matchAll(/viewtopic\.php\?[^"']*?t=(\d+)/g)].map((m) => m[1]);

    const before = topics.size;
    for (const id of found) topics.add(id);

    // 這一頁沒帶來新主題就是翻到底了
    if (topics.size === before) break;
    await sleep(300);   // 共享主機，別打太快
  }

  return [...topics];
}

function xml(urls) {
  const body = urls
    .map((u) => `  <url>\n    <loc>${u}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function main() {
  const forums = await listForums();
  console.log(`[forum-sitemap] 版面 ${forums.length} 個：${forums.join(', ')}`);

  const urls = [BASE];

  let topicCount = 0;
  for (const f of forums) {
    const topics = await listTopics(f);
    topicCount += topics.length;
    console.log(`[forum-sitemap]   f=${f} → ${topics.length} 個主題`);
    // 空版面（分類容器）不列進去，免得送一堆沒內容的頁給搜尋引擎
    if (!topics.length) continue;
    urls.push(`${BASE}viewforum.php?f=${f}`);
    for (const t of topics) urls.push(`${BASE}viewtopic.php?t=${t}`);
    await sleep(300);
  }

  // 同一個主題可能在多個版面出現（全域公告），去重
  const unique = [...new Set(urls)];
  writeFileSync(OUT, xml(unique));
  console.log(`[forum-sitemap] 共 ${unique.length} 個網址（主題 ${topicCount}）→ forum-assets/sitemap.xml`);
  console.log('[forum-sitemap] 記得手動 FTP 上傳到 phpBB 根目錄');
}

main().catch((err) => {
  console.error('[forum-sitemap] 失敗：', err.message);
  process.exit(1);
});
