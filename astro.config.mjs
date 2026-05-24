import { defineConfig } from 'astro/config';
import { remarkBlocks } from './src/remark-blocks.mjs';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// 讀取預先計算的 URL priority（由 fetch-hotel-data.mjs 產生）
let urlPriorities = {};
const PRIORITY_FILE = './src/data/sitemap-priorities.json';
if (existsSync(PRIORITY_FILE)) {
  try { urlPriorities = JSON.parse(readFileSync(PRIORITY_FILE, 'utf-8')); } catch {}
}

// 讀取地圖 lastmod（從 maps.ts 的 lastmod 欄位，以 JSON 快取）
const MAP_LASTMOD_FILE = './src/data/maps-lastmod.json';
let mapLastmod = {};
if (existsSync(MAP_LASTMOD_FILE)) {
  try { mapLastmod = JSON.parse(readFileSync(MAP_LASTMOD_FILE, 'utf-8')); } catch {}
}

// 從 blog content 取得 lastmod（優先 update，fallback pubDate）
function getBlogLastmod(slug) {
  const dirs = ['blog', 'en', 'zh-cn', 'zh-hk'];
  for (const dir of dirs) {
    const p = join(process.cwd(), 'src/content', dir, `${slug}.md`);
    if (existsSync(p)) {
      try {
        const { data } = matter(readFileSync(p, 'utf-8'));
        if (data.update) return data.update.replace(/\//g, '-');
        if (data.pubDate) return new Date(data.pubDate).toISOString().split('T')[0];
      } catch {}
      break;
    }
  }
  return undefined;
}

export default defineConfig({
  site: 'https://gobaligo.id',
  integrations: [
    mdx(),
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

        // lastmod：blog 讀 update/pubDate，地圖讀 maps-lastmod.json
        const blogLastmodMatch = path.match(/^(?:\/(en|zh-cn|zh-hk))?\/blog\/([^/]+)\/?$/);
        if (blogLastmodMatch) {
          const lastmod = getBlogLastmod(blogLastmodMatch[2]);
          if (lastmod) item.lastmod = lastmod;
        }
        const mapLastmodMatch = path.match(/^\/map\/([^/]+)\/?$/);
        if (mapLastmodMatch) {
          const lm = mapLastmod[mapLastmodMatch[1]];
          if (lm) item.lastmod = lm;
        }

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

        // hreflang for homepage (/ , /en/, /zh-cn/, /zh-hk/)
        const homepageMatch = path.match(/^(?:\/(en|zh-cn|zh-hk))?\/?$/);
        if (homepageMatch) {
          item.priority = 1.0;
          item.changefreq = 'daily';
          item.links = [
            { lang: 'x-default', url: 'https://gobaligo.id/' },
            { lang: 'zh-TW',     url: 'https://gobaligo.id/' },
            { lang: 'zh-HK',     url: 'https://gobaligo.id/zh-hk/' },
            { lang: 'zh-CN',     url: 'https://gobaligo.id/zh-cn/' },
            { lang: 'en',        url: 'https://gobaligo.id/en/' },
          ];
        }

        // hreflang for /tickets/ pages
        const ticketsMatch = path.match(/^(?:\/(en|zh-cn|zh-hk))?\/tickets\/?$/);
        if (ticketsMatch) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
          item.links = [
            { lang: 'x-default', url: 'https://gobaligo.id/tickets/' },
            { lang: 'zh-TW',     url: 'https://gobaligo.id/tickets/' },
            { lang: 'zh-HK',     url: 'https://gobaligo.id/zh-hk/tickets/' },
            { lang: 'zh-CN',     url: 'https://gobaligo.id/zh-cn/tickets/' },
            { lang: 'en',        url: 'https://gobaligo.id/en/tickets/' },
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
  adapter: cloudflare({ mode: 'advanced', platformProxy: { enabled: false } }),
  vite: {
    plugins: [
      {
        name: 'spa-links-save-api',
        configureServer(server) {
          server.middlewares.use('/api/save-spa-links', (req, res) => {
            if (req.method !== 'POST') { res.writeHead(405); res.end(); return; }
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                writeFileSync(
                  join(process.cwd(), 'src/data/spa-list.json'),
                  JSON.stringify(data, null, 2),
                  'utf-8'
                );
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
              } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: false, error: String(e) }));
              }
            });
          });
        }
      }
    ],
    server: {
      proxy: {
        '/api/kml': {
          target: 'https://www.google.com',
          changeOrigin: true,
          rewrite: (path) => {
            const u = new URL(path, 'http://localhost');
            return `/maps/d/kml?mid=${u.searchParams.get('mid')}&forcekml=1`;
          },
        },
      },
    },
  },
});
