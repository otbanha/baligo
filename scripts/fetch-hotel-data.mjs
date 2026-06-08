#!/usr/bin/env node
/**
 * fetch-hotel-data.mjs
 * 1. 掃描所有文章，產生 src/data/sitemap-priorities.json（供 astro.config.mjs 使用）
 * 2. 從 Agoda API 取得「住宿推薦」飯店資料，緩存至 src/data/hotel-cache.json
 *
 * 執行方式（本機）：
 *   node scripts/fetch-hotel-data.mjs
 *
 * 設定 API Key（選擇一種）：
 *   AGODA_SITE_ID=1961347 AGODA_API_KEY=06177fdb-... node scripts/fetch-hotel-data.mjs
 *   或在 .env.local 中設定後透過 dotenv 載入
 *
 * Cloudflare 不需要此 API Key（cache 已 commit 至 git）
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

// ─── 設定（建議改用環境變數）────────────────────────────
const SITE_ID = process.env.AGODA_SITE_ID || '1961347';
const API_KEY = process.env.AGODA_API_KEY || '06177fdb-8e7e-45e4-8305-8c7382154022';

const BLOG_DIR      = 'src/content/blog';
const DATA_DIR      = 'src/data';
const CACHE_FILE    = `${DATA_DIR}/hotel-cache.json`;
const PRIORITY_FILE = `${DATA_DIR}/sitemap-priorities.json`;
const CACHE_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 天

const HID_RE = /agoda\.com[^)'"\s]*[?&]hid=(\d+)/g;

// 各分類對應 sitemap priority
const CAT_PRIORITY = {
  '住宿推薦':      1.0,
  '峇里島分區攻略': 1.0,
  '簽證通關':      0.9,
  '新手指南':      0.9,
  '美食景點活動':   0.8,
  '叫車包車':      0.8,
  '家庭親子':      0.8,
  '旅行技巧':      0.8,
  '遊記分享':      0.7,
  '新聞存檔':      0.5,
};

// ─── 快取 ────────────────────────────────────────────
let cache = { hotels: {}, updatedAt: {} };
if (existsSync(CACHE_FILE)) {
  try { cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')); } catch {}
}
cache.hotels    ??= {};
cache.updatedAt ??= {};

function isFresh(hid) {
  return cache.updatedAt[hid] && (Date.now() - cache.updatedAt[hid]) < CACHE_TTL_MS;
}

// ─── 掃描文章 ─────────────────────────────────────────
function scanArticles() {
  const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const result = {};

  for (const file of files) {
    const slug    = file.replace(/\.mdx?$/, '');
    const content = readFileSync(join(BLOG_DIR, file), 'utf-8');

    // 取 frontmatter category
    const multiCat  = content.match(/^category:\s*\n((?:[ \t]+-[ \t]+.+\n)+)/m);
    const singleCat = content.match(/^category:[ \t]+(.+)/m);
    let cats = [];
    if (multiCat) {
      cats = [...multiCat[1].matchAll(/^[ \t]+-[ \t]+(.+)/mg)].map(m => m[1].trim());
    } else if (singleCat) {
      cats = [singleCat[1].trim().replace(/^['"]|['"]$/g, '')];
    }

    // 取 hotel IDs（只從住宿推薦文章）
    const hotelIds = [];
    if (cats.includes('住宿推薦')) {
      let m;
      HID_RE.lastIndex = 0;
      while ((m = HID_RE.exec(content)) !== null) {
        if (!hotelIds.includes(m[1])) hotelIds.push(m[1]);
      }
    }

    result[slug] = { cats, hotelIds };
  }

  return result;
}

// ─── Agoda API ────────────────────────────────────────
async function fetchHotel(hid) {
  // Agoda Partner API — 若 endpoint 有誤請至 https://partners.agoda.com 確認
  const url = `https://api.agoda.com/api/v1/en-us/hotels/${hid}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `AgodaApiKey ${SITE_ID}:${API_KEY}`,
      'Accept':        'application/json',
      'Accept-Language': 'en-US',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const d = await res.json();
  return {
    id:         hid,
    name:       d.hotelName  ?? d.name  ?? '',
    stars:      d.starRating ?? d.star  ?? null,
    rating:     +(d.reviewScore ?? d.rating ?? 0) || null,
    reviews:    d.numberOfReviews ?? d.reviewCount ?? null,
    lowestRate: d.lowestRate ?? d.price ?? null,
    currency:   d.currency ?? 'USD',
    city:       d.address?.city ?? d.city ?? 'Bali',
  };
}

// ─── 主程式 ───────────────────────────────────────────
async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const articles = scanArticles();
  console.log(`掃描了 ${Object.keys(articles).length} 篇文章`);

  // 1. 產生 sitemap-priorities.json
  const priorities = {};
  const langPrefixes = ['', 'en/', 'zh-cn/', 'zh-hk/'];
  for (const [slug, { cats }] of Object.entries(articles)) {
    const priority = Math.max(...cats.map(c => CAT_PRIORITY[c] ?? 0.8), 0.8);
    for (const prefix of langPrefixes) {
      priorities[`/${prefix}blog/${slug}/`] = priority;
    }
  }
  writeFileSync(PRIORITY_FILE, JSON.stringify(priorities, null, 2));
  console.log(`✓ sitemap-priorities.json：${Object.keys(priorities).length} 個 URL`);

  // 2. 取得飯店 API 資料
  const allHids = [...new Set(Object.values(articles).flatMap(a => a.hotelIds))];

  if (!allHids.length) {
    console.log('找不到飯店 ID，確認文章中有 Agoda 連結 (?hid=XXXXX)');
    return;
  }

  console.log(`\n共 ${allHids.length} 個飯店 ID，開始取得資料...`);
  let fetched = 0, skipped = 0, errors = 0;

  for (const hid of allHids) {
    if (isFresh(hid)) {
      skipped++;
      continue;
    }

    try {
      const data = await fetchHotel(hid);
      cache.hotels[hid]    = data;
      cache.updatedAt[hid] = Date.now();
      fetched++;
      console.log(`  ✓ hid=${hid}: ${data.name} ★${data.stars} ${data.rating}/10 (${data.reviews} 則評論)`);
    } catch (e) {
      errors++;
      console.log(`  ✗ hid=${hid}: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 300)); // rate limiting
  }

  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log(`\n✅ 完成：取得 ${fetched}，快取跳過 ${skipped}，錯誤 ${errors}`);
  console.log(`   快取儲存至 ${CACHE_FILE}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
