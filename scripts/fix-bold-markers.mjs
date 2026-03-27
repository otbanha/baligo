#!/usr/bin/env node
/**
 * fix-bold-markers.mjs
 * 掃描 src/content/blog/ 所有 .md 檔案，
 * 把 ****text**** 或 ***text*** 等多餘星號正規化為 **text**
 *
 * 成因：從 Vocus 抓取文章時，粗體標記被重複。
 * 在 astro build 之前執行，確保 Cloudflare 部署正確渲染粗體。
 */

import { readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = 'src/content/blog';

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let fixed = 0;
for (const filename of files) {
  const filepath = join(BLOG_DIR, filename);
  const original = readFileSync(filepath, 'utf-8');

  // 只處理 body（跳過 frontmatter）
  const fmEnd = original.indexOf('\n---', 3);
  if (fmEnd === -1) continue;

  const fm   = original.slice(0, fmEnd + 4);
  let   body = original.slice(fmEnd + 4);

  // ── 規則 1: ****text**** → **text** ──────────────────────────────
  body = body.replace(/\*{4}([^*\n]+?)\*{4}/g, '**$1**');

  // ── 規則 2: ***text*** → **text** (不含 bold+italic 的特殊情況) ───
  // ***text*** 在 CommonMark 是 bold+italic，但從抓取來看都是意外多一個 *
  body = body.replace(/\*{3}([^*\n]+?)\*{3}/g, '**$1**');

  // ── 規則 3: ***text**** 或 ****text*** (不對稱) → **text** ────────
  body = body.replace(/\*{3,4}([^*\n]+?)\*{3,4}/g, '**$1**');

  // ── 規則 4: **_text_** → **text** (CMS 產生的 bold+italic 混用) ───
  // Sveltia CMS 編輯後會把標題寫成 **_text_**，渲染為 <strong><em>
  body = body.replace(/\*\*_([^_\n]+?)_\*\*/g, '**$1**');

  const newContent = fm + body;
  if (newContent !== original) {
    writeFileSync(filepath, newContent, 'utf-8');
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`✓ fix-bold-markers: ${fixed} 個檔案已修正`);
} else {
  console.log('✓ fix-bold-markers: 無需修正');
}
