// 首頁輪播燈箱的選文邏輯（繁中／港繁／簡中首頁共用）
// 「最新上線」與「最新更新」各取 perGroup 篇，交錯排列，兩組不重複，皆排除新聞存檔。
import type { CarouselPost } from '../components/LatestPostsCarousel.astro';

const NEWS_CATEGORIES = ['新聞存檔', '新闻存档'];

// 不放進「最新更新」的文章（填 slug 或檔名）：經常小幅修改、不適合當作更新曝光的頁面。
// 仍可出現在「最新上線」。
const EXCLUDE_FROM_UPDATED = [
  'bali-drivers-recommendations-2',
  'bali-private-car-drivers-guide',
];

interface PostLike {
  id: string;
  body?: string;
  data: {
    slug?: string;
    title: string;
    heroImage?: string;
    category?: string | string[];
    pubDate: Date;
    updatedDate?: Date;
  };
}

const toCategories = (cat: unknown): string[] =>
  Array.isArray(cat) ? cat : typeof cat === 'string' ? [cat] : [];

// pubDate 與 updatedDate 都存成 UTC 午夜，取 ISO 日期即為峇里島當地日期
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * @param posts 已過濾未發布／私密文章、且依上線時間由新到舊排序的文章
 */
export function pickCarouselPosts(
  posts: PostLike[],
  { perGroup = 5, mapCategory = (c: string) => c } = {},
): CarouselPost[] {
  const eligible = posts.filter(p =>
    p.data.heroImage && !toCategories(p.data.category).some(c => NEWS_CATEGORIES.includes(c)),
  );

  const toSlide = (p: PostLike, status: 'new' | 'updated', date: Date): CarouselPost => ({
    slug: p.data.slug || p.id,
    title: p.data.title,
    heroImage: p.data.heroImage!,
    category: mapCategory(toCategories(p.data.category)[0] || ''),
    date: isoDay(date),
    status,
  });

  const newest = eligible.slice(0, perGroup);
  const newestIds = new Set(newest.map(p => p.id));

  // 上線當天的修改不算「更新」；同一天更新的文章依上線時間排（sort 為穩定排序）
  const updated = eligible
    .filter(p => !newestIds.has(p.id) && p.data.updatedDate && isoDay(p.data.updatedDate) > isoDay(p.data.pubDate))
    .filter(p => !EXCLUDE_FROM_UPDATED.includes(p.data.slug || p.id) && !EXCLUDE_FROM_UPDATED.includes(p.id))
    .sort((a, b) => b.data.updatedDate!.valueOf() - a.data.updatedDate!.valueOf())
    .slice(0, perGroup);

  const slides: CarouselPost[] = [];
  for (let i = 0; i < Math.max(newest.length, updated.length); i++) {
    if (newest[i]) slides.push(toSlide(newest[i], 'new', newest[i].data.pubDate));
    if (updated[i]) slides.push(toSlide(updated[i], 'updated', updated[i].data.updatedDate!));
  }
  return slides;
}
