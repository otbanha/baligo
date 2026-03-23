import { defineConfig } from 'astro/config';
import { remarkBlocks } from './src/remark-blocks.mjs';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://gobaligo.id',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [[remarkBlocks, {}]],
  },
  build: {
    format: 'directory'
  },
  output: 'static',
  i18n: {
    defaultLocale: 'zh-tw',
    locales: ['zh-tw', 'zh-cn', 'zh-hk', 'en'],
    routing: { prefixDefaultLocale: false },
  },
});
