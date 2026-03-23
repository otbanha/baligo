/**
 * Cloudflare Pages Functions Middleware
 * 語言自動偵測：只在使用者訪問根路徑 / 時執行
 * 根據 Accept-Language header 跳轉至對應語言版本
 */

export async function onRequest({ request, next }) {
  const url = new URL(request.url);

  // 只處理根路徑（/ 會被 _redirects 導到 /blog，但這裡先攔截）
  // 已在語言子路徑下則不重複跳轉
  if (
    url.pathname !== '/' ||
    request.headers.get('x-lang-redirected') === '1'
  ) {
    return next();
  }

  const acceptLang = (request.headers.get('accept-language') ?? '').toLowerCase();

  // 解析 Accept-Language header，取第一個有效語言
  const primaryLang = acceptLang
    .split(',')[0]          // 取第一個語言偏好
    .split(';')[0]          // 移除 q 值
    .trim();

  let redirect = null;

  if (/^zh-(hk|mo)|^yue/.test(primaryLang)) {
    redirect = '/zh-hk/blog/';
  } else if (/^zh-(cn|sg|hans)/.test(primaryLang)) {
    redirect = '/zh-cn/blog/';
  } else if (/^zh-(tw|hant)/.test(primaryLang) || primaryLang === 'zh') {
    redirect = null; // zh-tw 是預設，讓 _redirects 的 / → /blog 處理
  } else if (!primaryLang.startsWith('zh')) {
    redirect = '/en/blog/';
  }

  if (redirect) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect,
        'Cache-Control': 'no-store', // 不讓 CDN 快取，每個用戶獨立判斷
        'X-Lang-Detected': primaryLang,
      },
    });
  }

  return next();
}
