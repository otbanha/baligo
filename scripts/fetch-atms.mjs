#!/usr/bin/env node
/**
 * 抓取峇里島 ATM 位置資料
 * 來源：OpenStreetMap via Overpass API
 * 授權：© OpenStreetMap contributors (ODbL)
 * 輸出：public/maps/atm.kml + scripts/atm-data.json
 *
 * 用法：node scripts/fetch-atms.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const KML_OUT = path.join(ROOT, 'public/maps/atm.kml');
const JSON_OUT = path.join(ROOT, 'scripts/atm-data.json');

const OVERPASS_QUERY = `[out:json][timeout:60];
area["name"="Bali"]["admin_level"="4"]->.bali;
(
  node["amenity"="atm"](area.bali);
  node["amenity"="bank"]["atm"="yes"](area.bali);
);
out body;`;

// ─── Retry fetch ────────────────────────────────────────────────────────────

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

// ─── Bank name normalization ─────────────────────────────────────────────────

const BANK_PATTERNS = [
  { key: 'BCA',       re: /\bbca\b|bank central asia/i },
  { key: 'Mandiri',   re: /\bmandiri\b/i },
  { key: 'BNI',       re: /\bbni\b|bank negara indonesia/i },
  { key: 'BRI',       re: /\bbri\b|bank rakyat indonesia/i },
  { key: 'CIMB',      re: /\bcimb\b/i },
  { key: 'Permata',   re: /\bpermata\b/i },
  { key: 'Danamon',   re: /\bdanamon\b/i },
  { key: 'BPD Bali',  re: /\bbpd\b.*bali|bank pembangunan daerah bali/i },
  { key: 'Maybank',   re: /\bmaybank\b/i },
  { key: 'OCBC',      re: /\bocbc\b/i },
  { key: 'BTN',       re: /\bbtn\b|bank tabungan negara/i },
];

function normalizeBank(operator, name) {
  const combined = `${operator || ''} ${name || ''}`.trim();
  for (const { key, re } of BANK_PATTERNS) {
    if (re.test(combined)) return key;
  }
  return 'Lainnya';
}

// ─── Area detection (bounding box) ──────────────────────────────────────────

const AREAS = [
  { name: 'Canggu',           latMin: -8.690, latMax: -8.610, lngMin: 115.095, lngMax: 115.160 },
  { name: 'Seminyak / Legian', latMin: -8.730, latMax: -8.680, lngMin: 115.140, lngMax: 115.190 },
  { name: 'Kuta',             latMin: -8.780, latMax: -8.720, lngMin: 115.150, lngMax: 115.210 },
  { name: 'Denpasar',         latMin: -8.730, latMax: -8.620, lngMin: 115.185, lngMax: 115.265 },
  { name: 'Sanur',            latMin: -8.750, latMax: -8.670, lngMin: 115.250, lngMax: 115.300 },
  { name: 'Nusa Dua / Jimbaran', latMin: -8.870, latMax: -8.760, lngMin: 115.140, lngMax: 115.270 },
  { name: 'Uluwatu',          latMin: -8.910, latMax: -8.790, lngMin: 115.060, lngMax: 115.200 },
  { name: 'Ubud',             latMin: -8.560, latMax: -8.450, lngMin: 115.220, lngMax: 115.340 },
  { name: 'Gianyar',          latMin: -8.620, latMax: -8.470, lngMin: 115.310, lngMax: 115.460 },
  { name: 'Tabanan',          latMin: -8.700, latMax: -8.520, lngMin: 114.900, lngMax: 115.130 },
  { name: 'Singaraja (North Bali)', latMin: -8.250, latMax: -8.050, lngMin: 114.950, lngMax: 115.250 },
  { name: 'Karangasem (East Bali)', latMin: -8.550, latMax: -8.250, lngMin: 115.380, lngMax: 115.720 },
  { name: 'Klungkung',        latMin: -8.580, latMax: -8.500, lngMin: 115.370, lngMax: 115.520 },
];

function detectArea(lat, lng) {
  for (const area of AREAS) {
    if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
      return area.name;
    }
  }
  return 'Lainnya (Bali)';
}

// ─── XML escape ──────────────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Querying Overpass API for Bali ATMs…');
  const queryUrl = `${OVERPASS_URL}?data=${encodeURIComponent(OVERPASS_QUERY)}`;
  const res = await fetchWithRetry(queryUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'gobaligo-atm-fetcher/1.0 (https://gobaligo.id)',
    },
  });

  const data = await res.json();
  const nodes = data.elements || [];
  console.log(`Raw nodes from Overpass: ${nodes.length}`);

  // ── Deduplicate by rounded coordinate (same spot, multiple tags) ──────────
  const seen = new Set();
  const deduped = [];
  for (const node of nodes) {
    const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(node);
  }
  console.log(`After dedup: ${deduped.length}`);

  // ── Filter: must have name or operator ───────────────────────────────────
  const valid = deduped.filter(n => {
    const t = n.tags || {};
    return (t.name || t.operator || t.network);
  });
  const filtered = deduped.length - valid.length;
  console.log(`After quality filter (need name/operator): ${valid.length} (removed ${filtered})`);

  // ── Enrich and group by bank ─────────────────────────────────────────────
  const byBank = {};
  const bankStats = {};
  const areaStats = {};

  for (const node of valid) {
    const t = node.tags || {};
    const bank = normalizeBank(t.operator, t.name);
    const area = detectArea(node.lat, node.lon);

    if (!byBank[bank]) byBank[bank] = [];
    byBank[bank].push({ ...node, _bank: bank, _area: area });

    bankStats[bank] = (bankStats[bank] || 0) + 1;
    areaStats[area] = (areaStats[area] || 0) + 1;
  }

  // Print stats
  console.log('\n── By bank ────────────────────────────────────');
  for (const [bank, count] of Object.entries(bankStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${bank}: ${count}`);
  }
  console.log('\n── By area ────────────────────────────────────');
  for (const [area, count] of Object.entries(areaStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${area}: ${count}`);
  }

  const total = valid.length;
  console.log(`\nTotal ATMs: ${total}`);

  // ── Save JSON backup ─────────────────────────────────────────────────────
  fs.writeFileSync(JSON_OUT, JSON.stringify(valid, null, 2), 'utf-8');
  console.log(`\nJSON saved → ${JSON_OUT}`);

  // ── Build KML ────────────────────────────────────────────────────────────
  // Bank order: majors first, then others alphabetically, Lainnya last
  const BANK_ORDER = ['BCA', 'Mandiri', 'BNI', 'BRI', 'CIMB', 'Permata', 'Danamon', 'BPD Bali', 'Maybank', 'OCBC', 'BTN'];
  const sortedBanks = [
    ...BANK_ORDER.filter(b => byBank[b]),
    ...Object.keys(byBank).filter(b => !BANK_ORDER.includes(b) && b !== 'Lainnya').sort(),
    ...(byBank['Lainnya'] ? ['Lainnya'] : []),
  ];

  const today = new Date().toISOString().slice(0, 10);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- © OpenStreetMap contributors (ODbL) — https://www.openstreetmap.org/copyright -->
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>峇里島 ATM 提款機 by gobaligo</name>
    <description>資料來源：OpenStreetMap © OpenStreetMap contributors | 最後更新：${today} | 總計 ${total} 台</description>
`;

  for (const bank of sortedBanks) {
    const items = byBank[bank];
    kml += `    <Folder>\n      <name>${escapeXml(bank)}</name>\n`;

    for (const node of items) {
      const t = node.tags || {};
      const displayName = t.name || t.operator || t.network || bank;

      const descParts = [];
      if (t.operator && t.operator !== displayName) descParts.push(`🏦 ${t.operator}`);
      if (node._area) descParts.push(`📍 ${node._area}`);
      if (t['addr:street'] || t['addr:full']) {
        descParts.push(`🗺️ ${t['addr:full'] || t['addr:street'] || ''}`);
      }
      if (t.opening_hours) descParts.push(`⏰ ${t.opening_hours}`);
      if (t['payment:visa'] === 'yes') descParts.push('💳 Visa ✓');
      if (t['payment:mastercard'] === 'yes') descParts.push('💳 Mastercard ✓');
      if (t.fee) descParts.push(`💵 Fee: ${t.fee}`);
      descParts.push(`<a href="https://www.openstreetmap.org/node/${node.id}" target="_blank" rel="noopener">OpenStreetMap</a>`);

      kml += `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <description><![CDATA[${descParts.join('<br>')}]]></description>
        <Point>
          <coordinates>${node.lon},${node.lat},0</coordinates>
        </Point>
      </Placemark>\n`;
    }

    kml += `    </Folder>\n`;
  }

  kml += `  </Document>\n</kml>\n`;

  fs.writeFileSync(KML_OUT, kml, 'utf-8');
  console.log(`KML saved → ${KML_OUT}`);
  console.log(`\n✅ 完成：${total} 台 ATM 寫入 KML，共 ${sortedBanks.length} 個銀行分類`);
}

main().catch(err => { console.error(err); process.exit(1); });
