/**
 * Cloudflare Pages Functions Middleware
 * 語言自動偵測：進入任何頁面時，根據 Accept-Language 自動跳轉
 * - 使用 cookie 記憶使用者選擇，避免每次強制跳轉
 * - 已在翻譯語系路徑下則不重複跳轉
 */

const LANG_COOKIE = 'gobaligo_lang';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 年

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
