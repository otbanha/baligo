import { parseOGFromResponse } from './og-parser.js';

const BLOCKED_SIGNALS = [
  'Log in to Instagram',
  'Login • Instagram',
  'Instagram',
  "Sorry, this page isn't available",
  'Please wait a few minutes',
];

/**
 * @param {string} url  Normalized Instagram URL
 * @returns {Promise<object>}
 */
export async function handleInstagram(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
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

    // Detect login wall or empty response
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
    clearTimeout(timer);
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    return { error: 'UPSTREAM_ERROR' };
  }
}
