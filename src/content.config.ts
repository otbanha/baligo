import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    pubHour: z.number().optional().catch(undefined),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.any().optional(),
    originalUrl: z.string().optional(),
    embeds: z.array(z.object({
      position: z.string(),
      platform: z.enum(['youtube', 'instagram', 'tiktok']),
      url: z.string(),
    })).optional(),
    private: z.boolean().optional(),
    shuffle_h2: z.boolean().optional(),
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
    title_en: z.string().optional(),
    title_zh_cn: z.string().optional(),
    title_zh_hk: z.string().optional(),
    url: z.string(),
    coverImage: z.string().optional(),
    note: z.string().optional(),
    expiresAt: z.preprocess(
      v => (v === '' || v == null) ? undefined : v,
      z.coerce.date().optional()
    ),
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
  loader: glob({ base: './src/content/zh-cn', pattern: '**/*.{md,mdx}' }),
  schema: translatedSchema,
});

const zhhk = defineCollection({
  loader: glob({ base: './src/content/zh-hk', pattern: '**/*.{md,mdx}' }),
  schema: translatedSchema,
});

const en = defineCollection({
  loader: glob({ base: './src/content/en', pattern: '**/*.{md,mdx}' }),
  schema: translatedSchema,
});

const qa = defineCollection({
  loader: glob({ base: './src/content/qa', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    category: z.string(),
    relatedSlug: z.string().optional(),
    relatedLabel: z.string().optional(),
    relatedLinks: z.array(z.object({
      slug: z.string(),
      label: z.string(),
    })).optional(),
    featured: z.boolean().optional(),
    order: z.number().optional(),
    pubDate: z.coerce.date().optional(),
  }),
});

const tickets = defineCollection({
  loader: glob({ base: './src/content/tickets', pattern: '**/*.md' }),
  schema: z.object({
    name: z.string(),
    cat: z.enum(['temple', 'nature', 'island', 'park', 'activity', 'adventure', 'course', 'watersports', 'leisure']),
    idr: z.number(),
    note: z.string(),
    note_en: z.string().optional(),
    note_zh_cn: z.string().optional(),
    klook: z.string().nullable().optional(),
    agoda: z.boolean().optional(),
    tripcom: z.string().nullable().optional(),
    warn: z.string().nullable().optional(),
  }),
});

export const collections = {
  blog, blocks, promotions, qa, tickets,
  'zh-cn': zhcn,
  'zh-hk': zhhk,
  'en': en,
};