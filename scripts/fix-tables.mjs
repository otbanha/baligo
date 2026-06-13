#!/usr/bin/env node
/**
 * fix-tables.mjs
 * 掃描 src/content/blog/ 所有 .md 檔案，
 * 為「缺少分隔線列」的 GFM 表格自動補上 | --- | --- | 那一列。
 *
 * 成因：Sveltia CMS 的編輯器存檔表格時，常常只寫表頭列 + 資料列，
 * 漏掉 GFM 規範要求、表頭下方緊接的分隔線列。CMS 預覽很寬鬆照樣
 * 顯示成表格，但前台嚴格的 Markdown 渲染器沒有分隔線就不認得是
 * 表格，整段會被當成普通文字（一堆 |）。
 *
 * 順手清理：表格儲存格內字面的 \n（CMS 把換行寫成字面反斜線 n）。
 *
 * 在 astro build 之前執行，確保 Cloudflare 部署正確渲染表格。
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = 'src/content/blog';

// 是否為表格列（trim 後以 | 開頭）
const isTableRow = (line) => /^\s*\|/.test(line);
// 是否為分隔線列：每格只有 -、:、空白，例如 | --- | :--: |
const isDelimiterRow = (line) => /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/.test(line);

// 算出表頭有幾欄（去掉前後空格、忽略首尾空欄）
function columnCount(headerLine) {
  const cells = headerLine.trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
  return cells.length;
}

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let fixed = 0;
for (const filename of files) {
  const filepath = join(BLOG_DIR, filename);
  const original = readFileSync(filepath, 'utf-8');

  // 只處理 body（跳過 frontmatter）
  const fmEnd = original.indexOf('\n---', 3);
  if (fmEnd === -1) continue;

  const fm = original.slice(0, fmEnd + 4);
  const body = original.slice(fmEnd + 4);

  const lines = body.split('\n');
  const out = [];
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 清理表格列內字面的 \n（CMS 產物）：合併成空白
    if (isTableRow(line) && line.includes('\\n')) {
      const cleaned = line.replace(/\\n/g, ' ').replace(/  +/g, ' ');
      if (cleaned !== line) { line = cleaned; changed = true; }
    }

    out.push(line);

    // 偵測表格「表頭列」後面缺少分隔線 → 補一列。
    // 表頭 = 表格區塊的第一列（上一原始列不是表格列），
    // 且下一列是表格列但不是分隔線。
    const prev = lines[i - 1];
    const next = lines[i + 1];
    const isBlockStart = !(prev !== undefined && isTableRow(prev));
    if (
      isTableRow(line) &&
      isBlockStart &&
      next !== undefined &&
      isTableRow(next) &&
      !isDelimiterRow(next)
    ) {
      const cols = columnCount(line);
      out.push('| ' + Array(cols).fill('---').join(' | ') + ' |');
      changed = true;
    }
  }

  if (changed) {
    writeFileSync(filepath, fm + out.join('\n'), 'utf-8');
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`✓ fix-tables: ${fixed} 個檔案已修正`);
} else {
  console.log('✓ fix-tables: 無需修正');
}
