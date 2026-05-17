import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog');
  const now = new Date();

  const hotelPosts = posts.filter(p => {
    if (!p.data.pubDate || p.data.private) return false;
    const pubTime = new Date(p.data.pubDate);
    if (pubTime > now) return false;
    const cats = Array.isArray(p.data.category) ? p.data.category : [p.data.category];
    return cats.includes('住宿推薦');
  });

  const urls = hotelPosts.map(p => {
    const slug = p.data.slug || p.id;
    const lastmod = (p.data.updatedDate || p.data.pubDate)
      ? new Date(p.data.updatedDate || p.data.pubDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    return `  <url>
    <loc>https://gobaligo.id/blog/${slug}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`;
  }).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
