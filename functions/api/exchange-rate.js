// 每天兩次更新：10:00 Bali (02:00 UTC) 和 17:00 Bali (09:00 UTC)
function secondsUntilNextUpdate() {
  const now = new Date();
  const h = now.getUTCHours();
  const next = new Date(now);
  if (h < 2) {
    next.setUTCHours(2, 0, 0, 0);           // 今天 10:00 Bali
  } else if (h < 9) {
    next.setUTCHours(9, 0, 0, 0);           // 今天 17:00 Bali
  } else {
    next.setUTCDate(next.getUTCDate() + 1);  // 明天 10:00 Bali
    next.setUTCHours(2, 0, 0, 0);
  }
  return Math.max(60, Math.floor((next - now) / 1000));
}

// cache key 時段：am = 10:00–17:00 Bali，pm = 17:00–隔日10:00 Bali
function getCacheSlot() {
  const h = new Date().getUTCHours();
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  if (h >= 2 && h < 9) return `${date}-am`;  // 10:00–17:00 Bali
  if (h >= 9) return `${date}-pm`;            // 17:00+ Bali
  // 00:00–02:00 UTC = 08:00–10:00 Bali，仍屬前一天 pm 時段
  const prev = new Date(ms - 86400 * 1000);
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}-pm`;
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
