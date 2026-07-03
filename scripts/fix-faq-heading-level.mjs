#!/usr/bin/env node
/**
 * fix-faq-heading-level.mjs — 修復「FAQ 問題用 H3 而非 H2」的 schema bug
 *
 * SEO.astro 的 buildAnswerMap 只掃描 H2（## ）來產生 FAQPage schema，
 * 但部分文章的 FAQ 區塊寫成「## 常見問題」包一層，底下問題卻用「### 問題」，
 * 導致 schema 完全掃不到，即使分類是 新手指南/旅行技巧 也不會輸出 FAQPage。
 *
 * 修法：把 FAQ 包裹標題（## 常見問題...）降為 H3（避免自己被誤判成一個問題），
 * 底下的 ### 問題全部升為 ##（讓 buildAnswerMap 抓得到）。
 *
 * 範圍：僅限已知受影響的 blog 檔案清單（scan-faq-heading-bug.mjs 找出的結果）。
 *
 * 用法：
 *   node scripts/fix-faq-heading-level.mjs --dry-run
 *   node scripts/fix-faq-heading-level.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const isDryRun = process.argv.includes('--dry-run');
const BLOG_DIR = 'src/content/blog';

const FILES = [
  '2025-02-09-67a813d4fd8978000165ae91.md',
  '2025-03-14-67d42835fd897800014ffc83.md',
  '2024-10-13-670b5191fd8978000185cf37.md',
  '2026-02-05-6984a77afd89780001a13d36.md',
  '2026-05-17-050259.md',
  '2025-05-01-6812dc5dfd897800018e284b.md',
  '2025-07-26-68846867fd89780001b26ef9.md',
  '2025-10-04-68d49203fd89780001e4c5ef.md',
  '2025-09-22-68d13539fd89780001b06dfc.md',
  '2024-01-28-65b5c7e2fd89780001e96fac.md',
];

const FAQ_RE = /常見問題|FAQ|Q&A|問與答/;

let totalFiles = 0;
for (const file of FILES) {
  const path = join(BLOG_DIR, file);
  const raw = readFileSync(path, 'utf-8');
  const lines = raw.split('\n');

  // 找標題（含層級與行號），跳過 frontmatter 與 code fence
  const headings = [];
  let inCode = false, inFm = 0;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t === '---') { inFm++; continue; }
    if (inFm === 1) continue; // frontmatter 內
    if (/^```/.test(t)) { inCode = !inCode; continue; }
    if (inCode) continue;
    const m = /^(#{1,6})\s+(.+?)\s*$/.exec(lines[i]);
    if (m) headings.push({ line: i, level: m[1].length, text: m[2] });
  }

  const wrapperIdx = headings.findIndex(h => h.level === 2 && FAQ_RE.test(h.text));
  if (wrapperIdx === -1) { console.log(`  [skip] ${file}：找不到 FAQ 包裹標題`); continue; }

  const wrapper = headings[wrapperIdx];
  // 區塊結束：下一個 level<=2 的標題（原始層級，wrapper 之後）
  const nextTop = headings.slice(wrapperIdx + 1).find(h => h.level <= 2);
  const blockEndLine = nextTop ? nextTop.line : lines.length;

  let changed = 0;
  // 包裹標題本身：## → ###
  lines[wrapper.line] = '#' + lines[wrapper.line];
  changed++;

  // 區塊內的 ### 問題 → ##
  for (const h of headings) {
    if (h.line <= wrapper.line || h.line >= blockEndLine) continue;
    if (h.level === 3) {
      lines[h.line] = lines[h.line].replace(/^###/, '##');
      changed++;
    }
  }

  console.log(`  ${file}：包裹標題降級 + ${changed - 1} 個問題升級${isDryRun ? '（dry-run）' : ''}`);
  if (!isDryRun) writeFileSync(path, lines.join('\n'), 'utf-8');
  totalFiles++;
}

console.log(`\n${isDryRun ? '將' : '共'}修復 ${totalFiles} 檔`);
