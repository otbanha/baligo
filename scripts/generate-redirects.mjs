#!/usr/bin/env node
/**
 * generate-redirects.mjs
 *
 * 掃描舊格式檔名（vocus hex / Sveltia 時間戳），
 * 找出已填 slug 的文章，產生 Cloudflare Pages 301 redirect 規則。
 *
 * Usage:
 *   node scripts/generate-redirects.mjs          # 預覽
 *   node scripts/generate-redirects.mjs --write  # 寫入 public/_redirects
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const WRITE_MODE = process.argv.includes('--write');

const REDIRECTS_FILE = join(ROOT, 'public/_redirects');
const MARKER_START = '# === auto-generated slug redirects (start) ===';
const MARKER_END   = '# === auto-generated slug redirects (end) ===';

// 舊格式判斷
const RE_VOCUS    = /^\d{4}-\d{2}-\d{2}-[a-f0-9]{24}$/;
const RE_SVELTIA  = /^\d{4}-\d{2}-\d{2}-\d{6}$/;

function isOldFormat(stem) {
  return RE_VOCUS.test(stem) || RE_SVELTIA.test(stem);
}

/** 取得目錄內所有 .md/.mdx 檔案，回傳 { stem, file, ext } */
function listArticles(dir) {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
      .map(f => {
        const ext = extname(f);
        const stem = basename(f, ext);
        return { stem, file: join(dir, f), ext };
      });
  } catch {
    return [];
  }
}

/** 讀 frontmatter，回傳 slug（字串，可能是空字串或 undefined） */
function readSlug(filePath) {
  try {
    const { data } = matter(readFileSync(filePath, 'utf8'));
    return data.slug ?? null;
  } catch {
    return null;
  }
}

// ─── 目錄設定 ───────────────────────────────────────────────
const LANGS = [
  { dir: join(ROOT, 'src/content/blog'),  prefix: '/blog',         label: '繁中 (blog)'  },
  { dir: join(ROOT, 'src/content/en'),    prefix: '/en/blog',      label: '英文 (en)'    },
  { dir: join(ROOT, 'src/content/zh-cn'), prefix: '/zh-cn/blog',   label: '簡中 (zh-cn)' },
  { dir: join(ROOT, 'src/content/zh-hk'), prefix: '/zh-hk/blog',   label: '港版 (zh-hk)' },
];

// ─── 主邏輯 ─────────────────────────────────────────────────

// 先掃主目錄 (blog)，建立 stem → newSlug 對照表
const blogArticles = listArticles(LANGS[0].dir);

const pendingArticles = [];   // 舊格式但尚未填 slug
const readyArticles   = [];   // 舊格式且已有 slug

for (const { stem, file } of blogArticles) {
  if (!isOldFormat(stem)) continue;
  const slug = readSlug(file);
  if (!slug || slug.trim() === '') {
    pendingArticles.push({ stem, file });
  } else {
    readyArticles.push({ stem, slug: slug.trim(), file });
  }
}

// 建立 stem → newSlug 查找表（給翻譯目錄用）
const stemToSlug = Object.fromEntries(readyArticles.map(a => [a.stem, a.slug]));

// 收集所有 redirect 規則
const redirectLines = [];
const warnings = [];

// 主目錄 redirect
for (const { stem, slug } of readyArticles) {
  redirectLines.push(`/blog/${stem}/ /blog/${slug}/ 301`);
}

// 翻譯目錄
for (const { dir, prefix, label } of LANGS.slice(1)) {
  const articles = listArticles(dir);
  const articleMap = Object.fromEntries(articles.map(a => [a.stem, a]));

  for (const { stem, slug } of readyArticles) {
    if (articleMap[stem]) {
      // 舊檔名還在 → 加 redirect
      redirectLines.push(`${prefix}/${stem}/ ${prefix}/${slug}/ 301`);
    } else {
      // 舊檔名已不存在，可能已改名；檢查是否有新 slug 的檔案
      const hasNewFile = articles.some(a => a.stem === slug);
      if (!hasNewFile) {
        // 翻譯版可能還沒新增，提醒
        warnings.push(`⚠️  [${label}] 找不到 ${stem} 也找不到 ${slug} — 翻譯版可能尚未建立`);
      }
      // 就算舊檔名不在，如果沒有新檔案也加個 redirect（避免遺漏舊外連）
      redirectLines.push(`${prefix}/${stem}/ ${prefix}/${slug}/ 301`);
    }
  }

  // 翻譯目錄自己有舊格式但主目錄沒對應的情況（孤兒翻譯）
  for (const { stem, file } of articles) {
    if (!isOldFormat(stem)) continue;
    if (stemToSlug[stem]) continue; // 主目錄已處理
    const slug = readSlug(file);
    if (!slug || slug.trim() === '') {
      warnings.push(`⚠️  [${label}] ${stem} 是舊格式但尚未填 slug（主目錄也沒有）`);
    } else {
      redirectLines.push(`${prefix}/${stem}/ ${prefix}/${slug.trim()}/ 301`);
      warnings.push(`⚠️  [${label}] ${stem} 有 slug 但主目錄沒有對應文章，請確認`);
    }
  }
}

// ─── 輸出 ────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  generate-redirects  ${WRITE_MODE ? '【寫入模式】' : '【預覽模式】'}                     ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

console.log(`✅  已有 slug、將產生 redirect 的文章：${readyArticles.length} 篇`);
console.log(`🔢  總共產生 redirect 規則：${redirectLines.length} 條\n`);

if (redirectLines.length > 0) {
  console.log('── 產生的 redirect 規則 ──────────────────────────────────');
  redirectLines.forEach(l => console.log('  ' + l));
  console.log('');
}

if (warnings.length > 0) {
  console.log('── 警告 ───────────────────────────────────────────────────');
  warnings.forEach(w => console.log('  ' + w));
  console.log('');
}

if (pendingArticles.length > 0) {
  console.log(`── 待處理：舊格式但尚未填 slug（共 ${pendingArticles.length} 篇）──────────`);
  pendingArticles.forEach(({ stem }) => console.log('  📝 ' + stem));
  console.log('');
}

// ─── 寫入 _redirects ─────────────────────────────────────────
if (WRITE_MODE) {
  const existing = readFileSync(REDIRECTS_FILE, 'utf8');

  const block = [
    MARKER_START,
    ...redirectLines,
    MARKER_END,
  ].join('\n');

  let updated;
  if (existing.includes(MARKER_START)) {
    // 替換 marker 中間的區塊
    const re = new RegExp(
      `${escapeRegex(MARKER_START)}[\\s\\S]*?${escapeRegex(MARKER_END)}`,
      'g'
    );
    updated = existing.replace(re, block);
  } else {
    // 第一次執行，直接附加在檔案結尾
    updated = existing.trimEnd() + '\n\n' + block + '\n';
  }

  writeFileSync(REDIRECTS_FILE, updated, 'utf8');
  console.log(`✅  已寫入 public/_redirects（${redirectLines.length} 條規則）`);
} else {
  console.log('ℹ️  預覽模式，未寫入任何檔案。加上 --write 參數可實際寫入。');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
