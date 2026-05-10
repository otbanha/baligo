// 峇里島時間 = UTC+8，每天 10:00 AM WITA = 02:00 UTC
function secondsUntilNext10amBali() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(2, 0, 0, 0); // 02:00 UTC = 10:00 AM WITA
  if (now.getUTCHours() >= 2) {
    next.setUTCDate(next.getUTCDate() + 1); // 已過今天 10am → 等明天
  }
  return Math.max(60, Math.floor((next - now) / 1000));
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
      // 直接回傳 edge cache 結果（加上 CORS header）
      const headers = new Headers(cached.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('X-Cache', 'HIT');
      return new Response(cached.body, { headers });
    }

    // ── Cache miss：向 Frankfurter 抓最新匯率 ──
    const res = await fetch(
      'https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR,AUD,SGD,HKD,MYR,CNY'
    );
    if (!res.ok) throw new Error('upstream error');
    const data = await res.json();

    const { IDR, AUD, SGD, HKD, MYR, CNY } = data.rates;
    const rates = {
      USD: Math.round(IDR - 500),
      AUD: Math.round(IDR / AUD - 370),
      SGD: Math.round(IDR / SGD - 500),
      HKD: Math.round(IDR / HKD - 200),
      MYR: Math.round(IDR / MYR - 480),
      CNY: Math.round(IDR / CNY - 150),
    };

    const ttl = secondsUntilNext10amBali();
    const body = JSON.stringify({ date: data.date, rates });
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
      'X-Cache': 'MISS',
      'X-TTL': String(ttl),
    };

    // 存入 edge cache（到下一個峇里島 10:00 AM 過期）
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
