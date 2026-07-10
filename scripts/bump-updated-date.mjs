#!/usr/bin/env node
/**
 * 從 stdin 讀入被實質修改的文章路徑（每行一個），
 * 把該文章 frontmatter 的 updatedDate 設為今天（Asia/Makassar，峇里島時區 UTC+8）。
 * 只改一行，不動其他 frontmatter 格式，供 GitHub Action 呼叫。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

const paths = readFileSync(0, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(Boolean);

let changed = 0;
for (const path of paths) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    continue;
  }

  let updated;
  if (/^updatedDate:.*$/m.test(raw)) {
    updated = raw.replace(/^updatedDate:.*$/m, `updatedDate: ${today}`);
  } else if (/^pubDate:.*\r?\n/m.test(raw)) {
    updated = raw.replace(/^(pubDate:.*\r?\n)/m, `$1updatedDate: ${today}\n`);
  } else {
    continue;
  }

  if (updated !== raw) {
    writeFileSync(path, updated, 'utf8');
    changed++;
    console.log(`↻ ${path} → updatedDate: ${today}`);
  }
}

console.log(`✅ 已更新 ${changed} 篇文章的 updatedDate`);
