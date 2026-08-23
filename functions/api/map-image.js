// Google My Maps 上傳照片的 proxy。
//
// 為什麼需要：mymaps.usercontent.google.com 擋第三方 hotlink——瀏覽器發出的
// 圖片請求帶 Origin / Sec-Fetch-Site，Google 直接拒絕（curl 沒有這些 header
// 才拿得到 200）。因此地圖 popup 直接引用原始網址一律載入失敗，13 張分區地圖
// 共 314 個有照片的地點全部顯示不出來。改由這裡在邊緣代取再吐給瀏覽器。
//
// 順帶處理尺寸：KML 給的網址是 ?fife=s16383，也就是 16383px 的原圖（實測單張
// PNG 2.5MB）。popup 縮圖只有 280x140 CSS px，改用 fife 的裁切＋JPEG 參數後
// 同一張是 58KB。

const UPSTREAM_HOST = 'mymaps.usercontent.google.com';

// My Maps 的圖片 token 是 base64url，實測長度 209–259，放寬到 40–400
const ID_RE = /^[A-Za-z0-9_-]{40,400}$/;

// 白名單化 fife 參數，避免變成任意尺寸的公開轉檔服務。
// key 是對外的簡稱，value 是實際送給 Google 的 fife 值。
const VARIANTS = {
  thumb: 'w560-h280-c-rj', // popup 縮圖：560x280 JPEG，對應 280x140 @2x
  card: 'w800-h400-c-rj',
  full: 's1200-rj',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  const variant = url.searchParams.get('v') || 'thumb';

  if (!id || !ID_RE.test(id)) {
    return new Response('Invalid image id', { status: 400 });
  }
  const fife = VARIANTS[variant];
  if (!fife) {
    return new Response('Invalid variant', { status: 400 });
  }

  const upstream = `https://${UPSTREAM_HOST}/hostedimage/m/*/${id}?fife=${fife}`;

  try {
    const res = await fetch(upstream, {
      // token 內容不會變，快取久一點；My Maps 換圖會換 token
      cf: { cacheEverything: true, cacheTtl: 2592000 },
    });
    if (!res.ok) {
      return new Response('Upstream fetch failed', { status: 502 });
    }
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) {
      // Google 擋掉時會回 HTML 錯誤頁，別當成圖片轉出去
      return new Response('Upstream did not return an image', { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=2592000, immutable',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Error fetching image', { status: 502 });
  }
}
