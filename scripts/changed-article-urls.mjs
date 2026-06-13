#!/usr/bin/env node
/**
 * changed-article-urls.mjs
 *
 * 列出某個 git 範圍內「新增/修改」的文章，對應的正式網址（每行一個）。
 * 給 submit-to-google workflow 使用。
 *
 * 用法：
 *   node scripts/changed-article-urls.mjs <baseRef> [headRef]
 *   例：node scripts/changed-article-urls.mjs HEAD~1 HEAD
 *
 * 規則：
 *   - 只看 src/content/{blog,en,zh-cn,zh-hk} 的 .md/.mdx
 *   - 依目錄決定語言路徑前綴
 *   - slug 取 frontmatter 的 slug，空白則用檔名（空白 slug 的舊網址會 301，
 *     由 submit-to-google 的 200 驗證自動濾掉）
 *   - 跳過 private: true
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

const DIR_PREFIX = {
  'src/content/blog': 'https://gobaligo.id/blog',
  'src/content/en': 'https://gobaligo.id/en/blog',
  'src/content/zh-cn': 'https://gobaligo.id/zh-cn/blog',
  'src/content/zh-hk': 'https://gobaligo.id/zh-hk/blog',
};

const base = process.argv[2] || 'HEAD~1';
const head = process.argv[3] || 'HEAD';

let changed = [];
try {
  const out = execSync(
    `git diff --name-only --diff-filter=AM ${base} ${head} -- ` +
      'src/content/blog src/content/en src/content/zh-cn src/content/zh-hk',
    { encoding: 'utf-8' },
  );
  changed = out.split('\n').map((l) => l.trim()).filter(Boolean);
} catch {
  // 範圍無效（例如首次 push）時，安靜輸出空集合
  process.exit(0);
}

const urls = new Set();
for (const file of changed) {
  if (!/\.(md|mdx)$/.test(file)) continue;
  const dir = Object.keys(DIR_PREFIX).find((d) => file.startsWith(d + '/'));
  if (!dir) continue;
  if (!existsSync(file)) continue; // 已刪除的檔（diff-filter 理論上已排除）

  let data = {};
  try {
    ({ data } = matter(readFileSync(file, 'utf-8')));
  } catch {
    continue;
  }
  if (data.private === true) continue;

  const stem = file.split('/').pop().replace(/\.(md|mdx)$/, '');
  const slug = (data.slug && String(data.slug).trim()) || stem;
  urls.add(`${DIR_PREFIX[dir]}/${slug}/`);
}

for (const u of urls) console.log(u);
