/**
 * Cloudflare Pages Functions Middleware
 * 語言自動偵測：進入任何頁面時，根據 Accept-Language 自動跳轉
 * - 使用 cookie 記憶使用者選擇，避免每次強制跳轉
 * - 已在翻譯語系路徑下則不重複跳轉
 */

const LANG_COOKIE = 'gobaligo_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

// 分類縮圖：用於社群分享 OG image
const CATEGORY_OG = {
  '新手指南':       '/cat_pix/1.jpg',
  '住宿推薦':       '/cat_pix/2.jpg',
  '峇里島分區攻略': '/cat_pix/3.jpg',
  '簽證通關':       '/cat_pix/4.jpg',
  '叫車包車':       '/cat_pix/5.jpg',
  '家庭親子':       '/cat_pix/6.jpg',
  '遊記分享':       '/cat_pix/7.jpg',
  '美食景點活動':   '/cat_pix/8.jpg',
  '旅行技巧':       '/cat_pix/9.jpg',
};

/**
 * 從 Accept-Language 判斷語系
 * 回傳 'zh-tw' | 'zh-cn' | 'zh-hk' | 'en'
 */
function detectLang(acceptLang) {
  const primary = (acceptLang ?? '')
    .toLowerCase()
    .split(',')[0]
    .split(';')[0]
    .trim();

  if (/^zh-(hk|mo)|^yue/.test(primary)) return 'zh-hk';
  if (/^zh-(cn|sg|hans)/.test(primary)) return 'zh-cn';
  if (/^zh/.test(primary)) return 'zh-tw'; // zh-tw, zh-hant, zh 都算繁中
  if (primary) return 'en';
  return 'zh-tw';
}

/**
 * 根據語系和當前路徑，建立目標 URL
 */
function buildRedirectUrl(lang, pathname) {
  // 根路徑
  if (pathname === '/') {
    if (lang === 'zh-tw') return '/blog/';
    return `/${lang}/blog/`;
  }

  // /blog/ 列表頁 → 跳轉至對應語系列表頁
  if (pathname === '/blog/' || pathname === '/blog') {
    if (lang === 'zh-tw') return null;
    return `/${lang}/blog/`;
  }

  // /blog/xxx/ 文章頁 → 跳轉至對應翻譯語系
  const articleMatch = pathname.match(/^\/blog\/(.+)$/);
  if (articleMatch) {
    if (lang === 'zh-tw') return null; // 已在正確語系
    return `/${lang}/blog/${articleMatch[1]}`;
  }

  return null;
}

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 爬蟲/社群媒體抓取器
  const ua = request.headers.get('user-agent') ?? '';
  const isBot = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|discordbot|applebot|googlebot|bingbot|yandex|curl|wget/i.test(ua);

  // 社群分享分類頁：直接回傳含分類 OG 的輕量 HTML
  if (isBot && (pathname === '/blog' || pathname === '/blog/')) {
    const cat = url.searchParams.get('cat');
    const ogImagePath = cat ? CATEGORY_OG[cat] : null;
    if (ogImagePath) {
      const imageUrl = `https://gobaligo.id${ogImagePath}`;
      const catUrl = url.href; // 使用當前請求的完整 URL，避免 Facebook 追蹤 og:url 跑到別頁
      const catTitle = `${cat} | Go Bali Go 峇里島旅遊攻略`;
      const ogHtml = `<!DOCTYPE html><html lang="zh-TW"><head>
<meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:url" content="${catUrl}">
<meta property="og:site_name" content="Go Bali Go 峇里島旅遊攻略">
<meta property="og:title" content="${catTitle}">
<meta property="og:description" content="峇里島旅遊攻略 — ${cat}分類精選文章">
<meta property="og:image" content="${imageUrl}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="${catUrl}">
<meta property="twitter:title" content="${catTitle}">
<meta property="twitter:image" content="${imageUrl}">
</head><body></body></html>`;
      return new Response(ogHtml, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
      });
    }
  }

  if (isBot) return next();

  // 已在翻譯語系路徑下，設定 cookie 記憶後直接放行
  const translatedMatch = pathname.match(/^\/(zh-cn|zh-hk|en)(\/|$)/);
  if (translatedMatch) {
    const response = await next();
    const res = new Response(response.body, response);
    res.headers.append(
      'Set-Cookie',
      `${LANG_COOKIE}=${translatedMatch[1]}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
    );
    return res;
  }

  // API、靜態資源、admin 等不處理
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_astro/') ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/atlas') ||
    pathname.startsWith('/index-all') ||
    pathname.startsWith('/pagefind/') ||
    pathname.includes('.')  // 有副檔名的靜態檔案
  ) {
    return next();
  }

  // 已有語言 cookie → 尊重使用者選擇
  const cookies = request.headers.get('cookie') ?? '';
  const cookieMatch = cookies.match(new RegExp(`${LANG_COOKIE}=([^;]+)`));
  if (cookieMatch) {
    const savedLang = cookieMatch[1];
    // 對 /blog/ 列表頁：非繁中使用者導向對應語系列表頁
    if (savedLang !== 'zh-tw' && (pathname === '/blog/' || pathname === '/blog')) {
      return new Response(null, {
        status: 302,
        headers: { 'Location': `/${savedLang}/blog/`, 'Cache-Control': 'no-store' },
      });
    }
    return next(); // 已選過語言，不強制跳轉
  }

  // 第一次造訪：根據 Accept-Language 自動跳轉
  const acceptLang = request.headers.get('accept-language') ?? '';
  const detectedLang = detectLang(acceptLang);

  const redirectTo = buildRedirectUrl(detectedLang, pathname);

  if (redirectTo) {
    return new Response(null, {
      status: 302,
      headers: {
        'Location': redirectTo,
        'Cache-Control': 'no-store',
        'Set-Cookie': `${LANG_COOKIE}=${detectedLang}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`,
      },
    });
  }

  // zh-tw 路徑：設定 cookie 並放行
  const response = await next();
  const res = new Response(response.body, response);
  res.headers.append(
    'Set-Cookie',
    `${LANG_COOKIE}=zh-tw; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`
  );
  return res;
}
