/**
 * Markdown 內容協商（Markdown for Agents）
 *
 * 兩種進入方式，回傳同一份 markdown：
 *   1. `Accept: text/markdown`（或 `text/*`）→ 同一個網址回 markdown
 *   2. 網址加 `.md` 後綴，例如 /blog/xxx.md → 給不會設 Accept header 的工具用
 *
 * HTML 仍然是預設值：一般瀏覽器送的星號通配或 text/html 完全不受影響。
 */

import { htmlToMarkdown, estimateTokens } from './html-to-markdown.js';

// 這些路徑不做轉換：API、靜態資源、後台、以及本來就不是文章的互動頁
const EXCLUDED = [
  '/api/', '/_astro/', '/admin/', '/pagefind/', '/fonts/', '/images/',
  '/cat_pix/', '/maps/', '/forms/', '/tools/', '/ebook/', '/forum/',
  '/share', '/.well-known/',
];

/**
 * 依 RFC 9110 的 q 值判斷客戶端是不是真的想要 markdown。
 * 星號通配（瀏覽器預設）不算，否則所有人都會拿到 markdown。
 */
export function prefersMarkdown(accept) {
  if (!accept) return false;

  const entries = accept.split(',').map((chunk) => {
    const [type, ...params] = chunk.trim().split(';');
    const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const q = qParam ? parseFloat(qParam.slice(2)) : 1;
    return { type: type.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
  });

  const best = (types) => entries
    .filter((e) => types.includes(e.type))
    .reduce((max, e) => Math.max(max, e.q), -1);

  const mdQ = Math.max(best(['text/markdown', 'text/x-markdown']), best(['text/*']));
  if (mdQ <= 0) return false;

  return mdQ >= best(['text/html', 'application/xhtml+xml']);
}

/** /blog/xxx.md → /blog/xxx/ ；不是 .md 網址就回 null */
export function stripMdSuffix(pathname) {
  if (!pathname.endsWith('.md')) return null;
  let p = pathname.slice(0, -3);
  if (p.endsWith('/index')) p = p.slice(0, -6);
  if (!p.endsWith('/')) p += '/';
  return p || '/';
}

/** 這個路徑適合轉 markdown 嗎（排除 API／靜態檔／後台）*/
export function isConvertible(pathname) {
  if (EXCLUDED.some((prefix) => pathname.startsWith(prefix))) return false;
  // 尾段還有副檔名的（.json/.xml/.js…）一律當靜態檔
  const last = pathname.split('/').filter(Boolean).pop() || '';
  return !last.includes('.');
}

/**
 * 取回 HTML 版本、轉成 markdown 回傳。
 *
 * @param {Request} request 原始請求
 * @param {Function} next   Pages Functions 的 next()
 * @param {URL} url         原始 URL
 * @param {string} htmlPath 要抓的 HTML 路徑（已去掉 .md）
 * @param {boolean} viaSuffix true = 走 .md 網址進來（會多一個 noindex）
 */
export async function respondWithMarkdown(request, next, url, htmlPath, viaSuffix = false) {
  // 根路徑的 HTML 只是一層轉址殼，真正的首頁是 /blog/（middleware 對一般
  // 瀏覽器也是這樣導的），markdown 版直接給實際內容那頁
  const path = htmlPath === '/' ? '/blog/' : htmlPath;
  const target = new URL(path + url.search, url.origin);

  const upstream = await next(new Request(target.toString(), {
    method: 'GET',
    headers: {
      // 明確要 HTML，避免任何一層又把它當成 markdown 請求
      accept: 'text/html,application/xhtml+xml',
      'accept-language': request.headers.get('accept-language') || 'zh-TW',
      'user-agent': request.headers.get('user-agent') || '',
    },
  }));

  const type = upstream.headers.get('content-type') || '';
  if (!type.includes('text/html')) {
    // 404、重新導向或非 HTML：原樣回，不要假裝有 markdown 版
    return upstream;
  }

  const html = await upstream.text();
  const { markdown } = await htmlToMarkdown(html, target.href);

  const headers = new Headers({
    'content-type': 'text/markdown; charset=utf-8',
    'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    'vary': 'Accept',
    'x-markdown-tokens': String(estimateTokens(markdown)),
    'x-original-tokens': String(estimateTokens(html)),
    'link': `<${target.href}>; rel="canonical"`,
    'access-control-allow-origin': '*',
  });

  // .md 是另一個網址，可能被搜尋引擎自己撈到，標 noindex 避免當成重複內容。
  // 內容協商的那條路是同一個網址，絕對不能加，不然 HTML 版會有被誤判的風險。
  if (viaSuffix) headers.set('x-robots-tag', 'noindex');

  return new Response(request.method === 'HEAD' ? null : markdown, {
    status: upstream.status,
    headers,
  });
}
