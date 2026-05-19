#!/usr/bin/env node
/**
 * 抓取峇里島機車租賃店位置資料
 * 來源：OpenStreetMap via Overpass API
 * 授權：© OpenStreetMap contributors (ODbL)
 * 輸出：public/maps/motorbike-rental.kml + scripts/motorbike-rental-data.json
 *
 * 用法：node scripts/fetch-motorbike-rentals.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const KML_OUT = path.join(ROOT, 'public/maps/motorbike-rental.kml');
const JSON_OUT = path.join(ROOT, 'scripts/motorbike-rental-data.json');

// Union query：OSM 峇里島租機車店的各種標記方式
const OVERPASS_QUERY = `[out:json][timeout:90];
area["name"="Bali"]["admin_level"="4"]->.bali;
(
  nwr["amenity"="motorcycle_rental"](area.bali);
  nwr["amenity"="bicycle_rental"]["motorcycle"="yes"](area.bali);
  nwr["shop"="motorcycle"]["rental"="yes"](area.bali);
  nwr["shop"="motorcycle"]["service:vehicle:rental"="yes"](area.bali);
  nwr["shop"="motorcycle"]["motorcycle:rental"="yes"](area.bali);
  nwr["rental"~"motorcycle|scooter|motorbike",i](area.bali);
  nwr["name"~"rent|sewa|rental",i]["name"~"bike|motor|scooter|motorbike",i](area.bali);
);
out center tags;`;

// ─── Retry fetch ─────────────────────────────────────────────────────────────

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Area detection ───────────────────────────────────────────────────────────

const AREAS = [
  { name: 'Kuta / Legian / Seminyak', latMin: -8.760, latMax: -8.650, lngMin: 115.140, lngMax: 115.210 },
  { name: 'Canggu / Berawa',          latMin: -8.690, latMax: -8.610, lngMin: 115.095, lngMax: 115.165 },
  { name: 'Ubud',                     latMin: -8.560, latMax: -8.450, lngMin: 115.220, lngMax: 115.340 },
  { name: 'Sanur',                    latMin: -8.760, latMax: -8.670, lngMin: 115.240, lngMax: 115.300 },
  { name: 'Uluwatu / Bukit',          latMin: -8.910, latMax: -8.770, lngMin: 115.060, lngMax: 115.200 },
  { name: 'Nusa Dua / Jimbaran',      latMin: -8.850, latMax: -8.760, lngMin: 115.140, lngMax: 115.270 },
  { name: 'Denpasar',                 latMin: -8.730, latMax: -8.620, lngMin: 115.185, lngMax: 115.265 },
  { name: 'Nusa Penida',              latMin: -8.800, latMax: -8.640, lngMin: 115.400, lngMax: 115.610 },
  { name: 'Nusa Lembongan / Ceningan',latMin: -8.710, latMax: -8.660, lngMin: 115.420, lngMax: 115.490 },
  { name: 'Gianyar',                  latMin: -8.620, latMax: -8.470, lngMin: 115.310, lngMax: 115.460 },
  { name: 'Tabanan',                  latMin: -8.700, latMax: -8.520, lngMin: 114.900, lngMax: 115.130 },
  { name: 'Singaraja (North Bali)',   latMin: -8.250, latMax: -8.050, lngMin: 114.950, lngMax: 115.250 },
  { name: 'Karangasem (East Bali)',   latMin: -8.550, latMax: -8.250, lngMin: 115.380, lngMax: 115.720 },
  { name: 'Klungkung',                latMin: -8.580, latMax: -8.500, lngMin: 115.370, lngMax: 115.520 },
];

function detectArea(lat, lng) {
  for (const area of AREAS) {
    if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
      return area.name;
    }
  }
  return 'Lainnya (Bali)';
}

// ─── Tags source detection ────────────────────────────────────────────────────

function detectTagsSource(tags) {
  const t = tags || {};
  if (t.amenity === 'motorcycle_rental') return 'amenity=motorcycle_rental';
  if (t.amenity === 'bicycle_rental' && t.motorcycle === 'yes') return 'bicycle_rental+motorcycle=yes';
  if (t.shop === 'motorcycle' && t.rental === 'yes') return 'shop=motorcycle+rental=yes';
  if (t.shop === 'motorcycle' && t['service:vehicle:rental'] === 'yes') return 'shop=motorcycle+service:vehicle:rental=yes';
  if (t.shop === 'motorcycle' && t['motorcycle:rental'] === 'yes') return 'shop=motorcycle+motorcycle:rental=yes';
  if (t.rental && /motorcycle|scooter|motorbike/i.test(t.rental)) return `rental=${t.rental}`;
  if (t.name && /rent|sewa|rental/i.test(t.name) && /bike|motor|scooter|motorbike/i.test(t.name)) return 'name~rent+bike';
  return 'unknown';
}

// ─── Noise filter ─────────────────────────────────────────────────────────────

const NOISE_NAME_RE = /service|servis|bengkel|repair|workshop|cuci|wash|spare|sparepart/i;
const RENTAL_TAGS = ['rental', 'amenity', 'motorcycle:rental', 'service:vehicle:rental'];

function hasRentalTag(tags) {
  const t = tags || {};
  if (t.amenity === 'motorcycle_rental' || t.amenity === 'bicycle_rental') return true;
  if (RENTAL_TAGS.some(k => t[k] && /motorcycle|scooter|motorbike|yes/i.test(t[k]))) return true;
  if (t['service:vehicle:rental'] === 'yes' || t['motorcycle:rental'] === 'yes') return true;
  return false;
}

function shouldExclude(el) {
  const t = el.tags || {};

  // 排除汽車相關
  if (t.shop === 'car' || t.amenity === 'car_rental') return true;

  // shop=motorcycle 但沒有任何 rental tag → 賣車店或維修廠
  if (t.shop === 'motorcycle' && !hasRentalTag(t)) return true;

  // 名稱含維修/洗車關鍵字且沒有 rental tag
  const name = t.name || '';
  if (NOISE_NAME_RE.test(name) && !hasRentalTag(t)) return true;

  return false;
}

// ─── Coordinate extractor (way/relation use center) ──────────────────────────

function getCoords(el) {
  if (el.type === 'node') return { lat: el.lat, lng: el.lon };
  if (el.center) return { lat: el.center.lat, lng: el.center.lon };
  return null;
}

// ─── XML escape ───────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Querying Overpass API for Bali motorbike rentals…');
  const queryUrl = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const res = await fetchWithRetry(queryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'gobaligo-motorbike-rental-fetcher/1.0 (https://gobaligo.id)',
    },
  });

  const data = await res.json();
  const raw = data.elements || [];
  console.log(`Raw elements from Overpass: ${raw.length}`);

  // ── Filter out noise ─────────────────────────────────────────────────────
  const afterNoise = raw.filter(el => !shouldExclude(el));
  console.log(`After noise filter: ${afterNoise.length} (removed ${raw.length - afterNoise.length})`);

  // ── Deduplicate by name + ~50m rounded coordinate ────────────────────────
  const seen = new Set();
  const deduped = [];
  for (const el of afterNoise) {
    const coords = getCoords(el);
    if (!coords) continue;
    const name = (el.tags?.name || '').toLowerCase().trim();
    // Round to 4 decimal places ≈ 11m grid; use name+grid as key
    const key = `${name}|${coords.lat.toFixed(4)},${coords.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...el, _coords: coords });
  }
  console.log(`After dedup: ${deduped.length} (removed ${afterNoise.length - deduped.length})`);

  // ── Enrich and group by area ──────────────────────────────────────────────
  const byArea = {};
  const areaStats = {};
  const sourceStats = {};

  for (const el of deduped) {
    const t = el.tags || {};
    const { lat, lng } = el._coords;
    const area = detectArea(lat, lng);
    const tagsSource = detectTagsSource(t);

    const record = {
      id: el.id,
      osm_type: el.type,
      name: t.name || '未命名租車店',
      lat,
      lng,
      area,
      tags_source: tagsSource,
      phone: t.phone || t['contact:phone'] || null,
      website: t.website || t['contact:website'] || null,
      opening_hours: t.opening_hours || null,
      osm_url: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    };

    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(record);

    areaStats[area] = (areaStats[area] || 0) + 1;
    sourceStats[tagsSource] = (sourceStats[tagsSource] || 0) + 1;
  }

  // ── Print stats ───────────────────────────────────────────────────────────
  console.log('\n── By area ────────────────────────────────────');
  for (const [area, count] of Object.entries(areaStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${area}: ${count}`);
  }

  console.log('\n── By tags_source ─────────────────────────────');
  for (const [src, count] of Object.entries(sourceStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }

  const total = deduped.length;
  console.log(`\nTotal motorbike rental shops: ${total}`);

  // ── Save JSON backup ──────────────────────────────────────────────────────
  const allRecords = Object.values(byArea).flat();
  fs.writeFileSync(JSON_OUT, JSON.stringify(allRecords, null, 2), 'utf-8');
  console.log(`\nJSON saved → ${JSON_OUT}`);

  // ── Build KML ─────────────────────────────────────────────────────────────
  const AREA_ORDER = [
    'Kuta / Legian / Seminyak',
    'Canggu / Berawa',
    'Ubud',
    'Sanur',
    'Uluwatu / Bukit',
    'Nusa Dua / Jimbaran',
    'Denpasar',
    'Nusa Penida',
    'Nusa Lembongan / Ceningan',
    'Gianyar',
    'Tabanan',
    'Singaraja (North Bali)',
    'Karangasem (East Bali)',
    'Klungkung',
    'Lainnya (Bali)',
  ];
  const sortedAreas = [
    ...AREA_ORDER.filter(a => byArea[a]),
    ...Object.keys(byArea).filter(a => !AREA_ORDER.includes(a)).sort(),
  ];

  const today = new Date().toISOString().slice(0, 10);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright -->
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>峇里島租機車據點 by gobaligo</name>
    <description>資料來源：OpenStreetMap © OpenStreetMap contributors | 最後更新：${today} | 總計 ${total} 間</description>
`;

  for (const area of sortedAreas) {
    const items = byArea[area];
    kml += `    <Folder>\n      <name>${escapeXml(area)}</name>\n`;

    for (const r of items) {
      const descParts = ['🛵 機車出租'];
      if (r.opening_hours) descParts.push(`🕐 ${r.opening_hours}`);
      if (r.phone) descParts.push(`📞 ${r.phone}`);
      if (r.website) descParts.push(`🌐 <a href="${r.website}" target="_blank" rel="noopener">${r.website}</a>`);
      descParts.push(`<a href="${r.osm_url}" target="_blank" rel="noopener">OpenStreetMap</a>`);

      kml += `      <Placemark>
        <name>${escapeXml(r.name)}</name>
        <description><![CDATA[${descParts.join('<br>')}]]></description>
        <Point>
          <coordinates>${r.lng},${r.lat},0</coordinates>
        </Point>
      </Placemark>\n`;
    }

    kml += `    </Folder>\n`;
  }

  kml += `  </Document>\n</kml>\n`;

  fs.writeFileSync(KML_OUT, kml, 'utf-8');
  console.log(`KML saved → ${KML_OUT}`);
  console.log(`\n✅ 完成：${total} 間租機車店寫入 KML，共 ${sortedAreas.length} 個區域分類`);
}

main().catch(err => { console.error(err); process.exit(1); });
