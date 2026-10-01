#!/usr/bin/env node
/**
 * generate-zh-cn-sitemap.mjs
 *
 * astro build 之後執行：從 @astrojs/sitemap 產生的 dist/sitemap-*.xml 挑出 /zh-cn/
 * 網址，另存成 dist/sitemap-zh-cn.xml。
 *
 * 給百度／360／搜狗站長平台提交用：它們只該收簡中頁，而且對含 xhtml:link（hreflang）
 * 的大型 sitemap 支援不佳，單獨一份純 <url> 清單最穩。百度單檔上限 5 萬筆，這裡遠低於此。
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const OUT = join(DIST, 'sitemap-zh-cn.xml');

if (!existsSync(DIST)) {
  console.log('ℹ️  找不到 dist，略過簡中 sitemap。');
  process.exit(0);
}

const entries = [];
for (const name of readdirSync(DIST).filter((n) => /^sitemap-\d+\.xml$/.test(n)).sort()) {
  const xml = readFileSync(join(DIST, name), 'utf-8');
  for (const [, block] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    if (!loc || !loc.startsWith('https://gobaligo.id/zh-cn/')) continue;
    const pick = (tag) => block.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1];
    entries.push({ loc, lastmod: pick('lastmod'), changefreq: pick('changefreq'), priority: pick('priority') });
  }
}

const body = entries
  .map(({ loc, lastmod, changefreq, priority }) =>
    [
      '<url>',
      `<loc>${loc}</loc>`,
      lastmod && `<lastmod>${lastmod}</lastmod>`,
      changefreq && `<changefreq>${changefreq}</changefreq>`,
      priority && `<priority>${priority}</priority>`,
      '</url>',
    ].filter(Boolean).join(''),
  )
  .join('\n');

writeFileSync(
  OUT,
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
);
console.log(`✅ 簡中 sitemap：${entries.length} 筆 → dist/sitemap-zh-cn.xml`);
