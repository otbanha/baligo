import { defineConfig } from 'astro/config';
import { remarkBlocks } from './src/remark-blocks.mjs';

export default defineConfig({
  site: 'https://你的網域.com',
  markdown: {
    remarkPlugins: [remarkBlocks],
  },
  build: {
    format: 'directory'
  }
});