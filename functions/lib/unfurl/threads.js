/**
 * Threads unfurl handler.
 * 優先使用 Threads oEmbed API（公開貼文可用，不需 token）。
 * 若 oEmbed 失敗才嘗試 OG 爬取。
 */

const OEMBED_URL = 'https://www.threads.net/oembed/';

const BLOCKED_SIGNALS = [
  'Join Threads',
  'Log in to Instagram',
  'Login • Instagram',
  'Log in',
  "Sorry, this page isn't available",
  'Please wait a few minutes',
];

/**
 * @param {string} url  Normalized Threads URL
 * @returns {Promise<object>}
 */
export async function handleThreads(url) {
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

    if (res.status === 404) return { error: 'NOT_FOUND' };

    if (res.ok) {
      const data = await res.json();

      // Extract handle from author_url
      let handle = null;
      if (data.author_url) {
        const m = data.author_url.match(/@([\w.]+)/);
        if (m) handle = `@${m[1]}`;
      }

      // Extract plain text from embed HTML for description
      let description = null;
      if (data.html) {
        const text = data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (text.length > 10) description = text.slice(0, 500);
      }

      if (data.author_name || description) {
        return {
          ok: true,
          platform: 'threads',
          data: {
            title: data.author_name
              ? `@${data.author_name} 的 Threads 貼文`
              : 'Threads 貼文',
            description: description ?? '',
            author: {
              name: data.author_name ?? null,
              handle,
              url: data.author_url ?? null,
              avatar: null,
            },
            media: [],
            publishedAt: null,
            sourceUrl: url,
            embedHtml: data.html ?? null,
          },
        };
      }
    }
    // oEmbed 非 404 非 ok → 繼續嘗試 OG
  } catch (e) {
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    // 網路錯誤，繼續嘗試 OG
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

    if (titleInvalid) {
      return { error: 'BLOCKED_BY_PLATFORM' };
    }

    const media = [];
    if (og.image) media.push({ type: 'image', url: og.image });
    if (og.video) media.push({ type: 'video', url: og.video });

    return {
      ok: true,
      platform: 'threads',
      data: {
        title: og.title,
        description: og.description ?? '',
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
