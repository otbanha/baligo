#!/usr/bin/env node
/**
 * migrate-src-hash.mjs
 * 用最新版 contentHash 重新計算每個來源檔案的 hash，並寫入對應翻譯檔的 _srcHash。
 * 用途：每次 contentHash 演算法調整後執行一次，避免下次翻譯任務因 hash 不符而全面重翻。
 *
 * 用法：
 *   node scripts/migrate-src-hash.mjs            # 全部執行
 *   node scripts/migrate-src-hash.mjs --dry-run  # 只列出會修改的檔案
 *
 * 注意：contentHash 函數必須與 scripts/translate.mjs 保持一致！
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const isDryRun = process.argv.includes('--dry-run');
const LANGS = ['zh-cn', 'zh-hk', 'en'];
const BLOCK_LANGS = ['zh-cn', 'zh-hk', 'en'];

function md5(text) {
  return createHash('md5').update(text).digest('hex');
}

// ⚠️ 必須與 scripts/translate.mjs 的 contentHash 保持完全一致
function contentHash(text) {
  const stripped = text
    .replace(/^heroImage:.*$/m, 'heroImage: __img__')
    .replace(/^slug:.*$/m, 'slug: __slug__')
    .replace(/^update:.*$/m, 'update: __update__')
    .replace(/^pubDate:.*$/m, 'pubDate: __pubDate__')
    .replace(/^updatedDate:.*$/m, 'updatedDate: __updatedDate__')
    .replace(/^!\[.*?\]\(.*?\)\s*$/gm, '');
  return md5(stripped);
}

let updated = 0, skipped = 0, missing = 0;

function getDestFilename(srcContent, srcFilename, isBlocks) {
  if (isBlocks) return srcFilename;
  const { data: srcFm } = matter(srcContent);
  if (srcFm.slug && String(srcFm.slug).trim()) {
    const ext = srcFilename.endsWith('.mdx') ? '.mdx' : '.md';
    return String(srcFm.slug).trim() + ext;
  }
  return srcFilename;
}

function migrateDir(srcDir, destBaseDir, langs, isBlocks = false) {
  const files = readdirSync(srcDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const srcContent = readFileSync(srcPath, 'utf-8');
    const newHash = contentHash(srcContent);
    const destFilename = getDestFilename(srcContent, file, isBlocks);

    for (const lang of langs) {
      const destPath = isBlocks
        ? join(destBaseDir, lang, destFilename)
        : join(destBaseDir, lang, destFilename);
      if (!existsSync(destPath)) {
        missing++;
        continue;
      }

      const destContent = readFileSync(destPath, 'utf-8');
      const { data: fm, content: body } = matter(destContent);

      if (fm._srcHash === newHash) { skipped++; continue; }

      fm._srcHash = newHash;
      const newContent = matter.stringify(body, fm);

      if (!isDryRun) writeFileSync(destPath, newContent, 'utf-8');
      updated++;
      if (isDryRun && updated <= 10) console.log(`  [dry] ${lang}/${destFilename}`);
    }
  }
}

console.log(`\n🔄 migrate-src-hash${isDryRun ? ' (dry-run)' : ''}`);
console.log(`使用最新 contentHash：排除 heroImage / slug / update / pubDate / updatedDate / 純圖片行`);
console.log('');
migrateDir('src/content/blog', 'src/content', LANGS, false);
migrateDir('src/content/blocks', 'src/content/blocks', BLOCK_LANGS, true);
console.log(`✅ 更新：${updated}，已是新 hash 跳過：${skipped}，找不到翻譯版：${missing}\n`);
