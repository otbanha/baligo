import { defineCollection, z } from 'astro:content';

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

export const collections = { blog, blocks, promotions };