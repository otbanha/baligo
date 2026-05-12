// 每天 09:00–16:00 Bali 每 2 小時更新一次（09/11/13/15/16）
// UTC 對應：01/03/05/07/08
const SLOTS = [
  { utc: 1,  label: '09' },
  { utc: 3,  label: '11' },
  { utc: 5,  label: '13' },
  { utc: 7,  label: '15' },
  { utc: 8,  label: '16' },
];

// TWD 在印尼銀行流通性低，使用固定參考值
const TWD_FIXED = 350;

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

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

const CODES = ['USD', 'AUD', 'SGD', 'HKD', 'MYR', 'CNY'];

// Source 1: BCA E-Rate（買入價 = 旅客用外幣換印尼盾）
async function fetchFromBCA() {
  const res = await fetch('https://www.bca.co.id/api/kurs/main/GetKursData', {
    method: 'POST',
    headers: {
      ...BROWSER_HEADERS,
      'Content-Type': 'application/json',
      'Origin': 'https://www.bca.co.id',
      'Referer': 'https://www.bca.co.id/en/informasi/kurs',
    },
    body: JSON.stringify({ KursType: 'E-Rate', CurrencyCode: '' }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.Status !== '00' || !Array.isArray(data.Data)) return null;

  const rates = {};
  for (const item of data.Data) {
    if (CODES.includes(item.CurrencyCode) && item.BuyRate > 0) {
      rates[item.CurrencyCode] = Math.round(item.BuyRate);
    }
  }
  return Object.keys(rates).length >= 4 ? { rates, source: 'BCA' } : null;
}

// Source 2: Bank Indonesia SOAP（中間價）
async function fetchFromBI() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const url = `https://www.bi.go.id/biwebservice/wskursbi.asmx/getKursTransaksi?startdate=${date}&enddate=${date}`;
  const res = await fetch(url, {
    headers: { ...BROWSER_HEADERS, 'Accept': 'text/xml' },
  });
  if (!res.ok) return null;
  const xml = await res.text();

  const rates = {};
  const tableRe = /<Table[^>]*>([\s\S]*?)<\/Table>/g;
  let m;
  while ((m = tableRe.exec(xml)) !== null) {
    const block = m[1];
    const codeM = block.match(/<KODE_MATA_UANG>([^<]+)<\/KODE_MATA_UANG>/);
    const tengahM = block.match(/<KURS_TENGAH>([^<]+)<\/KURS_TENGAH>/);
    if (codeM && tengahM) {
      const code = codeM[1].trim();
      if (CODES.includes(code)) {
        rates[code] = Math.round(parseFloat(tengahM[1]));
      }
    }
  }
  return Object.keys(rates).length >= 4 ? { rates, source: 'BI' } : null;
}

// Source 3: currency-api（後備）
async function fetchFromCurrencyAPI() {
  const url = 'https://latest.currency-api.pages.dev/v1/currencies/idr.json';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.idr) return null;

  const rates = {};
  for (const code of CODES) {
    const mid = Math.round(1 / data.idr[code.toLowerCase()]);
    if (mid > 0) rates[code] = mid;
  }
  return Object.keys(rates).length >= 4 ? { rates, source: 'currency-api' } : null;
}

async function fetchRates() {
  const result =
    await fetchFromBCA().catch(() => null) ||
    await fetchFromBI().catch(() => null) ||
    await fetchFromCurrencyAPI().catch(() => null);

  if (!result) return null;

  // 加入固定 TWD
  result.rates['TWD'] = TWD_FIXED;
  result.date = getBaliDateTimeStr();
  return result;
}

export async function onRequest(context) {
  try {
    const cache = caches.default;
    const slot = getCacheSlot();
    const cacheKey = new Request(
      new URL(`/api/exchange-rate?v=4&s=${slot}`, context.request.url).toString()
    );

    const cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          'X-Cache': 'HIT',
        },
      });
    }

    const result = await fetchRates();
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
        'Cache-Control': 'no-store',
        'X-Cache': 'MISS',
        'X-Source': result.source,
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
