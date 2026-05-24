/**
 * Instagram embed-only handler.
 * Meta 在 2020 年後的 oEmbed 需要 App Token；server-side scraping 一律被擋。
 * 改用官方 blockquote + embed.js widget，由瀏覽器渲染。
 *
 * token 參數保留簽名相容性，但 embed mode 不使用。
 */

/**
 * @param {string} url          Normalized Instagram URL
 * @param {string|null} token   (unused in embed mode)
 * @returns {object}
 */
export async function handleInstagram(url, token = null) {
  return {
    ok: true,
    platform: 'instagram',
    renderMode: 'embed',
    embed: {
      type: 'instagram',
      url,
      script: 'https://www.instagram.com/embed.js',
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
