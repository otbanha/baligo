/**
 * Instagram unfurl handler.
 *
 * Meta 伺服器對 server-side 抓取設有多重防護，策略如下：
 * 1. oEmbed（需要 token，若 env.INSTAGRAM_TOKEN 已設定才啟用）
 * 2. 直接 OG 爬取（通常被登入牆擋）
 * 3. /embed/ 頁面爬取（Instagram iframe embed URL，公開貼文通常可讀）
 * 4. 基本卡片 fallback（不報錯，保持貼文加入分享牆）
 */

const OEMBED_URL = 'https://api.instagram.com/oembed/';

const BLOCKED_SIGNALS = [
  'Log in to Instagram',
  'Login • Instagram',
  "Sorry, this page isn't available",
  'Please wait a few minutes',
  'Before you continue',
];

/** 從 Instagram URL 取出 shortcode，支援 /p/ /reel/ /tv/ /reels/ */
function extractShortcode(url) {
  const m = url.match(/instagram\.com\/(?:p|reel|reels|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

/**
 * @param {string} url           Normalized Instagram URL
 * @param {string|null} token    Meta App Access Token（有才用）
 * @returns {Promise<object>}
 */
export async function handleInstagram(url, token = null) {
  // ── 1. oEmbed（有 token 才有效）──────────────────────────────────────────
  if (token) {
    try {
      const ep = `${OEMBED_URL}?url=${encodeURIComponent(url)}&maxwidth=600&omitscript=true&access_token=${encodeURIComponent(token)}`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(ep, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      });
      clearTimeout(t);

      if (res.status === 404) return { error: 'NOT_FOUND' };

      if (res.ok) {
        const data = await res.json();
        if (data?.title || data?.author_name) {
          const thumbnail = data.thumbnail_url ?? null;
          return {
            ok: true, platform: 'instagram',
            data: {
              title: data.title || `@${data.author_name} 的 Instagram 貼文`,
              description: data.title || '',
              author: {
                name: data.author_name ?? null,
                handle: data.author_url ? data.author_url.split('/').filter(Boolean).pop() : null,
                url: data.author_url ?? null,
                avatar: null,
              },
              media: thumbnail ? [{ type: 'image', url: thumbnail }] : [],
              publishedAt: null, sourceUrl: url, embedHtml: null,
            },
          };
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    }
  }

  // ── 2. OG 爬取（直接打貼文 URL）─────────────────────────────────────────
  try {
    const { parseOGFromResponse } = await import('./og-parser.js');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(t);

    if (res.status === 404) return { error: 'NOT_FOUND' };

    const og = await parseOGFromResponse(res);
    const blocked = !og.title || og.title.trim() === '' || BLOCKED_SIGNALS.some((s) => og.title.includes(s));

    if (!blocked && og.description && og.description.trim().length >= 10) {
      const media = [];
      if (og.image) media.push({ type: 'image', url: og.image });
      if (og.video) media.push({ type: 'video', url: og.video });
      return {
        ok: true, platform: 'instagram',
        data: {
          title: og.title, description: og.description,
          author: { name: null, handle: null, url: null, avatar: null },
          media, publishedAt: null, sourceUrl: url, embedHtml: null,
        },
      };
    }
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
  }

  // ── 3. /embed/ 頁面（iframe embed URL，不需登入）────────────────────────
  const shortcode = extractShortcode(url);
  if (shortcode) {
    try {
      const { parseOGFromResponse } = await import('./og-parser.js');
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(embedUrl, {
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://gobaligo.id/',
        },
        redirect: 'follow',
      });
      clearTimeout(t);

      if (res.ok) {
        const og = await parseOGFromResponse(res);
        const blocked = !og.title || og.title.trim() === '' || BLOCKED_SIGNALS.some((s) => og.title.includes(s));

        if (!blocked) {
          const media = [];
          if (og.image) media.push({ type: 'image', url: og.image });
          if (og.video) media.push({ type: 'video', url: og.video });
          return {
            ok: true, platform: 'instagram',
            data: {
              title: og.title || 'Instagram 貼文',
              description: og.description ?? '',
              author: { name: null, handle: null, url: null, avatar: null },
              media, publishedAt: null, sourceUrl: url, embedHtml: null,
            },
          };
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    }
  }

  // ── 4. 基本卡片 fallback（不報錯，貼文仍加入分享牆）────────────────────
  return {
    ok: true,
    platform: 'instagram',
    data: {
      title: 'Instagram 貼文',
      description: '點擊查看 Instagram 原始貼文',
      author: { name: null, handle: null, url: null, avatar: null },
      media: [],
      publishedAt: null,
      sourceUrl: url,
      embedHtml: null,
    },
  };
}
