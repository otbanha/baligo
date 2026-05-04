#!/usr/bin/env node
/**
 * migrate-src-hash.mjs
 * 把所有翻譯檔的 _srcHash 更新成 contentHash（排除圖片行的 hash），
 * 避免下次翻譯時因 hash 不符而重新翻譯 1200 篇。
 *
 * 用法：node scripts/migrate-src-hash.mjs [--dry-run]
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const isDryRun = process.argv.includes('--dry-run');
const LANGS = ['zh-cn', 'zh-hk', 'en'];
const BLOCK_LANGS = ['zh-cn', 'en'];

function md5(text) {
  return createHash('md5').update(text).digest('hex');
}

function contentHash(text) {
  const stripped = text
    .replace(/^heroImage:.*$/m, 'heroImage: __img__')
    .replace(/^!\[.*?\]\(.*?\)\s*$/gm, '');
  return md5(stripped);
}

let updated = 0, skipped = 0;

function migrateDir(srcDir, destDir, langs) {
  const files = readdirSync(srcDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const srcContent = readFileSync(srcPath, 'utf-8');
    const newHash = contentHash(srcContent);

    for (const lang of langs) {
      const destPath = join(destDir, lang, file);
      if (!existsSync(destPath)) continue;

      const destContent = readFileSync(destPath, 'utf-8');
      const { data: fm, content: body } = matter(destContent);

      if (fm._srcHash === newHash) { skipped++; continue; }

      fm._srcHash = newHash;
      const newContent = matter.stringify(body, fm);

      if (!isDryRun) writeFileSync(destPath, newContent, 'utf-8');
      updated++;
      if (isDryRun) console.log(`  [dry] ${lang}/${file}`);
    }
  }
}

console.log(`\n🔄 migrate-src-hash${isDryRun ? ' (dry-run)' : ''}`);
migrateDir('src/content/blog', 'src/content', LANGS);
migrateDir('src/content/blocks', 'src/content/blocks', BLOCK_LANGS);
console.log(`✅ 更新：${updated}，已是新 hash 跳過：${skipped}\n`);
