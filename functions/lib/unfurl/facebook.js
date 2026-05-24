/**
 * Facebook embed-only handler.
 * FB 登入牆擋死 server-side scraping；改用官方 fb-post widget + JS SDK。
 */

/**
 * @param {string} url  Normalized Facebook URL
 * @returns {object}
 */
export async function handleFacebook(url) {
  return {
    ok: true,
    platform: 'facebook',
    renderMode: 'embed',
    embed: {
      type: 'facebook',
      url,
      script: 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v18.0',
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
