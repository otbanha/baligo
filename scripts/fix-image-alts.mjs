#!/usr/bin/env node
/**
 * fix-image-alts.mjs — 批次修復無意義的圖片 alt（AEO 稽核步驟③）
 *
 * 問題：638 篇文章的圖片 alt 是 vocus 搬移殘留的 `raw-image`，
 * 對 AI 模式理解內容與 Google 圖片搜尋毫無幫助。
 *
 * 規則：`![raw-image](url)` 的 alt 改為「最近的上方標題」（H1-H4），
 * 圖片出現在第一個標題之前則用文章 title。同一標題下多張圖不加編號
 * （重複 alt 可接受，比 raw-image 好）。
 *
 * 套用範圍：blog + zh-cn + zh-hk + en + id（各語言檔用自己語言的標題）。
 * contentHash 會忽略獨立圖片行，獨立行的 alt 修改不觸發重翻；
 * 但清單/段落內的內嵌圖會變 hash，執行後請跑 migrate-src-hash.mjs。
 *
 * 用法：
 *   node scripts/fix-image-alts.mjs --dry-run
 *   node scripts/fix-image-alts.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const isDryRun = process.argv.includes('--dry-run');
const DIRS = [
  'blog', 'zh-cn', 'zh-hk', 'en', 'id',
  'blocks', 'blocks/en', 'blocks/zh-cn', 'blocks/zh-hk', 'blocks/id',
].map(d => `src/content/${d}`);
const DEMO_FILES = new Set(['first-post.md', 'second-post.md', 'third-post.md', 'using-mdx.mdx', 'markdown-style-guide.md']);

// 標題文字 → 乾淨 alt：去 markdown 記號 / emoji / 連結，截 60 字
function cleanAlt(s) {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`#>|[\]"]+/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

let totalFiles = 0, totalImgs = 0;
for (const dir of DIRS) {
  let files;
  try { files = readdirSync(dir).filter(f => /\.(md|mdx)$/.test(f)); } catch { continue; }
  let changedFiles = 0, changedImgs = 0;

  for (const f of files) {
    if (DEMO_FILES.has(f)) continue;
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf-8');
    if (!raw.includes('![raw-image]') && !raw.includes('alt="raw-image"')) continue;

    let title = '';
    try { title = String(matter(raw).data.title ?? ''); } catch { /* 用空字串 */ }
    const fallback = cleanAlt(title) || 'article image';

    const lines = raw.split('\n');
    let inCode = false;
    let currentAlt = fallback;
    let n = 0;
    const out = lines.map(line => {
      if (/^```/.test(line.trim())) { inCode = !inCode; return line; }
      if (inCode) return line;
      const hm = /^#{1,4}\s+(.+?)\s*#*\s*$/.exec(line);
      if (hm) {
        const a = cleanAlt(hm[1]);
        if (a) currentAlt = a;
        return line;
      }
      let l = line;
      if (l.includes('![raw-image]')) {
        n += l.split('![raw-image]').length - 1;
        l = l.replaceAll('![raw-image]', `![${currentAlt}]`);
      }
      if (l.includes('alt="raw-image"')) {
        n += l.split('alt="raw-image"').length - 1;
        l = l.replaceAll('alt="raw-image"', `alt="${currentAlt}"`);
      }
      return l;
    });

    if (n > 0) {
      changedFiles++;
      changedImgs += n;
      if (!isDryRun) writeFileSync(path, out.join('\n'), 'utf-8');
    }
  }
  console.log(`${dir}: ${changedFiles} 檔 / ${changedImgs} 張圖${isDryRun ? '（dry-run）' : ''}`);
  totalFiles += changedFiles;
  totalImgs += changedImgs;
}
console.log(`\n${isDryRun ? '將' : '共'}修改 ${totalFiles} 檔、${totalImgs} 張圖`);
