import { getCollection } from 'astro:content';
import rss from '@astrojs/rss';

function getPublishTime(p) {
  const d = new Date(p.data.pubDate);
  if (p.data.pubHour != null) {
    d.setTime(d.getTime() + (p.data.pubHour - 8) * 3600 * 1000);
  }
  return d;
}

function getCategories(c) {
  return Array.isArray(c) ? c : (c ? [c] : []);
}

export async function GET(context) {
  const now = new Date();
  const allPosts = await getCollection('blog');
  const newsPosts = allPosts
    .filter(p => p.data.pubDate && !p.data.private && getPublishTime(p) <= now)
    .filter(p => getCategories(p.data.category).includes('新聞存檔'))
    .sort((a, b) => getPublishTime(b).valueOf() - getPublishTime(a).valueOf());

  return rss({
    title: '峇里島新聞 - Go Bali Go',
    description: '每日整理峇里島最新消息：入境規定、天氣火山示警、交通異動、治安提醒與活動資訊，長住峇里島的台灣人「小傑」親自彙編。',
    site: context.site,
    items: newsPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: getPublishTime(post),
      link: `/blog/${post.data.slug || post.id}/`,
    })),
  });
}
