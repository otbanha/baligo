#!/usr/bin/env node
/**
 * scripts/tag-hotel-articles.mjs
 *
 * 自動把 hotelId 對應到 gobaligo.id 現有住宿介紹文，並回填 frontmatter
 *
 * 流程:
 *   1. 掃 src/content/blog/*.md，找 category 含「住宿推薦」的文章
 *   2. 用 regex 從 markdown 內文找 Agoda URL，解出 hotelId
 *   3. 批次呼叫 Agoda Lite API（每批 50 個）拿飯店資料
 *   4. 把 hotelId / 飯店名 / 星級 / 座標 寫入 frontmatter
 *   5. 同步寫入 zh-cn/zh-hk/en 對應檔案（同檔名）
 *
 * 用法:
 *   # 預覽（不修改檔案）
 *   AGODA_SITE_ID=xxx AGODA_API_KEY=xxx node scripts/tag-hotel-articles.mjs
 *
 *   # 實際寫入
 *   AGODA_SITE_ID=xxx AGODA_API_KEY=xxx node scripts/tag-hotel-articles.mjs --write
 *
 *   # 只看找不到 Agoda 連結的清單
 *   AGODA_SITE_ID=xxx AGODA_API_KEY=xxx node scripts/tag-hotel-articles.mjs --missing-only
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// === 設定 ====================================================================

const ROOT = process.cwd();
const BLOG_DIR = join(ROOT, 'src/content/blog');
const TRANSLATION_DIRS = {
  'zh-cn': join(ROOT, 'src/content/zh-cn'),
  'zh-hk': join(ROOT, 'src/content/zh-hk'),
  'en':    join(ROOT, 'src/content/en'),
};

const TARGET_CATEGORY = '住宿推薦';
const ENDPOINT = 'http://affiliateapi7643.agoda.com/affiliateservice/lt_v1';
const BATCH_SIZE = 50; // Lite API 一次最多查的 hotelId 數
const API_DELAY_MS = 1000; // 批次間延遲，避免被 rate limit

const SITE_ID = process.env.AGODA_SITE_ID;
const API_KEY = process.env.AGODA_API_KEY;

const WRITE_MODE = process.argv.includes('--write');
const MISSING_ONLY = process.argv.includes('--missing-only');

// === 工具函式 =================================================================

function readFrontmatter(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  return { raw: content, frontmatter: match[1], body: match[2] };
}

/**
 * 極簡 frontmatter parser — 只處理我們關心的欄位 (category, slug, title)
 * 不用完整 YAML parser 是為了零依賴
 */
function parseFrontmatter(fm) {
  const result = { category: [], slug: null, title: null };
  const lines = fm.split('\n');
  let inCategory = false;

  for (const line of lines) {
    if (/^category:\s*$/.test(line)) {
      inCategory = true;
      continue;
    }
    if (inCategory && /^  - /.test(line)) {
      result.category.push(line.replace(/^  - /, '').replace(/^['"]|['"]$/g, '').trim());
      continue;
    }
    if (inCategory && !/^  - / .test(line) && line.trim() !== '') {
      inCategory = false;
    }
    const slugMatch = line.match(/^slug:\s*(.+)$/);
    if (slugMatch) result.slug = slugMatch[1].trim().replace(/^['"]|['"]$/g, '');
    const titleMatch = line.match(/^title:\s*(.+)$/);
    if (titleMatch) result.title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

/**
 * 從 markdown body 找出所有可能的 Agoda hotelId
 * 支援格式:
 *   - https://www.agoda.com/.../hotel/.../h12345678.html
 *   - https://www.agoda.com/...?hid=12345678
 *   - https://www.agoda.com/partners/partnersearch.aspx?cid=xxx&hid=12345678
 */
function extractHotelIds(body) {
  const ids = new Set();
  const patterns = [
    /agoda\.com\/[^\s)"']*hid=(\d{4,})/gi,
    /agoda\.com\/[^\s)"']*\/h(\d{4,})\.html/gi,
    /agoda\.com\/[^\s)"']*hotelId[=:](\d{4,})/gi,
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(body)) !== null) {
      ids.add(Number(m[1]));
    }
  }
  return [...ids];
}

/**
 * 把欄位塞進 frontmatter（保留原有欄位順序，不存在則加到末尾）
 */
function upsertFrontmatterField(fm, key, value) {
  const formatted = typeof value === 'string'
    ? `${key}: "${value.replace(/"/g, '\\"')}"`
    : `${key}: ${value}`;

  const regex = new RegExp(`^${key}:.*$`, 'm');
  if (regex.test(fm)) {
    return fm.replace(regex, formatted);
  }
  return fm.trimEnd() + '\n' + formatted;
}

function writeBackFile(filePath, frontmatter, body) {
  const out = `---\n${frontmatter}\n---\n${body}`;
  writeFileSync(filePath, out, 'utf-8');
}

async function fetchHotelDataBatch(hotelIds) {
  const today = new Date();
  const checkIn = new Date(today.getTime() + 30 * 86400_000);
  const checkOut = new Date(today.getTime() + 31 * 86400_000);
  const fmt = d => d.toISOString().slice(0, 10);

  const body = {
    criteria: {
      additional: {
        currency: 'USD',
        discountOnly: false,
        language: 'zh-tw',
        occupancy: { numberOfAdult: 2, numberOfChildren: 0 },
      },
      checkInDate: fmt(checkIn),
      checkOutDate: fmt(checkOut),
      hotelId: hotelIds,
    },
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `${SITE_ID}:${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip,deflate',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  if (data.error) {
    // 整批查無資料 - 不算錯，回空 results
    if (data.error.id === 911) return { results: [] };
    throw new Error(`Agoda API ${data.error.id}: ${data.error.message}`);
  }
  return data;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// === 主流程 ===================================================================

async function main() {
  if (!SITE_ID || !API_KEY) {
    console.error('❌ 缺少 AGODA_SITE_ID 或 AGODA_API_KEY');
    process.exit(1);
  }

  console.log(`🔧 模式: ${WRITE_MODE ? '✏️ 寫入' : '👀 預覽 (dry-run)'}\n`);

  // Step 1: 掃 blog/，篩住宿文
  const allFiles = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  console.log(`📂 blog/ 共 ${allFiles.length} 篇文章`);

  const accommodationArticles = [];
  for (const filename of allFiles) {
    const filePath = join(BLOG_DIR, filename);
    const parsed = readFrontmatter(filePath);
    if (!parsed) continue;

    const meta = parseFrontmatter(parsed.frontmatter);
    if (!meta.category.includes(TARGET_CATEGORY)) continue;

    const hotelIds = extractHotelIds(parsed.body);
    accommodationArticles.push({
      filename,
      filePath,
      slug: meta.slug,
      title: meta.title,
      hotelIds,
      ...parsed,
    });
  }

  console.log(`🏨 「${TARGET_CATEGORY}」分類: ${accommodationArticles.length} 篇\n`);

  // Step 2: 統計有/沒有 hotel ID 的
  // 策略 A: 只處理「正好 1 個 hotelId」的文章；多 hotelId（懶人包）跳過
  const singleId = accommodationArticles.filter(a => a.hotelIds.length === 1);
  const multiId  = accommodationArticles.filter(a => a.hotelIds.length > 1);
  const noneId   = accommodationArticles.filter(a => a.hotelIds.length === 0);

  console.log(`🎯 單一 hotelId（會處理）:    ${singleId.length} 篇`);
  console.log(`📚 多 hotelId 懶人包（跳過）: ${multiId.length} 篇`);
  console.log(`❓ 找不到 Agoda 連結:        ${noneId.length} 篇\n`);

  if (MISSING_ONLY) {
    console.log('===== 找不到 Agoda 連結的住宿文 =====');
    for (const a of noneId) {
      console.log(`  - ${a.filename}`);
      console.log(`      ${a.title}`);
    }
    console.log('\n===== 懶人包文（多 hotelId，已跳過）=====');
    for (const a of multiId) {
      console.log(`  - ${a.filename} (${a.hotelIds.length} 間)`);
      console.log(`      ${a.title}`);
    }
    return;
  }

  if (singleId.length === 0) {
    console.log('沒有可以處理的文章，結束。');
    return;
  }

  const withId = singleId; // 後續邏輯沿用原變數名
  const withoutId = noneId; // 報表用

  // Step 3: 批次呼叫 API
  const allHotelIds = [...new Set(withId.map(a => a.hotelIds[0]))];
  console.log(`🌐 待查詢 unique hotelId: ${allHotelIds.length} 個（每批 ${BATCH_SIZE}）\n`);

  const hotelDataMap = new Map();
  for (let i = 0; i < allHotelIds.length; i += BATCH_SIZE) {
    const batch = allHotelIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allHotelIds.length / BATCH_SIZE);
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} hotels)... `);

    try {
      const data = await fetchHotelDataBatch(batch);
      for (const h of (data.results || [])) {
        hotelDataMap.set(h.hotelId, h);
      }
      console.log(`✓ 回傳 ${data.results?.length || 0} 筆`);
    } catch (err) {
      console.log(`✗ 失敗: ${err.message}`);
    }
    if (i + BATCH_SIZE < allHotelIds.length) await sleep(API_DELAY_MS);
  }
  console.log('');

  // Step 4: 統計實際拿到資料的
  const gotData = withId.filter(a => hotelDataMap.has(a.hotelIds[0]));
  const noData = withId.filter(a => !hotelDataMap.has(a.hotelIds[0]));

  console.log(`✅ API 回傳成功: ${gotData.length} 篇`);
  console.log(`⚠️ API 找不到資料: ${noData.length} 篇（飯店可能不在 affiliate 範圍）\n`);

  // Step 5: 逐篇處理
  let writtenZhTw = 0;
  let writtenTranslations = 0;
  const previewSamples = [];

  for (const article of gotData) {
    const hotelId = article.hotelIds[0];
    const h = hotelDataMap.get(hotelId);

    const newFields = {
      agoda_hotel_id: hotelId,
      agoda_hotel_name: h.hotelName,
      agoda_star_rating: h.starRating,
      latitude: h.latitude,
      longitude: h.longitude,
    };

    // 預覽前 3 筆
    if (previewSamples.length < 3) {
      previewSamples.push({ filename: article.filename, title: article.title, fields: newFields });
    }

    if (WRITE_MODE) {
      // 寫入繁中 (blog/)
      let newFm = article.frontmatter;
      for (const [k, v] of Object.entries(newFields)) {
        newFm = upsertFrontmatterField(newFm, k, v);
      }
      writeBackFile(article.filePath, newFm, article.body);
      writtenZhTw++;

      // 寫入三種翻譯版本（如果存在）
      for (const [lang, dir] of Object.entries(TRANSLATION_DIRS)) {
        const transPath = join(dir, article.filename);
        if (!existsSync(transPath)) continue;
        const transParsed = readFrontmatter(transPath);
        if (!transParsed) continue;
        let transFm = transParsed.frontmatter;
        for (const [k, v] of Object.entries(newFields)) {
          transFm = upsertFrontmatterField(transFm, k, v);
        }
        writeBackFile(transPath, transFm, transParsed.body);
        writtenTranslations++;
      }
    }
  }

  // 預覽輸出
  console.log('===== 預覽：前 3 筆會新增的 frontmatter 欄位 =====');
  for (const s of previewSamples) {
    console.log(`\n📄 ${s.filename}`);
    console.log(`   ${s.title}`);
    for (const [k, v] of Object.entries(s.fields)) {
      console.log(`   + ${k}: ${typeof v === 'string' ? `"${v}"` : v}`);
    }
  }
  console.log('');

  // 列找不到 Agoda 連結的清單
  if (withoutId.length > 0) {
    console.log(`\n===== 需要手動處理（找不到 Agoda 連結）${withoutId.length} 篇 =====`);
    for (const a of withoutId.slice(0, 20)) {
      console.log(`  - ${a.filename}`);
      console.log(`      ${a.title}`);
    }
    if (withoutId.length > 20) console.log(`  ... 還有 ${withoutId.length - 20} 篇`);
  }

  // API 找不到的
  if (noData.length > 0) {
    console.log(`\n===== API 查無資料 ${noData.length} 篇 =====`);
    for (const a of noData) {
      console.log(`  - ${a.filename} (hotelId: ${a.hotelIds[0]})`);
    }
  }

  // 最終統計
  console.log('\n===== 統計 =====');
  console.log(`住宿推薦類文章:           ${accommodationArticles.length}`);
  console.log(`  ✅ 單一 hotelId:           ${singleId.length}`);
  console.log(`     API 成功取得資料:        ${gotData.length}`);
  console.log(`     API 查無資料:            ${noData.length}`);
  console.log(`  📚 多 hotelId 懶人包 (跳過): ${multiId.length}`);
  console.log(`  ❓ 沒 Agoda 連結 (需手動):   ${noneId.length}`);

  if (WRITE_MODE) {
    console.log(`\n✏️ 已寫入:`);
    console.log(`   blog/ (繁中):       ${writtenZhTw} 篇`);
    console.log(`   翻譯版本 (3 語言):  ${writtenTranslations} 篇`);
  } else {
    console.log(`\n👀 這是 dry-run，沒有寫入任何檔案。`);
    console.log(`   確認 OK 後加 --write 真正寫入`);
  }
}

main().catch(err => {
  console.error('\n💥 致命錯誤:', err);
  process.exit(1);
});
