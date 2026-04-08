import { defineConfig } from 'astro/config';
import { remarkBlocks } from './src/remark-blocks.mjs';
import sitemap from '@astrojs/sitemap';
import { readFileSync, existsSync } from 'fs';

// 讀取預先計算的 URL priority（由 fetch-hotel-data.mjs 產生）
let urlPriorities = {};
const PRIORITY_FILE = './src/data/sitemap-priorities.json';
if (existsSync(PRIORITY_FILE)) {
  try { urlPriorities = JSON.parse(readFileSync(PRIORITY_FILE, 'utf-8')); } catch {}
}

export default defineConfig({
  site: 'https://gobaligo.id',
  integrations: [
    sitemap({
      // 排除不需要 Google 收錄的頁面
      filter(page) {
        return (
          !page.includes('/admin/') &&
          !page.includes('/go/') &&
          !page.includes('/bookmarks') &&
          !page.includes('/index-all')
        );
      },
      serialize(item) {
        const path = new URL(item.url).pathname;
        item.priority = urlPriorities[path] ?? 0.7;
        item.changefreq = item.priority >= 1.0 ? 'weekly' : 'monthly';

        // 加入 hreflang 互連，幫助 Google 理解多語言版本關係
        // 比對 /blog/SLUG/ 或 /en/blog/SLUG/ 等格式
        const articleMatch = path.match(/^(?:\/(en|zh-cn|zh-hk))?\/blog\/([^/]+)\/?$/);
        if (articleMatch) {
          const slug = articleMatch[2];
          item.links = [
            { lang: 'x-default', url: `https://gobaligo.id/blog/${slug}/` },
            { lang: 'zh-TW',     url: `https://gobaligo.id/blog/${slug}/` },
            { lang: 'zh-HK',     url: `https://gobaligo.id/zh-hk/blog/${slug}/` },
            { lang: 'zh-CN',     url: `https://gobaligo.id/zh-cn/blog/${slug}/` },
            { lang: 'en',        url: `https://gobaligo.id/en/blog/${slug}/` },
          ];
        }

        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [[remarkBlocks, {}]],
  },
  build: {
    format: 'directory'
  },
  output: 'static',
});
