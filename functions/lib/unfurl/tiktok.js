const OEMBED_URL = 'https://www.tiktok.com/oembed';

/**
 * @param {string} url
 * @returns {Promise<{platform:string, data:object}|{error:string}>}
 */
export async function handleTikTok(url) {
  const oembedUrl = `${OEMBED_URL}?url=${encodeURIComponent(url)}`;
  let res;
  try {
    res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; gobaligo-unfurl/1.0)' },
      cf: { cacheTtl: 60 },
    });
  } catch {
    return { error: 'UPSTREAM_ERROR' };
  }

  if (res.status === 404) return { error: 'NOT_FOUND' };
  if (!res.ok) return { error: 'UPSTREAM_ERROR' };

  let oembed;
  try {
    oembed = await res.json();
  } catch {
    return { error: 'UPSTREAM_ERROR' };
  }

  const authorHandle = oembed.author_url
    ? '@' + oembed.author_url.split('@').pop().split('?')[0].replace(/\/$/, '')
    : null;

  return {
    ok: true,
    platform: 'tiktok',
    data: {
      title:       oembed.title || null,
      description: null,
      author: {
        name:   oembed.author_name || null,
        handle: authorHandle,
        avatar: null,
      },
      media: oembed.thumbnail_url
        ? [{ type: 'image', url: oembed.thumbnail_url }]
        : [],
      embedHtml:  oembed.html || null,
      sourceUrl:  url,
    },
  };
}
