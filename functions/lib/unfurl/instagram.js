/**
 * Instagram embed handler.
 * Meta oEmbed 需要 App Token，server-side scraping 全被擋。
 * Grid 卡片用官方 iframe URL；result card 仍用 blockquote + embed.js widget。
 */

/** 從 URL 抽出 post code（/p/ /reel/ /tv/） */
function extractPostCode(url) {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

/**
 * @param {string} url          Normalized Instagram URL
 * @param {string|null} token   (unused in embed mode)
 * @returns {object}
 */
export async function handleInstagram(url, token = null) {
  const postCode  = extractPostCode(url);
  // /embed/captioned/ 同時顯示圖文，不只圖片
  const iframeUrl = postCode ? `https://www.instagram.com/p/${postCode}/embed/captioned/` : null;

  return {
    ok: true,
    platform: 'instagram',
    renderMode: 'embed',
    embed: {
      type: 'instagram',
      url,
      iframeUrl,          // https://www.instagram.com/p/{POST_CODE}/embed/captioned/
      iframeHeight: 600,
      script: 'https://www.instagram.com/embed.js',  // 保留供 renderEmbedCard 使用
    },
    data: {
      title: null,
      description: null,
      author: { name: null, handle: null, url: null, avatar: null },
      media: [],
      publishedAt: null,
      sourceUrl: url,
      embedHtml: null,
    },
  };
}
