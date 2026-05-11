// 每天 09:00–16:00 Bali 每 2 小時更新一次（09/11/13/15/16）
// UTC 對應：01/03/05/07/08
const SLOTS = [
  { utc: 1,  label: '09' },  // 09:00 Bali
  { utc: 3,  label: '11' },  // 11:00 Bali
  { utc: 5,  label: '13' },  // 13:00 Bali
  { utc: 7,  label: '15' },  // 15:00 Bali
  { utc: 8,  label: '16' },  // 16:00 Bali（最後一次，持續到隔日09:00）
];

// 中間價扣除值（模擬換匯所買入價）
const DEDUCTIONS = {
  USD: 450,
  AUD: 400,
  SGD: 400,
  MYR: 450,
  HKD: 190,
  CNY: 100,
};

function secondsUntilNextUpdate() {
  const now = new Date();
  const h = now.getUTCHours();
  const next = new Date(now);
  const nextSlot = SLOTS.find(s => s.utc > h);
  if (nextSlot) {
    next.setUTCHours(nextSlot.utc, 0, 0, 0);
  } else {
    next.setUTCDate(next.getUTCDate() + 1);
    next.setUTCHours(1, 0, 0, 0);
  }
  return Math.max(60, Math.floor((next - now) / 1000));
}

function getCacheSlot() {
  const h = new Date().getUTCHours();
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  let label = null;
  for (const s of SLOTS) {
    if (h >= s.utc) label = s.label;
  }
  if (label) return `${date}-${label}`;
  const prev = new Date(ms - 86400 * 1000);
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')}-16`;
}

function getBaliDateTimeStr() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

// 唯一來源：currency-api 市場中間價，扣除固定值後顯示
async function fetchRates() {
  const CODES = ['usd', 'aud', 'sgd', 'hkd', 'myr', 'cny'];
  const url = 'https://latest.currency-api.pages.dev/v1/currencies/idr.json';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.idr) return null;

  const rates = {};
  for (const code of CODES) {
    const mid = Math.round(1 / data.idr[code]);
    if (mid > 0) {
      const deduct = DEDUCTIONS[code.toUpperCase()] ?? 0;
      rates[code.toUpperCase()] = Math.max(1, mid - deduct);
    }
  }
  return Object.keys(rates).length >= 4
    ? { rates, date: getBaliDateTimeStr() }
    : null;
}

export async function onRequest(context) {
  try {
    const cache = caches.default;
    const slot = getCacheSlot();
    const cacheKey = new Request(
      new URL(`/api/exchange-rate?v=3&s=${slot}`, context.request.url).toString()
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

    const result = await fetchRates();
    if (!result) throw new Error('Exchange rate source unavailable');

    const ttl = secondsUntilNextUpdate();
    const body = JSON.stringify({ date: result.date, rates: result.rates });

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
