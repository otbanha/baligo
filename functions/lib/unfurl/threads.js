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
 * Threads 的 <title> 標籤實際放的是貼文全文（不是頁面標題！），
 * 沒有縮圖時至少能讓使用者知道這篇在講什麼。純媒體無文字的貼文，
 * <title> 會 fallback 成「Author (@handle) on Threads」，這種就不採用。
 */
function extractTitleTag(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  const text = decodeHtmlEntities(m[1]).replace(/\s+/g, ' ').trim();
  if (!text || /\(@[\w.]+\)\s*on\s*Threads$/i.test(text) || text === 'Threads') return null;
  return text.length > 200 ? `${text.slice(0, 200)}…` : text;
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

  // ── 抓貼文頁面 og:image / og:title / 貼文全文（失敗不影響主流程）──
  let thumbnail = null;
  let authorAvatar = null;
  let authorName = null;
  let caption = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

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
        // 純影片貼文，og:image 只是大頭貼，不當作貼文縮圖使用，
        // 但留著給前端在沒有真實縮圖時當 fallback 顯示
        authorAvatar = thumbnail;
        thumbnail = null;
      }
      const ogTitle = extractMetaContent(html, 'og:title');
      if (ogTitle) {
        const tm = ogTitle.match(/^(.*?)\s*\(@[\w.]+\)/);
        authorName = tm ? tm[1].trim() : ogTitle;
      }
      caption = extractTitleTag(html);
      if (!thumbnail && !authorAvatar) {
        console.log(`[threads] no og:image found url=${url} status=${res.status} htmlLen=${html.length}`);
        // TEMP DEBUG：wrangler tail 抓不到 console.log，暫時把診斷資訊塞進 caption
        // 讓使用者能直接在卡片上看到，排查完後會移除。
        if (!caption) caption = `[debug] status=${res.status} htmlLen=${html.length} hasTitleTag=${/<title/i.test(html)}`;
      }
    } else {
      console.log(`[threads] fetch not ok url=${url} status=${res.status}`);
      caption = `[debug] fetch not ok, status=${res.status}`;
    }
  } catch (e) {
    // 抓取失敗（逾時/網路錯誤）→ 繼續，thumbnail 維持 null（卡片顯示漸層佔位）
    console.log(`[threads] fetch failed url=${url} err=${e?.message}`);
    caption = `[debug] fetch exception: ${e?.message || e}`;
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
      title: caption,
      description: null,
      author: {
        name: authorName,
        handle: handle ? `@${handle}` : null,
        url: null,
        avatar: authorAvatar,
      },
      media: thumbnail ? [{ type: 'image', url: thumbnail }] : [],
      publishedAt: null,
      sourceUrl: url,
      embedHtml: null,
    },
  };
}
