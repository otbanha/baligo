#!/usr/bin/env node
/**
 * gsc-weather-report.mjs
 *
 * 追蹤 /weather/ 五個語言版在 Google Search Console 的曝光、點擊與排名變化，
 * 並和改版前的同長度區間對比。零外部依賴：Node 內建 crypto 簽 JWT + global fetch，
 * 與 scripts/submit-to-google.mjs 同一套認證方式。
 *
 * 用法：
 *   node scripts/gsc-weather-report.mjs                  # 產出報告並存快照
 *   node scripts/gsc-weather-report.mjs --list-sites     # 列出這組憑證能存取的資源（設定時用）
 *   node scripts/gsc-weather-report.mjs --days=14        # 指定對比區間長度
 *   node scripts/gsc-weather-report.mjs --since=2026-09-06  # 指定改版日
 *   node scripts/gsc-weather-report.mjs --no-save        # 只印報告、不寫快照
 *   node scripts/gsc-weather-report.mjs --out=report.md    # 寫進檔案而非 stdout（公開 repo 的 CI 必用）
 *
 * 環境變數：
 *   GOOGLE_INDEXING_CREDENTIALS  service account JSON（整份字串）。未設定時略過、exit 0。
 *   GSC_SITE_URL                 GSC 資源，預設 sc-domain:gobaligo.id
 *                                （網址前綴資源請填 https://gobaligo.id/）
 *
 * ⚠️ 設定前提：這組 service account 的 client_email 必須先在 Search Console
 *    後台被加為該資源的使用者（「設定 → 使用者和權限」，權限選「有限制」即可）。
 *    Indexing API 的權限和 Search Console 的讀取權限是分開的，不會自動繼承。
 *    先跑 --list-sites 確認拿得到資源清單，再跑正式報告。
 */

import crypto from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SNAPSHOT_DIR = path.join(ROOT, 'scripts/gsc-snapshots');

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';

const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:gobaligo.id';

// GSC 的資料大約落後 2–3 天，直接抓到「今天」會拿到不完整的尾巴，
// 讓最近幾天的數字看起來假性下滑。統一往回推 3 天當作區間結尾。
const DATA_LAG_DAYS = 3;

// 改版上線日：/weather/ 從薄工具頁改成天氣主題 hub 的那天。
const DEFAULT_SINCE = '2026-09-06';

const WEATHER_PAGES = [
  { path: '/weather/',       label: 'zh-TW' },
  { path: '/zh-cn/weather/', label: 'zh-CN' },
  { path: '/zh-hk/weather/', label: 'zh-HK' },
  { path: '/en/weather/',    label: 'en'    },
  { path: '/id/weather/',    label: 'id'    },
];

// 這次改版主打的字詞。GSC 沒有「只查這幾個字」的便利參數，
// 所以抓含這些詞根的查詢再自己過濾。
const QUERY_ROOTS = ['天氣', '天气', 'weather', 'cuaca'];

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const getOpt = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const OUT_FILE = getOpt('out', null);
const LIST_SITES = hasFlag('list-sites');

// --out：把報告寫進檔案而不是 stdout。
// 在公開 repo 的 GitHub Actions 上跑時一定要用這個 —— 公開 repo 的 Actions
// 執行頁面（含 job summary）任何人都看得到，報告直接印到 log 等於把查詢字詞、
// 曝光與排名公開。改寫進檔案再上傳 artifact，下載才需要權限。
const _lines = [];
if (OUT_FILE) {
  console.log = (...a) => _lines.push(a.join(' '));
  process.on('exit', () => {
    try {
      mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
      writeFileSync(OUT_FILE, _lines.join('\n') + '\n', 'utf-8');
      process.stdout.write(`報告已寫入 ${OUT_FILE}（${_lines.length} 行）。內容不印在 log，請下載 artifact 查看。\n`);
    } catch (e) {
      process.stdout.write(`寫入 ${OUT_FILE} 失敗：${e.message}\n`);
    }
  });
}
const NO_SAVE = hasFlag('no-save');
const AS_JSON = hasFlag('json');
const SINCE = getOpt('since', DEFAULT_SINCE);
const WINDOW_DAYS = parseInt(getOpt('days', ''), 10) || null;

// ─── 日期工具 ───────────────────────────────────────────────────────────────

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000);

/**
 * 算出「改版後」與「改版前」兩段等長、不重疊的區間。
 * 改版後不足指定天數時就用實際可用天數，兩邊一起縮短，避免拿 7 天比 28 天。
 */
function buildWindows() {
  const end = addDays(iso(new Date()), -DATA_LAG_DAYS);
  const availableAfter = daysBetween(SINCE, end) + 1;
  if (availableAfter < 1) {
    return { tooEarly: true, availableAfter, firstDataDay: addDays(SINCE, DATA_LAG_DAYS) };
  }
  const len = Math.max(1, Math.min(WINDOW_DAYS ?? availableAfter, availableAfter));
  const after = { start: addDays(end, -(len - 1)), end, days: len };
  const beforeEnd = addDays(SINCE, -1);
  const before = { start: addDays(beforeEnd, -(len - 1)), end: beforeEnd, days: len };
  return { before, after, availableAfter };
}

// ─── 認證 ───────────────────────────────────────────────────────────────────

const b64url = (input) => Buffer.from(input).toString('base64url');

async function getAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: creds.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(creds.private_key).toString('base64url');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`取得 access token 失敗：${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// ─── API ────────────────────────────────────────────────────────────────────

async function listSites(token) {
  const res = await fetch(`${API_BASE}/sites`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`列出資源失敗：${res.status} ${await res.text()}`);
  return (await res.json()).siteEntry ?? [];
}

async function queryAnalytics(token, body) {
  const url = `${API_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 403) {
      throw new Error(
        `403：這組 service account 沒有 ${SITE_URL} 的讀取權限。\n` +
        '   請到 Search Console →「設定 → 使用者和權限」把憑證裡的 client_email 加為使用者（權限「有限制」即可），\n' +
        '   再跑 --list-sites 確認。原始回應：' + text,
      );
    }
    throw new Error(`查詢失敗：${res.status} ${text}`);
  }
  return (await res.json()).rows ?? [];
}

const pageFilter = {
  filters: [{ dimension: 'page', operator: 'contains', expression: '/weather/' }],
};

async function fetchWindow(token, win) {
  const [pages, queries, allWeatherQueries] = await Promise.all([
    queryAnalytics(token, {
      startDate: win.start, endDate: win.end,
      dimensions: ['page'],
      dimensionFilterGroups: [pageFilter],
      rowLimit: 100,
    }),
    queryAnalytics(token, {
      startDate: win.start, endDate: win.end,
      dimensions: ['query'],
      dimensionFilterGroups: [pageFilter],
      rowLimit: 500,
    }),
    // 不限定頁面：主打字詞可能是別的文章在排，這樣才看得出是不是換頁面吃排名
    queryAnalytics(token, {
      startDate: win.start, endDate: win.end,
      dimensions: ['query', 'page'],
      rowLimit: 2000,
    }),
  ]);
  return { win, pages, queries, allWeatherQueries };
}

// ─── 彙整 ───────────────────────────────────────────────────────────────────

const keyOf = (row) => row.keys.join(' | ');
const toMap = (rows) => new Map(rows.map((r) => [keyOf(r), r]));

const metrics = (r) => ({
  clicks: r?.clicks ?? 0,
  impressions: r?.impressions ?? 0,
  ctr: r?.ctr ?? 0,
  position: r?.position ?? null,
});

function diffRow(name, beforeRow, afterRow) {
  const b = metrics(beforeRow);
  const a = metrics(afterRow);
  return {
    name,
    before: b,
    after: a,
    deltaClicks: a.clicks - b.clicks,
    deltaImpressions: a.impressions - b.impressions,
    // 名次越小越好，所以「改善」是負的 delta；這裡轉成正數代表前進幾名
    positionGain: b.position != null && a.position != null ? b.position - a.position : null,
  };
}

function isTargetQuery(q) {
  const lower = q.toLowerCase();
  return QUERY_ROOTS.some((root) => lower.includes(root.toLowerCase()));
}

// ─── 輸出 ───────────────────────────────────────────────────────────────────

const n0 = (v) => Math.round(v).toLocaleString('en-US');
const pos = (v) => (v == null ? '—' : v.toFixed(1));
const pct = (v) => (v * 100).toFixed(1) + '%';

function signed(v, digits = 0) {
  if (v == null) return '—';
  const s = digits ? v.toFixed(digits) : n0(Math.abs(v));
  if (v > 0) return '+' + (digits ? s : s);
  if (v < 0) return '−' + (digits ? Math.abs(v).toFixed(digits) : s);
  return '0';
}

function posArrow(gain) {
  if (gain == null) return '—';
  if (gain > 0.05) return `↑ ${gain.toFixed(1)} 名`;
  if (gain < -0.05) return `↓ ${Math.abs(gain).toFixed(1)} 名`;
  return '持平';
}

function printTable(title, rows, { showPosition = true } = {}) {
  console.log(`\n## ${title}\n`);
  if (!rows.length) {
    console.log('（這段期間沒有資料）');
    return;
  }
  const head = showPosition
    ? ['項目', '曝光(前→後)', '曝光變化', '點擊(前→後)', '平均排名(前→後)', '排名變化']
    : ['項目', '曝光(前→後)', '曝光變化', '點擊(前→後)', 'CTR'];
  // 用 markdown 表格：終端機看得懂，貼進 GitHub Actions summary 也會直接渲染成表格
  console.log('| ' + head.join(' | ') + ' |');
  console.log('|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const cells = showPosition
      ? [
          r.name,
          `${n0(r.before.impressions)} → ${n0(r.after.impressions)}`,
          signed(r.deltaImpressions),
          `${n0(r.before.clicks)} → ${n0(r.after.clicks)}`,
          `${pos(r.before.position)} → ${pos(r.after.position)}`,
          posArrow(r.positionGain),
        ]
      : [
          r.name,
          `${n0(r.before.impressions)} → ${n0(r.after.impressions)}`,
          signed(r.deltaImpressions),
          `${n0(r.before.clicks)} → ${n0(r.after.clicks)}`,
          pct(r.after.ctr),
        ];
    console.log('| ' + cells.map((c) => String(c).replace(/\|/g, '\\|')).join(' | ') + ' |');
  }
}

function totals(rows) {
  return rows.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { clicks: 0, impressions: 0 },
  );
}

// ─── 主流程 ─────────────────────────────────────────────────────────────────

const credsRaw = process.env.GOOGLE_INDEXING_CREDENTIALS;
if (!credsRaw) {
  console.log('⏭️  未設定 GOOGLE_INDEXING_CREDENTIALS，略過 GSC 報告。');
  process.exit(0);
}

let creds;
try {
  creds = JSON.parse(credsRaw);
} catch {
  console.error('❌ GOOGLE_INDEXING_CREDENTIALS 不是合法 JSON。');
  process.exit(1);
}

const token = await getAccessToken(creds);

if (LIST_SITES) {
  const sites = await listSites(token);
  console.log(`service account：${creds.client_email}\n`);
  if (!sites.length) {
    console.log('⚠️  這組憑證目前沒有任何 Search Console 資源的存取權。');
    console.log('   到 Search Console →「設定 → 使用者和權限 → 新增使用者」，');
    console.log(`   把 ${creds.client_email} 加進去（權限選「有限制」就夠），再跑一次。`);
    process.exit(0);
  }
  console.log('可存取的資源：');
  for (const s of sites) console.log(`  ${s.permissionLevel.padEnd(18)} ${s.siteUrl}`);
  console.log(`\n目前 GSC_SITE_URL = ${SITE_URL}`);
  process.exit(0);
}

const windows = buildWindows();
if (windows.tooEarly) {
  console.log(`# /weather/ 的 GSC 表現對比\n`);
  console.log(`改版上線日 ${SINCE} 之後還沒有可用的 GSC 資料。`);
  console.log(`Search Console 的資料大約落後 ${DATA_LAG_DAYS} 天，最快 ${windows.firstDataDay} 才會出現第一天的數字。`);
  console.log('\n（排程每週跑一次，時間到了自然會有報告；想提前看可以加 --since= 指定較早的日期。）');
  process.exit(0);
}
const { before, after, availableAfter } = windows;

console.log(`# /weather/ 的 GSC 表現對比`);
console.log(`\n資源：${SITE_URL}`);
console.log(`改版上線日：${SINCE}（已累積 ${availableAfter} 天可用資料）`);
console.log(`改版後：${after.start} ~ ${after.end}（${after.days} 天）`);
console.log(`改版前：${before.start} ~ ${before.end}（${before.days} 天）`);
if (availableAfter < 14) {
  console.log(`\n⚠️  改版後只有 ${availableAfter} 天資料。競爭字詞的排名通常要 2–8 週才會穩定，`);
  console.log('   這個階段請把重點放在「曝光」與「有沒有開始拿到新的查詢字詞」，排名數字先當參考。');
}

const [b, a] = await Promise.all([fetchWindow(token, before), fetchWindow(token, after)]);

// ── 1. 五個語言版的頁面表現
const bPages = toMap(b.pages);
const aPages = toMap(a.pages);
const pageRows = WEATHER_PAGES.map(({ path: p, label }) => {
  const full = `https://gobaligo.id${p}`;
  return diffRow(`${label}  ${p}`, bPages.get(full), aPages.get(full));
});
printTable('一、天氣頁各語言版表現', pageRows);

const bTot = totals(b.pages);
const aTot = totals(a.pages);
console.log(
  `\n合計：曝光 ${n0(bTot.impressions)} → ${n0(aTot.impressions)}（${signed(aTot.impressions - bTot.impressions)}）` +
  `、點擊 ${n0(bTot.clicks)} → ${n0(aTot.clicks)}（${signed(aTot.clicks - bTot.clicks)}）`,
);

// ── 2. 天氣頁拿到的查詢字詞（依曝光變化排序）
const bQ = toMap(b.queries);
const aQ = toMap(a.queries);
const allQKeys = new Set([...bQ.keys(), ...aQ.keys()]);
const queryRows = [...allQKeys]
  .map((k) => diffRow(k, bQ.get(k), aQ.get(k)))
  .sort((x, y) => y.deltaImpressions - x.deltaImpressions);

printTable('二、天氣頁曝光成長最多的查詢字詞（前 20）', queryRows.slice(0, 20));

const lostRows = queryRows.filter((r) => r.deltaImpressions < 0).slice(-10).reverse();
if (lostRows.length) printTable('三、曝光掉最多的查詢字詞（前 10，注意是否被別的頁面吃掉）', lostRows);

const newQueries = queryRows.filter((r) => r.before.impressions === 0 && r.after.impressions > 0);
console.log(`\n新拿到的查詢字詞：${newQueries.length} 個`);
if (newQueries.length) {
  console.log(newQueries.slice(0, 15).map((r) => `  ${r.name}（曝光 ${n0(r.after.impressions)}，排名 ${pos(r.after.position)}）`).join('\n'));
}

// ── 3. 全站天氣相關字詞：哪個頁面在排
function weatherQueryRows(win) {
  return win.allWeatherQueries.filter((r) => isTargetQuery(r.keys[0]));
}
const bW = toMap(weatherQueryRows(b));
const aW = toMap(weatherQueryRows(a));
const wKeys = new Set([...bW.keys(), ...aW.keys()]);
const targetRows = [...wKeys]
  .map((k) => diffRow(k, bW.get(k), aW.get(k)))
  .sort((x, y) => (y.after.impressions ?? 0) - (x.after.impressions ?? 0));

printTable('四、全站「天氣類」字詞是由哪個頁面在排（前 25，query | page）', targetRows.slice(0, 25));

// ── 快照
if (!NO_SAVE) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const file = path.join(SNAPSHOT_DIR, `${after.end}.json`);
  const snapshot = {
    generatedAt: new Date().toISOString(),
    site: SITE_URL,
    since: SINCE,
    windows: { before, after },
    pages: pageRows,
    topQueries: queryRows.slice(0, 100),
    weatherQueriesByPage: targetRows.slice(0, 100),
  };
  writeFileSync(file, JSON.stringify(snapshot, null, 2), 'utf-8');
  console.log(`\n快照已寫入 ${path.relative(ROOT, file)}`);

  const history = existsSync(SNAPSHOT_DIR)
    ? readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.json')).sort()
    : [];
  if (history.length > 1) {
    console.log(`歷史快照：${history.length} 份（${history[0].replace('.json', '')} ~ ${history[history.length - 1].replace('.json', '')}）`);
  }
}

if (AS_JSON) {
  console.log('\n--- JSON ---');
  console.log(JSON.stringify({ windows: { before, after }, pages: pageRows }, null, 2));
}
