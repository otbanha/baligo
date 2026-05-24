/**
 * Facebook embed handler.
 * FB 登入牆擋死 server-side scraping。
 * Grid 卡片用 facebook.com/plugins/post.php iframe；result card 仍用 FB SDK widget。
 */

/**
 * @param {string} url  Normalized Facebook URL
 * @returns {object}
 */
export async function handleFacebook(url) {
  // plugins/post.php 是 Meta 官方提供的無需登入 public embed API
  const iframeUrl = `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&width=500&show_text=true&appId`;

  return {
    ok: true,
    platform: 'facebook',
    renderMode: 'embed',
    embed: {
      type: 'facebook',
      url,
      iframeUrl,          // facebook.com/plugins/post.php?href=...
      iframeHeight: 500,
      script: 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v18.0',  // 保留供 renderEmbedCard 使用
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
