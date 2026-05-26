/**
 * Threads handler — hybrid approach:
 *   1. Server-side oEmbed fetch → thumbnail_url + author_name（非阻斷，失敗繼續）
 *   2. renderMode:'embed' → result card 仍用官方 widget 渲染
 *   3. data.media 帶 thumbnail → grid card 顯示真實縮圖
 */

function extractHandle(url) {
  const m = url.match(/threads\.(?:net|com)\/@([\w.]+)/);
  return m ? m[1] : null;
}

/** 從 URL 抽出 post code，用於組 iframe URL */
function extractPostCode(url) {
  const m = url.match(/threads\.(?:net|com)\/@[\w.]+\/post\/([\w-]+)/);
  return m ? m[1] : null;
}

/**
 * @param {string} url  Normalized Threads URL
 * @returns {Promise<object>}
 */
export async function handleThreads(url) {
  const handle    = extractHandle(url);
  const postCode  = extractPostCode(url);
  const iframeUrl = postCode ? `https://www.threads.net/embed/post/${postCode}` : null;

  // ── 嘗試 oEmbed 取 thumbnail + author（失敗不影響主流程）──
  let thumbnail = null;
  let authorName = null;

  try {
    const oembedUrl = `https://www.threads.net/oembed/?url=${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'application/json',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      thumbnail  = data.thumbnail_url  ?? null;
      authorName = data.author_name    ?? null;
    }
  } catch {
    // oEmbed 失敗 → 繼續，thumbnail 維持 null（grid 顯示漸層佔位）
  }

  return {
    ok: true,
    platform: 'threads',
    renderMode: 'embed',           // result card 仍用官方 iframe widget
    embed: {
      type: 'threads',
      url,
      iframeUrl,          // https://www.threads.net/embed/post/{POST_CODE}
      iframeHeight: 600,
      script: 'https://www.threads.net/embed.js',  // 保留供 renderEmbedCard 使用
    },
    data: {
      title: null,
      description: null,
      author: {
        name: authorName,
        handle: handle ? `@${handle}` : null,
        url: null,
        avatar: null,
      },
      media: thumbnail ? [{ type: 'image', url: thumbnail }] : [],
      publishedAt: null,
      sourceUrl: url,
      embedHtml: null,
    },
  };
}
