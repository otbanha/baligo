import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    pubHour: z.number().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.array(z.string()).optional(),
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
    title_en: z.string().optional(),
    title_zh_cn: z.string().optional(),
    title_zh_hk: z.string().optional(),
    url: z.string(),
    coverImage: z.string().optional(),
    note: z.string().optional(),
    expiresAt: z.union([z.date(), z.string(), z.null(), z.undefined()]).optional()
      .transform(v => {
        if (v == null || v === '') return undefined;
        if (v instanceof Date) return isNaN(v.getTime()) ? undefined : v;
        const d = new Date(v as string);
        return isNaN(d.getTime()) ? undefined : d;
      }),
  }),
});

const translatedSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  pubDate: z.coerce.date().optional(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
  category: z.array(z.string()).optional(),
  tags: z.any().optional(),
  originalUrl: z.string().optional(),
  lang: z.string().optional(),
  embeds: z.array(z.object({
    position: z.string(),
    platform: z.enum(['youtube', 'instagram', 'tiktok']),
    url: z.string(),
  })).optional(),
  private: z.boolean().optional(),
  shuffle_h2: z.boolean().optional(),
});

const qa = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    title_en: z.string().optional(),
    title_zh_cn: z.string().optional(),
    title_zh_hk: z.string().optional(),
    category: z.string().optional(),
    relatedLinks: z.array(z.object({ slug: z.string(), label: z.string() })).optional(),
    featured: z.boolean().optional(),
    pubDate: z.coerce.date().optional(),
  }),
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

const tickets = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tickets' }),
  schema: z.object({
    name: z.string(),
    cat: z.enum(['temple', 'nature', 'island', 'park', 'activity', 'adventure']),
    idr: z.number(),
    note: z.string(),
    klook: z.string().nullable().optional(),
    agoda: z.boolean().optional(),
    tripcom: z.string().nullable().optional(),
    warn: z.string().nullable().optional(),
    order: z.number().optional(),
  }),
});

export const collections = {
  blog, blocks, promotions, qa, tickets,
  'zh-cn': zhcn,
  'zh-hk': zhhk,
  'en': en,
};