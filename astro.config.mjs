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
      serialize(item) {
        const path = new URL(item.url).pathname;
        item.priority = urlPriorities[path] ?? 0.7;
        item.changefreq = item.priority >= 1.0 ? 'weekly' : 'monthly';
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
