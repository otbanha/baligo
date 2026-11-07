#!/usr/bin/env node
/**
 * generate-vocus-redirect-map.mjs
 *
 * 產生「舊 vocus 文章 → gobaligo.id 新網址」的完整對照表。
 *
 * 背景：站上 584 篇文章是從 vocus.cc 搬過來的，frontmatter 的 originalUrl 記著
 * 原文網址。vocus 上那 584 篇舊文還活著，而且多半比新站先被 Google 收錄，等於
 * 自己跟自己搶同一組關鍵字。要把排名收回新站，vocus 每一篇都得放一條指向對應
 * 新網址的導引（canonical 無法跨站自己設，只能靠導引連結 + 讀者點擊）。
 *
 * vocus 沒有公開 API，也不在本專案的部署範圍內，所以這支腳本只負責產出
 * 「要貼什麼、貼到哪裡」的對照檔，實際更新在 vocus 後台進行：
 *
 *   docs/vocus-redirect-map.json  機器可讀（vocus 網址 → 五語言新網址）
 *   docs/vocus-redirect-map.csv   可直接丟進試算表逐篇作業，含要貼上的導引文字
 *
 * 用法：node scripts/generate-vocus-redirect-map.mjs
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const SITE = 'https://gobaligo.id';
const OUT_DIR = join(ROOT, 'docs');

const LANG_DIRS = { 'zh-tw': 'blog', 'zh-hk': 'zh-hk', 'zh-cn': 'zh-cn', en: 'en', id: 'id' };

/** slug → 該 slug 實際存在哪些語言（避免導引指向 404） */
function buildSlugLangs() {
  const map = new Map();
  for (const [lang, dir] of Object.entries(LANG_DIRS)) {
    const base = join(ROOT, 'src/content', dir);
    let files = [];
    try { files = readdirSync(base).filter(f => /\.mdx?$/.test(f)); } catch { continue; }
    for (const f of files) {
      try {
        const { data } = matter(readFileSync(join(base, f), 'utf-8'));
        if (data.private) continue;
        const slug = data.slug || f.replace(/\.mdx?$/, '');
        if (!map.has(slug)) map.set(slug, new Set());
        map.get(slug).add(lang);
      } catch { /* 略過壞檔 */ }
    }
  }
  return map;
}

const urlFor = (lang, slug) =>
  lang === 'zh-tw' ? `${SITE}/blog/${slug}/` : `${SITE}/${lang}/blog/${slug}/`;

const slugLangs = buildSlugLangs();

const rows = [];
const base = join(ROOT, 'src/content/blog');
for (const f of readdirSync(base).filter(f => /\.mdx?$/.test(f)).sort()) {
  let data;
  try { ({ data } = matter(readFileSync(join(base, f), 'utf-8'))); } catch { continue; }
  if (data.private) continue;

  const original = String(data.originalUrl ?? '').trim();
  if (!/^https?:\/\/vocus\.cc\/article\/[0-9a-f]+/i.test(original)) continue;

  const slug = String(data.slug ?? '').trim() || f.replace(/\.mdx?$/, '');
  const langs = slugLangs.get(slug) ?? new Set(['zh-tw']);

  rows.push({
    vocusUrl: original.replace(/\/+$/, ''),
    vocusId: original.match(/\/article\/([0-9a-f]+)/i)?.[1] ?? '',
    slug,
    title: String(data.title ?? '').trim(),
    pubDate: data.pubDate ? new Date(data.pubDate).toISOString().slice(0, 10) : '',
    category: Array.isArray(data.category) ? data.category.join('|') : (data.category ?? ''),
    newUrl: urlFor('zh-tw', slug),
    translations: Object.fromEntries(
      Object.keys(LANG_DIRS)
        .filter(l => l !== 'zh-tw' && langs.has(l))
        .map(l => [l, urlFor(l, slug)]),
    ),
  });
}

rows.sort((a, b) => (b.pubDate || '').localeCompare(a.pubDate || ''));

/** 要貼在 vocus 文章最上方的導引文字（繁中，與 vocus 的讀者語言一致） */
function noticeFor(row) {
  return `📌 本文已搬家並持續更新，最新版本請看：${row.title} → ${row.newUrl}`;
}

mkdirSync(OUT_DIR, { recursive: true });

writeFileSync(
  join(OUT_DIR, 'vocus-redirect-map.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString().slice(0, 10),
      total: rows.length,
      note: 'vocus.cc 舊文 → gobaligo.id 新網址對照。vocus 無公開 API，需在其後台逐篇貼上 notice。',
      rows,
    },
    null,
    2,
  ) + '\n',
  'utf-8',
);

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const header = ['vocus_url', 'vocus_id', 'pub_date', 'title', 'new_url', 'category', 'notice_to_paste', 'en_url', 'id_url', 'zh_cn_url', 'zh_hk_url'];
const csv = [
  header.join(','),
  ...rows.map(r => [
    r.vocusUrl, r.vocusId, r.pubDate, r.title, r.newUrl, r.category, noticeFor(r),
    r.translations.en ?? '', r.translations.id ?? '', r.translations['zh-cn'] ?? '', r.translations['zh-hk'] ?? '',
  ].map(csvCell).join(',')),
].join('\n');
writeFileSync(join(OUT_DIR, 'vocus-redirect-map.csv'), csv + '\n', 'utf-8');

// 檢查：每個新網址在 dist 裡都有對應頁面（有 build 過才檢查）
const dist = join(ROOT, 'dist');
let missing = [];
if (existsSync(dist)) {
  missing = rows.filter(r => !existsSync(join(dist, 'blog', r.slug, 'index.html')));
}

console.log(`✅ ${rows.length} 篇 vocus 舊文對照已寫入 docs/vocus-redirect-map.{json,csv}`);
console.log(`   其中有翻譯版的語言數分佈：` +
  ['en', 'id', 'zh-cn', 'zh-hk'].map(l => `${l} ${rows.filter(r => r.translations[l]).length}`).join('、'));
if (!existsSync(dist)) {
  console.log('ℹ️  找不到 dist，略過新網址存在性檢查（先跑 npm run build 可一併驗證）。');
} else if (missing.length) {
  console.log(`⚠️  ${missing.length} 篇的新網址在 dist 裡找不到對應頁面：`);
  for (const r of missing.slice(0, 20)) console.log(`   - ${r.slug} (${r.vocusUrl})`);
  process.exitCode = 1;
} else {
  console.log('✅ 所有新網址都在 dist 裡有對應頁面，沒有指向 404 的導引。');
}
