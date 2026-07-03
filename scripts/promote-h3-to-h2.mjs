#!/usr/bin/env node
/**
 * promote-h3-to-h2.mjs — 標題層級修復（AEO 稽核步驟②）
 *
 * 問題：188 篇文章完全沒有 H2（68 篇只用 H3 組織內容），而 SEO.astro 的
 * HowTo 步驟、FAQPage 問答、TouristDestination 景點清單全部只讀 H2，
 * 這些文章的分類 schema 是空殼。
 *
 * 規則：檔案內文「沒有任何 H2」且「H3 數量 ≥ 2」→ 整組標題升一級：
 *   ### → ##、#### → ###、##### → ####（維持相對層級）
 * 程式碼區塊（```）內不動、frontmatter 不動。
 *
 * 套用範圍：blog + zh-cn + zh-hk + en + id（翻譯檔做同樣機械變換，
 * 之後跑 migrate-src-hash.mjs 重新對齊 _srcHash，避免觸發大量重翻）。
 *
 * 用法：
 *   node scripts/promote-h3-to-h2.mjs --dry-run   # 只列出會修改的檔案
 *   node scripts/promote-h3-to-h2.mjs             # 執行
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const isDryRun = process.argv.includes('--dry-run');
const DIRS = ['blog', 'zh-cn', 'zh-hk', 'en', 'id'].map(d => `src/content/${d}`);
const DEMO_FILES = new Set(['first-post.md', 'second-post.md', 'third-post.md', 'using-mdx.mdx', 'markdown-style-guide.md']);

function splitFrontmatter(text) {
  const m = text.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  return m ? { fm: m[1], body: m[2] } : { fm: '', body: text };
}

function analyze(body) {
  const lines = body.split('\n');
  let inCode = false, h2 = 0, h3 = 0;
  for (const line of lines) {
    if (/^```/.test(line.trim())) { inCode = !inCode; continue; }
    if (inCode) continue;
    if (/^##\s/.test(line)) h2++;
    else if (/^###\s/.test(line)) h3++;
  }
  return { h2, h3 };
}

function promote(body) {
  const lines = body.split('\n');
  let inCode = false;
  const out = lines.map(line => {
    if (/^```/.test(line.trim())) { inCode = !inCode; return line; }
    if (inCode) return line;
    if (/^###\s/.test(line)) return line.replace(/^###/, '##');
    if (/^####\s/.test(line)) return line.replace(/^####/, '###');
    if (/^#####\s/.test(line)) return line.replace(/^#####/, '####');
    return line;
  });
  return out.join('\n');
}

let totalChanged = 0;
for (const dir of DIRS) {
  let files;
  try { files = readdirSync(dir).filter(f => /\.(md|mdx)$/.test(f)); } catch { continue; }
  let changed = 0;
  for (const f of files) {
    if (DEMO_FILES.has(f)) continue;
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf-8');
    const { fm, body } = splitFrontmatter(raw);
    const { h2, h3 } = analyze(body);
    if (h2 > 0 || h3 < 2) continue;
    changed++;
    if (isDryRun) { console.log(`  [dry] ${path}（H3×${h3}）`); continue; }
    writeFileSync(path, fm + promote(body), 'utf-8');
  }
  console.log(`${dir}: ${changed} 檔${isDryRun ? '（dry-run 未寫入）' : '已升級'}`);
  totalChanged += changed;
}
console.log(`\n${isDryRun ? '將' : '共'}修改 ${totalChanged} 檔`);
