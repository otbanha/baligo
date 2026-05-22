#!/usr/bin/env node
/**
 * 抓取峇里島超市位置資料
 * 來源：OpenStreetMap via Overpass API
 * 授權：© OpenStreetMap contributors (ODbL)
 * 輸出：public/maps/supermarket.kml + scripts/supermarket-data.json
 *
 * 篩選邏輯：白名單優先保留中大型超市，黑名單排除便利商店
 * 用法：node scripts/fetch-supermarkets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const KML_OUT = path.join(ROOT, 'public/maps/supermarket.kml');
const JSON_OUT = path.join(ROOT, 'scripts/supermarket-data.json');

const OVERPASS_QUERY = `[out:json][timeout:60];
area["name"="Bali"]["admin_level"="4"]->.bali;
(
  node["shop"="supermarket"](area.bali);
  way["shop"="supermarket"](area.bali);
  node["shop"="department_store"](area.bali);
  way["shop"="department_store"](area.bali);
  node["shop"="wholesale"](area.bali);
  way["shop"="wholesale"](area.bali);
);
out center tags;`;

// ─── Whitelist: 中大型超市品牌（必收）────────────────────────────────────────

const WHITELIST = [
  /pepito/i,
  /grand\s*lucky/i,
  /hardy['']?s/i,
  /hardys/i,
  /bali\s*deli/i,
  /carrefour/i,
  /transmart/i,
  /lotte\s*mart/i,
  /lottemart/i,
  /hypermart/i,
  /ranch\s*market/i,
  /farmers?\s*market/i,
  /papaya/i,
  /tiara\s*dewata/i,
  /coco\s*(supermarket|mart|express)/i,
  /frestive/i,
  /bintang\s*(supermarket|market|swalayan)/i,
  /delta\s*dewata/i,
  /nirmala/i,
  /popular/i,
];

// ─── Blacklist: 便利商店 / 小型門市（必排除）─────────────────────────────────

const BLACKLIST = [
  /indomaret/i,
  /alfamart/i,
  /alfa\s*express/i,
  /alfamidi/i,
  /circle\s*k/i,
  /circlek/i,
  /lawson/i,
  /family\s*mart/i,
  /familymart/i,
  /7[\s-]?eleven/i,
  /seven[\s-]?eleven/i,
  /mini\s*market/i,
  /minimarket/i,
  /minimart/i,
  /\btoko\b/i,
  /\bwarung\b/i,
  /\bpasar\b/i,
  /traditional\s*market/i,
];

// ─── Brand normalization ──────────────────────────────────────────────────────

const BRAND_PATTERNS = [
  { key: 'Pepito',              re: /pepito/i },
  { key: 'Grand Lucky',         re: /grand\s*lucky/i },
  { key: "Hardy's",             re: /hardy['']?s|hardys/i },
  { key: 'Bali Deli',           re: /bali\s*deli/i },
  { key: 'Carrefour / Transmart', re: /carrefour|transmart/i },
  { key: 'Lotte Mart',          re: /lotte\s*mart|lottemart/i },
  { key: 'Hypermart',           re: /hypermart/i },
  { key: 'Ranch Market',        re: /ranch\s*market/i },
  { key: 'Farmers Market',      re: /farmers?\s*market/i },
  { key: 'Papaya',              re: /papaya/i },
  { key: 'Tiara Dewata',        re: /tiara\s*dewata/i },
  { key: 'Coco Supermarket',    re: /coco\s*(supermarket|mart|express)/i },
  { key: 'Frestive',            re: /frestive/i },
  { key: 'Bintang Supermarket', re: /bintang/i },
  { key: 'Delta Dewata',        re: /delta\s*dewata/i },
  { key: 'Nirmala',             re: /nirmala/i },
  { key: 'Popular',             re: /popular/i },
];

function normalizeBrand(name, brand) {
  const combined = `${name || ''} ${brand || ''}`.trim();
  for (const { key, re } of BRAND_PATTERNS) {
    if (re.test(combined)) return key;
  }
  return 'Lainnya';
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function isBlacklisted(name, brand) {
  const combined = `${name || ''} ${brand || ''}`;
  return BLACKLIST.some(re => re.test(combined));
}

function isWhitelisted(name, brand) {
  const combined = `${name || ''} ${brand || ''}`;
  return WHITELIST.some(re => re.test(combined));
}

function shouldKeep(node) {
  const t = node.tags || {};
  const name = t.name || '';
  const brand = t.brand || '';

  if (isBlacklisted(name, brand)) return false;
  if (isWhitelisted(name, brand)) return true;

  // 未命中白名單但 shop=supermarket：name 含超市關鍵字則保留
  const KEEP_KEYWORDS = /supermarket|swalayan|grocery|fresh(?!mart)/i;
  if (KEEP_KEYWORDS.test(name)) return true;

  // 排除其他未確認的點位
  return false;
}

// ─── Area detection ───────────────────────────────────────────────────────────

const AREAS = [
  { name: 'Canggu',              latMin: -8.690, latMax: -8.610, lngMin: 115.095, lngMax: 115.160 },
  { name: 'Seminyak / Legian',   latMin: -8.730, latMax: -8.680, lngMin: 115.140, lngMax: 115.190 },
  { name: 'Kuta',                latMin: -8.780, latMax: -8.720, lngMin: 115.150, lngMax: 115.210 },
  { name: 'Denpasar',            latMin: -8.730, latMax: -8.620, lngMin: 115.185, lngMax: 115.265 },
  { name: 'Sanur',               latMin: -8.750, latMax: -8.670, lngMin: 115.250, lngMax: 115.300 },
  { name: 'Nusa Dua / Jimbaran', latMin: -8.870, latMax: -8.760, lngMin: 115.140, lngMax: 115.270 },
  { name: 'Uluwatu',             latMin: -8.910, latMax: -8.790, lngMin: 115.060, lngMax: 115.200 },
  { name: 'Ubud',                latMin: -8.560, latMax: -8.450, lngMin: 115.220, lngMax: 115.340 },
  { name: 'Gianyar',             latMin: -8.620, latMax: -8.470, lngMin: 115.310, lngMax: 115.460 },
  { name: 'Tabanan',             latMin: -8.700, latMax: -8.520, lngMin: 114.900, lngMax: 115.130 },
  { name: 'Singaraja (North Bali)', latMin: -8.250, latMax: -8.050, lngMin: 114.950, lngMax: 115.250 },
  { name: 'Karangasem (East Bali)', latMin: -8.550, latMax: -8.250, lngMin: 115.380, lngMax: 115.720 },
  { name: 'Klungkung',           latMin: -8.580, latMax: -8.500, lngMin: 115.370, lngMax: 115.520 },
];

function detectArea(lat, lng) {
  for (const area of AREAS) {
    if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
      return area.name;
    }
  }
  return 'Lainnya (Bali)';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, maxRetries = 3, delayMs = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      const err = new Error(`HTTP ${res.status}: ${res.statusText}`);
      if (!retryable || attempt === maxRetries) throw err;
      console.warn(`  Attempt ${attempt}/${maxRetries} failed (HTTP ${res.status}), retrying in ${delayMs / 1000}s…`);
      await sleep(delayMs);
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`  Attempt ${attempt}/${maxRetries} error: ${err.message}, retrying in ${delayMs / 1000}s…`);
      await sleep(delayMs);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Querying Overpass API for Bali supermarkets…');
  const queryUrl = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const res = await fetchWithRetry(queryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'gobaligo-supermarket-fetcher/1.0 (https://gobaligo.id)',
    },
  });

  const data = await res.json();
  const raw = data.elements || [];
  console.log(`Raw elements from Overpass: ${raw.length}`);

  // ── Normalize coordinates (way elements use center) ──────────────────────
  const normalized = raw.map(el => ({
    ...el,
    lat: el.lat ?? el.center?.lat,
    lon: el.lon ?? el.center?.lon,
  })).filter(el => el.lat && el.lon);

  // ── Deduplicate by rounded coordinate ────────────────────────────────────
  const seen = new Set();
  const deduped = [];
  for (const el of normalized) {
    const key = `${el.lat.toFixed(5)},${el.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(el);
  }
  console.log(`After dedup: ${deduped.length}`);

  // ── Apply whitelist / blacklist filter ───────────────────────────────────
  const kept = [];
  const removed = [];
  for (const el of deduped) {
    if (shouldKeep(el)) {
      kept.push(el);
    } else {
      removed.push(el);
    }
  }

  console.log(`After whitelist/blacklist filter: ${kept.length} kept, ${removed.length} removed`);

  if (removed.length > 0 && process.env.VERBOSE) {
    console.log('\nRemoved:');
    for (const el of removed) {
      console.log(`  - ${el.tags?.name || '(no name)'} [${el.tags?.brand || ''}]`);
    }
  }

  // ── Group by brand ────────────────────────────────────────────────────────
  const byBrand = {};
  const brandStats = {};
  const areaStats = {};

  for (const el of kept) {
    const t = el.tags || {};
    const brand = normalizeBrand(t.name, t.brand);
    const area = detectArea(el.lat, el.lon);

    if (!byBrand[brand]) byBrand[brand] = [];
    byBrand[brand].push({ ...el, _brand: brand, _area: area });

    brandStats[brand] = (brandStats[brand] || 0) + 1;
    areaStats[area] = (areaStats[area] || 0) + 1;
  }

  // Print stats
  console.log('\n── By brand ───────────────────────────────────');
  for (const [brand, count] of Object.entries(brandStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${brand}: ${count}`);
  }
  console.log('\n── By area ────────────────────────────────────');
  for (const [area, count] of Object.entries(areaStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${area}: ${count}`);
  }

  const total = kept.length;
  console.log(`\nTotal supermarkets: ${total}`);

  if (total < 50) {
    console.warn('⚠️  WARNING: Less than 50 points — whitelist may be too strict');
  } else if (total > 400) {
    console.warn('⚠️  WARNING: More than 400 points — convenience stores may not be filtered');
  }

  // ── Save JSON backup ──────────────────────────────────────────────────────
  fs.writeFileSync(JSON_OUT, JSON.stringify(kept, null, 2), 'utf-8');
  console.log(`\nJSON saved → ${JSON_OUT}`);

  // ── Build KML ─────────────────────────────────────────────────────────────
  const BRAND_ORDER = [
    'Pepito', 'Grand Lucky', "Hardy's", 'Bali Deli', 'Carrefour / Transmart',
    'Lotte Mart', 'Hypermart', 'Ranch Market', 'Farmers Market', 'Papaya',
    'Tiara Dewata', 'Coco Supermarket', 'Frestive', 'Bintang Supermarket',
    'Delta Dewata', 'Nirmala', 'Popular',
  ];
  const sortedBrands = [
    ...BRAND_ORDER.filter(b => byBrand[b]),
    ...Object.keys(byBrand).filter(b => !BRAND_ORDER.includes(b) && b !== 'Lainnya').sort(),
    ...(byBrand['Lainnya'] ? ['Lainnya'] : []),
  ];

  const today = new Date().toISOString().slice(0, 10);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright -->
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>峇里島超市地圖 by gobaligo</name>
    <description>資料來源：OpenStreetMap © OpenStreetMap contributors | 最後更新：${today} | 總計 ${total} 間</description>
`;

  for (const brand of sortedBrands) {
    const items = byBrand[brand];
    kml += `    <Folder>\n      <name>${escapeXml(brand)}</name>\n`;

    for (const el of items) {
      const t = el.tags || {};
      const displayName = t.name || brand;

      const descParts = [];
      if (el._area) descParts.push(`📍 ${el._area}`);
      if (t['addr:street'] || t['addr:full']) {
        descParts.push(`🗺️ ${t['addr:full'] || t['addr:street'] || ''}`);
      }
      if (t.opening_hours) descParts.push(`⏰ ${t.opening_hours}`);
      if (t.phone) descParts.push(`📞 ${t.phone}`);
      if (t.website) descParts.push(`🌐 <a href="${escapeXml(t.website)}" target="_blank" rel="noopener">${escapeXml(t.website)}</a>`);
      descParts.push(`<a href="https://www.openstreetmap.org/${el.type || 'node'}/${el.id}" target="_blank" rel="noopener">OpenStreetMap</a>`);

      kml += `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <description><![CDATA[${descParts.join('<br>')}]]></description>
        <Point>
          <coordinates>${el.lon},${el.lat},0</coordinates>
        </Point>
      </Placemark>\n`;
    }

    kml += `    </Folder>\n`;
  }

  kml += `  </Document>\n</kml>\n`;

  fs.writeFileSync(KML_OUT, kml, 'utf-8');
  console.log(`KML saved → ${KML_OUT}`);
  console.log(`\n✅ 完成：${total} 間超市寫入 KML，共 ${sortedBrands.length} 個品牌分類`);
}

main().catch(err => { console.error(err); process.exit(1); });
