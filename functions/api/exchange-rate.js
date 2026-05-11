// 峇里島時間 = UTC+8，每天 11:00 AM WITA = 03:00 UTC
function secondsUntilNext11amBali() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (now.getUTCHours() >= 3) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return Math.max(60, Math.floor((next - now) / 1000));
}

// 取得峇里島日期字串（往回 daysBack 天），回傳 { str: 'YYYYMMDD', display: 'YYYY-MM-DD' }
function getBaliDateStr(daysBack = 0) {
  const ms = Date.now() + 8 * 3600 * 1000 - daysBack * 86400 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return { str: `${y}${m}${day}`, display: `${y}-${m}-${day}` };
}

// 向 Bank Indonesia 官方 API 抓指定日期的 kurs tengah（中間匯率）
async function fetchBIRates(dateStr) {
  const url = `https://www.bi.go.id/biwebservice/wskursbi.asmx/getCursBI?mts=${dateStr}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const xml = await res.text();

  const CODES = ['USD', 'AUD', 'SGD', 'HKD', 'MYR', 'CNY'];
  const rates = {};
  for (const code of CODES) {
    const re = new RegExp(
      `<nm_kurs>\\s*${code}\\s*<\\/nm_kurs>[\\s\\S]*?<kurs_tengah>([\\d,.]+)<\\/kurs_tengah>`,
      'i'
    );
    const match = xml.match(re);
    if (match) {
      rates[code] = Math.round(parseFloat(match[1].replace(/,/g, '')));
    }
  }
  return Object.keys(rates).length >= 4 ? rates : null;
}

export async function onRequest(context) {
  try {
    // ── Cloudflare Edge Cache：快取到下一個峇里島 10:00 AM ──
    const cache = caches.default;
    const cacheKey = new Request(
      new URL('/api/exchange-rate', context.request.url).toString()
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('X-Cache', 'HIT');
      return new Response(cached.body, { headers });
    }

    // ── Cache miss：向 Bank Indonesia 抓最新匯率（週末/假日往回找最多 5 天）──
    let rates = null;
    let dateDisplay = '';
    for (let i = 0; i <= 5; i++) {
      const { str, display } = getBaliDateStr(i);
      rates = await fetchBIRates(str);
      if (rates) { dateDisplay = display; break; }
    }
    if (!rates) throw new Error('BI API unavailable');

    const ttl = secondsUntilNext11amBali();
    const body = JSON.stringify({ date: dateDisplay, rates, source: 'Bank Indonesia' });
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
      'X-Cache': 'MISS',
      'X-TTL': String(ttl),
    };

    context.waitUntil(
      cache.put(cacheKey, new Response(body, { headers }))
    );

    return new Response(body, { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
