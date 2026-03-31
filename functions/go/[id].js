// Dynamic short link redirect handler
// Returns OG-tagged HTML page (meta refresh) so social platforms get proper titles.
import staticLinks from '../../src/data/shortlinks.json';

const staticMap = Object.fromEntries(staticLinks.map(l => [l.id, { url: l.url, title: l.title || '', note: l.note || '' }]));

const SITE_TITLE = 'Go Bali Go 峇里島旅遊攻略';
const SITE_DESCRIPTION = '峇里島旅遊最完整的中文攻略網站。簽證、交通、住宿、美食、景點、行程規劃，610+ 篇深度文章。';
const SITE_OG_IMAGE = 'https://gobaligo.id/og-default.jpg';
const SITE_BASE = 'https://gobaligo.id';

// 分類名稱 → 頁面標題
const CAT_TITLES = {
  '新手指南':     '新手指南',
  '住宿推薦':     '住宿推薦',
  '峇里島分區攻略': '峇里島分區攻略',
  '簽證通關':     '簽證通關',
  '叫車包車':     '叫車包車',
  '家庭親子':     '家庭親子',
  '遊記分享':     '遊記分享',
  '美食景點活動': '美食景點活動',
  '旅行技巧':     '旅行技巧',
  '新聞存檔':     '新聞存檔',
};

function extractPageTitle(url, note) {
  try {
    const u = new URL(url);
    const cat = u.searchParams.get('cat') || u.searchParams.get('category') || '';
    if (cat && CAT_TITLES[cat]) {
      return `${CAT_TITLES[cat]} — ${SITE_TITLE}`;
    }
    // pathname hint: /go/bali-tips type labels from note
    if (note) return `${note} — ${SITE_TITLE}`;
  } catch { /* ignore */ }
  return SITE_TITLE;
}

function buildHtml(url, title, description) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=${esc(url)}" />
  <title>${esc(title)}</title>
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:image" content="${SITE_OG_IMAGE}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE_TITLE)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${SITE_OG_IMAGE}" />
</head>
<body>
  <p>正在跳轉… <a href="${esc(url)}">點此前往</a></p>
</body>
</html>`;
}

export async function onRequest({ params, env, request }) {
  const id = params.id;

  // KV lookup first (dynamic links take priority)
  if (env.RATE_LIMIT) {
    const { value: url, metadata } = await env.RATE_LIMIT.getWithMetadata(`sl:${id}`);
    if (url) {
      const note = metadata?.note || '';
      const title = extractPageTitle(url, note);
      const html = buildHtml(url, title, SITE_DESCRIPTION);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
      });
    }
  }

  // Fall back to static JSON
  const entry = staticMap[id];
  if (entry) {
    const title = extractPageTitle(entry.url, entry.note || entry.title);
    const html = buildHtml(entry.url, title, SITE_DESCRIPTION);
    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public,max-age=300' },
    });
  }

  return new Response('Short link not found', { status: 404 });
}
