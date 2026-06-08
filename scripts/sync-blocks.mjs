#!/usr/bin/env node
/**
 * sync-blocks.mjs
 *
 * 同步預設繁中 blocks 到 en / zh-cn 翻譯版本：
 *  - 新增了的連結項目 → 加到翻譯版（附上 ⚠️ 標記，提醒需翻譯）
 *  - 刪除了的連結項目 → 從翻譯版移除
 *  - 更新 type / randomCount → 同步到翻譯版
 *  - 已翻譯的文字 → 保持不動
 *
 * 用法：
 *   node scripts/sync-blocks.mjs              # 同步所有 blocks
 *   node scripts/sync-blocks.mjs klook 攻略   # 只同步指定 blocks
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_DIR = join(__dirname, '../src/content/blocks');
const LANGS = ['en', 'zh-cn'];

// 指定 block slugs（來自命令列參數），空陣列 = 全部
const targetSlugs = process.argv.slice(2);

// ── 解析 markdown 連結清單 ──────────────────────────────────────
function parseItems(content) {
  return content.split('\n')
    .filter(line => line.trim().startsWith('- '))
    .map(line => {
      const raw = line.trim().slice(2).trim();
      // 找到 item 中第一個 markdown 連結（可能有 emoji 前綴，如 🏄‍♂️ [text](url)）
      const match = raw.match(/\[(.+?)\]\((.+?)\)/);
      return match
        ? { raw, url: match[2] }   // 保存原始完整文字 + 提取 URL 作為 key
        : { raw, url: null };
    });
}

function parseHeading(content) {
  return content.split('\n')
    .filter(line => !line.trim().startsWith('- '))
    .join('\n')
    .trim();
}

function buildContent(heading, items) {
  const listLines = items.map(item => `- ${item.raw}`);
  return (heading ? heading + '\n\n' : '') + listLines.join('\n') + '\n';
}

// ── 核心同步邏輯 ───────────────────────────────────────────────
function syncBlock(slug, lang) {
  const defaultPath = join(BASE_DIR, slug + '.md');
  const langDir = join(BASE_DIR, lang);
  const langPath = join(langDir, slug + '.md');

  if (!existsSync(defaultPath)) return;
  if (!existsSync(langPath)) {
    console.log(`  [SKIP] ${lang}/${slug}.md 不存在（尚未建立翻譯版）`);
    return;
  }

  const defaultFile = matter(readFileSync(defaultPath, 'utf-8'));
  const langFile = matter(readFileSync(langPath, 'utf-8'));

  const defaultItems = parseItems(defaultFile.content);
  const langItems = parseItems(langFile.content);

  // 正規化 URL：去除語言前綴，方便跨語言比對
  // /en/blog/xxx/ → /blog/xxx/  /zh-cn/blog/xxx/ → /blog/xxx/
  // Klook 外部連結：去除 zh-TW/en/zh-CN 差異，取 query 參數或末段路徑作為 key
  const normalizeUrl = url => {
    if (!url) return url;
    // 內部連結去語言前綴
    const noLang = url.replace(/^\/(en|zh-cn|zh-hk)\/blog\//, '/blog/');
    if (noLang !== url) return noLang;
    // Klook affiliate 連結：取 k_site 的 query 參數或最後路徑段
    const klookMatch = url.match(/[?&]k_site=([^&]+)/);
    if (klookMatch) {
      const decoded = decodeURIComponent(klookMatch[1]);
      const qMatch = decoded.match(/[?&]query=([^&]+)/);
      if (qMatch) return 'klook:' + decodeURIComponent(qMatch[1]);
      const pathMatch = decoded.match(/\/([^/]+)\/?$/);
      if (pathMatch) return 'klook:path:' + pathMatch[1];
    }
    return url;
  };

  // 用正規化 URL 作為唯一 key 來比對（無 URL 的純文字項目用 raw 比對）
  const key = item => (item.url ? normalizeUrl(item.url) : item.raw);
  const langMap = new Map(langItems.map(i => [key(i), i]));
  const defaultKeys = new Set(defaultItems.map(key));

  let changed = false;
  const newItems = [];

  // 按預設順序排列，保留已翻譯文字，插入新項目
  for (const defItem of defaultItems) {
    const k = key(defItem);
    if (langMap.has(k)) {
      newItems.push(langMap.get(k)); // 保留翻譯版文字
    } else {
      // 新項目：加上 ⚠️ 提醒需翻譯
      newItems.push({ raw: `⚠️ ${defItem.raw}`, url: defItem.url });
      console.log(`  [ADD]  ${lang}/${slug}.md ← 新增項目（需翻譯）: ${defItem.raw.slice(0, 60)}`);
      changed = true;
    }
  }

  // 檢查是否有被刪除的項目
  for (const [k, item] of langMap) {
    if (!defaultKeys.has(k)) {
      console.log(`  [DEL]  ${lang}/${slug}.md ← 移除項目: ${item.raw.slice(0, 60)}`);
      changed = true;
      // 不加入 newItems（即刪除）
    }
  }

  // 同步 metadata
  const newData = { ...langFile.data };
  let metaChanged = false;
  for (const field of ['type', 'randomCount']) {
    if (defaultFile.data[field] !== undefined && langFile.data[field] !== defaultFile.data[field]) {
      console.log(`  [META] ${lang}/${slug}.md: ${field} ${langFile.data[field]} → ${defaultFile.data[field]}`);
      newData[field] = defaultFile.data[field];
      metaChanged = true;
    }
  }

  if (!changed && !metaChanged) {
    console.log(`  [OK]   ${lang}/${slug}.md 已是最新`);
    return;
  }

  // 重新組合內容
  const heading = parseHeading(langFile.content);
  const newContent = buildContent(heading, newItems);
  const output = matter.stringify(newContent, newData);
  writeFileSync(langPath, output, 'utf-8');
  console.log(`  [SAVE] ${lang}/${slug}.md 已更新`);
}

// ── 主流程 ──────────────────────────────────────────────────────
const allFiles = readdirSync(BASE_DIR)
  .filter(f => f.endsWith('.md'))
  .map(f => f.replace('.md', ''));

const slugs = targetSlugs.length > 0 ? targetSlugs : allFiles;

console.log(`\n🔄 sync-blocks 開始 (langs: ${LANGS.join(', ')})\n`);

for (const slug of slugs) {
  if (!existsSync(join(BASE_DIR, slug + '.md'))) {
    console.log(`⚠️  找不到預設 block: ${slug}.md`);
    continue;
  }
  console.log(`\n📦 ${slug}`);
  for (const lang of LANGS) {
    syncBlock(slug, lang);
  }
}

console.log('\n✅ 完成\n');
console.log('提醒：標記 ⚠️ 的項目表示新增的連結，請翻譯後移除 ⚠️ 符號。\n');
