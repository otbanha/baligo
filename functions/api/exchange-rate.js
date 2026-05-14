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
const CODES = ['USD', 'AUD', 'SGD', 'HKD', 'MYR', 'CNY'];

// 市場參考價額外調整（從BI買入價再扣，貼近換匯所實際行情）
const MARKET_ADJUST = {
  USD: 300,
  AUD: 350,
  SGD: 350,
  HKD: 150,
  MYR: 400,
  CNY: 90,
};

// 中間價與銀行買入價的典型差距（根據 BCA E-Rate 實際觀察值）
const BANK_SPREAD = {
  USD: 150,
  AUD: 140,
  SGD: 125,
  HKD: 25,
  MYR: 60,
  CNY: 80,
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

function getSlotDateTimeStr() {
  const utcH = new Date().getUTCHours();
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  let slotLabel = null;
  for (const s of SLOTS) {
    if (utcH >= s.utc) slotLabel = s.label;
  }
  if (slotLabel) {
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${day} ${slotLabel}:00`;
  }
  const prev = new Date(ms - 86400 * 1000);
  return `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-${String(prev.getUTCDate()).padStart(2, '0')} 16:00`;
}

function getBaliDate() {
  const ms = Date.now() + 8 * 3600 * 1000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// Source 1: Bank Indonesia SOAP — KURS_BELI（BI 買入價）
async function fetchFromBI() {
  const date = getBaliDate();
  const url = `https://www.bi.go.id/biwebservice/wskursbi.asmx/getKursTransaksi?startdate=${date}&enddate=${date}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/xml,application/xml,*/*',
    },
  });
  if (!res.ok) return null;
  const xml = await res.text();
  if (!xml.includes('KODE_MATA_UANG')) return null;

  const rates = {};
  const tableRe = /<Table[^>]*>([\s\S]*?)<\/Table>/g;
  let m;
  while ((m = tableRe.exec(xml)) !== null) {
    const block = m[1];
    const codeM  = block.match(/<KODE_MATA_UANG>([^<]+)<\/KODE_MATA_UANG>/);
    const beliM  = block.match(/<KURS_BELI>([^<]+)<\/KURS_BELI>/);
    if (codeM && beliM) {
      const code = codeM[1].trim();
      if (CODES.includes(code)) {
        rates[code] = Math.round(parseFloat(beliM[1]));
      }
    }
  }
  return Object.keys(rates).length >= 4 ? { rates, source: 'BI-beli' } : null;
}

// Source 2: currency-api 中間價減銀行差價（近似買入價）
async function fetchFromCurrencyAPI() {
  const url = 'https://latest.currency-api.pages.dev/v1/currencies/idr.json';
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.idr) return null;

  const rates = {};
  for (const code of CODES) {
    const mid = Math.round(1 / data.idr[code.toLowerCase()]);
    if (mid > 0) {
      const spread = BANK_SPREAD[code] ?? 100;
      rates[code] = Math.max(1, mid - spread);
    }
  }
  return Object.keys(rates).length >= 4 ? { rates, source: 'currency-api-buy' } : null;
}

async function fetchRates() {
  const result =
    await fetchFromBI().catch(() => null) ||
    await fetchFromCurrencyAPI().catch(() => null);

  if (!result) return null;
  for (const code of CODES) {
    if (result.rates[code] != null && MARKET_ADJUST[code]) {
      result.rates[code] = Math.max(1, result.rates[code] - MARKET_ADJUST[code]);
    }
  }
  result.rates['TWD'] = TWD_FIXED;
  result.date = getSlotDateTimeStr();
  return result;
}

export async function onRequest(context) {
  try {
    const cache = caches.default;
    const slot = getCacheSlot();
    const cacheKey = new Request(
      new URL(`/api/exchange-rate?v=6&s=${slot}`, context.request.url).toString()
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
