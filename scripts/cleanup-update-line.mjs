#!/usr/bin/env node
/**
 * 一次性清理：移除文章內文開頭寫死的 "Update: YYYY/MM/DD" 文字行，
 * 改寫入 frontmatter 的 updatedDate 欄位（沿用原本寫死的日期，不歸零）。
 * 之後改由 GitHub Action（scripts/bump-updated-date.mjs）在文章被實際修改時自動更新。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const BLOG_DIR = join(process.cwd(), 'src/content/blog');
const LINE_RE = /^Update: (\d{4})\/(\d{2})\/(\d{2})\r?\n\r?\n/m;

let changed = 0;
for (const f of readdirSync(BLOG_DIR)) {
  if (!/\.(md|mdx)$/.test(f)) continue;
  const path = join(BLOG_DIR, f);
  const raw = readFileSync(path, 'utf8');
  const m = raw.match(LINE_RE);
  if (!m) continue;

  const [, y, mo, d] = m;
  const isoDate = `${y}-${mo}-${d}`;
  let updated = raw.replace(LINE_RE, '');

  if (/^updatedDate:/m.test(updated)) {
    updated = updated.replace(/^updatedDate:.*$/m, `updatedDate: ${isoDate}`);
  } else {
    updated = updated.replace(/^(pubDate:.*\r?\n)/m, `$1updatedDate: ${isoDate}\n`);
  }

  writeFileSync(path, updated, 'utf8');
  changed++;
}

console.log(`✅ 已清理 ${changed} 篇文章`);
