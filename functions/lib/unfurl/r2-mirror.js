/**
 * 將第三方平台的縮圖（如 TikTok 的 oEmbed thumbnail_url）下載並存到 R2，
 * 回傳穩定的公開網址。原始網址通常帶有 x-expires 簽章，1~2 天後就會失效，
 * 導致 /share/ 與首頁「旅人分享」的縮圖在過期後永久損毀。
 */

const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
};

/**
 * @param {object} env        Pages Function env（需有 R2_BUCKET binding 與 R2_PUBLIC_URL）
 * @param {string} imageUrl   來源圖片網址
 * @param {string} keyPrefix  R2 物件 key（不含副檔名），例如 images/unfurl/tiktok/<hash>
 * @returns {Promise<string|null>} 成功回傳 R2 公開網址，失敗回傳 null
 */
export async function mirrorImageToR2(env, imageUrl, keyPrefix) {
  if (!env.R2_BUCKET || !env.R2_PUBLIC_URL || !imageUrl) return null;

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; gobaligo-unfurl/1.0)' },
    });
    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
    const ext = EXT_BY_TYPE[contentType] || 'jpg';
    const buffer = await res.arrayBuffer();
    const key = `${keyPrefix}.${ext}`;

    await env.R2_BUCKET.put(key, buffer, { httpMetadata: { contentType } });

    return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  } catch {
    return null;
  }
}
