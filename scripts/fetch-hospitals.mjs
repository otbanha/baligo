#!/usr/bin/env node
/**
 * 抓取峇里島醫院 / 診所位置資料
 * 來源：OpenStreetMap via Overpass API
 * 授權：© OpenStreetMap contributors (ODbL)
 * 輸出：public/maps/hospital.kml + scripts/hospital-data.json
 *
 * 用法：node scripts/fetch-hospitals.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const KML_OUT  = path.join(ROOT, 'public/maps/hospital.kml');
const JSON_OUT = path.join(ROOT, 'scripts/hospital-data.json');

const OVERPASS_QUERY = `[out:json][timeout:60];
area["name"="Bali"]["admin_level"="4"]->.bali;
(
  node["amenity"="hospital"](area.bali);
  way["amenity"="hospital"](area.bali);
  node["amenity"="clinic"](area.bali);
  way["amenity"="clinic"](area.bali);
  node["amenity"="doctors"](area.bali);
  way["amenity"="doctors"](area.bali);
);
out center body;`;

// ─── Retry fetch ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url, opts, maxRetries = 3, delayMs = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, opts);
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Known international / prominent hospitals (keyword match on name) ────────

const INTL_PATTERNS = [
  /\bbimc\b/i,
  /\bsiloam\b/i,
  /kasih ibu/i,
  /prima medika/i,
  /bali royal/i,
  /\bbros\b/i,
  /mandaya/i,
  /sanglah/i,
  /udayana/i,
  /wangaya/i,
  /sos medik/i,
  /international/i,
  /\bintl\b/i,
];

function isInternational(name) {
  return INTL_PATTERNS.some(re => re.test(name));
}

// ─── Category logic ──────────────────────────────────────────────────────────

function categorize(el) {
  const t   = el.tags || {};
  const name = t.name || t['name:en'] || '';
  const amenity = t.amenity || '';
  const oh  = (t.opening_hours || '').toLowerCase();
  const is24h = oh.includes('24/7') || oh.includes('24 hours');

  if (isInternational(name)) return '國際醫院';
  if (amenity === 'hospital')  return is24h ? '24H 急診醫院' : '醫院';
  if (is24h)                   return '24H 診所';
  return '診所';
}

// ─── Category display order ───────────────────────────────────────────────────

const CAT_ORDER = ['國際醫院', '24H 急診醫院', '醫院', '24H 診所', '診所'];

// ─── Area detection (same bounding boxes as ATM script) ──────────────────────

const AREAS = [
  { name: 'Canggu',               latMin: -8.690, latMax: -8.610, lngMin: 115.095, lngMax: 115.160 },
  { name: 'Seminyak / Legian',    latMin: -8.730, latMax: -8.680, lngMin: 115.140, lngMax: 115.190 },
  { name: 'Kuta',                 latMin: -8.780, latMax: -8.720, lngMin: 115.150, lngMax: 115.210 },
  { name: 'Denpasar',             latMin: -8.730, latMax: -8.620, lngMin: 115.185, lngMax: 115.265 },
  { name: 'Sanur',                latMin: -8.750, latMax: -8.670, lngMin: 115.250, lngMax: 115.300 },
  { name: 'Nusa Dua / Jimbaran',  latMin: -8.870, latMax: -8.760, lngMin: 115.140, lngMax: 115.270 },
  { name: 'Uluwatu',              latMin: -8.910, latMax: -8.790, lngMin: 115.060, lngMax: 115.200 },
  { name: 'Ubud',                 latMin: -8.560, latMax: -8.450, lngMin: 115.220, lngMax: 115.340 },
  { name: 'Gianyar',              latMin: -8.620, latMax: -8.470, lngMin: 115.310, lngMax: 115.460 },
  { name: 'Tabanan',              latMin: -8.700, latMax: -8.520, lngMin: 114.900, lngMax: 115.130 },
  { name: 'Singaraja (North Bali)',latMin: -8.250, latMax: -8.050, lngMin: 114.950, lngMax: 115.250 },
  { name: 'Karangasem (East Bali)',latMin: -8.550, latMax: -8.250, lngMin: 115.380, lngMax: 115.720 },
  { name: 'Klungkung',            latMin: -8.580, latMax: -8.500, lngMin: 115.370, lngMax: 115.520 },
];

function detectArea(lat, lng) {
  for (const a of AREAS) {
    if (lat >= a.latMin && lat <= a.latMax && lng >= a.lngMin && lng <= a.lngMax) return a.name;
  }
  return 'Lainnya (Bali)';
}

// ─── XML escape ───────────────────────────────────────────────────────────────

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Querying Overpass API for Bali hospitals / clinics…');
  const url = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const res = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'gobaligo-hospital-fetcher/1.0 (https://gobaligo.id)',
    },
  });

  const data = await res.json();
  const elements = data.elements || [];
  console.log(`Raw elements from Overpass: ${elements.length}`);

  // Normalise: ways have center coords; nodes have lat/lon directly
  const normalised = elements
    .map(el => {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      if (!lat || !lng) return null;
      return { ...el, lat, lon: lng };
    })
    .filter(Boolean);

  // Deduplicate by rounded coordinate
  const seen = new Set();
  const deduped = [];
  for (const el of normalised) {
    const key = `${el.lat.toFixed(5)},${el.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(el);
  }
  console.log(`After dedup: ${deduped.length}`);

  // Must have a name
  const valid = deduped.filter(el => {
    const t = el.tags || {};
    return t.name || t['name:en'];
  });
  console.log(`After quality filter (need name): ${valid.length}`);

  // Categorise
  const byCat = {};
  const catStats = {};
  const areaStats = {};

  for (const el of valid) {
    const cat  = categorize(el);
    const area = detectArea(el.lat, el.lon);
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({ ...el, _cat: cat, _area: area });
    catStats[cat]   = (catStats[cat]   || 0) + 1;
    areaStats[area] = (areaStats[area] || 0) + 1;
  }

  console.log('\n── By category ─────────────────────────────────');
  for (const cat of CAT_ORDER) {
    if (catStats[cat]) console.log(`  ${cat}: ${catStats[cat]}`);
  }
  console.log('\n── By area ─────────────────────────────────────');
  for (const [area, cnt] of Object.entries(areaStats).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${area}: ${cnt}`);
  }
  console.log(`\nTotal: ${valid.length}`);

  // Save JSON backup
  fs.writeFileSync(JSON_OUT, JSON.stringify(valid, null, 2), 'utf-8');
  console.log(`\nJSON saved → ${JSON_OUT}`);

  // Build KML
  const today = new Date().toISOString().slice(0, 10);
  const sortedCats = [...CAT_ORDER.filter(c => byCat[c])];
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright -->
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>峇里島醫院 / 診所 by gobaligo</name>
    <description>資料來源：OpenStreetMap © OpenStreetMap contributors | 最後更新：${today} | 總計 ${valid.length} 筆</description>
`;

  for (const cat of sortedCats) {
    kml += `    <Folder>\n      <name>${esc(cat)}</name>\n`;

    for (const el of byCat[cat]) {
      const t = el.tags || {};
      const name = t.name || t['name:en'] || cat;
      const nameEn = t['name:en'] || '';

      const parts = [];
      if (nameEn && nameEn !== name) parts.push(`🏥 ${nameEn}`);
      if (el._area)                  parts.push(`📍 ${el._area}`);
      if (t['addr:street'] || t['addr:full']) parts.push(`🗺️ ${t['addr:full'] || t['addr:street']}`);
      if (t.phone || t['contact:phone']) parts.push(`📞 ${t.phone || t['contact:phone']}`);
      if (t.opening_hours)           parts.push(`⏰ ${t.opening_hours}`);
      if (t.emergency === 'yes')     parts.push('🚨 急診 24H');
      if (t.website || t['contact:website']) {
        const web = t.website || t['contact:website'];
        parts.push(`<a href="${esc(web)}" target="_blank" rel="noopener">網站</a>`);
      }
      parts.push(`<a href="https://www.openstreetmap.org/${el.type}/${el.id}" target="_blank" rel="noopener">OpenStreetMap</a>`);

      kml += `      <Placemark>
        <name>${esc(name)}</name>
        <description><![CDATA[${parts.join('<br>')}]]></description>
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
  console.log(`\n✅ 完成：${valid.length} 筆醫療設施，${sortedCats.length} 個分類`);
}

main().catch(err => { console.error(err); process.exit(1); });
