#!/usr/bin/env node
/**
 * aeo-audit.mjs — 全站 AEO（Answer Engine Optimization）唯讀稽核
 *
 * 掃描 src/content/blog/ 全部 zh-TW 文章，依 A~E 五大項評分（0-100），
 * 輸出 aeo-audit-report.csv 與 aeo-audit-summary.md。不修改任何內容檔。
 *
 * 用法：
 *   node scripts/aeo-audit.mjs --sample 10   # 試跑：跨分類抽 10 篇
 *   node scripts/aeo-audit.mjs               # 全量
 *
 * Schema 判斷完全模擬 src/components/SEO.astro 的 category-aware 邏輯
 * （含 hotel-cache.json 是否有資料、FAQ 答案是否可擷取）。
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';
import matter from 'gray-matter';

const ROOT = new URL('..', import.meta.url).pathname;
const BLOG_DIR = join(ROOT, 'src/content/blog');
const CSV_OUT = join(ROOT, 'aeo-audit-report.csv');
const MD_OUT = join(ROOT, 'aeo-audit-summary.md');
const NOW = new Date('2026-07-03');

const args = process.argv.slice(2);
const sampleIdx = args.indexOf('--sample');
const SAMPLE_N = sampleIdx >= 0 ? parseInt(args[sampleIdx + 1] || '10', 10) : 0;

// ── Hotel cache（決定住宿文 Hotel schema 是否真的會輸出）─────────────────────
let hotelCacheCount = 0;
try {
  const cache = JSON.parse(readFileSync(join(ROOT, 'src/data/hotel-cache.json'), 'utf-8'));
  hotelCacheCount = Object.keys(cache.hotels ?? {}).length;
} catch { /* 無快取 */ }

// ── 文字工具 ─────────────────────────────────────────────────────────────────
const cjkLen = (s) => (s.match(/[一-鿿㐀-䶿]/g) || []).length;
const textLen = (s) => cjkLen(s) + (s.match(/[a-zA-Z0-9]+/g) || []).length; // 中文字 + 英文詞

const stripInline = (s) => s
  .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  .replace(/\{\{[^}]*\}\}/g, '')
  .replace(/[*_~`#>]+/g, '')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

// ── 文章結構解析 ─────────────────────────────────────────────────────────────
function parseStructure(body) {
  const lines = body.split(/\r?\n/);
  const headings = [];        // { depth, text, line }
  const paragraphs = [];      // { text, line, len }
  const listBlocks = [];      // { items, line }
  let tableCount = 0;
  let imageCount = 0;
  let inCode = false;
  let paraBuf = [];
  let paraStart = -1;
  let listBuf = [];
  let listStart = -1;

  const flushPara = () => {
    if (paraBuf.length) {
      const text = stripInline(paraBuf.join(' '));
      if (text) paragraphs.push({ text, line: paraStart, len: cjkLen(text) + Math.round((text.match(/[a-zA-Z0-9]+/g) || []).length * 1.5) });
    }
    paraBuf = []; paraStart = -1;
  };
  const flushList = () => {
    if (listBuf.length) listBlocks.push({ items: listBuf.slice(), line: listStart });
    listBuf = []; listStart = -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const t = raw.trim();
    if (/^```/.test(t)) { inCode = !inCode; flushPara(); flushList(); continue; }
    if (inCode) continue;
    if (/^import\s.+from\s/.test(t)) continue; // MDX import

    const hm = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(t);
    if (hm) { flushPara(); flushList(); headings.push({ depth: hm[1].length, text: stripInline(hm[2]), line: i }); continue; }

    imageCount += (raw.match(/!\[[^\]]*\]\([^)]*\)/g) || []).length;

    // 表格：| a | b | 且下一行是分隔列
    if (/^\|.+\|/.test(t) && /^\|?[\s:-]+\|[\s|:-]*$/.test((lines[i + 1] || '').trim())) {
      tableCount++;
      flushPara(); flushList();
      while (i < lines.length && /^\|.*\|?\s*$/.test((lines[i] || '').trim()) && lines[i].trim()) i++;
      continue;
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(raw)) {
      flushPara();
      if (listStart < 0) listStart = i;
      listBuf.push(stripInline(raw.replace(/^\s*([-*+]|\d+\.)\s+/, '')));
      continue;
    }

    if (!t || /^!\[[^\]]*\]\([^)]*\)\s*$/.test(t) || /^https?:\/\/\S+$/.test(t) || /^\{\{.*\}\}\s*$/.test(t) || /^>/.test(t) || /^<\/?[a-zA-Z]/.test(t)) {
      flushPara(); flushList();
      continue;
    }

    if (paraStart < 0) paraStart = i;
    paraBuf.push(t);
  }
  flushPara(); flushList();
  return { headings, paragraphs, listBlocks, tableCount, imageCount, lineCount: lines.length };
}

// ── 模擬 SEO.astro 的 FAQ 答案擷取（buildAnswerMap 簡化版）───────────────────
function faqAnswerCount(body, h2s) {
  const lines = body.split(/\r?\n/);
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!/^##\s+/.test(lines[i])) continue;
    // 收集到下一個標題前的行，找第一個有意義區塊
    const buf = [];
    for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) buf.push(lines[j]);
    let k = 0;
    while (k < buf.length) {
      const t = buf[k].trim();
      if (!t || /^!\[[^\]]*\]\([^)]*\)\s*$/.test(t) || /^https?:\/\/\S+$/.test(t)) { k++; continue; }
      break;
    }
    if (k < buf.length) {
      const ans = stripInline(buf[k]);
      if (ans.length >= 12) count++;
    }
  }
  return count;
}

// ── A. 直接回答能力（30）────────────────────────────────────────────────────
const FLUFF_OPENER = /^(如果你|你是否|大家好|哈囉|嗨+|想像一下|還記得|上次|上個月|前陣子|每次|終於|一直以來|說到|不知道大家|欸|哇|嘿|話說|某天|那天|有一天|自從)/;
const DIRECT_WORDS = /(最划算|最推薦|最便宜|最方便|最適合|首選|答案是|結論|直接說|一句話|建議(選|去|住|搭|用)|就是|總共|只要|大約|約\s?\d|需要\d|不用\d|免費|必須|重點是|推薦|排名|前\d名|依序|分別是|可以分成|共有|唯一)/;
const HAS_FACT = /(\d|Rp|IDR|NT\$?|US\$?|盾|美金|台幣|分鐘|小時|公里|km)/i;

function scoreA1(paragraphs) {
  if (!paragraphs.length) return 0;
  // 開頭 150 字：取前兩段拼起來的前 150 中文字
  let opening = '';
  for (const p of paragraphs.slice(0, 2)) { opening += p.text; if (cjkLen(opening) >= 150) break; }
  opening = opening.slice(0, 300);
  const fluff = FLUFF_OPENER.test(paragraphs[0].text);
  const direct = DIRECT_WORDS.test(opening);
  const fact = HAS_FACT.test(opening);
  let s = 0;
  if (direct) s += 6;
  if (fact) s += 4;
  if (fluff) s = Math.min(s, 4);
  return Math.min(10, s);
}

const TLDR_HEADING = /(TL;?DR|懶人包|重點整理|重點摘要|快速結論|快速摘要|快速總覽|一句話|本文重點|文章重點|先講結論|結論先講|速覽)/i;
function scoreA2(st, fm, body) {
  // 內容本身的 TL;DR：前 40% 內的摘要標題，或第一個 H2 前的 ≥3 項列點
  const cutoff = Math.max(20, st.lineCount * 0.4);
  const hasTldrHeading = st.headings.some(h => h.line < cutoff && TLDR_HEADING.test(h.text));
  if (hasTldrHeading) return 10;
  const firstH = st.headings.length ? st.headings[0].line : Infinity;
  const earlyList = st.listBlocks.some(l => l.line < firstH && l.items.length >= 3);
  if (earlyList) return 8;
  // layout 會用 description 產「💡 快速解答」callout（單句、非列點）→ 給基礎分
  if ((fm.description || '').trim().length >= 60) return 5;
  return 0;
}

const Q_HEADING = /[?？]|嗎|如何|怎麼|怎樣|哪裡|哪個|哪家|哪間|什麼|為什麼|多少|要不要|能不能|該不該|值得|好嗎|划算/;
const VAGUE_HEADING = /^(前言|心得|後記|結語|總結|感想|小結|其他|補充|最後|尾聲|寫在最後|碎碎念|閒聊|雜記|番外|後續|附錄|結尾|感謝)$/;
const TOPIC_SIGNAL = /(\d|[A-Z][a-z]+|價|費用|交通|住宿|地址|時間|營業|門票|預約|推薦|攻略|美食|行程|注意|安全|簽證|機場|換錢|換匯|退稅|網卡|包車|叫車|評價|優缺點|房型|泳池|早餐|位置|如何|哪|什麼)/;
function scoreA3(st) {
  const hs = st.headings.filter(h => h.depth === 2 || h.depth === 3);
  if (!hs.length) return 0;
  let pts = 0;
  for (const h of hs) {
    const t = h.text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}✕✖️🌴🍹💡]/gu, '').trim();
    if (VAGUE_HEADING.test(t) || cjkLen(t) + (t.match(/[a-zA-Z]+/g) || []).length <= 2) pts += 0;
    else if (Q_HEADING.test(t)) pts += 1.0;
    else if (TOPIC_SIGNAL.test(t)) pts += 0.8;
    else pts += 0.45;
  }
  return Math.round(Math.min(10, (pts / hs.length) * 10) * 10) / 10;
}

// ── B. 結構化資料（25）──────────────────────────────────────────────────────
function schemaTypes(fm, body, st) {
  const cats = Array.isArray(fm.category) ? fm.category : (fm.category ? [fm.category] : []);
  const h2s = st.headings.filter(h => h.depth === 2);
  const types = ['Article', 'BreadcrumbList'];
  let hotelPotential = false;

  if (cats.includes('住宿推薦')) {
    const agodaIds = new Set();
    const re = /agoda\.com[^)'"\s]*[?&]hid=(\d+)/g;
    let m; while ((m = re.exec(body)) !== null) agodaIds.add(m[1]);
    hotelPotential = agodaIds.size > 0;
    if (hotelPotential && hotelCacheCount > 0) types.push('ItemList/Hotel'); // 快取為空時實際不輸出
  }
  if (cats.includes('峇里島分區攻略')) {
    types.push('TouristDestination');
    if (h2s.length >= 2) types.push('Article/TravelAction');
  }
  if (cats.includes('簽證通關') && h2s.length > 0) types.push('HowTo');
  if ((cats.includes('新手指南') || cats.includes('旅行技巧')) && faqAnswerCount(body, h2s) > 0) types.push('FAQPage');
  if (cats.includes('美食景點活動')) types.push('LocalBusiness');
  if (fm.isSpaGuide && !types.includes('FAQPage')) types.push('FAQPage');
  if (fm.isDriverGuide && Array.isArray(fm.drivers) && fm.drivers.length) types.push('Person/LocalBusiness');

  return { cats, types, hotelPotential };
}

function scoreB1(info) {
  const { cats, types } = info;
  if (cats.includes('住宿推薦')) return types.includes('ItemList/Hotel') ? 10 : 3; // 缺 Hotel schema
  if (cats.includes('峇里島分區攻略')) return 10;
  if (cats.includes('簽證通關')) return types.includes('HowTo') ? 10 : 5;
  if (cats.includes('新手指南') || cats.includes('旅行技巧')) return types.includes('FAQPage') ? 10 : 5;
  if (cats.includes('美食景點活動')) return 9; // LocalBusiness 有但為泛用型（無實體地址/營業資訊）
  if (cats.some(c => ['遊記分享', '新聞存檔'].includes(c))) return 8; // Article 即為正確型別
  if (cats.some(c => ['家庭親子', '叫車包車'].includes(c))) return 6;
  return 4; // 無分類 → 只有 Article
}

const FAQ_SECTION = /(常見問題|FAQ|Q&A|Q＆A|問與答|新手常問|大家最常問)/i;
function scoreB2(info, st) {
  const hasSchema = info.types.includes('FAQPage');
  const hasSection = st.headings.some(h => FAQ_SECTION.test(h.text));
  if (hasSchema && hasSection) return 10;
  if (hasSchema) return 6;
  if (hasSection) return 4;
  return 0;
}

function scoreB3(fm) {
  let s = 0;
  const d = (fm.description || '').trim();
  s += d.length >= 40 ? 3 : d.length >= 10 ? 2 : 0;
  if (fm.pubDate) s += 1;
  if (fm.updatedDate || fm.update) s += 1;
  return s;
}

// ── C. 可擷取性（20）────────────────────────────────────────────────────────
function scoreC1(st) {
  let s = 0;
  if (st.tableCount > 0) s += 4;
  if (st.listBlocks.some(l => l.items.length >= 3)) s += 3;
  return s;
}

function scoreC2(st) {
  const ps = st.paragraphs;
  if (!ps.length) return 3;
  const long = ps.filter(p => p.len > 150).length;
  const ratio = long / ps.length;
  return Math.round(Math.max(0, 7 * (1 - ratio * 1.8)) * 10) / 10;
}

const RE_PRICE = /(Rp\.?|IDR|NT\$?|US\$|USD)\s?[\d,.]+|[\d,.]+\s?(盾|萬盾|元|美金|台幣|印尼盾)|\$\s?\d/;
const RE_TIME = /\d{1,2}[:：]\d{2}|營業時間|開放時間|\d+\s?(分鐘|小時)|(每|週|周)[一二三四五六日]/;
const RE_PLACE = /(google\s?maps?|goo\.gl\/maps|maps\.app\.goo|地址|地圖定位|Jl\.\s|Jalan\s)/i;
function scoreC3(body) {
  let s = 0;
  if (RE_PRICE.test(body)) s += 2;
  if (RE_TIME.test(body)) s += 2;
  if (RE_PLACE.test(body)) s += 2;
  return s;
}

// ── D. 實體與一致性（15）────────────────────────────────────────────────────
// 簡體字侵入（zh-TW 文章不該出現的 unambiguous 簡體字）
const SIMPLIFIED = /[乌岛签证价钱风湾滩买东车鸟龙园厅馆们发现观点线场无边际约询详见闲游记后来]/g; // 注意：仅含簡體專用字
const SIMPLIFIED_SAFE = /[乌签证价钱风湾滩买东车鸟龙园厅馆们发现观线场无边际约询详闲]/g; // 保守版
function scoreD1(body) {
  let s = 8;
  const hasBali1 = /峇里島/.test(body);
  const hasBali2 = /巴里島|巴厘島|巴厘岛/.test(body);
  if (hasBali1 && hasBali2) s -= 2; // 峇里島/巴里島 混用
  const simp = (body.match(SIMPLIFIED_SAFE) || []).length;
  if (simp > 5) s -= 4; else if (simp > 0) s -= 2;
  // Villa / 別墅 / 民宿 三者混用（各出現 ≥2 次）
  const villaForms = [/[Vv]illa/, /別墅/, /民宿/].filter(re => (body.match(new RegExp(re.source, 'g')) || []).length >= 2).length;
  if (villaForms >= 3) s -= 2;
  return Math.max(0, s);
}

const AREA_NAMES = /(烏布|Ubud|水明漾|Seminyak|庫塔|Kuta|金巴蘭|Jimbaran|努沙杜瓦|Nusa\s?Dua|沙努|Sanur|坎古|蒼古|Canggu|烏魯瓦圖|Uluwatu|登巴薩|Denpasar|藍夢島|Lembongan|佩尼達|Penida|南灣|Tanjung\s?Benoa|阿勇河|Ayung|京打馬尼|Kintamani|圖蘭奔|Tulamben|艾湄灣|Amed)/;
function scoreD2(fm, body) {
  let s = 0;
  // 英文專名（連續兩個以上大寫開頭單字，如 Manarai Beach House）
  if (/[A-Z][a-zA-Z]+(\s[A-Z&][a-zA-Z]*)+/.test(body) || fm.agoda_hotel_name) s += 3;
  if (AREA_NAMES.test(body)) s += 2;
  if (RE_PLACE.test(body) || fm.latitude != null || fm.agoda_hotel_name) s += 2;
  return Math.min(7, s);
}

// ── E. 新鮮度與可信度（10）──────────────────────────────────────────────────
const STALE = /(20(1\d|2[0-3]))\s?年[^。\n]{0,15}(價|价|費用|费用)|已(歇業|停業|結業|關閉|关闭)|疫情(期間|管制)|目前尚未開放/;
function scoreE1(fm, body) {
  const d = fm.updatedDate || fm.pubDate;
  let s = 0;
  if (d) {
    const months = (NOW - new Date(d)) / (1000 * 3600 * 24 * 30.44);
    s = months <= 18 ? 5 : months <= 30 ? 3 : months <= 48 ? 1 : 0;
  }
  if (STALE.test(body)) s = Math.max(0, s - 2);
  return s;
}

const EXP_SIGNALS = /(我們|我和|我這次|我當時|我實際|親自|實測|實訪|實際(走訪|入住|體驗)|我點了|我住|我搭|我們一家|當天|入住當晚|排隊|排了|吃了|花了|住了|去了|帶(著)?(小孩|爸媽|長輩))/g;
function scoreE2(body, st) {
  let s = 0;
  const exp = (body.match(EXP_SIGNALS) || []).length;
  s += exp >= 5 ? 2 : exp >= 2 ? 1 : 0;
  s += st.imageCount >= 3 ? 2 : st.imageCount >= 1 ? 1 : 0;
  if (/\d{4}\s?年\s?\d{1,2}\s?月/.test(body)) s += 1;
  return Math.min(5, s);
}

// ── top_fix 產生（依失分幅度排序，給具體建議）───────────────────────────────
function buildFixes(r, fm, info, st) {
  const fixes = []; // { loss, text }
  const title = fm.title || r.slug;

  if (r.a1 <= 4) fixes.push({ loss: 10 - r.a1, text: `開頭150字內補直接回答段：針對「${title.slice(0, 25)}」先給結論（推薦名單/價格區間/具體做法），再展開細節` });
  if (r.a2 <= 5) fixes.push({ loss: 10 - r.a2, text: r.a2 === 5 ? '已有快速解答callout，再加列點式TL;DR區塊（3-5點快速結論）更利AI擷取' : '文章開頭加TL;DR重點摘要（3-5個列點的快速結論），並補frontmatter description' });
  if (r.a3 <= 6) fixes.push({ loss: (10 - r.a3) * 0.9, text: '把模糊標題（心得/後記類）改為問句式或明確主題式H2，例如「XX多少錢？」「怎麼去XX？」' });

  if (r.b1 <= 5) {
    if (info.cats.includes('住宿推薦')) fixes.push({ loss: 10 - r.b1, text: info.hotelPotential ? '缺Hotel schema：hotel-cache.json是空的，跑scripts/fetch-hotel-data.mjs補快取即可自動輸出（layout層一次解決）' : '文內無Agoda連結(hid)可對應飯店實體，補上飯店Agoda連結+跑fetch-hotel-data.mjs才會有Hotel schema' });
    else if (info.cats.includes('新手指南') || info.cats.includes('旅行技巧')) fixes.push({ loss: 10 - r.b1, text: 'H2底下第一段太短(<12字)導致FAQPage schema無法擷取答案，每個H2下先放一段完整回答' });
    else fixes.push({ loss: 10 - r.b1, text: `分類「${info.cats[0] || '無'}」只輸出泛用Article schema，補上正確分類或在SEO.astro擴充對應型別` });
  }
  if (r.b2 <= 4) fixes.push({ loss: 10 - r.b2, text: info.cats.some(c => ['新手指南', '旅行技巧'].includes(c)) ? '文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema' : '文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出' });
  if (r.b3 <= 3) fixes.push({ loss: 5 - r.b3, text: (fm.description || '').trim().length < 40 ? '補frontmatter description（60-120字直接回答式摘要，會變成頁面上的快速解答callout）' : '補updatedDate讓Google/AI知道內容有維護' });

  if (r.c1 <= 3) fixes.push({ loss: 7 - r.c1, text: '把價格/時間/優缺點等可比較資訊改用表格或列點呈現，不要埋在敘述裡' });
  if (r.c2 <= 4) {
    const longN = st.paragraphs.filter(p => p.len > 150).length;
    fixes.push({ loss: 7 - r.c2, text: `拆分過長段落（${longN}段超過150字），每段聚焦單一重點` });
  }
  if (r.c3 <= 2) fixes.push({ loss: 6 - r.c3, text: '補明確格式的關鍵資訊：價格（Rp數字）、營業/所需時間、地址或Google Maps地點名' });

  if (r.d1 <= 5) fixes.push({ loss: 8 - r.d1, text: '統一用字：檢查簡體字殘留與「峇里島/巴里島」混用，全文用同一寫法' });
  if (r.d2 <= 4) fixes.push({ loss: 7 - r.d2, text: '補具體實體資訊：店家/飯店英文原名、所在區域名、Google Maps可搜尋的地點名稱' });

  if (r.e1 <= 2) fixes.push({ loss: 5 - r.e1, text: `內容過舊（最後日期${r.lastUpdated || '無'}）：查核價格/營業狀態後更新updatedDate` });
  if (r.e2 <= 2) fixes.push({ loss: 5 - r.e2, text: '補第一人稱實地經驗訊號：具體造訪日期、實測細節（排隊/花費/照片描述）' });

  fixes.sort((a, b) => b.loss - a.loss);
  return [fixes[0]?.text || '', fixes[1]?.text || '', fixes[2]?.text || ''];
}

// ── 主流程 ───────────────────────────────────────────────────────────────────
const files = readdirSync(BLOG_DIR).filter(f => /\.(md|mdx)$/.test(f)).sort();
const DEMO_FILES = new Set(['first-post.md', 'second-post.md', 'third-post.md', 'using-mdx.mdx', 'markdown-style-guide.md']);

const rows = [];
const skipped = [];

let targets = files;
if (SAMPLE_N > 0) {
  // 跨分類抽樣：每個主分類輪流取，湊滿 N 篇
  const byCat = new Map();
  for (const f of files) {
    if (DEMO_FILES.has(f)) continue;
    try {
      const fm = matter(readFileSync(join(BLOG_DIR, f), 'utf-8')).data;
      if (fm.private) continue;
      const cat = (Array.isArray(fm.category) ? fm.category[0] : fm.category) || '無分類';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(f);
    } catch { /* skip */ }
  }
  const picked = [];
  const catLists = [...byCat.values()];
  let round = 0;
  while (picked.length < SAMPLE_N && round < 50) {
    for (const list of catLists) {
      if (picked.length >= SAMPLE_N) break;
      const idx = Math.floor(list.length / 2 + round * 7) % list.length; // 取中段避開極端
      if (list.length > round && !picked.includes(list[idx])) picked.push(list[idx]);
    }
    round++;
  }
  targets = picked;
}

for (const f of targets) {
  if (DEMO_FILES.has(f)) { skipped.push({ file: f, reason: 'Astro theme 範例檔' }); continue; }
  let parsed;
  try {
    parsed = matter(readFileSync(join(BLOG_DIR, f), 'utf-8'));
  } catch (e) {
    skipped.push({ file: f, reason: `frontmatter 解析失敗: ${e.message.slice(0, 60)}` });
    continue;
  }
  const fm = parsed.data;
  const body = parsed.content;
  if (fm.private === true) { skipped.push({ file: f, reason: 'private: true（不公開）' }); continue; }
  const wc = textLen(body);
  if (wc < 100) { skipped.push({ file: f, reason: `內文過短（${wc}字）` }); continue; }

  const st = parseStructure(body);
  const info = schemaTypes(fm, body, st);
  const slug = fm.slug || basename(f).replace(/\.(md|mdx)$/, '');

  const r = {
    slug,
    a1: scoreA1(st.paragraphs), a2: scoreA2(st, fm, body), a3: scoreA3(st),
    b1: scoreB1(info), b2: scoreB2(info, st), b3: scoreB3(fm),
    c1: scoreC1(st), c2: scoreC2(st), c3: scoreC3(body),
    d1: scoreD1(body), d2: scoreD2(fm, body),
    e1: scoreE1(fm, body), e2: scoreE2(body, st),
    lastUpdated: '',
  };
  const dRaw = fm.updatedDate || fm.pubDate;
  if (dRaw) { const dd = new Date(dRaw); if (!isNaN(dd)) r.lastUpdated = dd.toISOString().slice(0, 10); }

  const A = r.a1 + r.a2 + r.a3, B = r.b1 + r.b2 + r.b3, C = r.c1 + r.c2 + r.c3, D = r.d1 + r.d2, E = r.e1 + r.e2;
  const total = Math.round((A + B + C + D + E) * 10) / 10;
  const [fix1, fix2, fix3] = buildFixes(r, fm, info, st);

  const qHeadings = st.headings.filter(h => (h.depth === 2 || h.depth === 3) && Q_HEADING.test(h.text)).length;
  const avgPara = st.paragraphs.length ? Math.round(st.paragraphs.reduce((a, p) => a + p.len, 0) / st.paragraphs.length) : 0;

  rows.push({
    slug, title: fm.title || '', collection: 'blog',
    primaryCat: info.cats[0] || '無分類',
    url_path: `/blog/${slug}/`,
    total_score: total,
    score_A_answer: Math.round(A * 10) / 10, score_B_schema: B, score_C_extract: Math.round(C * 10) / 10,
    score_D_entity: D, score_E_fresh: E,
    has_tldr: r.a2 >= 8 ? 'yes' : r.a2 === 5 ? 'callout-only' : 'no',
    has_faq: r.b2 >= 6 ? 'yes' : r.b2 === 4 ? 'section-only' : 'no',
    has_schema_type: r.b1 >= 8 ? 'yes' : 'partial',
    schema_types_found: info.types.join('|'),
    has_table: st.tableCount > 0 ? 'yes' : 'no',
    avg_paragraph_length: avgPara,
    question_headings_count: qHeadings,
    last_updated: r.lastUpdated,
    word_count: wc,
    top_fix_1: fix1, top_fix_2: fix2, top_fix_3: fix3,
    _sub: r,
  });
}

// ── CSV 輸出 ─────────────────────────────────────────────────────────────────
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const COLS = ['slug', 'title', 'collection', 'url_path', 'total_score',
  'score_A_answer', 'score_B_schema', 'score_C_extract', 'score_D_entity', 'score_E_fresh',
  'has_tldr', 'has_faq', 'has_schema_type', 'schema_types_found',
  'has_table', 'avg_paragraph_length', 'question_headings_count',
  'last_updated', 'word_count', 'top_fix_1', 'top_fix_2', 'top_fix_3'];
const csv = [COLS.join(',')].concat(rows.map(r => COLS.map(c => esc(r[c])).join(','))).join('\n');
writeFileSync(CSV_OUT, '﻿' + csv, 'utf-8'); // BOM 讓 Excel 正確顯示中文

// ── Summary 輸出（全量模式才寫完整版）───────────────────────────────────────
const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 10) / 10 : 0;
const totals = rows.map(r => r.total_score);
const dist = { '0-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
for (const t of totals) { if (t <= 40) dist['0-40']++; else if (t <= 60) dist['41-60']++; else if (t <= 80) dist['61-80']++; else dist['81-100']++; }

const byCat = new Map();
for (const r of rows) { if (!byCat.has(r.primaryCat)) byCat.set(r.primaryCat, []); byCat.get(r.primaryCat).push(r); }

// 系統性問題統計
const pct = (n) => `${Math.round(n / rows.length * 100)}%`;
const sys = [];
const noHotel = rows.filter(r => r.primaryCat === '住宿推薦' && r._sub.b1 <= 3);
if (noHotel.length) sys.push({ n: noHotel.length, base: rows.filter(r => r.primaryCat === '住宿推薦').length, label: `住宿文 Hotel schema 未輸出（hotel-cache.json 有 ${hotelCacheCount} 筆資料）`, fix: '一次性修復：跑 scripts/fetch-hotel-data.mjs 填快取 → layout 自動輸出全部住宿文的 Hotel/ItemList schema', level: 'layout/一次性' });
const noFaq = rows.filter(r => r._sub.b2 === 0);
sys.push({ n: noFaq.length, base: rows.length, label: '沒有 FAQ schema 也沒有文內常見問題區塊', fix: '兩段修：(1) SEO.astro 把 FAQPage 擴充到更多分類（layout 一次解決）(2) 逐篇補「常見問題」H2 區塊', level: '部分layout/部分逐篇' });
const noTldr = rows.filter(r => r._sub.a2 < 8);
sys.push({ n: noTldr.length, base: rows.length, label: '缺列點式 TL;DR 摘要（layout callout 只有單句）', fix: '逐篇補 3-5 點摘要；或在 layout 擴充 quickAnswer 支援多點式（需 frontmatter 新欄位，半自動可行）', level: '逐篇（可半自動）' });
const stale = rows.filter(r => r._sub.e1 <= 1);
sys.push({ n: stale.length, base: rows.length, label: '更新日期超過 30 個月或含過時訊號', fix: '逐篇查核後補 updatedDate；優先處理實用類（價格/簽證/交通）', level: '逐篇' });
const longPara = rows.filter(r => r._sub.c2 <= 4);
sys.push({ n: longPara.length, base: rows.length, label: '長段落敘事牆（>150字段落比例高）', fix: '逐篇拆段；新文章寫作規範限制段落長度', level: '逐篇' });
const badOpen = rows.filter(r => r._sub.a1 <= 4);
sys.push({ n: badOpen.length, base: rows.length, label: '開頭 150 字沒有直接回答', fix: '逐篇改開頭；description 已有答案的可半自動搬進內文首段', level: '逐篇（可半自動）' });
sys.sort((a, b) => b.n / b.base - a.n / a.base);

// 高搜尋潛力 + 低分 優先清單
const KW_TIERS = [
  { re: /(換錢|換匯|匯率|money\s?changer)/i, w: 10, tag: '換錢' },
  { re: /(簽證|visa|voa|入境|通關|海關|落地簽)/i, w: 10, tag: '簽證入境' },
  { re: /(機場|airport|DPS|伍拉|接送)/i, w: 9, tag: '機場' },
  { re: /(包車|叫車|grab|gojek|計程車|交通|租車|騎車)/i, w: 9, tag: '交通' },
  { re: /(網卡|sim|上網|esim)/i, w: 8, tag: '網卡' },
  { re: /(退稅|旅遊稅|tax)/i, w: 8, tag: '稅務' },
  { re: /(烏布|ubud|水明漾|seminyak|庫塔|kuta|金巴蘭|jimbaran|努沙杜瓦|nusa\s?dua|坎古|canggu|沙努|sanur).{0,12}(住宿|飯店|hotel|villa|推薦|攻略)/i, w: 8, tag: '熱門區住宿' },
  { re: /(自由行|行程|攻略|五天|4天|五日|規劃|新手)/i, w: 7, tag: '行程攻略' },
  { re: /(安全|詐騙|注意|地震|火山|禁忌)/i, w: 7, tag: '安全' },
  { re: /(天氣|雨季|乾季|幾月)/i, w: 6, tag: '天氣' },
  { re: /(小費|插座|藥|醫院|保險)/i, w: 6, tag: '實用資訊' },
];
function kwScore(r) {
  const hay = r.title + ' ' + r.slug;
  let best = 0, tag = '';
  for (const t of KW_TIERS) if (t.re.test(hay) && t.w > best) { best = t.w; tag = t.tag; }
  return { w: best, tag };
}
// 排除新聞存檔（時效性內容無長尾搜尋價值）；每主題上限 6 篇，避免單一主題洗版
const tagCount = new Map();
const priority = [];
for (const x of rows
  .filter(r => r.primaryCat !== '新聞存檔' && !/新聞|要聞/.test(r.title))
  .map(r => ({ r, kw: kwScore(r) }))
  .filter(x => x.kw.w >= 6 && x.r.total_score < 75)
  .sort((a, b) => (b.kw.w - a.kw.w) || (a.r.total_score - b.r.total_score))) {
  const c = tagCount.get(x.kw.tag) || 0;
  if (c >= 6) continue;
  tagCount.set(x.kw.tag, c + 1);
  priority.push(x);
  if (priority.length >= 30) break;
}

const catTable = [...byCat.entries()]
  .sort((a, b) => b[1].length - a[1].length)
  .map(([cat, rs]) => `| ${cat} | ${rs.length} | ${avg(rs.map(r => r.total_score))} | ${avg(rs.map(r => r.score_A_answer))} | ${avg(rs.map(r => r.score_B_schema))} | ${avg(rs.map(r => r.score_C_extract))} | ${avg(rs.map(r => r.score_D_entity))} | ${avg(rs.map(r => r.score_E_fresh))} |`)
  .join('\n');

const md = `# AEO 全站稽核報告${SAMPLE_N ? `（試跑 ${rows.length} 篇樣本）` : ''}

> 產生時間：${new Date().toISOString().slice(0, 10)}　掃描 ${rows.length} 篇　跳過 ${skipped.length} 篇
> 詳細逐篇資料見 aeo-audit-report.csv

## 總覽

- **全站平均分數：${avg(totals)} / 100**
- 分項平均：A 直接回答 ${avg(rows.map(r => r.score_A_answer))}/30　B 結構化資料 ${avg(rows.map(r => r.score_B_schema))}/25　C 可擷取性 ${avg(rows.map(r => r.score_C_extract))}/20　D 實體一致性 ${avg(rows.map(r => r.score_D_entity))}/15　E 新鮮度 ${avg(rows.map(r => r.score_E_fresh))}/10
- 分數分布：0-40 分 **${dist['0-40']} 篇**　41-60 分 **${dist['41-60']} 篇**　61-80 分 **${dist['61-80']} 篇**　81-100 分 **${dist['81-100']} 篇**

## 各分類平均分數

| 分類 | 篇數 | 總分 | A/30 | B/25 | C/20 | D/15 | E/10 |
|---|---|---|---|---|---|---|---|
${catTable}

## 全站系統性問題 Top 5

${sys.slice(0, 6).map((s, i) => `${i + 1}. **${s.label}** — ${s.n}/${s.base} 篇（${Math.round(s.n / s.base * 100)}%）
   - 修法：${s.fix}
   - 層級：${s.level}`).join('\n')}

## 建議優先處理清單（高搜尋潛力 × 低分，Top ${priority.length}）

| # | 主題 | 標題 | 分數 | 首要修改 |
|---|---|---|---|---|
${priority.map((x, i) => `| ${i + 1} | ${x.kw.tag} | [${x.r.title.slice(0, 40)}](${x.r.url_path}) | ${x.r.total_score} | ${x.r.top_fix_1.slice(0, 60)} |`).join('\n')}

## 跳過清單

${skipped.map(s => `- ${s.file}：${s.reason}`).join('\n') || '無'}
`;

writeFileSync(MD_OUT, md, 'utf-8');

console.log(`✅ 掃描 ${rows.length} 篇，跳過 ${skipped.length} 篇`);
console.log(`   CSV: ${CSV_OUT}`);
console.log(`   Summary: ${MD_OUT}`);
if (skipped.length) console.log('   跳過原因：' + skipped.map(s => `${s.file}(${s.reason})`).slice(0, 10).join('、'));
