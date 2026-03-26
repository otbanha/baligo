#!/usr/bin/env node
/**
 * fix-string-tags.mjs
 * 掃描 src/content/blog/ 所有 .md 檔案，
 * 把 YAML 中的 tags: |- 多行字串轉成正確的 YAML 陣列格式。
 * 在 astro build 之前執行，確保 Cloudflare 部署不因格式問題失敗。
 */

import { readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = 'src/content/blog';

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let fixed = 0;
for (const filename of files) {
  const filepath = join(BLOG_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');

  const newContent = content.replace(
    /^tags: \|-\n((?:  .+\n)+)/m,
    (_, block) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      return 'tags:\n' + lines.map(l => `  - ${l}`).join('\n') + '\n';
    }
  );

  if (newContent !== content) {
    writeFileSync(filepath, newContent, 'utf-8');
    console.log(`  fixed: ${filename}`);
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`✓ fix-string-tags: ${fixed} 個檔案已修正`);
} else {
  console.log('✓ fix-string-tags: 無需修正');
}
