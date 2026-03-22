import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),
    category: z.union([z.string(), z.array(z.string())]).optional(),
    tags: z.array(z.string()).optional(),
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
    expiresAt: z.preprocess(val => (val === '' || val === null) ? undefined : val, z.coerce.date().optional()),
  }),
});

export const collections = { blog, blocks, promotions };