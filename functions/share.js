// Dynamic OG share page for trip planner links
// /share/?c=...&d=...&i=...&b=...&a=...&s=...
// Generates friend-facing OG title/description, then redirects to /trip-planner/

const COMPANION_ZH = {
  solo: '個人獨旅', couple: '情侶蜜月', family: '親子旅遊',
  friends: '朋友同行', elder: '長輩同行', group: '10人以上團體',
};
const DAYS_ZH = {
  '4': '4天', '5': '5天4夜', '68': '6-8天', '9': '9天以上',
};
const AREA_ZH = {
  kuta: '庫塔', seminyak: '水明漾', canggu: '長谷',
  ubud: '烏布', jimbaran: '金巴蘭', uluwatu: '烏魯瓦圖',
  nusadua: '努沙杜瓦', sanur: '沙努爾', penida: '努沙佩尼達',
  lembongan: '藍夢島', komodo: '科摩多', east: '東部峇里',
};

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const p = url.searchParams;

  const companion = COMPANION_ZH[p.get('c')] || '';
  const days      = DAYS_ZH[p.get('d')] || '';
  const areas     = (p.get('a') || '').split(',').filter(Boolean)
                      .map(k => AREA_ZH[k]).filter(Boolean);

  // ── Build inviting OG title ────────────────────────────────────────
  let title;
  if (companion && days) {
    title = `${companion} ${days}峇里島行程，分享給你參考！`;
  } else if (companion) {
    title = `${companion}的峇里島行程規劃，一起看看？`;
  } else if (days) {
    title = `我規劃了 ${days} 的峇里島行程，快來參考！`;
  } else {
    title = '參考一下，這是我規劃的峇里島行程 ✈️';
  }

  // ── Build OG description ───────────────────────────────────────────
  let desc;
  if (areas.length > 0) {
    desc = `規劃地區：${areas.join('・')}。包含住宿推薦、景點攻略與行程安排，點擊查看完整個人化推薦！`;
  } else {
    desc = '個人化峇里島行程推薦，包含住宿、景點與分區攻略。點擊查看完整規劃！';
  }

  // ── Build redirect URL back to trip planner ────────────────────────
  const fwdParams = new URLSearchParams();
  ['c', 'd', 'i', 'b', 'a', 's'].forEach(k => {
    const v = p.get(k); if (v) fwdParams.set(k, v);
  });
  const tripUrl = `/trip-planner/?${fwdParams.toString()}`;

  // Use the site's main OG image (absolute URL required for LINE/OG scrapers)
  const origin = url.origin;
  const ogImage = `${origin}/og-2026.jpg`;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)}</title>
<meta property="og:title" content="${escHtml(title)}">
<meta property="og:description" content="${escHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escHtml(url.href)}">
<meta property="og:image" content="${escHtml(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="${escHtml(title)}">
<meta property="og:site_name" content="gobaligo.id">
<meta property="og:locale" content="zh_TW">
<meta property="fb:app_id" content="1994862997907037">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(title)}">
<meta name="twitter:description" content="${escHtml(desc)}">
<meta name="twitter:image" content="${escHtml(ogImage)}">
<meta http-equiv="refresh" content="0;url=${escHtml(tripUrl)}">
<style>
  body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         display:flex; align-items:center; justify-content:center;
         min-height:100vh; background:#faf7f2; margin:0; }
  .box { text-align:center; padding:2rem; }
  p { color:#1A365D; font-size:1.05rem; margin-bottom:1rem; }
  a { color:#C5A059; font-weight:700; text-decoration:none; }
</style>
</head>
<body>
<div class="box">
  <p>正在載入行程推薦…</p>
  <a href="${escHtml(tripUrl)}">點此直接前往 →</a>
</div>
<script>location.replace(${JSON.stringify(tripUrl)});<\/script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}
