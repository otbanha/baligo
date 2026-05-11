// 每天 09:00–16:00 Bali 每 2 小時更新一次（09/11/13/15/16）
// UTC 對應：01/03/05/07/08
const SLOTS = [
  { utc: 1,  label: '09' },  // 09:00 Bali
  { utc: 3,  label: '11' },  // 11:00 Bali
  { utc: 5,  label: '13' },  // 13:00 Bali
  { utc: 7,  label: '15' },  // 15:00 Bali
  { utc: 8,  label: '16' },  // 16:00 Bali（最後一次，持續到隔日09:00）
];

function secondsUntilNextUpdate() {
  const now = new Date();
  const h = now.getUTCHours();
  const next = new Date(now);
  const nextSlot = SLOTS.find(s => s.utc > h);
  if (nextSlot) {
    next.setUTCHours(nextSlot.utc, 0, 0, 0);
  } else {
    // 已過 16:00 Bali，等到明天 09:00 Bali (01:00 UTC)
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(1, 0, 0, 0);
  }
  return Math.max(60, Math.floor((next - now) / 1000));
}

// cache key = 日期 + 時段標籤
function getCacheSlot() {
  const h = new Date().getUTCHours();
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  // 找目前所屬時段（最後一個 utc <= h 的 slot）
  let label = null;
  for (const s of SLOTS) {
    if (h >= s.utc) label = s.label;
  }
  if (label) return `${date}-${label}`;
  // h < 1（UTC）= 還未到 09:00 Bali，屬前一天 16 時段
  const prev = new Date(ms - 86400 * 1000);
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}-16`;
}

function getBaliDateStr() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 主要來源：Bank Indonesia kurs_beli（銀行買價，較低）
async function fetchFromBI() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const dateStr = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;

  for (let i = 0; i <= 5; i++) {
    const ds = String(Number(dateStr) - i).padStart(8, '0');
    const url = `https://www.bi.go.id/biwebservice/wskursbi.asmx/getCursBI?mts=${ds}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
        'Accept': 'text/xml, application/xml, */*',
      },
    });
    if (!res.ok) continue;
    const xml = await res.text();
    const CODES = ['USD', 'AUD', 'SGD', 'HKD', 'MYR', 'CNY'];
    const rates = {};
    for (const code of CODES) {
      const re = new RegExp(`<nm_kurs>\\s*${code}\\s*<\\/nm_kurs>[\\s\\S]*?<kurs_beli>([\\d,.]+)<\\/kurs_beli>`, 'i');
      const match = xml.match(re);
      if (match) rates[code] = Math.round(parseFloat(match[1].replace(/,/g, '')));
    }
    if (Object.keys(rates).length >= 4) {
      return { rates, date: getBaliDateStr(), source: 'BI-kurs_beli' };
    }
  }
  return null;
}

// 備用來源：currency-api（Cloudflare Pages 託管，無 IP 限制，中間匯率）
async function fetchFromCurrencyAPI() {
  const CODES = ['usd', 'aud', 'sgd', 'hkd', 'myr', 'cny'];
  const url = 'https://latest.currency-api.pages.dev/v1/currencies/idr.json';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.idr) return null;

  const rates = {};
  for (const code of CODES) {
    const rate = data.idr[code];
    if (rate && rate > 0) {
      rates[code.toUpperCase()] = Math.round(1 / rate);
    }
  }
  return Object.keys(rates).length >= 4 ? { rates, date: data.date || getBaliDateStr(), source: 'currency-api' } : null;
}

export async function onRequest(context) {
  try {
    const cache = caches.default;
    const slot = getCacheSlot();
    const cacheKey = new Request(
      new URL(`/api/exchange-rate?s=${slot}`, context.request.url).toString()
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=0, s-maxage=3600',
          'X-Cache': 'HIT',
        },
      });
    }

    // 先試 BI（有買/賣價），失敗再用 currency-api（中間匯率）
    const result = await fetchFromBI() || await fetchFromCurrencyAPI();
    if (!result) throw new Error('All exchange rate sources unavailable');

    const ttl = secondsUntilNextUpdate();
    const body = JSON.stringify({ date: result.date, rates: result.rates, source: result.source });

    context.waitUntil(
      cache.put(cacheKey, new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
        },
      }))
    );

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}`,
        'X-Cache': 'MISS',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  }
}
