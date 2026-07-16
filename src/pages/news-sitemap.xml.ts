import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = true;

function getPublishTime(p: any): Date {
  const d = new Date(p.data.pubDate);
  if (p.data.pubHour != null) {
    d.setTime(d.getTime() + (p.data.pubHour - 8) * 3600 * 1000);
  }
  return d;
}

function getCategories(c: any): string[] {
  return Array.isArray(c) ? c : (c ? [c] : []);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 48 * 3600 * 1000);

  const allPosts = await getCollection('blog');
  const recentNews = allPosts
    .filter(p => {
      const pubTime = getPublishTime(p);
      return (
        p.data.pubDate &&
        !p.data.private &&
        pubTime <= now &&
        pubTime >= cutoff &&
        getCategories(p.data.category).includes('新聞存檔')
      );
    })
    .sort((a, b) => getPublishTime(b).valueOf() - getPublishTime(a).valueOf());

  const urls = recentNews.map(p => {
    const slug = p.data.slug || p.id;
    const loc = `https://gobaligo.id/blog/${slug}/`;
    const pubDate = getPublishTime(p).toISOString();
    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>Go Bali Go 峇里島旅遊攻略</news:name>
        <news:language>zh-tw</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${escapeXml(p.data.title)}</news:title>
    </news:news>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
