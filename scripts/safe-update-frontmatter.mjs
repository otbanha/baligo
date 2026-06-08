#!/usr/bin/env node
/**
 * safe-update-frontmatter.mjs
 *
 * 在你修改 /blog 來源檔案的 frontmatter 或 body（不需要重新翻譯時）之後，
 * 跑這個工具會把對應 /en、/zh-cn、/zh-hk 的 _srcHash 重新計算，
 * 避免下次自動翻譯任務白白把這些檔案重翻一次。
 *
 * 使用情境：
 *   - 修改一批文章 frontmatter 的 tags / category / description（但不想翻譯版被改）
 *   - 加入/修改 body 內容（例如新增聯盟連結、修正錯字、補圖片）
 *   - 任何「不希望觸發重翻」的編輯
 *
 * 用法：
 *   node scripts/safe-update-frontmatter.mjs              # 對 /blog 所有檔案執行
 *   node scripts/safe-update-frontmatter.mjs --file=FNAME # 只處理指定檔案
 *   node scripts/safe-update-frontmatter.mjs --dry-run    # 只列出會修改的檔案
 *
 * 注意：
 *   - 不會修改翻譯版的內文，只更新 _srcHash 元資料
 *   - 如果你想讓翻譯版「文字也一起同步」，必須 (a) 手動修改翻譯版內容
 *     或 (b) 不要跑這個工具，讓自動翻譯任務去做（會花 API 錢）
 *   - 跟 migrate-src-hash.mjs 行為一致，但更彈性（可指定單一檔案）
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const isDryRun = process.argv.includes('--dry-run');
const fileArg = process.argv.find(a => a.startsWith('--file='));
const targetFile = fileArg ? fileArg.split('=')[1] : null;

const LANGS = ['zh-cn', 'zh-hk', 'en'];
const BLOG_DIR = 'src/content/blog';

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

function getDestFilename(srcContent, srcFilename) {
  const { data: srcFm } = matter(srcContent);
  if (srcFm.slug && String(srcFm.slug).trim()) {
    const ext = srcFilename.endsWith('.mdx') ? '.mdx' : '.md';
    return String(srcFm.slug).trim() + ext;
  }
  return srcFilename;
}

let processed = 0, updated = 0, skipped = 0, missing = 0;

function processFile(filename) {
  const srcPath = join(BLOG_DIR, filename);
  if (!existsSync(srcPath)) {
    console.log(`⚠️  找不到 ${srcPath}`);
    return;
  }
  const srcContent = readFileSync(srcPath, 'utf-8');
  const newHash = contentHash(srcContent);
  const destFilename = getDestFilename(srcContent, filename);
  processed++;

  for (const lang of LANGS) {
    const destPath = join('src/content', lang, destFilename);
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
    if (isDryRun) console.log(`  [dry] ${lang}/${destFilename}`);
  }
}

console.log(`\n🔒 safe-update-frontmatter${isDryRun ? ' (dry-run)' : ''}`);

if (targetFile) {
  console.log(`目標：${targetFile}`);
  processFile(targetFile);
} else {
  console.log(`目標：/blog 全部檔案`);
  const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  for (const f of files) processFile(f);
}

console.log(`\n✅ 處理 ${processed} 個來源檔案`);
console.log(`   更新 _srcHash: ${updated} 個翻譯版`);
console.log(`   已是最新 hash: ${skipped} 個`);
console.log(`   找不到翻譯版: ${missing} 個\n`);
