#!/usr/bin/env node
/**
 * 03-apply-slugs.mjs
 * 讀取 scripts/slug-suggestions.csv，對 status=ready 的文章套用 slug 變更：
 *   - 繁中 (blog)：更新 frontmatter slug 欄位，檔名不動
 *   - 翻譯版 (en/zh-cn/zh-hk)：重新命名檔案，frontmatter 不動
 *
 * Usage:
 *   node scripts/03-apply-slugs.mjs          → 預覽（dry-run）
 *   node scripts/03-apply-slugs.mjs --write  → 實際執行
 */

import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import matter from 'gray-matter';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const WRITE_MODE = process.argv.includes('--write');
const CSV_FILE   = join(__dirname, 'slug-suggestions.csv');
const LOG_FILE   = join(__dirname, 'slug-changes.log');

const DIRS = {
  blog:    join(ROOT, 'src/content/blog'),
  en:      join(ROOT, 'src/content/en'),
  'zh-cn': join(ROOT, 'src/content/zh-cn'),
  'zh-hk': join(ROOT, 'src/content/zh-hk'),
};

const SLUG_RE = /^[a-z0-9-]+$/;

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function parseCSV(content) {
  const text = content.startsWith('﻿') ? content.slice(1) : content;
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
  });
}

// ─── File helpers ─────────────────────────────────────────────────────────────

function findFile(dir, stem) {
  for (const ext of ['.md', '.mdx']) {
    const p = join(dir, stem + ext);
    if (existsSync(p)) return { path: p, ext };
  }
  return null;
}

/** 在 frontmatter 中插入或更新 slug 欄位，不動其他 frontmatter 內容 */
function insertOrUpdateSlug(rawContent, newSlug) {
  // 若 slug: 欄位已存在（包括空值），直接替換那一行
  if (/^slug:/m.test(rawContent)) {
    return rawContent.replace(/^slug:.*$/m, `slug: ${newSlug}`);
  }
  // 否則在 opening --- 後第一行插入
  return rawContent.replace(/^(---\r?\n)/, `$1slug: ${newSlug}\n`);
}

// ─── Confirm prompt ───────────────────────────────────────────────────────────

function waitForEnter(msg) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(msg, () => { rl.close(); resolve(); });
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  03-apply-slugs  ${WRITE_MODE ? '【寫入模式】' : '【預覽模式 dry-run】'}`);
  console.log('══════════════════════════════════════════════════════\n');

  if (!existsSync(CSV_FILE)) {
    console.error('❌  找不到 scripts/slug-suggestions.csv，請先跑步驟 1');
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(CSV_FILE, 'utf8'));
  const ready  = rows.filter(r => r.status?.trim() === 'ready');
  const skip   = rows.filter(r => r.status?.trim() === 'skip').length;
  const pending = rows.filter(r => r.status?.trim() === 'pending').length;
  const apiErr = rows.filter(r => r.status?.trim() === 'api_error').length;

  console.log(`CSV 總行數：${rows.length}`);
  console.log(`  ready：${ready.length} 筆  skip：${skip}  pending：${pending}  api_error：${apiErr}\n`);

  if (ready.length === 0) {
    console.log('⚠️  沒有 status=ready 的列，結束。');
    return;
  }

  // ─── 安全檢查 ─────────────────────────────────────────────────────────────
  console.log('🔍 安全檢查...');
  const errors = [];
  const seenSlugs = new Set();

  for (const row of ready) {
    const fn  = row.filename?.trim();
    const slug = row.final_slug?.trim();

    if (!fn) { errors.push('❌  某列 filename 為空'); continue; }
    if (!slug) { errors.push(`❌  [${fn}] final_slug 為空`); continue; }
    if (!SLUG_RE.test(slug)) {
      errors.push(`❌  [${fn}] final_slug "${slug}" 含非法字元（只允許 a-z 0-9 -）`);
    }
    if (seenSlugs.has(slug)) {
      errors.push(`❌  CSV 內重複 slug: "${slug}"`);
    }
    seenSlugs.add(slug);
  }

  // 收集 blog 目錄中已有的 slug（排除正要更新的文章自身）
  const readyFilenames = new Set(ready.map(r => r.filename?.trim()));
  const existingSlugsInBlog = new Map(); // slug → filename

  for (const f of readdirSync(DIRS.blog).filter(f => f.endsWith('.md') || f.endsWith('.mdx'))) {
    const stem = basename(f, extname(f));
    if (readyFilenames.has(stem)) continue; // 自己的舊 slug 不算衝突
    const { data } = matter(readFileSync(join(DIRS.blog, f), 'utf8'));
    if (data.slug) existingSlugsInBlog.set(data.slug.trim(), stem);
    // 非舊格式的檔名本身也算 slug 佔用
    existingSlugsInBlog.set(stem, stem);
  }

  for (const row of ready) {
    const slug = row.final_slug?.trim();
    if (!slug) continue;
    if (existingSlugsInBlog.has(slug)) {
      errors.push(`❌  [${row.filename}] slug "${slug}" 已被 ${existingSlugsInBlog.get(slug)} 佔用`);
    }
  }

  if (errors.length > 0) {
    console.log('\n安全檢查失敗：');
    errors.forEach(e => console.log('  ' + e));
    console.log('\n⛔ 中止，未修改任何檔案。請修正 CSV 後再跑。');
    process.exit(1);
  }
  console.log('  ✅ 通過\n');

  // ─── 預覽變更清單 ──────────────────────────────────────────────────────────
  console.log('── 將執行的變更 ──────────────────────────────────────────────────');

  const changes = [];

  for (const row of ready) {
    const fn   = row.filename.trim();
    const slug = row.final_slug.trim();

    // blog：只更新 frontmatter，檔名不動
    const blogFile = findFile(DIRS.blog, fn);
    if (blogFile) {
      changes.push({
        type:  'frontmatter',
        path:  blogFile.path,
        slug,
        label: `[blog]  ${fn}.md → frontmatter slug: ${slug}`,
      });
    } else {
      console.log(`  ⚠️  blog/${fn} 找不到檔案`);
    }

    // 翻譯版：重新命名
    for (const lang of ['en', 'zh-cn', 'zh-hk']) {
      const tf = findFile(DIRS[lang], fn);
      if (tf) {
        const newPath = join(DIRS[lang], slug + tf.ext);
        changes.push({
          type:  'rename',
          from:  tf.path,
          to:    newPath,
          label: `[${lang}]  ${fn}${tf.ext} → ${slug}${tf.ext}`,
        });
      }
    }
  }

  changes.forEach(c => console.log('  📝 ' + c.label));
  console.log(`\n共 ${changes.length} 個變更（${ready.length} 篇文章）\n`);

  if (!WRITE_MODE) {
    console.log('ℹ️  預覽模式，未寫入。加上 --write 實際執行。');
    return;
  }

  // ─── 確認提示 ─────────────────────────────────────────────────────────────
  await waitForEnter(`⚠️  將處理 ${ready.length} 筆，按 Enter 繼續或 Ctrl+C 取消：`);
  console.log('');

  // ─── 執行 ─────────────────────────────────────────────────────────────────
  const logLines = [
    `# slug-changes.log — ${new Date().toISOString()}`,
    `# ready: ${ready.length} 筆 / changes: ${changes.length}`,
    '',
  ];
  let success = 0, failed = 0;

  for (const c of changes) {
    try {
      if (c.type === 'frontmatter') {
        const raw = readFileSync(c.path, 'utf8');
        writeFileSync(c.path, insertOrUpdateSlug(raw, c.slug), 'utf8');
        logLines.push(`FM  ${c.path}  →  slug: ${c.slug}`);
      } else {
        renameSync(c.from, c.to);
        logLines.push(`MV  ${c.from}  →  ${c.to}`);
      }
      success++;
    } catch (e) {
      console.log(`  ❌  失敗: ${c.label} — ${e.message}`);
      logLines.push(`ERR ${c.label} — ${e.message}`);
      failed++;
    }
  }

  writeFileSync(LOG_FILE, logLines.join('\n') + '\n', 'utf8');

  console.log('── 完成 ──────────────────────────────────────────────────────────');
  console.log(`✅  成功：${success}  |  ❌ 失敗：${failed}`);
  console.log(`📋  log：scripts/slug-changes.log\n`);
  console.log('== 步驟 4：更新 redirects ==');
  console.log('  node scripts/generate-redirects.mjs --write\n');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
