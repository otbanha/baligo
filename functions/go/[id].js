// Dynamic short link redirect handler
// Returns OG-tagged HTML page (meta refresh) so social platforms get proper titles.
import staticLinks from '../../src/data/shortlinks.json';

const staticMap = Object.fromEntries(staticLinks.map(l => [l.id, { url: l.url, title: l.title || '', note: l.note || '' }]));

const SITE_TITLE = 'Go Bali Go 峇里島旅遊攻略';
const SITE_DESCRIPTION = '峇里島旅遊最完整的中文攻略網站。簽證、交通、住宿、美食、景點、行程規劃，610+ 篇深度文章。';
const SITE_OG_IMAGE = 'https://gobaligo.id/og-default.jpg';
const SITE_BASE = 'https://gobaligo.id';

// 分類名稱 → { label, image }
// image：上傳 1200×630 的分類封面圖到 public/ 後填入路徑
const CAT_META = {
  '新手指南':       { label: '新手指南',       image: 'https://gobaligo.id/og-default.jpg' },
  '住宿推薦':       { label: '住宿推薦',       image: 'https://gobaligo.id/og-default.jpg' },
  '峇里島分區攻略': { label: '峇里島分區攻略', image: 'https://gobaligo.id/og-default.jpg' },
  '簽證通關':       { label: '簽證通關',       image: 'https://gobaligo.id/og-default.jpg' },
  '叫車包車':       { label: '叫車包車',       image: 'https://gobaligo.id/og-default.jpg' },
  '家庭親子':       { label: '家庭親子',       image: 'https://gobaligo.id/og-default.jpg' },
  '遊記分享':       { label: '遊記分享',       image: 'https://gobaligo.id/og-default.jpg' },
  '美食景點活動':   { label: '美食景點活動',   image: 'https://gobaligo.id/og-default.jpg' },
  '旅行技巧':       { label: '旅行技巧',       image: 'https://gobaligo.id/og-default.jpg' },
  '新聞存檔':       { label: '新聞存檔',       image: 'https://gobaligo.id/og-default.jpg' },
};

function extractMeta(destUrl, note) {
  try {
    const u = new URL(destUrl);
    const cat = u.searchParams.get('cat') || u.searchParams.get('category') || '';
    if (cat && CAT_META[cat]) {
      const { label, image } = CAT_META[cat];
      return { title: `${label} — ${SITE_TITLE}`, image };
    }
    if (note) return { title: `${note} — ${SITE_TITLE}`, image: SITE_OG_IMAGE };
  } catch { /* ignore */ }
  return { title: SITE_TITLE, image: SITE_OG_IMAGE };
}

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
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE_TITLE)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(ogImage)}" />
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
      const note = metadata?.note || '';
      const { title, image } = extractMeta(url, note);
      const html = buildHtml(url, selfUrl, title, SITE_DESCRIPTION, image);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
      });
    }
  }

  // Fall back to static JSON
  const entry = staticMap[id];
  if (entry) {
    const { title, image } = extractMeta(entry.url, entry.note || entry.title);
    const html = buildHtml(entry.url, selfUrl, title, SITE_DESCRIPTION, image);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
    });
  }

  return new Response('Short link not found', { status: 404 });
}
