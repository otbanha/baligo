#!/usr/bin/env node
/**
 * push 前最後防線：驗證翻譯輸出的 frontmatter 是否符合 Astro content schema，
 * 專門攔截「本該是字串/陣列的欄位卻變成 object」這類會讓 `astro build` 直接失敗的畸形資料
 *（2026-07-02 曾因翻譯 API 巢狀回傳把 title 寫成 object 弄掛 production build）。
 *
 * 用法：
 *   printf '%s\n' file1.md file2.md | node scripts/validate-translations.mjs
 *   node scripts/validate-translations.mjs file1.md file2.md
 *
 * 輸出：
 *   stdout — 每行一個「驗證不通過」的檔案路徑（供 CI 剔除、不 push）
 *   stderr — 人類可讀的原因與統計
 *   exit code — 一律 0（讓 CI 剔除壞檔後繼續 push 好檔；驗證器本身不該中斷流程）
 *
 * 規則對齊 src/content.config.ts：
 *   translated（zh-cn/zh-hk/en/id）：title 必填字串；description/heroImage/originalUrl/lang 選填字串；
 *                                    category 字串或字串陣列；tags 字串陣列。
 *   blocks：title 必填字串。
 *   其他：至少要求 title 為字串（blog/qa 皆然）。
 */
import matter from 'gray-matter';
import { readFileSync, existsSync } from 'node:fs';

// ── 讀入檔案清單（argv 優先，否則讀 stdin）────────────────────────────────────
function readStdin() {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

const argvFiles = process.argv.slice(2);
const files = (argvFiles.length ? argvFiles.join('\n') : readStdin())
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));

// ── 型別判斷小工具 ────────────────────────────────────────────────────────────
const isStr = (v) => typeof v === 'string';
const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
// 選填字串欄位：允許不存在（undefined/null），存在則必須是字串
const optStrBad = (v) => v != null && !isStr(v);

function collectionOf(path) {
  const m = path.match(/src\/content\/(blocks\/[^/]+|[^/]+)\//);
  if (!m) return 'other';
  const seg = m[1];
  if (seg.startsWith('blocks/')) return 'blocks';
  if (['zh-cn', 'zh-hk', 'en', 'id'].includes(seg)) return 'translated';
  return seg; // blog / qa / promotions / tickets ...
}

/** 回傳該檔的錯誤原因陣列（空陣列 = 通過）。 */
function validate(path, data) {
  const errs = [];
  const col = collectionOf(path);

  // 所有需要 title 的集合：title 必填且為字串
  if (col === 'translated' || col === 'blocks' || col === 'blog' || col === 'other') {
    if (!isStr(data.title) || !data.title.trim()) {
      errs.push(`title 非字串或為空（實際型別：${data.title === undefined ? 'undefined' : Array.isArray(data.title) ? 'array' : typeof data.title}）`);
    }
  }

  if (col === 'translated') {
    for (const k of ['description', 'heroImage', 'originalUrl', 'lang']) {
      if (optStrBad(data[k])) errs.push(`${k} 應為字串，實際為 ${Array.isArray(data[k]) ? 'array' : typeof data[k]}`);
    }
    // category：字串或字串陣列
    const cat = data.category;
    if (cat != null) {
      if (isPlainObject(cat)) errs.push('category 應為字串或字串陣列，實際為 object');
      else if (Array.isArray(cat) && !cat.every(isStr)) errs.push('category 陣列含非字串元素');
      else if (!Array.isArray(cat) && !isStr(cat)) errs.push(`category 型別錯誤（${typeof cat}）`);
    }
    // tags：字串陣列
    const tags = data.tags;
    if (tags != null) {
      if (!Array.isArray(tags)) errs.push(`tags 應為陣列，實際為 ${isPlainObject(tags) ? 'object' : typeof tags}`);
      else if (!tags.every(isStr)) errs.push('tags 陣列含非字串元素');
    }
  }

  return errs;
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
let badCount = 0;
for (const f of files) {
  if (!existsSync(f)) continue; // 檔案可能已被刪除（e.g. 私密文章），略過
  let data;
  try {
    ({ data } = matter(readFileSync(f, 'utf-8')));
  } catch (e) {
    process.stdout.write(f + '\n');
    process.stderr.write(`✗ ${f}\n    frontmatter 解析失敗：${e.message}\n`);
    badCount++;
    continue;
  }
  const errs = validate(f, data);
  if (errs.length) {
    process.stdout.write(f + '\n');
    process.stderr.write(`✗ ${f}\n${errs.map((e) => '    ' + e).join('\n')}\n`);
    badCount++;
  }
}

process.stderr.write(
  badCount
    ? `\n⚠️ ${files.length} 個檔案中有 ${badCount} 個 frontmatter 不合格，已列於 stdout（將不 push）。\n`
    : `✅ ${files.length} 個檔案 frontmatter 全部通過。\n`
);

process.exit(0);
