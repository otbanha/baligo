import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.array(z.string()).optional(),
    originalUrl: z.string().optional(),
  }),
});

const blocks = defineCollection({
  loader: glob({ base: './src/content/blocks', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
  }),
});

const promotions = defineCollection({
  loader: glob({ base: './src/content/promotions', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    url: z.string(),
    coverImage: z.string().optional(),
    note: z.string().optional(),
    expiresAt: z.coerce.date().optional().nullable(),
  }),
});

const translatedSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date().optional(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).optional(),
  originalUrl: z.string().optional(),
  lang: z.string().optional(),
});

const zhcn = defineCollection({
  loader: glob({ base: './src/content/zh-cn', pattern: '**/*.md' }),
  schema: translatedSchema,
});

const zhhk = defineCollection({
  loader: glob({ base: './src/content/zh-hk', pattern: '**/*.md' }),
  schema: translatedSchema,
});

const en = defineCollection({
  loader: glob({ base: './src/content/en', pattern: '**/*.md' }),
  schema: translatedSchema,
});

export const collections = {
  blog, blocks, promotions,
  'zh-cn': zhcn,
  'zh-hk': zhhk,
  'en': en,
};