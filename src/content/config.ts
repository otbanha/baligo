import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.union([z.array(z.string()), z.string().transform(s => s ? [s] : [])]).optional(),
    tags: z.union([z.array(z.string()), z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : [])]).optional(),
    originalUrl: z.string().optional(),
    embeds: z.array(z.object({
      position: z.string(),
      platform: z.enum(['youtube', 'instagram', 'tiktok']),
      url: z.string(),
    })).optional(),
  }),
});

const blocks = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.string().optional(),
    randomCount: z.number().optional(),
  }),
});

const promotions = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    url: z.string(),
    coverImage: z.string().optional(),
    note: z.string().optional(),
    expiresAt: z.coerce.date().optional(),
  }),
});

const translatedSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date().optional(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  category: z.union([z.array(z.string()), z.string().transform(s => s ? [s] : [])]).optional(),
  tags: z.union([z.array(z.string()), z.string().transform(s => s ? s.split(',').map(t => t.trim()).filter(Boolean) : [])]).optional(),
  originalUrl: z.string().optional(),
  lang: z.string().optional(),
  embeds: z.array(z.object({
    position: z.string(),
    platform: z.enum(['youtube', 'instagram', 'tiktok']),
    url: z.string(),
  })).optional(),
});

// 翻譯文章集合 — 使用 glob loader 支援連字號目錄名稱
const zhcn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/zh-cn' }),
  schema: translatedSchema,
});
const zhhk = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/zh-hk' }),
  schema: translatedSchema,
});
const en = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/en' }),
  schema: translatedSchema,
});

export const collections = {
  blog, blocks, promotions,
  'zh-cn': zhcn,
  'zh-hk': zhhk,
  'en': en,
};