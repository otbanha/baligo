/**
 * Facebook embed handler.
 * FB 登入牆擋死 server-side scraping。
 * 影片貼文（/videos/、/watch、/reel/、fb.watch）用 plugins/video.php；
 * 一般貼文用 plugins/post.php。result card 仍用 FB SDK widget。
 */

/** /videos/、/watch、/reel/ 視為影片，走 video plugin（16:9） */
function isVideoUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return /\/(videos|watch|reel)(\/|$)/.test(u.pathname)
      || u.pathname.startsWith('/watch')
      || u.pathname.startsWith('/share/r/');
  } catch {
    return false;
  }
}

/** fb.watch 短網址 → follow redirect 拿真正的 facebook.com URL */
async function resolveFbWatch(urlStr) {
  if (!/fb\.watch/i.test(urlStr)) return urlStr;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(urlStr, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    });
    clearTimeout(timer);
    res.body?.cancel?.().catch?.(() => {});
    return res.url || urlStr;
  } catch {
    clearTimeout(timer);
    return urlStr; // 解析失敗 → 用原始網址，仍可組 post plugin iframe
  }
}

/**
 * @param {string} url  Normalized Facebook URL
 * @returns {Promise<object>}
 */
export async function handleFacebook(url) {
  const resolvedUrl = await resolveFbWatch(url);
  const isVideo = isVideoUrl(resolvedUrl) || isVideoUrl(url);
  const isReel = /\/(reel|share\/r)\//.test(resolvedUrl) || /\/(reel|share\/r)\//.test(url);

  const iframeUrl = isVideo
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(resolvedUrl)}&show_text=false&width=560`
    : `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(resolvedUrl)}&show_text=true&width=500`;

  return {
    ok: true,
    platform: 'facebook',
    renderMode: 'embed',
    embed: {
      type: 'facebook',
      url: resolvedUrl,
      iframeUrl,
      iframeHeight: isVideo ? 315 : 500,
      iframeRatio: isReel ? '9:16' : (isVideo ? '16:9' : '4:5'),
      script: 'https://connect.facebook.net/zh_TW/sdk.js#xfbml=1&version=v18.0',  // 保留供 renderEmbedCard 使用
    },
    data: {
      title: null,
      description: null,
      author: { name: null, handle: null, url: null, avatar: null },
      media: [],
      publishedAt: null,
      sourceUrl: resolvedUrl,
      embedHtml: null,
    },
  };
}
