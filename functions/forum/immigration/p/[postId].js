// OG share page for individual forum posts
// /forum/immigration/p/[postId]/ → renders OG tags → redirects to /forum/immigration/#[postId]

const SITE_TITLE    = 'Go Bali Go 峇里島旅遊攻略';
const FB_APP_ID     = '1994862997907037';
const FALLBACK_DESC = '看看別人是怎麼解決的 — 峇里島簽證與入境問題互助討論區';

const TOPICS = {
  evisa: '電子簽證', voa: '落地簽', aiac: 'AIAC入境卡',
  'tourism-tax': '旅遊稅', other: '其他入境問題',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHtml({ selfUrl, destUrl, title, description, ogImage }) {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8" />
  <link rel="canonical" href="${esc(selfUrl)}" />
  <title>${esc(title)}</title>
  <meta property="og:url"          content="${esc(selfUrl)}" />
  <meta property="og:title"        content="${esc(title)}" />
  <meta property="og:description"  content="${esc(description)}" />
  <meta property="og:image"        content="${esc(ogImage)}" />
  <meta property="og:image:width"  content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:type"   content="image/jpeg" />
  <meta property="og:image:alt"    content="${esc(title)}" />
  <meta property="og:type"         content="article" />
  <meta property="og:site_name"    content="${esc(SITE_TITLE)}" />
  <meta property="og:locale"       content="zh_TW" />
  <meta property="fb:app_id"       content="${FB_APP_ID}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image"       content="${esc(ogImage)}" />
  <meta name="robots" content="noindex" />
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
           justify-content: center; min-height: 100vh; background: #faf7f2; margin: 0; }
    .box { text-align: center; padding: 2rem; }
    p { color: #1A365D; font-size: 1.05rem; margin-bottom: 1rem; }
    a { color: #C5A059; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
<div class="box">
  <p>正在載入討論…</p>
  <a href="${esc(destUrl)}">點此直接前往 →</a>
</div>
<script>location.replace(${JSON.stringify(destUrl)});<\/script>
</body>
</html>`;
}

export async function onRequest({ params, env, request }) {
  const postId = params.postId;
  if (!postId) return new Response('Not found', { status: 404 });

  const origin  = new URL(request.url).origin;
  const selfUrl = `${origin}/forum/immigration/p/${postId}/`;
  const destUrl = `${origin}/forum/immigration/#${postId}`;
  const ogImage = `${origin}/og-2026.jpg`;

  // Fetch post from Supabase REST API
  const supabaseUrl  = env.PUBLIC_SUPABASE_URL;
  const supabaseAnon = env.PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnon) {
    try {
      const apiUrl = `${supabaseUrl}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&moderation_status=eq.approved&select=title,content,topic&limit=1`;
      const res = await fetch(apiUrl, {
        headers: {
          'apikey': supabaseAnon,
          'Authorization': `Bearer ${supabaseAnon}`,
        },
      });
      const rows = await res.json();
      const post = Array.isArray(rows) && rows[0];

      if (post) {
        const title   = post.title;
        const snippet = (post.content || '').replace(/\s+/g, ' ').trim().slice(0, 100);
        const desc    = snippet
          ? `${snippet}${post.content.length > 100 ? '⋯' : ''} — 在討論區查看完整回覆`
          : FALLBACK_DESC;

        return new Response(buildHtml({ selfUrl, destUrl, title, description: desc, ogImage }), {
          headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'public, max-age=300' },
        });
      }
    } catch {
      // fall through to generic response
    }
  }

  // Fallback: post not found or Supabase unavailable
  return new Response(buildHtml({
    selfUrl,
    destUrl,
    title: '峇里島入境討論區',
    description: FALLBACK_DESC,
    ogImage,
  }), {
    headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' },
  });
}
