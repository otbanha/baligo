/**
 * @param {string} url  Normalized Threads URL
 * @returns {Promise<object>}
 */
export async function handleThreads(url) {
  const oembedUrl = `https://www.threads.net/oembed?url=${encodeURIComponent(url)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.status === 404) return { error: 'NOT_FOUND' };
    if (!res.ok) return { error: 'UPSTREAM_ERROR' };

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
      // Strip HTML tags and normalize whitespace
      const text = data.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 10) description = text.slice(0, 500);
    }

    return {
      ok: true,
      platform: 'threads',
      data: {
        title: null,
        description,
        author: {
          name: data.author_name || null,
          handle,
          url: data.author_url || null,
          avatar: null,
        },
        media: [],
        publishedAt: null,
        sourceUrl: url,
        embedHtml: data.html || null,
      },
    };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') return { error: 'TIMEOUT' };
    return { error: 'UPSTREAM_ERROR' };
  }
}
