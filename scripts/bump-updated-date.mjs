#!/usr/bin/env node
/**
 * 從 stdin 讀入被實質修改的文章路徑（每行一個），
 * 把該文章 frontmatter 的 updatedDate 設為今天（Asia/Makassar，峇里島時區 UTC+8）。
 *
 * 另外維護 contentUpdatedAt（內文最後修改時間，含時分秒，同時區），供首頁輪播「最新更新」用：
 * - 跟上一個 commit（HEAD^）比，內文文字有改 → 設為現在
 * - 只改 frontmatter（分類、hero 圖…）、只動空白或只換圖片行 → 沿用 HEAD^ 的值
 *   （CMS 偶爾會用快取的舊值覆寫 frontmatter，所以一律以 HEAD^ 為準，而不是看目前檔案）
 *
 * 只改這幾行，不動其他 frontmatter 格式，供 GitHub Action 呼叫（需在 repo 根目錄、HEAD 為要處理的 commit）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const baliNow = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
const today = baliNow.slice(0, 10);
const nowStamp = `${baliNow.slice(0, 19)}+08:00`;

// ⚠️ 判斷規則需與回填腳本一致：去掉 frontmatter、只有圖片的行、所有空白後比較
function bodyText(raw) {
  const m = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  const body = m ? m[1] : raw;
  return body.replace(/^\s*!\[[^\]]*\]\([^)]*\)\s*$/gm, '').replace(/\s+/g, '');
}

function fmValue(raw, key) {
  const m = raw.match(new RegExp(`^${key}:\\s*['"]?([^'"\\r\\n]*)['"]?\\s*$`, 'm'));
  return m && m[1] ? m[1] : null;
}

function previousVersion(path) {
  try {
    return execFileSync('git', ['show', `HEAD^:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function setField(raw, key, value, afterKey) {
  const line = `${key}: '${value}'`;
  if (new RegExp(`^${key}:.*$`, 'm').test(raw)) return raw.replace(new RegExp(`^${key}:.*$`, 'm'), line);
  return raw.replace(new RegExp(`^(${afterKey}:.*\\r?\\n)`, 'm'), `$1${line}\n`);
}

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

  // 舊欄位（2026-09-27～10-01 使用），已由 contentUpdatedAt 取代
  updated = updated.replace(/^updatedAt:.*\r?\n/m, '');

  const prev = previousVersion(path);
  const bodyChanged = prev === null || bodyText(prev) !== bodyText(raw);
  const prevContentUpdatedAt = prev && fmValue(prev, 'contentUpdatedAt');
  if (bodyChanged) {
    updated = setField(updated, 'contentUpdatedAt', nowStamp, 'updatedDate');
  } else if (prevContentUpdatedAt) {
    updated = setField(updated, 'contentUpdatedAt', prevContentUpdatedAt, 'updatedDate');
  } else {
    updated = updated.replace(/^contentUpdatedAt:.*\r?\n/m, '');
  }

  if (updated !== raw) {
    writeFileSync(path, updated, 'utf8');
    changed++;
    console.log(`↻ ${path} → updatedDate: ${today}${bodyChanged ? `, contentUpdatedAt: ${nowStamp}` : '（只改 frontmatter，內文更新時間不變）'}`);
  }
}

console.log(`✅ 已更新 ${changed} 篇文章的 updatedDate`);
