#!/usr/bin/env node
/**
 * 抓取印尼央行 (BI) 授權換匯所資料
 * 來源：https://moneychangerbali.com/api/kantor
 * 輸出：public/maps/money-changer.kml + scripts/money-changer-data.json
 *
 * 用法：node scripts/scrape-bi-money-changers.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const API_URL = 'https://moneychangerbali.com/api/kantor';
const KML_OUT = path.join(ROOT, 'public/maps/money-changer.kml');
const JSON_OUT = path.join(ROOT, 'scripts/money-changer-data.json');

// Map kecamatanName → tourist-area folder label
function getArea(entry) {
  const kec = (entry.kecamatanName || '').toLowerCase();
  const kel = (entry.kelurahanName || '').toLowerCase();
  const alamat = (entry.alamat || '').toLowerCase();

  if (kec.includes('ubud')) return 'Ubud';
  if (kec.includes('sukawati') || kec.includes('gianyar') || kec.includes('blahbatuh') || kec.includes('payangan') || kec.includes('tegallalang')) return 'Ubud 周邊 (Gianyar)';
  if (kec.includes('kuta selatan') || kel.includes('jimbaran') || alamat.includes('jimbaran')) return 'Jimbaran / Nusa Dua / Uluwatu';
  if (kec.includes('nusa dua') || kel.includes('nusa dua') || alamat.includes('nusa dua')) return 'Jimbaran / Nusa Dua / Uluwatu';
  if (kec.includes('kuta utara') || kel.includes('kerobokan') || alamat.includes('kerobokan') || alamat.includes('canggu') || kel.includes('canggu')) return 'Kerobokan / Canggu';
  if (kec.includes('kuta') && !kec.includes('utara') && !kec.includes('selatan')) {
    if (kel.includes('legian') || alamat.includes('legian')) return 'Legian / Seminyak';
    if (kel.includes('seminyak') || alamat.includes('seminyak')) return 'Legian / Seminyak';
    return 'Kuta';
  }
  if (kec.includes('denpasar')) return 'Denpasar';
  if (kec.includes('sanur') || kel.includes('sanur') || alamat.includes('sanur')) return 'Sanur';
  if (kec.includes('karangasem') || kec.includes('amlapura') || kec.includes('kubu') || kec.includes('abang') || kec.includes('bebandem') || kec.includes('sidemen') || kec.includes('selat') || kec.includes('rendang') || kec.includes('manggis')) return 'Karangasem (East Bali)';
  if (kec.includes('buleleng') || kec.includes('singaraja') || kec.includes('seririt') || kec.includes('sukasada') || kec.includes('sawan')) return 'Buleleng (North Bali)';
  if (kec.includes('tabanan') || kec.includes('kerambitan') || kec.includes('penebel') || kec.includes('kediri') || kec.includes('marga')) return 'Tabanan';
  if (kec.includes('bangli') || kec.includes('kintamani') || kec.includes('tembuku') || kec.includes('susut')) return 'Bangli / Kintamani';
  if (kec.includes('klungkung') || kec.includes('banjarangkan') || kec.includes('dawan') || kec.includes('nusa penida')) return 'Klungkung';
  return 'Lainnya (Bali)';
}

// Bali kabupaten filter
const BALI_KOTA = new Set([
  'KAB. BADUNG', 'KAB. GIANYAR', 'KOTA DENPASAR',
  'KAB. KARANGASEM', 'KAB. BULELENG', 'KAB. TABANAN',
  'KAB. KLUNGKUNG', 'KAB. BANGLI', 'KAB. JEMBRANA',
]);

function isBali(entry) {
  return BALI_KOTA.has((entry.kotaName || '').toUpperCase().trim());
}

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function main() {
  console.log(`Fetching ${API_URL} …`);
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const raw = await res.json();
  console.log(`Total records from API: ${raw.length}`);

  const bali = raw.filter(isBali);
  const outside = raw.length - bali.length;
  console.log(`Filtered to Bali: ${bali.length} (excluded ${outside} non-Bali)`);

  // Count missing coords (sanity check)
  const noCoords = bali.filter(e => !e.latitude || !e.longitude).length;
  console.log(`Missing coordinates: ${noCoords} (${((noCoords / bali.length) * 100).toFixed(1)}%)`);

  // Group by area
  const grouped = {};
  for (const entry of bali) {
    if (!entry.latitude || !entry.longitude) continue;
    const area = getArea(entry);
    if (!grouped[area]) grouped[area] = [];
    grouped[area].push(entry);
  }

  // Sort areas by count desc
  const sortedAreas = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);
  console.log('\nArea breakdown:');
  for (const [area, items] of sortedAreas) {
    console.log(`  ${area}: ${items.length}`);
  }

  // Save JSON for reference / re-runs
  fs.writeFileSync(JSON_OUT, JSON.stringify(bali, null, 2), 'utf-8');
  console.log(`\nJSON saved → ${JSON_OUT}`);

  // Build KML
  const today = new Date().toISOString().slice(0, 10);
  let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>峇里島印尼央行授權換匯所 by gobaligo</name>
    <description>資料來源：moneychangerbali.com | 最後更新：${today} | 實際授權狀態以印尼央行公告為準</description>
`;

  for (const [area, items] of sortedAreas) {
    kml += `    <Folder>\n      <name>${escapeXml(area)}</name>\n`;
    for (const e of items) {
      const displayName = e.name
        .replace(/^PT\s+/i, 'PT ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      const desc = [
        e.alamat ? `📍 ${e.alamat.trim()}` : '',
        e.nomorIzin ? `🪪 Izin: ${e.nomorIzin}` : '',
        e.tipe ? `[${e.tipe}]` : '',
        `<a href="https://moneychangerbali.com/" target="_blank">Lihat di moneychangerbali.com</a>`,
      ].filter(Boolean).join('<br>');

      kml += `      <Placemark>
        <name>${escapeXml(displayName)}</name>
        <description><![CDATA[${desc}]]></description>
        <Point>
          <coordinates>${e.longitude},${e.latitude},0</coordinates>
        </Point>
      </Placemark>\n`;
    }
    kml += `    </Folder>\n`;
  }

  kml += `  </Document>\n</kml>\n`;

  fs.writeFileSync(KML_OUT, kml, 'utf-8');
  console.log(`KML saved → ${KML_OUT}`);

  // Summary for user
  const totalPlaced = sortedAreas.reduce((s, [, items]) => s + items.length, 0);
  console.log(`\n✅ 完成：${totalPlaced} 筆換匯所寫入 KML`);

  // Show first 5 records
  console.log('\n前 5 筆資料：');
  bali.slice(0, 5).forEach((e, i) => {
    console.log(`\n[${i + 1}] ${e.name}`);
    console.log(`  地址: ${(e.alamat || '').trim()}`);
    console.log(`  區域: ${getArea(e)} | kotaName: ${e.kotaName}`);
    console.log(`  座標: ${e.latitude}, ${e.longitude}`);
    console.log(`  類型: ${e.tipe} | nomorIzin: ${e.nomorIzin || '(無)'}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
