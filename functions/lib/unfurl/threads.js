/**
 * Threads handler:
 *   1. Threads 已關閉公開 oEmbed（/oembed/ 會 302 到 /login/），改用
 *      Googlebot UA 直接抓貼文頁面 HTML，解析 og:image / og:title。
 *   2. data.media 帶 thumbnail → 卡片顯示真實縮圖（無縮圖則漸層佔位）。
 */

function extractHandle(url) {
  const m = url.match(/threads\.(?:net|com)\/@([\w.]+)/);
  return m ? m[1] : null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function extractMetaContent(html, property) {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  const m = html.match(re);
  return m ? decodeHtmlEntities(m[1]) : null;
}

/**
 * 純影片貼文沒有畫面截圖時，Threads 的 og:image 會 fallback 成「作者大頭貼」
 * （CDN 網址的 efg 參數 base64 解碼後含 vencode_tag: profile_pic...）。
 * 這種情況視同無縮圖，讓卡片改顯示漸層佔位，避免縮圖看起來像錯誤的大頭貼特寫。
 */
function isProfilePicThumbnail(imageUrl) {
  try {
    const efg = new URL(imageUrl).searchParams.get('efg');
    if (!efg) return false;
    const padded = efg.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return decoded.includes('profile_pic');
  } catch {
    return false;
  }
}

/**
 * @param {string} url  Normalized Threads URL
 * @returns {Promise<object>}
 */
export async function handleThreads(url) {
  const handle = extractHandle(url);

  // ── 抓貼文頁面 og:image / og:title（失敗不影響主流程）──
  let thumbnail = null;
  let authorName = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        Accept: 'text/html',
      },
    });
    clearTimeout(timer);

    if (res.ok) {
      const html = await res.text();
      thumbnail = extractMetaContent(html, 'og:image');
      if (thumbnail && isProfilePicThumbnail(thumbnail)) {
        thumbnail = null; // 純影片貼文，og:image 只是大頭貼 → 改走漸層佔位
      }
      const ogTitle = extractMetaContent(html, 'og:title');
      if (ogTitle) {
        const tm = ogTitle.match(/^(.*?)\s*\(@[\w.]+\)/);
        authorName = tm ? tm[1].trim() : ogTitle;
      }
    }
  } catch {
    // 抓取失敗 → 繼續，thumbnail 維持 null（卡片顯示漸層佔位）
  }

  return {
    ok: true,
    platform: 'threads',
    renderMode: 'embed',
    embed: {
      type: 'threads',
      url,
      iframeRatio: '4:5', // 容器比例，與 IG/FB 卡片視覺統一
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
