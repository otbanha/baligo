#!/usr/bin/env node
/**
 * reset-collapsed-translations.mjs
 *
 * 找出被「整段清單塞給模型翻譯」的舊 bug 吃掉（或憑空多出）清單項目的翻譯檔，
 * 把它們的 _srcHash 清掉，好讓 translate.mjs 下次執行時整份從繁中來源重新產生。
 *
 * translate.mjs 的翻譯檔是每次從來源整份重建、不是就地修補，
 * 所以只要清掉 _srcHash 就能救回內容，不需要從 git 還原舊版。
 *
 * 用法：
 *   node scripts/reset-collapsed-translations.mjs            # 只列出（dry run）
 *   node scripts/reset-collapsed-translations.mjs --write    # 實際清除 _srcHash
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const WRITE = process.argv.includes('--write');
const LANGS = ['zh-cn', 'zh-hk', 'en', 'id'];

// 判定門檻：翻譯版少掉一半以上項目 = 內容被吃掉；多出 2 項以上 = 模型自己長出來的
const LOSS_RATIO = 0.5;
const EXTRA_TOLERANCE = 1;

const bodyOf = (txt) => {
  const m = txt.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  return m ? m[1] : txt;
};
const countItems = (txt) => (bodyOf(txt).match(/^\s*[-*]\s+\S/gm) || []).length;

function destName(txt, filename) {
  const m = txt.match(/^slug:\s*(.+)$/m);
  if (m) {
    const slug = m[1].trim().replace(/^['"]|['"]$/g, '');
    if (slug) return slug + (filename.endsWith('.mdx') ? '.mdx' : '.md');
  }
  return filename;
}

function scan(srcDir, destDirOf) {
  const hits = [];
  for (const f of readdirSync(srcDir).filter(x => /\.mdx?$/.test(x))) {
    const txt = readFileSync(join(srcDir, f), 'utf-8');
    const n = countItems(txt);
    if (n < 3) continue; // 清單太短，差異不足以判定
    const dn = destName(txt, f);
    for (const lang of LANGS) {
      const p = join(destDirOf(lang), dn);
      if (!existsSync(p)) continue;
      const m = countItems(readFileSync(p, 'utf-8'));
      if (m < n * LOSS_RATIO) hits.push({ path: p, lang, src: n, dest: m, kind: '吃掉' });
      else if (m > n + EXTRA_TOLERANCE) hits.push({ path: p, lang, src: n, dest: m, kind: '多出' });
    }
  }
  return hits;
}

const hits = [
  ...scan('src/content/blocks', (l) => `src/content/blocks/${l}`),
  ...scan('src/content/blog', (l) => `src/content/${l}`),
];

for (const h of hits) {
  console.log(`  [${h.kind}] ${h.path}  ${h.src} → ${h.dest}`);
  if (!WRITE) continue;
  const txt = readFileSync(h.path, 'utf-8');
  const out = txt.replace(/^_srcHash:.*\r?\n/m, '').replace(/^_translateAttempts:.*\r?\n/m, '')
                 .replace(/^_translateIncomplete:.*\r?\n/m, '');
  if (out !== txt) writeFileSync(h.path, out, 'utf-8');
}

console.log(`\n${WRITE ? '已清除' : '待清除'} ${hits.length} 個翻譯檔的 _srcHash（下次 translate.mjs 會整份重譯）`);
if (!WRITE) console.log('加上 --write 才會實際寫入');
