// 英文版部落格首頁（/en/blog/）的文章清單：頁面本身與 /en/blog/posts.json 共用同一份邏輯，
// 確保靜態輸出的第一頁、分頁總數與前端篩選用的 JSON 永遠一致。
import { getCollection } from 'astro:content';

function extractFirstImage(body: string): string {
  const m = body?.match(/!\[.*?\]\((https?:\/\/[^)\s]+)\)/);
  return m ? m[1] : '';
}

export function getPublishTime(p: any): Date {
  const d = new Date(p.data.pubDate);
  if (p.data.pubHour != null) {
    d.setTime(d.getTime() + (p.data.pubHour - 8) * 3600 * 1000);
  }
  return d;
}

export const getCategories = (cat: any): string[] => {
  if (!cat) return [];
  if (Array.isArray(cat)) return cat;
  if (typeof cat === 'string') return [cat];
  return [];
};

export type EnPostData = {
  id: string;
  slug: string;
  hasEnTranslation: boolean;
  title: string;
  description: string;
  heroImage: string;
  category: string[];
};

export async function getEnBlogPosts(now = new Date()) {
  const langPosts = await getCollection('en');
  const langMap = new Map(langPosts.map(p => [p.data.slug || p.id, p]));
  const isPublished = (p: any) => p.data.pubDate && !p.data.private && getPublishTime(p) <= now;

  const allPosts = (await getCollection('blog'))
    .filter(isPublished)
    .map(p => {
      const t = langMap.get(p.data.slug || p.id);
      return {
        ...p,
        data: {
          ...p.data,
          title: t?.data.title ?? p.data.title,
          description: t?.data.description ?? p.data.description,
          pubDate: new Date(p.data.pubDate),
          heroImage: p.data.heroImage || extractFirstImage(p.body ?? ''),
        },
      };
    })
    .sort((a, b) => getPublishTime(b).valueOf() - getPublishTime(a).valueOf());

  const allPostsData: EnPostData[] = allPosts.map(p => ({
    id: p.id,
    slug: p.data.slug || p.id,
    hasEnTranslation: langMap.has(p.id),
    title: p.data.title,
    description: p.data.description || '',
    heroImage: p.data.heroImage || '',
    category: getCategories(p.data.category),
  }));

  return { allPosts, allPostsData };
}
