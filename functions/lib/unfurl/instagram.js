/**
 * Instagram unfurl handler.
 * 優先使用 Instagram oEmbed API（不需要 token，公開貼文可用）。
 * 若 oEmbed 失敗（私人貼文、限速等）才嘗試 OG 爬取。
 */

const OEMBED_URL = 'https://api.instagram.com/oembed/';

const BLOCKED_SIGNALS = [
  'Log in to Instagram',
  'Login • Instagram',
  "Sorry, this page isn't available",
  'Please wait a few minutes',
];

/**
 * @param {string} url  Normalized Instagram URL
 * @returns {Promise<object>}
 */
export async function handleInstagram(url) {
  // ── 1. Try oEmbed ──────────────────────────────────────────────────────────
  try {
    const oembedEndpoint = `${OEMBED_URL}?url=${encodeURIComponent(url)}&maxwidth=600&omitscript=true`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(oembedEndpoint, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      if (data?.title || data?.author_name) {
        const thumbnail = data.thumbnail_url ?? null;
        return {
          ok: true,
          platform: 'instagram',
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
            publishedAt: null,
            sourceUrl: url,
            embedHtml: null,
          },
        };
      }
    }

    // oEmbed 回傳 404 = 私人 / 已刪除
    if (res.status === 404) return { error: 'NOT_FOUND' };
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    // oEmbed 失敗，繼續嘗試 OG
  }

  // ── 2. Fallback: OG scraping ───────────────────────────────────────────────
  try {
    const { parseOGFromResponse } = await import('./og-parser.js');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      redirect: 'follow',
    });
    clearTimeout(timer);

    if (res.status === 404) return { error: 'NOT_FOUND' };

    const og = await parseOGFromResponse(res);

    const titleInvalid =
      !og.title ||
      og.title.trim() === '' ||
      BLOCKED_SIGNALS.some((s) => og.title.includes(s));

    if (titleInvalid || !og.description || og.description.trim().length < 10) {
      return { error: 'BLOCKED_BY_PLATFORM' };
    }

    const media = [];
    if (og.image) media.push({ type: 'image', url: og.image });
    if (og.video) media.push({ type: 'video', url: og.video });

    return {
      ok: true,
      platform: 'instagram',
      data: {
        title: og.title,
        description: og.description,
        author: { name: null, handle: null, url: null, avatar: null },
        media,
        publishedAt: null,
        sourceUrl: url,
        embedHtml: null,
      },
    };
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    return { error: 'UPSTREAM_ERROR' };
  }
}
