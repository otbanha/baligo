/**
 * Threads embed-only handler.
 * 不做 server-side scraping；只驗 URL、抽 handle，
 * 回傳 renderMode:'embed' 讓前端用官方 widget 渲染。
 */

/** 從 Threads URL 抽出 @handle（去掉 @） */
function extractHandle(url) {
  const m = url.match(/threads\.(?:net|com)\/@([\w.]+)/);
  return m ? m[1] : null;
}

/**
 * @param {string} url  Normalized Threads URL
 * @returns {object}
 */
export async function handleThreads(url) {
  const handle = extractHandle(url);
  return {
    ok: true,
    platform: 'threads',
    renderMode: 'embed',
    embed: {
      type: 'threads',
      url,
      script: 'https://www.threads.net/embed.js',
    },
    data: {
      title: null,
      description: null,
      author: {
        name: null,
        handle: handle ? `@${handle}` : null,
        url: null,
        avatar: null,
      },
      media: [],
      publishedAt: null,
      sourceUrl: url,
      embedHtml: null,
    },
  };
}
