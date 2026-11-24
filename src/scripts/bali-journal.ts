/**
 * 峇里手帳 (/app/) — 和旅伴一起編的峇里島旅行手帳（client-side）
 *
 * 純前端、離線可用：所有旅行資料存在 localStorage（不需登入）。
 * 分享：把整趟旅行壓縮進網址 hash（#share=...），對方打開即可「匯入」成自己的一份。
 *
 * 重用站內既有資料：
 * - tripPlannerSpots / generateItinerary：景點庫與一鍵排行程
 * - regionTravelMatrix：換區車程與尖峰塞車提醒
 * - BALI_CLIMATE：當月氣候（即時天氣讀不到時的備援）
 * - FEATURED_TICKETS：旅行包（門票合作連結）
 * - article-index.json（build 時嵌入）：旅報與景點攻略連結
 */

import { tripPlannerSpots, spotById, type RegionId, type Audience, type Spot } from '../data/tripPlannerSpots';
import { getTravelTime } from '../data/regionTravelMatrix';
import { generateItinerary, type DaysOption } from '../data/generateItinerary';
import { BALI_CLIMATE, SEASON_LABEL } from '../data/baliClimate';
import { FEATURED_TICKETS, CAT_LABEL } from '../data/tickets.js';

// ── 型別 ────────────────────────────────────────────────────────────

interface Item {
  id: string;
  day: number; // 1-based
  time: string; // 'HH:MM' 或 ''
  title: string;
  region?: RegionId;
  spotId?: string;
  note?: string;
  url?: string;
  done?: boolean;
}

type Cur = 'IDR' | 'TWD';

interface Expense {
  id: string;
  title: string;
  amount: number;
  cur: Cur;
  payer: string;
  split: string[];
  cat: string;
  day: number;
  date: string; // ISO
}

interface Check {
  id: string;
  text: string;
  group: string;
  done: boolean;
}

interface Note {
  id: string;
  author: string;
  text: string;
  pinned: boolean;
  at: string;
}

interface Trip {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  days: number;
  members: string[];
  companion: Audience;
  items: Item[];
  expenses: Expense[];
  checklist: Check[];
  notes: Note[];
  stay: { name: string; address: string; checkIn: string; region?: RegionId }[];
  flights: { no: string; date: string; time: string; note: string }[];
  rate: number; // 1 TWD = ? IDR
  updatedAt: string;
}

interface Store {
  v: 1;
  trips: Trip[];
  currentId: string | null;
}

interface NewsItem {
  title: string;
  url: string;
  img: string;
  date: string;
  cat: string;
}

interface PageData {
  news: NewsItem[];
  articleMeta: Record<string, { title: string; img: string }>;
}

// ── 常數 ────────────────────────────────────────────────────────────

const STORE_KEY = 'gobaligo_journal_v1';

export const REGIONS: { id: RegionId; label: string; emoji: string; lat: number; lng: number }[] = [
  { id: 'ubud', label: '烏布/金塔瑪尼', emoji: '🌿', lat: -8.5069, lng: 115.2625 },
  { id: 'kuta', label: '庫塔', emoji: '🏄', lat: -8.718, lng: 115.1686 },
  { id: 'seminyak', label: '水明漾', emoji: '🍹', lat: -8.6913, lng: 115.1683 },
  { id: 'canggu', label: '長谷', emoji: '☕', lat: -8.6478, lng: 115.1385 },
  { id: 'jimbaran', label: '金巴蘭', emoji: '🦞', lat: -8.7907, lng: 115.16 },
  { id: 'uluwatu', label: '烏魯瓦圖', emoji: '🌅', lat: -8.8291, lng: 115.0849 },
  { id: 'nusa-dua', label: '努沙杜瓦', emoji: '🏖️', lat: -8.8003, lng: 115.2306 },
  { id: 'sanur', label: '沙努爾', emoji: '⛵', lat: -8.6929, lng: 115.2618 },
  { id: 'nusa-penida', label: '努沙佩尼達', emoji: '🐠', lat: -8.7275, lng: 115.5444 },
  { id: 'lembongan', label: '藍夢島', emoji: '🚤', lat: -8.68, lng: 115.45 },
  { id: 'east-bali', label: '東部峇里', emoji: '⛩️', lat: -8.45, lng: 115.6 },
  { id: 'komodo', label: '科摩多島', emoji: '🦎', lat: -8.4964, lng: 119.8877 },
];
const regionById = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, (typeof REGIONS)[number]>;

const COMPANIONS: { id: Audience; label: string }[] = [
  { id: 'couple', label: '情侶／蜜月' },
  { id: 'family', label: '親子' },
  { id: 'friends', label: '朋友' },
  { id: 'solo', label: '獨旅' },
  { id: 'elderly', label: '帶長輩' },
  { id: 'group', label: '團體' },
];

const SLOT_CLOCK: Record<string, string> = {
  sunrise: '04:30',
  morning: '09:00',
  afternoon: '14:00',
  sunset: '17:30',
  evening: '19:30',
};

const EXPENSE_CATS = ['🍜 餐飲', '🚗 交通', '🏨 住宿', '🎟️ 門票活動', '💆 SPA', '🛍️ 購物', '📦 其他'];

const DEFAULT_CHECKLIST: { group: string; text: string }[] = [
  { group: '證件與入境', text: '護照效期 6 個月以上（入境日起算）' },
  { group: '證件與入境', text: '線上申請 e-VOA 落地簽（或抵達後辦 VOA）' },
  { group: '證件與入境', text: '繳交峇里島觀光稅 Levy（IDR 150,000／人）' },
  { group: '證件與入境', text: '出發前填 All Indonesia 入境申報（海關＋健康）' },
  { group: '證件與入境', text: '機票、住宿確認信存到手機離線' },
  { group: '證件與入境', text: '旅遊平安險／不便險' },
  { group: '錢與網路', text: '準備印尼盾現金（小額鈔多帶一些）' },
  { group: '錢與網路', text: '開通信用卡海外刷卡／提款' },
  { group: '錢與網路', text: 'eSIM 或 SIM 卡' },
  { group: '錢與網路', text: '下載 Gojek／Grab 叫車 App' },
  { group: '行李', text: '萬用轉接頭（印尼為 C/F 型、230V）' },
  { group: '行李', text: '防曬乳、防蚊液、帽子、太陽眼鏡' },
  { group: '行李', text: '泳衣、拖鞋、薄外套（火山日出很冷）' },
  { group: '行李', text: '進寺廟用的紗龍或過膝長褲' },
  { group: '行李', text: '常備藥（腸胃藥、止瀉藥、暈船藥）' },
  { group: '行李', text: '行動電源、充電線' },
];

const BALI_NOTES: { title: string; icon: string; body: string[]; link?: string }[] = [
  {
    title: '入境',
    icon: '🛂',
    body: [
      '台灣護照需辦落地簽 VOA（可線上 e-VOA），效期 30 天、可延簽一次。',
      '入境峇里島需繳觀光稅 IDR 150,000／人，建議出發前線上繳。',
      '海關＋健康申報統一用 All Indonesia 線上填寫，出發前 3 天內可填。',
    ],
    link: '/blog/?cat=簽證通關',
  },
  {
    title: '交通',
    icon: '🚗',
    body: [
      '島上沒有方便的大眾運輸，主要靠 Gojek／Grab 叫車或包車。',
      '南部（庫塔、水明漾、長谷）到烏布單趟約 1–1.5 小時，傍晚尖峰可能破 2 小時。',
      '部分區域（機場、烏布市中心）有在地車隊限制，叫車上車點需要走一段。',
      '跳島（佩尼達、藍夢島）從沙努爾搭快艇，風浪大時可能停航。',
    ],
    link: '/map/gojek-fare/',
  },
  {
    title: '禮儀與宗教',
    icon: '🙏',
    body: [
      '進寺廟需穿紗龍、遮肩，生理期女性依習俗不進寺廟。',
      '路上的供品（Canang Sari）請不要踩到。',
      '寧靜日 Nyepi 全島停擺 24 小時，機場關閉、不能外出，出發前查日期。',
      '不要摸小孩的頭；用右手遞東西。',
    ],
  },
  {
    title: '健康與安全',
    icon: '💊',
    body: [
      '不要生飲自來水，刷牙也建議用瓶裝水；冰塊盡量選大餐廳。',
      '「峇里肚」（Bali Belly）很常見，備好腸胃藥。',
      '猴子會搶眼鏡、帽子和手機，聖猴森林與烏魯瓦圖要收好。',
      '騎機車需國際駕照（機車類），無照出事保險多不理賠。',
    ],
  },
  {
    title: '錢與小費',
    icon: '💰',
    body: [
      '幣值零很多：IDR 100,000 約台幣 200 元上下，付錢前多看一次位數。',
      '換匯選有牌照（Authorized Money Changer）的店，當面點清。',
      '餐廳帳單常已含 10% 服務費＋稅，SPA、司機可另給小費。',
    ],
    link: '/map/money-changer/',
  },
];

const SOS: { label: string; num: string; note?: string }[] = [
  { label: '緊急萬用', num: '112', note: '所有緊急情況皆可撥打' },
  { label: '警察', num: '110' },
  { label: '救護車', num: '118' },
  { label: '消防', num: '113' },
];

const HOSPITALS = [
  { name: 'BIMC Hospital Kuta', note: '國際醫院（庫塔／機場附近）' },
  { name: 'BIMC Hospital Nusa Dua', note: '國際醫院（努沙杜瓦）' },
  { name: 'Siloam Hospitals Denpasar', note: '國際醫院（登巴薩／庫塔交界）' },
];

// ── 小工具 ──────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const pad = (n: number) => String(n).padStart(2, '0');

function todayISO(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayISO(dt);
}

function diffDays(a: string, b: string) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${m}/${d}（${WEEK[dt.getDay()]}）`;
}

function fmtMoney(n: number, cur: Cur) {
  return cur === 'IDR' ? `Rp ${Math.round(n).toLocaleString('en-US')}` : `NT$ ${Math.round(n).toLocaleString('en-US')}`;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** 傍晚尖峰（16:00–19:00） */
function isPeak(time: string) {
  const h = parseInt(time.slice(0, 2), 10);
  return h >= 16 && h < 19;
}

// ── 儲存 ────────────────────────────────────────────────────────────

function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Store;
      if (s && Array.isArray(s.trips)) return s;
    }
  } catch {
    /* 隱私模式等情況讀不到，就當作空的 */
  }
  return { v: 1, trips: [], currentId: null };
}

let store = loadStore();
let storageOk = true;

function save() {
  const t = currentTrip();
  if (t) t.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
    storageOk = true;
  } catch {
    storageOk = false;
  }
}

function currentTrip(): Trip | null {
  return store.trips.find((t) => t.id === store.currentId) ?? null;
}

function normalizeTrip(t: Partial<Trip>): Trip {
  return {
    id: t.id || uid(),
    name: t.name || '峇里島之旅',
    start: t.start || todayISO(),
    days: Math.max(1, Math.min(30, Number(t.days) || 5)),
    members: t.members?.length ? t.members : ['我'],
    companion: t.companion || 'friends',
    items: t.items || [],
    expenses: t.expenses || [],
    checklist: t.checklist || DEFAULT_CHECKLIST.map((c) => ({ ...c, id: uid(), done: false })),
    notes: t.notes || [],
    stay: t.stay || [],
    flights: t.flights || [],
    rate: Number(t.rate) || 500,
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

// ── 分享（壓縮進網址） ──────────────────────────────────────────────

async function encodeTrip(t: Trip): Promise<string> {
  const json = JSON.stringify(t);
  const bytes = new TextEncoder().encode(json);
  let out: Uint8Array = bytes;
  let prefix = 'j';
  if ('CompressionStream' in window) {
    const cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    out = new Uint8Array(await new Response(cs).arrayBuffer());
    prefix = 'z';
  }
  let bin = '';
  out.forEach((b) => (bin += String.fromCharCode(b)));
  return prefix + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function decodeTrip(s: string): Promise<Trip | null> {
  try {
    const prefix = s[0];
    const b64 = s.slice(1).replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    let bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    if (prefix === 'z') {
      const ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      bytes = new Uint8Array(await new Response(ds).arrayBuffer());
    }
    return normalizeTrip(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

// ── 計算 ────────────────────────────────────────────────────────────

function tripDayIndex(t: Trip, iso = todayISO()): number {
  // 回傳 1..days 表示旅行中；<1 表示還沒出發；>days 表示已結束
  return diffDays(t.start, iso) + 1;
}

function itemsOfDay(t: Trip, day: number) {
  return t.items
    .filter((i) => i.day === day)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}

function toIDR(e: { amount: number; cur: Cur }, rate: number) {
  return e.cur === 'IDR' ? e.amount : e.amount * rate;
}

/** 分帳：回傳每人淨額（IDR，正 = 應收）與最少轉帳次數的結算清單 */
function settle(t: Trip) {
  const bal: Record<string, number> = Object.fromEntries(t.members.map((m) => [m, 0]));
  for (const e of t.expenses) {
    const amt = toIDR(e, t.rate);
    const split = e.split.filter((s) => s in bal);
    if (!split.length || !(e.payer in bal)) continue;
    bal[e.payer] += amt;
    const share = amt / split.length;
    split.forEach((s) => (bal[s] -= share));
  }
  const debtors = Object.entries(bal).filter(([, v]) => v < -1).map(([k, v]) => ({ k, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = Object.entries(bal).filter(([, v]) => v > 1).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  const transfers: { from: string; to: string; amt: number }[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].v, creditors[j].v);
    transfers.push({ from: debtors[i].k, to: creditors[j].k, amt: x });
    debtors[i].v -= x;
    creditors[j].v -= x;
    if (debtors[i].v < 1) i++;
    if (creditors[j].v < 1) j++;
  }
  return { bal, transfers };
}

// ── 狀態 ────────────────────────────────────────────────────────────

type Tab = 'today' | 'plan' | 'money' | 'check' | 'more';

const ui = {
  tab: 'today' as Tab,
  day: 1,
  spotRegion: '' as RegionId | '',
  spotQuery: '',
  sheet: null as null | string,
  sheetData: {} as Record<string, unknown>,
  weather: null as null | { temp: number; code: number; rain: number; max: number; min: number },
  nearest: null as null | RegionId,
  shared: null as null | Trip,
};

let DATA: PageData = { news: [], articleMeta: {} };
let root: HTMLElement;

// ── 版面元件 ────────────────────────────────────────────────────────

function spotLink(url?: string) {
  if (!url) return '';
  const ext = /^https?:/.test(url);
  const meta = DATA.articleMeta[url.split('#')[0]];
  const label = meta ? `📖 ${meta.title}` : ext ? '🔗 相關介紹' : '📖 看攻略';
  return `<a class="bj-link" href="${esc(url)}" ${ext ? 'target="_blank" rel="noopener"' : ''}>${esc(label)}</a>`;
}

function regionTag(r?: RegionId) {
  if (!r || !regionById[r]) return '';
  const R = regionById[r];
  return `<span class="bj-tag">${R.emoji} ${esc(R.label)}</span>`;
}

function weatherLabel(code: number) {
  if (code === 0) return ['☀️', '晴朗'];
  if (code <= 2) return ['🌤️', '晴時多雲'];
  if (code === 3) return ['☁️', '多雲'];
  if (code <= 48) return ['🌫️', '有霧'];
  if (code <= 67) return ['🌧️', '有雨'];
  if (code <= 82) return ['🌦️', '陣雨'];
  return ['⛈️', '雷雨'];
}

/** 同一天相鄰兩個行程跨區時，插入車程提醒 */
function transferHint(a: Item, b: Item) {
  if (!a.region || !b.region || a.region === b.region) return '';
  const tt = getTravelTime(a.region, b.region);
  if (tt.normalMinutes >= 999) {
    return `<li class="bj-transfer">🚤 ${esc(regionById[a.region].label)} → ${esc(regionById[b.region].label)}：${esc(tt.note || '需搭船／飛機')}</li>`;
  }
  const peak = b.time && isPeak(b.time);
  const min = peak ? tt.peakMinutes : tt.normalMinutes;
  return `<li class="bj-transfer ${peak ? 'is-peak' : ''}">🚗 ${esc(regionById[a.region].label)} → ${esc(regionById[b.region].label)} 約 ${min} 分鐘${peak ? '（傍晚尖峰，建議提早出發）' : ''}</li>`;
}

function timeline(t: Trip, day: number, opts: { editable: boolean; highlightNext?: boolean }) {
  const items = itemsOfDay(t, day);
  if (!items.length) {
    return `<div class="bj-empty">這天還沒有行程${opts.editable ? '，從下方「加景點」開始吧 🌴' : ''}</div>`;
  }
  const now = new Date();
  const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const nextId = opts.highlightNext ? items.find((i) => !i.done && (!i.time || i.time >= nowHM))?.id : null;
  let html = '<ol class="bj-timeline">';
  items.forEach((it, idx) => {
    if (idx > 0) html += transferHint(items[idx - 1], it);
    html += `<li class="bj-item ${it.done ? 'is-done' : ''} ${it.id === nextId ? 'is-next' : ''}">
      <button class="bj-dot" data-act="toggle-item" data-id="${it.id}" aria-label="${it.done ? '標為未完成' : '標為完成'}">${it.done ? '✓' : ''}</button>
      <div class="bj-item-body">
        <div class="bj-item-head">
          <span class="bj-time">${esc(it.time || '--:--')}</span>
          <strong>${esc(it.title)}</strong>
          ${it.id === nextId ? '<span class="bj-badge">下一站</span>' : ''}
        </div>
        <div class="bj-item-meta">${regionTag(it.region)} ${spotLink(it.url)}</div>
        ${it.note ? `<p class="bj-item-note">${esc(it.note)}</p>` : ''}
      </div>
      ${opts.editable ? `<button class="bj-icon-btn" data-act="edit-item" data-id="${it.id}" aria-label="編輯">✏️</button>` : ''}
    </li>`;
  });
  return html + '</ol>';
}

// ── 畫面：歡迎／旅行清單 ──────────────────────────────────────────────

function viewWelcome() {
  const trips = store.trips
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map(
      (t) => `<button class="bj-trip-card" data-act="open-trip" data-id="${t.id}">
        <strong>${esc(t.name)}</strong>
        <span>${fmtDate(t.start)} 出發・${t.days} 天・${t.members.length} 人</span>
      </button>`,
    )
    .join('');
  return `<section class="bj-hero">
      <div class="bj-hero-art" aria-hidden="true">🌺</div>
      <h1>峇里手帳</h1>
      <p>把想去的峇里島，變成一段和旅伴一起編的旅程。</p>
      <button class="bj-btn bj-btn-primary" data-act="new-trip">＋ 建立新旅行</button>
    </section>
    ${trips ? `<section class="bj-card"><h2>我的旅行</h2><div class="bj-trip-list">${trips}</div></section>` : ''}
    <section class="bj-card">
      <h2>手帳裡有什麼</h2>
      <ul class="bj-features">
        <li><span>🗓️</span><div><h3>每天的行程</h3><p>從 80+ 個 GoBaliGo 實測景點挑選，或一鍵自動排；跨區自動提醒車程與傍晚塞車。</p></div></li>
        <li><span>☀️</span><div><h3>旅行中的「今天」</h3><p>打開就看到今天的天氣、下一站，還能找附近好玩好吃的。</p></div></li>
        <li><span>💸</span><div><h3>記帳與分帳</h3><p>印尼盾／台幣混記，自動算出誰該給誰多少。</p></div></li>
        <li><span>✅</span><div><h3>行前清單</h3><p>e-VOA、觀光稅、All Indonesia 申報…峇里島專屬清單一項項打勾。</p></div></li>
        <li><span>🆘</span><div><h3>注意事項與 SOS 卡</h3><p>入境、交通、寺廟禮儀，急難時一鍵撥打 112、警察、救護車。</p></div></li>
        <li><span>🔗</span><div><h3>分享給旅伴</h3><p>產生連結傳到 LINE，旅伴打開就能看、也能存成自己的一份。</p></div></li>
      </ul>
      <p class="bj-muted">免費、免登入，資料只存在你的手機裡，沒網路也能看。</p>
    </section>
    ${viewNews(6)}`;
}

// ── 畫面：今天 ──────────────────────────────────────────────────────

function viewToday(t: Trip) {
  const idx = tripDayIndex(t);
  const month = new Date().getMonth() + 1;
  const clim = BALI_CLIMATE.find((c) => c.month === month)!;
  let status = '';
  let body = '';
  if (idx < 1) {
    const left = 1 - idx;
    status = `<div class="bj-countdown"><span>${left}</span>天後出發 ✈️</div>`;
    const undone = t.checklist.filter((c) => !c.done).length;
    body = `<section class="bj-card">
        <h2>出發前</h2>
        <p>行前清單還有 <strong>${undone}</strong> 項沒打勾。</p>
        <button class="bj-btn" data-act="tab" data-tab="check">打開行前清單</button>
      </section>
      <section class="bj-card"><h2>第 1 天預覽・${fmtDate(t.start)}</h2>${timeline(t, 1, { editable: false })}</section>`;
  } else if (idx > t.days) {
    status = `<div class="bj-countdown is-over">旅程結束了，歡迎回家 🏡</div>`;
    const { transfers } = settle(t);
    body = `<section class="bj-card"><h2>旅行回顧</h2>
      <p>共 ${t.items.length} 個行程、${t.expenses.length} 筆花費。</p>
      ${transfers.length ? `<p>還有 ${transfers.length} 筆分帳沒結清。</p><button class="bj-btn" data-act="tab" data-tab="money">看分帳</button>` : '<p>分帳都結清了 🎉</p>'}
    </section>`;
  } else {
    status = `<div class="bj-countdown"><small>Day</small><span>${idx}</span><small>／${t.days}</small></div>`;
    const items = itemsOfDay(t, idx);
    const regionsToday = [...new Set(items.map((i) => i.region).filter(Boolean))] as RegionId[];
    const baseRegion = ui.nearest || regionsToday[0];
    body = `<section class="bj-card"><h2>今天的行程・${fmtDate(addDays(t.start, idx - 1))}</h2>
        ${timeline(t, idx, { editable: false, highlightNext: true })}
        <button class="bj-btn bj-btn-ghost" data-act="goto-day" data-day="${idx}">編輯今天</button>
      </section>
      ${viewNearby(baseRegion, t)}`;
  }

  const w = ui.weather;
  const [wi, wl] = w ? weatherLabel(w.code) : ['🌡️', ''];
  const weather = `<section class="bj-card bj-weather">
      <div class="bj-weather-main">${wi}<div>
        ${w ? `<strong>${Math.round(w.temp)}°C ${wl}</strong><span>今日 ${Math.round(w.min)}–${Math.round(w.max)}°C・降雨機率 ${w.rain}%</span>` : `<strong>${month} 月・${SEASON_LABEL['zh-tw'][clim.season]}</strong><span>均溫 ${clim.temp[0]}–${clim.temp[1]}°C・降雨機率 ${clim.rainChance[0]}–${clim.rainChance[1]}%</span>`}
      </div></div>
      <a class="bj-link" href="/weather/">看峇里島逐月天氣 →</a>
    </section>`;

  return `<header class="bj-today-head"><h1>${esc(t.name)}</h1>${status}</header>${weather}${body}${viewNews(3)}`;
}

function viewNearby(region: RegionId | undefined, t: Trip) {
  const geoBtn = `<button class="bj-btn bj-btn-ghost" data-act="locate">📍 用目前位置找</button>`;
  if (!region) {
    return `<section class="bj-card"><h2>附近可以去</h2><p class="bj-muted">開啟定位，或在今天的行程加上景點，就能推薦附近好去處。</p>${geoBtn}</section>`;
  }
  const picked = new Set(t.items.map((i) => i.spotId));
  const list = tripPlannerSpots
    .filter((s) => s.region === region && !picked.has(s.id) && !s.isFullDay && s.audience.includes(t.companion))
    .slice(0, 6);
  return `<section class="bj-card"><h2>${regionById[region].emoji} ${esc(regionById[region].label)}附近可以去</h2>
    ${list.length ? `<ul class="bj-spot-list">${list.map((s) => spotRow(s, tripDayIndex(t))).join('')}</ul>` : '<p class="bj-muted">這區的景點都排進行程了！</p>'}
    ${geoBtn}</section>`;
}

// ── 畫面：行程 ──────────────────────────────────────────────────────

function spotRow(s: Spot, day: number) {
  const dur = s.isFullDay ? '整天' : `${s.durationHours} 小時`;
  return `<li class="bj-spot">
    <div><strong>${esc(s.name)}</strong>
    <div class="bj-item-meta">${regionTag(s.region)}<span class="bj-tag">⏱ ${dur}</span>${'🔥'.repeat(s.intensity)}</div>
    ${s.notes ? `<p class="bj-item-note">${esc(s.notes)}</p>` : ''}
    ${spotLink(s.blogUrl)}</div>
    <button class="bj-btn bj-btn-sm" data-act="add-spot" data-id="${s.id}" data-day="${day}">＋ 加入</button>
  </li>`;
}

function viewPlan(t: Trip) {
  const day = Math.min(Math.max(1, ui.day), t.days);
  ui.day = day;
  const tabs = Array.from({ length: t.days }, (_, i) => {
    const d = i + 1;
    const n = t.items.filter((x) => x.day === d).length;
    return `<button class="bj-day-tab ${d === day ? 'is-on' : ''}" data-act="goto-day" data-day="${d}">
      <b>Day ${d}</b><small>${fmtDate(addDays(t.start, i))}</small>${n ? `<i>${n}</i>` : ''}</button>`;
  }).join('');

  const q = ui.spotQuery.trim().toLowerCase();
  const spots = tripPlannerSpots.filter(
    (s) => (!ui.spotRegion || s.region === ui.spotRegion) && (!q || s.name.toLowerCase().includes(q)),
  );
  const regionChips = [`<button class="bj-chip ${!ui.spotRegion ? 'is-on' : ''}" data-act="spot-region" data-region="">全部</button>`]
    .concat(
      REGIONS.map(
        (r) => `<button class="bj-chip ${ui.spotRegion === r.id ? 'is-on' : ''}" data-act="spot-region" data-region="${r.id}">${r.emoji} ${esc(r.label)}</button>`,
      ),
    )
    .join('');

  const stays = t.stay.length
    ? t.stay.map((s, i) => `<li><strong>🏨 ${esc(s.name)}</strong>${s.checkIn ? `<span>入住 ${fmtDate(s.checkIn)}</span>` : ''}${s.address ? `<a class="bj-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}">${esc(s.address)}</a>` : ''}<button class="bj-icon-btn" data-act="del-stay" data-i="${i}" aria-label="刪除">🗑️</button></li>`).join('')
    : '';
  const flights = t.flights.length
    ? t.flights.map((f, i) => `<li><strong>✈️ ${esc(f.no)}</strong><span>${f.date ? fmtDate(f.date) : ''} ${esc(f.time)}</span>${f.note ? `<span>${esc(f.note)}</span>` : ''}<button class="bj-icon-btn" data-act="del-flight" data-i="${i}" aria-label="刪除">🗑️</button></li>`).join('')
    : '';

  return `<header class="bj-page-head"><h1>行程</h1>
      <div class="bj-head-actions">
        <button class="bj-btn bj-btn-sm" data-act="auto-plan">✨ 自動排</button>
        <button class="bj-btn bj-btn-sm" data-act="share">🔗 分享</button>
      </div></header>
    <nav class="bj-day-tabs" aria-label="選擇天數">${tabs}</nav>
    <section class="bj-card">
      <h2>Day ${day}・${fmtDate(addDays(t.start, day - 1))}</h2>
      ${timeline(t, day, { editable: true })}
      <button class="bj-btn bj-btn-ghost" data-act="new-item">＋ 自訂行程</button>
    </section>
    <section class="bj-card">
      <h2>加景點到 Day ${day}</h2>
      <input class="bj-input" type="search" placeholder="搜尋景點，例如：海灘俱樂部、SPA" value="${esc(ui.spotQuery)}" data-input="spot-query">
      <div class="bj-chips">${regionChips}</div>
      <ul class="bj-spot-list">${spots.map((s) => spotRow(s, day)).join('') || '<li class="bj-empty">找不到符合的景點，可以用「自訂行程」加入</li>'}</ul>
    </section>
    <section class="bj-card">
      <h2>航班與住宿</h2>
      <ul class="bj-info-list">${flights}${stays}</ul>
      <div class="bj-row">
        <button class="bj-btn bj-btn-ghost" data-act="new-flight">＋ 航班</button>
        <button class="bj-btn bj-btn-ghost" data-act="new-stay">＋ 住宿</button>
        <a class="bj-btn bj-btn-ghost" href="/blog/?cat=住宿推薦">找住宿攻略</a>
      </div>
    </section>`;
}

// ── 畫面：記帳 ──────────────────────────────────────────────────────

function viewMoney(t: Trip) {
  const total = t.expenses.reduce((s, e) => s + toIDR(e, t.rate), 0);
  const { bal, transfers } = settle(t);
  const byCat: Record<string, number> = {};
  t.expenses.forEach((e) => (byCat[e.cat] = (byCat[e.cat] || 0) + toIDR(e, t.rate)));
  const catRows = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .map(([c, v]) => `<li><span>${esc(c)}</span><span class="bj-bar"><i style="width:${total ? (v / total) * 100 : 0}%"></i></span><b>${fmtMoney(v, 'IDR')}</b></li>`)
    .join('');
  const list = t.expenses
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(
      (e) => `<li class="bj-exp">
        <div><strong>${esc(e.title)}</strong><span class="bj-muted">${esc(e.cat)}・Day ${e.day}・${esc(e.payer)} 付・${e.split.length} 人分</span></div>
        <div class="bj-exp-amt">${fmtMoney(e.amount, e.cur)}${e.cur === 'IDR' ? `<small>≈ ${fmtMoney(e.amount / t.rate, 'TWD')}</small>` : ''}</div>
        <button class="bj-icon-btn" data-act="edit-exp" data-id="${e.id}" aria-label="編輯">✏️</button>
      </li>`,
    )
    .join('');
  return `<header class="bj-page-head"><h1>記帳分帳</h1><button class="bj-btn bj-btn-sm bj-btn-primary" data-act="new-exp">＋ 記一筆</button></header>
    <section class="bj-card bj-total">
      <span>總花費</span><strong>${fmtMoney(total, 'IDR')}</strong><span>≈ ${fmtMoney(total / t.rate, 'TWD')}・每人約 ${fmtMoney(total / t.rate / t.members.length, 'TWD')}</span>
    </section>
    <section class="bj-card">
      <h2>匯率計算機</h2>
      <div class="bj-calc">
        <label>1 台幣 =<input class="bj-input bj-input-sm" type="number" inputmode="decimal" min="1" step="1" value="${t.rate}" data-input="rate"> 印尼盾</label>
        <label><input class="bj-input" inputmode="decimal" placeholder="輸入印尼盾，可打算式如 150000*2" data-input="calc"></label>
        <output id="bj-calc-out" class="bj-calc-out">—</output>
      </div>
      <button class="bj-link bj-link-btn" data-act="fetch-rate">↻ 帶入今日換匯參考價</button>
    </section>
    ${t.members.length > 1 ? `<section class="bj-card"><h2>誰該給誰</h2>
      ${transfers.length ? `<ul class="bj-settle">${transfers.map((x) => `<li><b>${esc(x.from)}</b> → <b>${esc(x.to)}</b><span>${fmtMoney(x.amt, 'IDR')}<small>≈ ${fmtMoney(x.amt / t.rate, 'TWD')}</small></span></li>`).join('')}</ul>` : '<p class="bj-muted">目前大家都打平了 👍</p>'}
      <details><summary>每人收支</summary><ul class="bj-settle">${Object.entries(bal).map(([k, v]) => `<li><b>${esc(k)}</b><span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : '−'}${fmtMoney(Math.abs(v), 'IDR')}</span></li>`).join('')}</ul></details>
    </section>` : ''}
    ${catRows ? `<section class="bj-card"><h2>花費分類</h2><ul class="bj-cats">${catRows}</ul></section>` : ''}
    <section class="bj-card"><h2>明細</h2>${list ? `<ul class="bj-exp-list">${list}</ul>` : '<div class="bj-empty">還沒有記帳，按右上角「記一筆」</div>'}</section>`;
}

// ── 畫面：清單 ──────────────────────────────────────────────────────

function viewCheck(t: Trip) {
  const groups = [...new Set(t.checklist.map((c) => c.group))];
  const done = t.checklist.filter((c) => c.done).length;
  const pct = t.checklist.length ? Math.round((done / t.checklist.length) * 100) : 0;
  return `<header class="bj-page-head"><h1>行前清單</h1><span class="bj-pill">${done}/${t.checklist.length}</span></header>
    <div class="bj-progress"><i style="width:${pct}%"></i></div>
    ${groups
      .map(
        (g) => `<section class="bj-card"><h2>${esc(g)}</h2><ul class="bj-checks">
        ${t.checklist
          .filter((c) => c.group === g)
          .map(
            (c) => `<li class="${c.done ? 'is-done' : ''}"><label><input type="checkbox" data-act="toggle-check" data-id="${c.id}" ${c.done ? 'checked' : ''}><span>${esc(c.text)}</span></label><button class="bj-icon-btn" data-act="del-check" data-id="${c.id}" aria-label="刪除">✕</button></li>`,
          )
          .join('')}</ul></section>`,
      )
      .join('')}
    <section class="bj-card">
      <form class="bj-row" data-form="add-check">
        <input class="bj-input" name="text" placeholder="新增項目，例如：伴手禮清單" required>
        <button class="bj-btn bj-btn-primary">新增</button>
      </form>
    </section>
    <section class="bj-card bj-card-aqua"><h2>入境三件事看這裡</h2>
      <p>e-VOA、觀光稅、All Indonesia 申報的最新教學，GoBaliGo 都有整理。</p>
      <a class="bj-btn" href="/blog/?cat=簽證通關">看簽證通關攻略</a></section>`;
}

// ── 畫面：更多（須知、SOS、留言板、旅報、旅行包、設定） ───────────────

function viewSOS() {
  return `<section class="bj-card bj-sos" id="sos">
    <h2>🆘 SOS 卡・峇里島</h2>
    <div class="bj-sos-grid">${SOS.map((s) => `<a class="bj-sos-btn" href="tel:${s.num}"><b>${s.num}</b><span>${esc(s.label)}</span></a>`).join('')}</div>
    <p class="bj-muted">112 為萬用緊急電話；遇到外國人相關事件也可請飯店協助聯絡旅遊警察。</p>
    <h3>國際醫院</h3>
    <ul class="bj-info-list">${HOSPITALS.map((h) => `<li><strong>🏥 ${esc(h.name)}</strong><span>${esc(h.note)}</span><a class="bj-link" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}">地圖</a></li>`).join('')}</ul>
    <h3>台灣駐外館處</h3>
    <ul class="bj-info-list">
      <li><strong>駐泗水台北經濟貿易辦事處</strong><span>轄區含峇里島、龍目島等東印尼地區</span><a class="bj-link" target="_blank" rel="noopener" href="https://www.google.com/search?q=${encodeURIComponent('駐泗水台北經濟貿易辦事處 急難救助電話')}">查急難救助電話</a></li>
      <li><strong>駐印尼台北經濟貿易代表處（雅加達）</strong><a class="bj-link" target="_blank" rel="noopener" href="https://www.roc-taiwan.org/id/">官網與急難救助電話</a></li>
      <li><strong>外交部旅外國人急難救助全球免付費專線</strong><span>可撥 00-800-0885-0885（部分地區不適用）</span></li>
    </ul>
    <p class="bj-muted">出發前建議把以上號碼存進手機通訊錄，並到外交部「出國登錄」。<a class="bj-link" href="/blog/2025-06-20-6855271afd897800016d3b6a/">護照遺失怎麼辦 →</a></p>
  </section>`;
}

function viewNotes(t: Trip) {
  const notes = t.notes
    .slice()
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at))
    .map(
      (n) => `<li class="${n.pinned ? 'is-pinned' : ''}"><div><b>${esc(n.author)}</b><span class="bj-muted">${new Date(n.at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
      <p>${esc(n.text)}</p>
      <div class="bj-row"><button class="bj-link bj-link-btn" data-act="pin-note" data-id="${n.id}">${n.pinned ? '取消置頂' : '📌 置頂'}</button><button class="bj-link bj-link-btn" data-act="del-note" data-id="${n.id}">刪除</button></div></li>`,
    )
    .join('');
  return `<section class="bj-card"><h2>💬 旅伴留言板</h2>
    <form class="bj-note-form" data-form="add-note">
      <select class="bj-input bj-input-sm" name="author">${t.members.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
      <input class="bj-input" name="text" placeholder="留話給旅伴，例如：明天 8 點大廳集合" required>
      <button class="bj-btn bj-btn-primary">送出</button>
    </form>
    ${notes ? `<ul class="bj-notes">${notes}</ul>` : '<p class="bj-muted">留言會跟著「分享連結」一起傳給旅伴。</p>'}
  </section>`;
}

function viewNews(limit: number) {
  const items = DATA.news.slice(0, limit);
  if (!items.length) return '';
  return `<section class="bj-card"><h2>📰 GoBaliGo 旅報</h2>
    <div class="bj-news">${items
      .map(
        (n) => `<a class="bj-news-item" href="${esc(n.url)}">
        ${n.img ? `<img src="${esc(n.img)}" alt="" loading="lazy" width="96" height="72">` : '<span class="bj-news-ph">🌴</span>'}
        <div><strong>${esc(n.title)}</strong><span class="bj-muted">${esc(n.cat)}${n.date ? `・${esc(n.date)}` : ''}</span></div></a>`,
      )
      .join('')}</div>
    <a class="bj-link" href="/news/">看更多峇里島新聞 →</a></section>`;
}

function viewPack() {
  const tickets = (FEATURED_TICKETS as { name: string; cat: string; idr: number; klook: string; tripcom: string }[]).slice(0, 8);
  return `<section class="bj-card bj-card-aqua"><h2>🧳 峇里旅行包</h2>
    <p>門票、包車、eSIM、SPA…出發前先準備好。</p>
    <ul class="bj-pack">${tickets
      .map(
        (k) => `<li><div><strong>${esc(k.name)}</strong><span class="bj-muted">${esc((CAT_LABEL as Record<string, string>)[k.cat] || '')}・現場約 ${fmtMoney(k.idr, 'IDR')}</span></div>
        <div class="bj-row"><a class="bj-btn bj-btn-sm" href="${esc(k.klook)}" target="_blank" rel="sponsored noopener">Klook</a><a class="bj-btn bj-btn-sm" href="${esc(k.tripcom)}" target="_blank" rel="sponsored noopener">Trip.com</a></div></li>`,
      )
      .join('')}</ul>
    <div class="bj-row"><a class="bj-btn" href="/tickets/">全部門票比價</a><a class="bj-btn" href="/bali-budget-calculator/">旅費試算</a><a class="bj-btn" href="/map/">峇里島地圖</a></div>
    <p class="bj-muted">含合作推薦連結，價格和直接購買一樣。</p></section>`;
}

function viewMore(t: Trip) {
  return `<header class="bj-page-head"><h1>更多</h1></header>
    ${viewSOS()}
    <section class="bj-card"><h2>📋 峇里島注意事項</h2>
      ${BALI_NOTES.map((n) => `<details class="bj-details"><summary>${n.icon} ${esc(n.title)}</summary><ul>${n.body.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>${n.link ? `<a class="bj-link" href="${esc(n.link)}">延伸閱讀 →</a>` : ''}</details>`).join('')}
    </section>
    ${viewNotes(t)}
    ${viewPack()}
    ${viewNews(8)}
    <section class="bj-card"><h2>⚙️ 這趟旅行</h2>
      <div class="bj-row">
        <button class="bj-btn" data-act="edit-trip">編輯旅行資訊</button>
        <button class="bj-btn" data-act="share">🔗 分享給旅伴</button>
        <button class="bj-btn" data-act="switch-trip">切換／新增旅行</button>
        <button class="bj-btn bj-btn-danger" data-act="del-trip">刪除這趟旅行</button>
      </div>
      ${storageOk ? '' : '<p class="bj-warn">⚠️ 這個瀏覽器無法儲存資料（可能是無痕模式），關掉頁面後資料會消失。</p>'}
      <p class="bj-muted">資料只存在這支手機的瀏覽器裡。換手機前，請用「分享」產生連結，在新手機打開後匯入。</p>
    </section>`;
}

// ── 底部彈出表單（sheet） ────────────────────────────────────────────

function sheetTrip(t?: Trip) {
  const isNew = !t;
  const comp = t?.companion || 'couple';
  return `<form class="bj-form" data-form="${isNew ? 'create-trip' : 'save-trip'}">
    <h2>${isNew ? '建立新旅行' : '編輯旅行資訊'}</h2>
    <label>旅行名稱<input class="bj-input" name="name" required maxlength="40" value="${esc(t?.name || '峇里島 ' + (new Date().getFullYear()) + ' 之旅')}"></label>
    <div class="bj-row">
      <label>出發日<input class="bj-input" type="date" name="start" required value="${esc(t?.start || addDays(todayISO(), 30))}"></label>
      <label>天數<input class="bj-input" type="number" name="days" min="1" max="30" required value="${t?.days || 5}"></label>
    </div>
    <label>旅伴（用逗號分隔，第一位是你）<input class="bj-input" name="members" value="${esc((t?.members || ['我']).join(', '))}"></label>
    <label>同行對象<select class="bj-input" name="companion">${COMPANIONS.map((c) => `<option value="${c.id}" ${c.id === comp ? 'selected' : ''}>${c.label}</option>`).join('')}</select></label>
    ${
      isNew
        ? `<fieldset class="bj-fieldset"><legend><label><input type="checkbox" name="auto" checked> ✨ 用 GoBaliGo 行程產生器自動排</label></legend>
          <p class="bj-muted">選想住／想玩的區域（可複選），會依車程自動安排每天住哪一區，之後都能再改。</p>
          <div class="bj-chips">${REGIONS.map((r) => `<label class="bj-chip"><input type="checkbox" name="regions" value="${r.id}" ${['ubud', 'seminyak'].includes(r.id) ? 'checked' : ''}> ${r.emoji} ${esc(r.label)}</label>`).join('')}</div>
        </fieldset>`
        : ''
    }
    <div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">${isNew ? '建立' : '儲存'}</button></div>
  </form>`;
}

function sheetAutoPlan(t: Trip) {
  return `<form class="bj-form" data-form="auto-plan">
    <h2>✨ 自動排行程</h2>
    <p class="bj-muted">依你選的區域與同行對象，用 GoBaliGo 行程產生器重新安排 ${t.days} 天行程（一天一區、換區提醒車程）。</p>
    <div class="bj-chips">${REGIONS.map((r) => `<label class="bj-chip"><input type="checkbox" name="regions" value="${r.id}" ${t.items.some((i) => i.region === r.id) ? 'checked' : ''}> ${r.emoji} ${esc(r.label)}</label>`).join('')}</div>
    <label class="bj-check-line"><input type="checkbox" name="keep" checked> 保留我自己加的「自訂行程」</label>
    <p class="bj-warn">會取代目前從景點庫加入的行程。</p>
    <div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">開始排</button></div>
  </form>`;
}

function sheetItem(t: Trip, it?: Item) {
  return `<form class="bj-form" data-form="save-item" data-id="${it?.id || ''}">
    <h2>${it ? '編輯行程' : '新增自訂行程'}</h2>
    <label>名稱<input class="bj-input" name="title" required maxlength="60" value="${esc(it?.title || '')}" placeholder="例如：Potato Head 看夕陽"></label>
    <div class="bj-row">
      <label>Day<select class="bj-input" name="day">${Array.from({ length: t.days }, (_, i) => `<option value="${i + 1}" ${(it?.day || ui.day) === i + 1 ? 'selected' : ''}>Day ${i + 1}</option>`).join('')}</select></label>
      <label>時間<input class="bj-input" type="time" name="time" value="${esc(it?.time || '')}"></label>
    </div>
    <label>區域<select class="bj-input" name="region"><option value="">（不指定）</option>${REGIONS.map((r) => `<option value="${r.id}" ${it?.region === r.id ? 'selected' : ''}>${r.emoji} ${esc(r.label)}</option>`).join('')}</select></label>
    <label>備註<textarea class="bj-input" name="note" rows="2" maxlength="300" placeholder="訂位代號、集合地點…">${esc(it?.note || '')}</textarea></label>
    <label>連結<input class="bj-input" name="url" type="url" value="${esc(it?.url || '')}" placeholder="https://"></label>
    <div class="bj-row bj-form-actions">
      ${it ? `<button type="button" class="bj-btn bj-btn-danger" data-act="del-item" data-id="${it.id}">刪除</button>` : ''}
      <button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">儲存</button></div>
  </form>`;
}

function sheetExpense(t: Trip, e?: Expense) {
  const idx = tripDayIndex(t);
  const defDay = idx >= 1 && idx <= t.days ? idx : 1;
  const split = e?.split || t.members;
  return `<form class="bj-form" data-form="save-exp" data-id="${e?.id || ''}">
    <h2>${e ? '編輯花費' : '記一筆'}</h2>
    <label>項目<input class="bj-input" name="title" required maxlength="40" value="${esc(e?.title || '')}" placeholder="例如：髒鴨餐"></label>
    <div class="bj-row">
      <label>金額<input class="bj-input" name="amount" required inputmode="decimal" value="${e ? e.amount : ''}" placeholder="可打算式，如 85000*3"></label>
      <label>幣別<select class="bj-input" name="cur"><option value="IDR" ${e?.cur !== 'TWD' ? 'selected' : ''}>印尼盾</option><option value="TWD" ${e?.cur === 'TWD' ? 'selected' : ''}>台幣</option></select></label>
    </div>
    <div class="bj-row">
      <label>分類<select class="bj-input" name="cat">${EXPENSE_CATS.map((c) => `<option ${e?.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
      <label>Day<select class="bj-input" name="day">${Array.from({ length: t.days }, (_, i) => `<option value="${i + 1}" ${(e?.day || defDay) === i + 1 ? 'selected' : ''}>Day ${i + 1}</option>`).join('')}</select></label>
    </div>
    <label>誰付的<select class="bj-input" name="payer">${t.members.map((m) => `<option ${e?.payer === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
    <fieldset class="bj-fieldset"><legend>幫誰付（平分）</legend><div class="bj-chips">${t.members.map((m) => `<label class="bj-chip"><input type="checkbox" name="split" value="${esc(m)}" ${split.includes(m) ? 'checked' : ''}> ${esc(m)}</label>`).join('')}</div></fieldset>
    <div class="bj-row bj-form-actions">
      ${e ? `<button type="button" class="bj-btn bj-btn-danger" data-act="del-exp" data-id="${e.id}">刪除</button>` : ''}
      <button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">儲存</button></div>
  </form>`;
}

function sheetFlight() {
  return `<form class="bj-form" data-form="save-flight"><h2>新增航班</h2>
    <label>航班編號<input class="bj-input" name="no" required maxlength="20" placeholder="例如：CI 771"></label>
    <div class="bj-row"><label>日期<input class="bj-input" type="date" name="date"></label><label>起飛時間<input class="bj-input" type="time" name="time"></label></div>
    <label>備註<input class="bj-input" name="note" maxlength="80" placeholder="航廈、訂位代號…"></label>
    <div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">儲存</button></div></form>`;
}

function sheetStay(t: Trip) {
  return `<form class="bj-form" data-form="save-stay"><h2>新增住宿</h2>
    <label>住宿名稱<input class="bj-input" name="name" required maxlength="60"></label>
    <label>地址（給司機看、開地圖）<input class="bj-input" name="address" maxlength="160"></label>
    <label>入住日<input class="bj-input" type="date" name="checkIn" value="${esc(t.start)}"></label>
    <div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">取消</button><button class="bj-btn bj-btn-primary">儲存</button></div></form>`;
}

function sheetShare(url: string) {
  return `<div class="bj-form"><h2>🔗 分享給旅伴</h2>
    <p>旅伴打開這個連結就能看到完整行程、記帳與留言，也可以存成自己的一份繼續編。</p>
    <textarea class="bj-input" rows="3" readonly id="bj-share-url">${esc(url)}</textarea>
    <p class="bj-muted">連結裡就是行程內容本身，不會上傳到伺服器。之後有修改，請重新分享一次。</p>
    <div class="bj-row bj-form-actions">
      <a class="bj-btn" target="_blank" rel="noopener" href="https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}">分享到 LINE</a>
      <button class="bj-btn bj-btn-primary" data-act="copy-share">複製連結</button>
      <button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">關閉</button></div></div>`;
}

function sheetImport(t: Trip) {
  const exists = store.trips.some((x) => x.id === t.id);
  return `<div class="bj-form"><h2>旅伴分享了一趟旅行給你</h2>
    <div class="bj-card"><strong>${esc(t.name)}</strong><p>${fmtDate(t.start)} 出發・${t.days} 天・${esc(t.members.join('、'))}</p>
    <p class="bj-muted">${t.items.length} 個行程・${t.expenses.length} 筆記帳・${t.notes.length} 則留言</p></div>
    ${exists ? '<p class="bj-warn">你的手帳裡已經有這趟旅行，匯入會用旅伴的版本覆蓋。</p>' : ''}
    <div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">先不要</button><button class="bj-btn bj-btn-primary" data-act="import-shared">${exists ? '更新成這個版本' : '存到我的手帳'}</button></div></div>`;
}

function sheetTrips() {
  return `<div class="bj-form"><h2>我的旅行</h2><div class="bj-trip-list">
    ${store.trips.map((t) => `<button class="bj-trip-card ${t.id === store.currentId ? 'is-on' : ''}" data-act="open-trip" data-id="${t.id}"><strong>${esc(t.name)}</strong><span>${fmtDate(t.start)} 出發・${t.days} 天</span></button>`).join('')}
    </div><div class="bj-row bj-form-actions"><button type="button" class="bj-btn bj-btn-ghost" data-act="close-sheet">關閉</button><button class="bj-btn bj-btn-primary" data-act="new-trip">＋ 建立新旅行</button></div></div>`;
}

function renderSheet(t: Trip | null) {
  const s = ui.sheet;
  if (!s) return '';
  let inner = '';
  if (s === 'new-trip') inner = sheetTrip();
  else if (s === 'edit-trip' && t) inner = sheetTrip(t);
  else if (s === 'auto-plan' && t) inner = sheetAutoPlan(t);
  else if (s === 'item' && t) inner = sheetItem(t, t.items.find((i) => i.id === ui.sheetData.id));
  else if (s === 'exp' && t) inner = sheetExpense(t, t.expenses.find((i) => i.id === ui.sheetData.id));
  else if (s === 'flight') inner = sheetFlight();
  else if (s === 'stay' && t) inner = sheetStay(t);
  else if (s === 'share') inner = sheetShare(String(ui.sheetData.url));
  else if (s === 'import' && ui.shared) inner = sheetImport(ui.shared);
  else if (s === 'trips') inner = sheetTrips();
  return `<div class="bj-sheet-backdrop" data-act="close-sheet"></div><div class="bj-sheet" role="dialog" aria-modal="true">${inner}</div>`;
}

// ── 主渲染 ──────────────────────────────────────────────────────────

const NAV: { tab: Tab; icon: string; label: string }[] = [
  { tab: 'today', icon: '☀️', label: '今天' },
  { tab: 'plan', icon: '🗓️', label: '行程' },
  { tab: 'money', icon: '💸', label: '記帳' },
  { tab: 'check', icon: '✅', label: '清單' },
  { tab: 'more', icon: '🧭', label: '更多' },
];

function render() {
  const t = currentTrip();
  const scrollY = window.scrollY;
  let main = '';
  if (!t) main = viewWelcome();
  else if (ui.tab === 'today') main = viewToday(t);
  else if (ui.tab === 'plan') main = viewPlan(t);
  else if (ui.tab === 'money') main = viewMoney(t);
  else if (ui.tab === 'check') main = viewCheck(t);
  else main = viewMore(t);

  const topbar = `<div class="bj-topbar">
      <a class="bj-brand" href="/blog/" aria-label="回 GoBaliGo 首頁"><span>🌺</span>峇里手帳</a>
      ${t ? `<button class="bj-trip-switch" data-act="switch-trip">${esc(t.name)} ▾</button>` : ''}
      <button class="bj-sos-chip" data-act="sos" aria-label="SOS 緊急電話">SOS</button>
    </div>`;

  const nav = t
    ? `<nav class="bj-nav" aria-label="手帳選單">${NAV.map((n) => `<button class="${ui.tab === n.tab ? 'is-on' : ''}" data-act="tab" data-tab="${n.tab}" ${ui.tab === n.tab ? 'aria-current="page"' : ''}><span>${n.icon}</span>${n.label}</button>`).join('')}</nav>`
    : '';

  root.innerHTML = `${topbar}<main class="bj-main">${main}</main>${nav}${renderSheet(t)}`;
  root.classList.toggle('has-nav', !!t);
  document.body.classList.toggle('bj-lock', !!ui.sheet);
  window.scrollTo(0, scrollY);
}

function setTab(tab: Tab) {
  ui.tab = tab;
  render();
  window.scrollTo(0, 0);
}

function openSheet(name: string, data: Record<string, unknown> = {}) {
  ui.sheet = name;
  ui.sheetData = data;
  render();
  const first = root.querySelector<HTMLElement>('.bj-sheet input:not([type=hidden]), .bj-sheet button');
  first?.focus({ preventScroll: true });
}

function closeSheet() {
  ui.sheet = null;
  ui.sheetData = {};
  render();
}

function toast(msg: string) {
  const el = document.createElement('div');
  el.className = 'bj-toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

/** 只允許數字與 + - * / ( ) . 的安全算式 */
function calc(expr: string): number | null {
  const s = expr.replace(/[,\s]/g, '').replace(/[×x]/g, '*').replace(/÷/g, '/');
  if (!s || !/^[\d+\-*/().]+$/.test(s)) return null;
  try {
    const v = Function(`"use strict";return (${s})`)() as number;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

// ── 自動排行程 ──────────────────────────────────────────────────────

function autoPlan(t: Trip, regions: RegionId[], keepCustom: boolean) {
  const opt: DaysOption = t.days <= 4 ? '4' : t.days === 5 ? '5' : t.days <= 8 ? '68' : '9';
  const result = generateItinerary({ companion: t.companion, days: opt, regions: regions.length ? regions : ['ubud', 'seminyak'], spotIds: [] });
  const kept = keepCustom ? t.items.filter((i) => !i.spotId) : [];
  const items: Item[] = [];
  const toMin = (hm: string) => parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3, 5), 10);
  const toHM = (m: number) => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m % 60))}`;
  result.days.slice(0, t.days).forEach((d, i) => {
    // 同一時段排了多個景點時，依停留時數往後推（含 30 分鐘移動）
    let cursor = 0;
    d.slots.forEach((s) => {
      const start = Math.max(toMin(SLOT_CLOCK[s.time] || '09:00'), cursor);
      cursor = start + Math.round(s.spot.durationHours * 60) + 30;
      items.push({
        id: uid(),
        day: i + 1,
        time: toHM(Math.min(start, 22 * 60)),
        title: s.spot.name,
        region: s.spot.region,
        spotId: s.spot.id,
        url: s.spot.blogUrl,
        note: s.spot.notes,
      });
    });
    if (d.isTravelDay && d.travelNote) {
      items.push({ id: uid(), day: i + 1, time: '08:00', title: `換區移動：${d.travelNote}`, region: d.travelFrom, note: '' });
    }
  });
  // 天數超過產生器上限時，最後幾天留空讓使用者自己排
  t.items = [...kept, ...items];
  return result.tradeoffNote;
}

// ── 事件 ────────────────────────────────────────────────────────────

async function handleAction(act: string, el: HTMLElement) {
  const t = currentTrip();
  const id = el.dataset.id || '';
  switch (act) {
    case 'tab':
      return setTab(el.dataset.tab as Tab);
    case 'new-trip':
      return openSheet('new-trip');
    case 'switch-trip':
      return openSheet('trips');
    case 'open-trip':
      store.currentId = id;
      save();
      ui.sheet = null;
      ui.day = 1;
      return setTab('today');
    case 'edit-trip':
      return openSheet('edit-trip');
    case 'del-trip':
      // 不用 confirm()：部分 WebView／內嵌環境會直接回傳 false。改成按兩次確認。
      if (t && el.dataset.armed !== '1') {
        el.dataset.armed = '1';
        el.textContent = `再按一次，刪除「${t.name}」（無法復原）`;
        setTimeout(() => {
          if (el.isConnected) {
            el.dataset.armed = '';
            el.textContent = '刪除這趟旅行';
          }
        }, 4000);
        return;
      }
      if (t) {
        store.trips = store.trips.filter((x) => x.id !== t.id);
        store.currentId = store.trips[0]?.id ?? null;
        save();
        setTab('today');
      }
      return;
    case 'close-sheet':
      return closeSheet();
    case 'sos':
      if (t) {
        ui.tab = 'more';
        ui.sheet = null;
        render();
      } else if (!document.getElementById('sos')) {
        root.querySelector('.bj-main')?.insertAdjacentHTML('afterbegin', viewSOS());
      }
      document.getElementById('sos')?.scrollIntoView({ behavior: 'smooth' });
      return;
    case 'goto-day':
      ui.day = Number(el.dataset.day) || 1;
      return setTab('plan');
    case 'spot-region':
      ui.spotRegion = (el.dataset.region || '') as RegionId | '';
      return render();
    case 'add-spot': {
      const s = spotById[id];
      if (!t || !s) return;
      const day = Number(el.dataset.day) || ui.day;
      const dayItems = itemsOfDay(t, day);
      const last = dayItems[dayItems.length - 1];
      let time = s.allowedTimes?.length ? SLOT_CLOCK[s.allowedTimes[0]] : SLOT_CLOCK[s.bestTime] || '';
      if (last?.time && time && time <= last.time) {
        // 接在當天最後一個行程之後（停留時數＋30 分鐘移動）
        const lastSpot = last.spotId ? spotById[last.spotId] : undefined;
        const [h, m] = last.time.split(':').map(Number);
        const next = Math.min(h * 60 + m + Math.round((lastSpot?.durationHours ?? 1.5) * 60) + 30, 22 * 60);
        time = `${pad(Math.floor(next / 60))}:${pad(next % 60)}`;
      }
      t.items.push({ id: uid(), day, time, title: s.name, region: s.region, spotId: s.id, url: s.blogUrl, note: s.notes });
      save();
      toast(`已加入 Day ${day}：${s.name}`);
      return render();
    }
    case 'toggle-item': {
      const it = t?.items.find((i) => i.id === id);
      if (it) {
        it.done = !it.done;
        save();
        render();
      }
      return;
    }
    case 'new-item':
      return openSheet('item');
    case 'edit-item':
      return openSheet('item', { id });
    case 'del-item':
      if (t) {
        t.items = t.items.filter((i) => i.id !== id);
        save();
      }
      return closeSheet();
    case 'auto-plan':
      return openSheet('auto-plan');
    case 'share': {
      if (!t) return;
      const code = await encodeTrip(t);
      const url = `${location.origin}/app/#share=${code}`;
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        try {
          await navigator.share({ title: `${t.name}｜峇里手帳`, text: `一起看我們的峇里島行程：${t.name}`, url });
          return;
        } catch {
          /* 使用者取消就改顯示連結 */
        }
      }
      return openSheet('share', { url });
    }
    case 'copy-share': {
      const ta = document.getElementById('bj-share-url') as HTMLTextAreaElement | null;
      if (!ta) return;
      try {
        await navigator.clipboard.writeText(ta.value);
      } catch {
        ta.select();
        document.execCommand('copy');
      }
      return toast('已複製連結');
    }
    case 'import-shared': {
      const s = ui.shared;
      if (!s) return;
      store.trips = store.trips.filter((x) => x.id !== s.id).concat(s);
      store.currentId = s.id;
      ui.shared = null;
      save();
      history.replaceState(null, '', '/app/');
      ui.sheet = null;
      toast('已存到你的手帳');
      return setTab('plan');
    }
    case 'new-exp':
      return openSheet('exp');
    case 'edit-exp':
      return openSheet('exp', { id });
    case 'del-exp':
      if (t) {
        t.expenses = t.expenses.filter((e) => e.id !== id);
        save();
      }
      return closeSheet();
    case 'fetch-rate':
      return fetchRate(true);
    case 'toggle-check': {
      const c = t?.checklist.find((x) => x.id === id);
      if (c) {
        c.done = (el as HTMLInputElement).checked;
        save();
        render();
      }
      return;
    }
    case 'del-check':
      if (t) {
        t.checklist = t.checklist.filter((c) => c.id !== id);
        save();
        render();
      }
      return;
    case 'pin-note': {
      const n = t?.notes.find((x) => x.id === id);
      if (n) {
        n.pinned = !n.pinned;
        save();
        render();
      }
      return;
    }
    case 'del-note':
      if (t) {
        t.notes = t.notes.filter((n) => n.id !== id);
        save();
        render();
      }
      return;
    case 'new-flight':
      return openSheet('flight');
    case 'new-stay':
      return openSheet('stay');
    case 'del-flight':
      t?.flights.splice(Number(el.dataset.i), 1);
      save();
      return render();
    case 'del-stay':
      t?.stay.splice(Number(el.dataset.i), 1);
      save();
      return render();
    case 'locate':
      return locate(true);
  }
}

function handleForm(name: string, form: HTMLFormElement) {
  const fd = new FormData(form);
  const get = (k: string) => String(fd.get(k) ?? '').trim();
  const t = currentTrip();
  switch (name) {
    case 'create-trip': {
      const members = get('members').split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
      const trip = normalizeTrip({
        name: get('name'),
        start: get('start'),
        days: Number(get('days')),
        members: [...new Set(members)],
        companion: get('companion') as Audience,
      });
      if (fd.get('auto')) autoPlan(trip, fd.getAll('regions') as RegionId[], false);
      store.trips.push(trip);
      store.currentId = trip.id;
      save();
      ui.sheet = null;
      ui.day = 1;
      fetchRate(false);
      return setTab('plan');
    }
    case 'save-trip': {
      if (!t) return;
      const members = [...new Set(get('members').split(/[,，、]/).map((s) => s.trim()).filter(Boolean))];
      t.name = get('name') || t.name;
      t.start = get('start') || t.start;
      t.days = Math.max(1, Math.min(30, Number(get('days')) || t.days));
      t.members = members.length ? members : t.members;
      t.companion = get('companion') as Audience;
      save();
      return closeSheet();
    }
    case 'auto-plan': {
      if (!t) return;
      const note = autoPlan(t, fd.getAll('regions') as RegionId[], !!fd.get('keep'));
      save();
      ui.day = 1;
      closeSheet();
      return toast(note ? `已排好！${note}` : '已排好行程，可以再自由調整');
    }
    case 'save-item': {
      if (!t) return;
      const editId = form.dataset.id;
      const existing = t.items.find((i) => i.id === editId);
      const data = {
        title: get('title'),
        day: Number(get('day')) || ui.day,
        time: get('time'),
        region: (get('region') || undefined) as RegionId | undefined,
        note: get('note'),
        url: get('url') || existing?.url,
      };
      if (existing) Object.assign(existing, data);
      else t.items.push({ id: uid(), ...data });
      ui.day = data.day;
      save();
      return closeSheet();
    }
    case 'save-exp': {
      if (!t) return;
      const amount = calc(get('amount'));
      if (amount == null || amount <= 0) {
        toast('金額格式不正確');
        return;
      }
      const split = fd.getAll('split').map(String);
      const editId = form.dataset.id;
      const existing = t.expenses.find((e) => e.id === editId);
      const data = {
        title: get('title'),
        amount,
        cur: get('cur') as Cur,
        payer: get('payer'),
        split: split.length ? split : [get('payer')],
        cat: get('cat'),
        day: Number(get('day')) || 1,
      };
      if (existing) Object.assign(existing, data);
      else t.expenses.push({ id: uid(), date: new Date().toISOString(), ...data });
      save();
      return closeSheet();
    }
    case 'add-check': {
      if (!t) return;
      t.checklist.push({ id: uid(), text: get('text'), group: '我的項目', done: false });
      save();
      return render();
    }
    case 'add-note': {
      if (!t) return;
      t.notes.push({ id: uid(), author: get('author'), text: get('text'), pinned: false, at: new Date().toISOString() });
      save();
      return render();
    }
    case 'save-flight':
      t?.flights.push({ no: get('no'), date: get('date'), time: get('time'), note: get('note') });
      save();
      return closeSheet();
    case 'save-stay':
      t?.stay.push({ name: get('name'), address: get('address'), checkIn: get('checkIn') });
      save();
      return closeSheet();
  }
}

function handleInput(name: string, el: HTMLInputElement) {
  const t = currentTrip();
  if (name === 'spot-query') {
    ui.spotQuery = el.value;
    const pos = el.selectionStart;
    render();
    const again = root.querySelector<HTMLInputElement>('[data-input="spot-query"]');
    if (again) {
      again.focus({ preventScroll: true });
      again.setSelectionRange(pos, pos);
    }
  } else if (name === 'rate' && t) {
    const v = Number(el.value);
    if (v > 0) {
      t.rate = v;
      save();
    }
  } else if (name === 'calc' && t) {
    const out = document.getElementById('bj-calc-out');
    const v = calc(el.value);
    if (out) out.textContent = v == null ? '—' : `${fmtMoney(v, 'IDR')} ≈ ${fmtMoney(v / t.rate, 'TWD')}`;
  }
}

// ── 外部資料（可失敗，失敗就用備援） ─────────────────────────────────

async function fetchWeather() {
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-8.65&longitude=115.2&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FMakassar&forecast_days=1',
    );
    const j = await r.json();
    ui.weather = {
      temp: j.current.temperature_2m,
      code: j.current.weather_code,
      max: j.daily.temperature_2m_max[0],
      min: j.daily.temperature_2m_min[0],
      rain: j.daily.precipitation_probability_max[0],
    };
    if (ui.tab === 'today' && !ui.sheet) render();
  } catch {
    /* 離線：維持逐月氣候 */
  }
}

/** 站內 /api/exchange-rate 不提供 TWD 即時價，以 USD 的 IDR 換匯參考價推算 */
async function fetchRate(userInitiated: boolean) {
  const t = currentTrip();
  if (!t) return;
  try {
    const r = await fetch(`/api/exchange-rate?d=${todayISO()}`);
    const j = await r.json();
    const usd = Number(j?.rates?.USD);
    if (!usd) throw new Error('no rate');
    // 1 USD ≈ 31–33 TWD；以 32 推估 TWD 的換匯參考價
    const twd = Math.round(usd / 32);
    if (twd > 100 && twd < 2000) {
      t.rate = twd;
      save();
      if (userInitiated) toast(`已帶入參考匯率：1 台幣 ≈ ${twd} 印尼盾`);
      if (ui.tab === 'money' && !ui.sheet) render();
    }
  } catch {
    if (userInitiated) toast('目前讀不到匯率，請手動輸入');
  }
}

function locate(userInitiated: boolean) {
  if (!('geolocation' in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      let best = REGIONS[0];
      let bestKm = Infinity;
      for (const r of REGIONS) {
        const km = haversineKm(here, r);
        if (km < bestKm) {
          bestKm = km;
          best = r;
        }
      }
      if (bestKm > 60) {
        if (userInitiated) toast('你目前好像不在峇里島，先用行程裡的區域推薦');
        return;
      }
      ui.nearest = best.id;
      render();
    },
    () => userInitiated && toast('無法取得定位'),
    { timeout: 8000, maximumAge: 600000 },
  );
}

async function checkShareHash() {
  const m = location.hash.match(/share=([\w-]+)/);
  if (!m) return;
  const t = await decodeTrip(m[1]);
  if (!t) {
    toast('分享連結已損壞，無法讀取');
    return;
  }
  ui.shared = t;
  openSheet('import');
}

// ── 啟動 ────────────────────────────────────────────────────────────

export function initBaliJournal(el: HTMLElement, data: PageData) {
  root = el;
  DATA = data;
  if (store.currentId && !currentTrip()) store.currentId = store.trips[0]?.id ?? null;
  // 舊資料補欄位
  store.trips = store.trips.map(normalizeTrip);

  const t = currentTrip();
  if (t) {
    const idx = tripDayIndex(t);
    ui.day = idx >= 1 && idx <= t.days ? idx : 1;
  }
  const qTab = new URLSearchParams(location.search).get('tab') as Tab | null;
  if (qTab && NAV.some((n) => n.tab === qTab)) ui.tab = qTab;

  render();

  root.addEventListener('click', (ev) => {
    const target = (ev.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target || !root.contains(target)) return;
    if (target.tagName === 'INPUT') {
      // checkbox：讓瀏覽器先切換狀態
      handleAction(target.dataset.act!, target);
      return;
    }
    ev.preventDefault();
    handleAction(target.dataset.act!, target);
  });
  root.addEventListener('submit', (ev) => {
    const form = ev.target as HTMLFormElement;
    if (!form.dataset.form) return;
    ev.preventDefault();
    handleForm(form.dataset.form, form);
  });
  root.addEventListener('input', (ev) => {
    const el = ev.target as HTMLInputElement;
    if (el.dataset.input) handleInput(el.dataset.input, el);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && ui.sheet) closeSheet();
  });
  window.addEventListener('hashchange', checkShareHash);

  checkShareHash();
  fetchWeather();

  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {});
  }
}
