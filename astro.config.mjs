import { defineConfig } from 'astro/config';
import { remarkBlocks } from './src/remark-blocks.mjs';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://你的網域.com',

  markdown: {
    remarkPlugins: [() => remarkBlocks()],

  },

  build: {
    format: 'directory'
  },

  output: 'static',
  adapter: cloudflare(),
});