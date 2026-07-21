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
    update: z.string().optional(),
    heroImage: z.string().optional(),
    category: z.array(z.string()).optional(),
    tags: z.any().optional(),
    originalUrl: z.string().optional(),
    // 峇里島新聞（category 含「新聞存檔」時使用）
    newsCategory: z.enum(['政策', '交通', '天氣', '景點', '簽證', '治安', '活動']).optional(),
    source: z.string().optional(),
    sourceUrl: z.string().optional(),
    imageAlt: z.string().optional(),
    embeds: z.array(z.object({
      position: z.string(),
      platform: z.enum(['youtube', 'instagram', 'tiktok']),
      url: z.string(),
    })).optional(),
    private: z.boolean().optional(),
    shuffle_h2: z.boolean().optional(),
    agoda_hotel_id: z.number().optional(),
    agoda_hotel_name: z.string().optional(),
    agoda_star_rating: z.number().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    isDriverGuide: z.boolean().optional(),
    line_qr_guide: z.boolean().optional(),
    drivers: z.array(z.object({
      name: z.string(),
      category: z.string(),
      languages: z.array(z.string()),
      specialty: z.string(),
      contact: z.string(),
      facebookRefs: z.number(),
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
  update: z.string().optional(),
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
  agoda_hotel_id: z.number().optional(),
  agoda_hotel_name: z.string().optional(),
  agoda_star_rating: z.number().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isDriverGuide: z.boolean().optional(),
  drivers: z.array(z.object({
    name: z.string(),
    category: z.string(),
    languages: z.array(z.string()),
    specialty: z.string(),
    contact: z.string(),
    facebookRefs: z.number(),
  })).optional(),
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
  loader: glob({ pattern: ['**/*.md', '**/*.mdx'], base: './src/content/zh-cn' }),
  schema: translatedSchema,
});
const zhhk = defineCollection({
  loader: glob({ pattern: ['**/*.md', '**/*.mdx'], base: './src/content/zh-hk' }),
  schema: translatedSchema,
});
const en = defineCollection({
  loader: glob({ pattern: ['**/*.md', '**/*.mdx'], base: './src/content/en' }),
  schema: translatedSchema,
});
const id = defineCollection({
  loader: glob({ pattern: ['**/*.md', '**/*.mdx'], base: './src/content/id' }),
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
  'id': id,
};