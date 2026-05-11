// 峇里島時間 = UTC+8，每天更新
function secondsUntilNext11amBali() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (now.getUTCHours() >= 3) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return Math.max(60, Math.floor((next - now) / 1000));
}

function getBaliDateStr() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 主要來源：currency-api（Cloudflare Pages 託管，無 IP 限制）
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
  return Object.keys(rates).length >= 4 ? { rates, date: data.date || getBaliDateStr() } : null;
}

// 備用來源：Bank Indonesia（需 Cloudflare IP）
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
      const re = new RegExp(`<nm_kurs>\\s*${code}\\s*<\\/nm_kurs>[\\s\\S]*?<kurs_tengah>([\\d,.]+)<\\/kurs_tengah>`, 'i');
      const match = xml.match(re);
      if (match) rates[code] = Math.round(parseFloat(match[1].replace(/,/g, '')));
    }
    if (Object.keys(rates).length >= 4) {
      return { rates, date: getBaliDateStr() };
    }
  }
  return null;
}

export async function onRequest(context) {
  try {
    const cache = caches.default;
    const todayBali = getBaliDateStr();
    const cacheKey = new Request(
      new URL(`/api/exchange-rate?d=${todayBali}`, context.request.url).toString()
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

    // 先試主要來源，失敗再試備用
    const result = await fetchFromCurrencyAPI() || await fetchFromBI();
    if (!result) throw new Error('All exchange rate sources unavailable');

    const ttl = secondsUntilNext11amBali();
    const body = JSON.stringify({ date: result.date, rates: result.rates, source: 'currency-api' });

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
