// Dynamic short link redirect handler
// Returns OG-tagged HTML page (meta refresh) so social platforms get proper titles.
import staticLinks from '../../src/data/shortlinks.json';

const staticMap = Object.fromEntries(staticLinks.map(l => [l.id, l]));

const SITE_TITLE = 'Go Bali Go 峇里島旅遊攻略';
const SITE_DESCRIPTION = '峇里島旅遊最完整的中文攻略網站。簽證、交通、住宿、美食、景點、行程規劃，610+ 篇深度文章。';
const SITE_OG_IMAGE = 'https://gobaligo.id/og-2026.jpg';
const SITE_BASE = 'https://gobaligo.id';

function buildHtml(destUrl, selfUrl, title, description, ogImage) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=${esc(destUrl)}" />
  <link rel="canonical" href="${esc(selfUrl)}" />
  <title>${esc(title)}</title>
  <meta property="og:url" content="${esc(selfUrl)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${esc(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:alt" content="${esc(title)}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE_TITLE)}" />
  <meta property="og:locale" content="zh_TW" />
  <meta property="fb:app_id" content="1994862997907037" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
  <script>window.location.replace(${JSON.stringify(destUrl)});<\/script>
</head>
<body>
  <p>正在跳轉… <a href="${esc(destUrl)}">點此前往</a></p>
</body>
</html>`;
}

export async function onRequest({ params, env, request }) {
  const id = params.id;
  const selfUrl = new URL(request.url).origin + '/go/' + id;

  // KV lookup first (dynamic links take priority)
  if (env.RATE_LIMIT) {
    const { value: url, metadata } = await env.RATE_LIMIT.getWithMetadata(`sl:${id}`);
    if (url) {
      const title = metadata?.title || metadata?.note || SITE_TITLE;
      const description = metadata?.description || SITE_DESCRIPTION;
      const image = metadata?.image || SITE_OG_IMAGE;
      const html = buildHtml(url, selfUrl, title, description, image);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
      });
    }
  }

  // Fall back to static JSON
  const entry = staticMap[id];
  if (entry) {
    const title = entry.title || SITE_TITLE;
    const description = entry.description || SITE_DESCRIPTION;
    const image = entry.image || SITE_OG_IMAGE;
    const html = buildHtml(entry.url, selfUrl, title, description, image);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
    });
  }

  return new Response('Short link not found', { status: 404 });
}
