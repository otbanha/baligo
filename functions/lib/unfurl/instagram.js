/**
 * Instagram embed handler.
 * Meta oEmbed 需要 App Token，server-side scraping 全被擋。
 * Grid 卡片與 result card 統一用官方 /embed/captioned/ iframe URL。
 */

/** 從 URL 抽出 post code（/p/ /reel/ /tv/） */
function extractPostCode(url) {
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([\w-]+)/);
  return m ? m[1] : null;
}

/** /reel/ 為直式短影音 9:16；/p/ /tv/ 為一般貼文 1:1 */
function detectRatio(url) {
  return /instagram\.com\/reel\//.test(url) ? '9:16' : '1:1';
}

/**
 * @param {string} url          Normalized Instagram URL
 * @param {string|null} token   (unused in embed mode)
 * @returns {object}
 */
export async function handleInstagram(url, token = null) {
  const postCode  = extractPostCode(url);
  const ratio     = detectRatio(url);
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
      iframeRatio: ratio, // '1:1'（post/tv）或 '9:16'（reel）
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
