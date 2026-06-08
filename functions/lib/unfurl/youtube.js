function extractVideoId(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtube.com') {
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2];
      return url.searchParams.get('v');
    }
    if (host === 'youtu.be') return url.pathname.slice(1).split('?')[0];
  } catch {}
  return null;
}

/**
 * @param {string} url  Normalized YouTube URL
 * @returns {Promise<object>}
 */
export async function handleYouTube(url) {
  const videoId = extractVideoId(url);
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(oembedUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (res.status === 401 || res.status === 403) return { error: 'NOT_FOUND' };
    if (res.status === 404) return { error: 'NOT_FOUND' };
    if (!res.ok) return { error: 'UPSTREAM_ERROR' };

    const data = await res.json();

    // Shorts 的 maxresdefault 常常不存在 → 直接用 hqdefault（永遠有）
    // 一般影片優先用 maxresdefault，client 端 onerror 再 fallback 到 hqdefault
    const isShorts = url.includes('/shorts/');
    const thumbnail = videoId
      ? `https://i.ytimg.com/vi/${videoId}/${isShorts ? 'hqdefault' : 'maxresdefault'}.jpg`
      : (data.thumbnail_url || null);

    return {
      ok: true,
      platform: 'youtube',
      data: {
        title: data.title || null,
        description: null,
        author: {
          name: data.author_name || null,
          handle: null,
          url: data.author_url || null,
          avatar: null,
        },
        media: thumbnail
          ? [{ type: 'image', url: thumbnail, width: data.thumbnail_width, height: data.thumbnail_height }]
          : [],
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
