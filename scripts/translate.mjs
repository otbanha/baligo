#!/usr/bin/env node
/**
 * translate.mjs — 自動翻譯腳本
 * 來源：src/content/blog/*.md (zh-tw)
 * 輸出：src/content/zh-cn/ | src/content/zh-hk/ | src/content/en/
 *
 * 用法：
 *   node scripts/translate.mjs                   # 翻譯所有三種語言
 *   node scripts/translate.mjs --lang zh-cn      # 只翻譯簡體中文
 *   node scripts/translate.mjs --dry-run         # 預覽模式，不呼叫 API
 *   node scripts/translate.mjs --file 2024-07-18-xxx.md  # 只翻譯指定檔案
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// ── 設定 ──────────────────────────────────────────────────────────────────────

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Video URL 保留（YouTube / Instagram / TikTok）
const VIDEO_RES = [
  /https?:\/\/(?:www\.)?youtube\.com\/watch\?[^\s\)"'`\]]+/g,
  /https?:\/\/youtu\.be\/[^\s\)"'`\]]+/g,
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?[^\s\)"'`\]]*/g,
  /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s\)"'`\]]+\/video\/\d+[^\s\)"'`\]]*/g,
];

function extractVideoUrls(text) {
  const saved = [];
  let out = text;
  for (const re of VIDEO_RES) {
    out = out.replace(re, (match) => {
      const idx = saved.length;
      saved.push(match);
      return `__VID${idx}__`;
    });
  }
  return { text: out, saved };
}

function restoreVideoUrls(text, saved) {
  if (!saved.length) return text;
  return text.replace(/__VID(\d+)__/g, (_, i) => saved[parseInt(i, 10)] ?? '');
}
const CACHE_FILE = '.translation-cache.json';
const BATCH_SIZE = parseInt(process.env.TRANSLATE_BATCH_SIZE ?? '10', 10); // 每次 API 呼叫最多幾個段落

const ALL_LANGS = ['zh-cn', 'zh-hk', 'en', 'id'];
const BLOCK_LANGS = ['zh-cn', 'zh-hk', 'en', 'id'];

// en/id 是非中文語系，翻譯結果理論上不該殘留大量中文字。
// 曾發生 DeepSeek 只替換少數詞彙（如「峇里島→Bali」）就整段回傳的情況，
// 腳本原本只驗證「是不是非空字串」，這種半殘留翻譯會被誤判為成功並寫入快取。
const NON_CJK_LANGS = new Set(['en', 'id']);
const CJK_RE = /[一-鿿]/g;

const countCjk = (s) => (String(s ?? '').match(CJK_RE) || []).length;

// 內文段落允許殘留的中文字數上限：頻道名、人名、括號裡的原文地名這類專有名詞
// 本來就該保留（例：「Crazy with YU芳婷 video screenshot」）。
const RESIDUE_ALLOWANCE = 4;
// 內文段落判定「有翻」的門檻：譯文中文字數要掉到來源的三成以下。
const RESIDUE_DROP_MAX = 0.3;

// 同一份來源內容最多重試幾次。超過就接受現況、寫入正式 _srcHash 並標記
// _translateIncomplete，避免翻不動的段落被每日排程無限重翻、白燒 API 額度。
// 來源文章一旦改動，hash 變了，次數自動歸零重新開始。
const MAX_TRANSLATE_ATTEMPTS = 3;

// 判斷翻譯結果是否明顯翻譯失敗（殘留中文字）。
//
// strict（frontmatter 的 title/description）：維持接近零容忍。標題到處都看得到，
// 曾發生「2024印尼/Bali Online Visa...」這種只殘留 1-2 個中文字的半殘留翻譯，
// 用佔比判斷會漏抓，所以短文字直接零容忍、長文字用中文字元佔比。
//
// 非 strict（內文段落）：改用「中文字降幅」判斷。零容忍套在內文上會誤殺——
// 譯文保留少量中文專有名詞是正確的，卻被判失敗而退回 100% 中文原文，
// 比接受譯文更糟，而且每次排程都會重試、永遠不會收斂（2026-08-02 實測 31 個檔卡死）。
function isUntranslatedResidue(text, lang, source = '', strict = true) {
  if (!NON_CJK_LANGS.has(lang)) return false;
  if (typeof text !== 'string' || !text.trim()) return false;
  const cjkCount = countCjk(text);
  if (cjkCount === 0) return false;

  if (strict) {
    if (text.length <= 100) return true;
    return cjkCount / text.length > 0.02;
  }

  const srcCjk = countCjk(source);
  if (srcCjk === 0) return true; // 來源沒中文卻譯出中文 → 異常回傳
  // 少量殘留放行，但必須真的比來源少（整段原封不動回傳不算）
  if (cjkCount <= RESIDUE_ALLOWANCE && cjkCount < srcCjk) return false;
  return cjkCount / srcCjk > RESIDUE_DROP_MAX;
}

const SYSTEM_PROMPTS = {
  'zh-cn': `你是專業翻譯，將繁體中文翻譯成簡體中文。
要求：
1. 使用中國大陸慣用詞彙和地名（如峇里島→巴厘岛、烏布→乌布、廟宇→寺庙、計程車→出租车）
2. 地名統一對照（不論原文寫法）：長谷/倉古/蒼古/坎古→坎古、水明漾→水明漾、庫塔→库塔、沙努爾→沙努尔、金巴蘭→金巴兰、努沙杜瓦→努沙杜瓦
3. 語氣自然，符合大陸讀者習慣
4. 金額換算：將台幣（NT$、新台幣、台幣）金額換算成美金（USD），匯率 31:1，四捨五入至整數，例如 NT$3,100 → USD$100
5. 文字中若出現 __VID0__、__VID1__ 等佔位符，必須原封不動保留，不可翻譯或修改
6. 以 JSON 物件回傳，格式：{"translations": ["翻譯1", "翻譯2", ...]}
   陣列長度必須與輸入相同`,

  'zh-hk': `你是專業翻譯，將繁體中文翻譯成香港粵語書寫體。
要求：
1. 使用香港慣用詞彙（如的士、巴士、超市、埋單、雪糕）
2. 地名統一對照（不論原文寫法）：長谷/倉古/蒼古/坎古→坎古、峇里島→峇里島、烏布→烏布、水明漾→水明漾、庫塔→庫塔、沙努爾→沙努爾、金巴蘭→金巴蘭、努沙杜瓦→努沙杜瓦
3. 語氣自然口語化，符合香港讀者習慣
4. 金額換算：將台幣（NT$、新台幣、台幣）金額換算成美金（USD），匯率 31:1，四捨五入至整數，例如 NT$3,100 → USD$100
5. 文字中若出現 __VID0__、__VID1__ 等佔位符，必須原封不動保留，不可翻譯或修改
6. 以 JSON 物件回傳，格式：{"translations": ["翻譯1", "翻譯2", ...]}
   陣列長度必須與輸入相同`,

  'en': `You are a professional translator. Translate Traditional Chinese travel content to natural English.
Requirements:
1. Use standard English place names. Important mappings (regardless of how they appear in source):
   峇里島→Bali, 烏布→Ubud, 庫塔→Kuta, 水明漾→Seminyak, 沙努爾→Sanur, 金巴蘭→Jimbaran, 努沙杜瓦→Nusa Dua
   長谷/倉古/蒼古/坎古→Canggu (these all refer to the same place)
2. Natural, engaging travel writing style
3. Currency conversion: Convert all NT$ / 新台幣 / 台幣 amounts to USD at a rate of 31:1, rounded to the nearest dollar. Example: NT$3,100 → USD$100
4. If the text contains placeholders like __VID0__, __VID1__, keep them exactly as-is — do not translate or modify them
5. Return JSON: {"translations": ["translation1", "translation2", ...]}
   Array length must match input`,

  'id': `Kamu adalah penerjemah konten travel Bali yang berpengalaman. Terjemahkan teks dari bahasa Mandarin Tradisional ke bahasa Indonesia.
Ketentuan:
1. Gaya santai dan natural seperti blog travel lokal Indonesia — boleh pakai "kamu", hindari "Anda". Boleh pakai kata gaul travel secukupnya (banget, sih, wajib coba, worth it, hidden gem) tapi jangan berlebihan/garing.
2. Nama tempat pakai nama Indonesia asli (apa pun tulisan sumbernya):
   峇里島→Bali, 烏布→Ubud, 庫塔→Kuta, 水明漾→Seminyak, 沙努爾→Sanur, 金巴蘭→Jimbaran, 努沙杜瓦→Nusa Dua
   長谷/倉古/蒼古/坎古→Canggu（semua merujuk tempat yang sama）
3. Jangan terjemahkan: nama brand, nama tempat spesifik (jika perlu, tambahkan keterangan asli dalam kurung), code block, path gambar, link affiliate beserta parameternya.
4. Konversi mata uang: ubah jumlah NT$ / 新台幣 / 台幣 ke USD dengan kurs 31:1, dibulatkan ke bilangan bulat terdekat. Contoh: NT$3,100 → USD$100
5. Jika teks mengandung placeholder seperti __VID0__, __VID1__, biarkan apa adanya — jangan diterjemahkan atau diubah
6. Pertahankan struktur Markdown dan level heading apa adanya
7. Kembalikan dalam format JSON: {"translations": ["terjemahan1", "terjemahan2", ...]}
   Panjang array harus sama dengan input`,
};

// ── CLI 引數解析 ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isBlocks = args.includes('--blocks');
const SOURCE_DIR = isBlocks ? 'src/content/blocks' : 'src/content/blog';
const langIdx = args.indexOf('--lang');
const targetLangs = langIdx !== -1 ? [args[langIdx + 1]] : (isBlocks ? BLOCK_LANGS : ALL_LANGS);
const fileIdx = args.indexOf('--file');
const targetFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

// ── 快取 ─────────────────────────────────────────────────────────────────────

let cache = { paragraphs: {}, files: {} };
if (existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    cache.paragraphs ??= {};
    cache.files ??= {};
  } catch { /* ignore corrupt cache */ }
}

// ── Title/description 鎖定清單 ────────────────────────────────────────────────
// 人工優化過 SEO title/description 的頁面，翻譯腳本重跑時必須跳過這兩欄，
// 只重翻 body。格式：{ "en": ["slug1", "slug2", ...], "zh-cn": [...] }
const TITLE_LOCK_FILE = 'scripts/title-lock.json';
let titleLocks = {};
if (existsSync(TITLE_LOCK_FILE)) {
  try { titleLocks = JSON.parse(readFileSync(TITLE_LOCK_FILE, 'utf-8')); } catch { /* ignore corrupt file */ }
}
function isTitleLocked(lang, destFilename) {
  const slug = destFilename.replace(/\.mdx?$/, '');
  return (titleLocks[lang] || []).includes(slug);
}

function saveCache() {
  if (!isDryRun) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ── 工具函式 ─────────────────────────────────────────────────────────────────

function md5(text) {
  return createHash('md5').update(text).digest('hex');
}

// Hash only translatable content — only title, description, and body text.
// Frontmatter field ordering, heroImage, dates, tags, slug, etc. are all ignored.
// IMPORTANT: when changing this function, also update scripts/migrate-src-hash.mjs
// and run `node scripts/migrate-src-hash.mjs` to re-sync all translation _srcHash,
// otherwise the next translation run will re-translate all files unnecessarily.
function contentHash(text) {
  // Split frontmatter and body
  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) return md5(text);
  const fmText = fmMatch[1];
  const body = fmMatch[2];

  // Extract only title and description from frontmatter
  const title = (fmText.match(/^title:\s*(.+)$/m) || [])[1] || '';
  const desc  = (fmText.match(/^description:\s*(.+)$/m) || [])[1] || '';

  // Strip inline images from body
  const cleanBody = body.replace(/^!\[.*?\]\(.*?\)\s*$/gm, '');

  return md5(`title:${title}\ndesc:${desc}\n---\n${cleanBody}`);
}

/**
 * 將 markdown body 分割成「可翻譯段落」和「保留段落」。
 * 返回 segment 陣列：{ type: 'text'|'list'|'code'|'image'|'empty', content: string }
 * 其中 list 另帶 lines: string[]（逐行翻譯用，見下方註解）
 */
const PLACEHOLDER_RE = /\x00(?:CODE|BLOCK)\d+\x00/g;
const LIST_ITEM_RE = /^\s*[-*]\s+/;

/**
 * 結構驗證：譯文必須保住來源的行結構與所有連結 URL。
 * 模型「少回幾行」或「把清單縮成一句」時，內容會直接消失在翻譯版裡而且無聲無息，
 * 所以這裡當成翻譯失敗處理（退回原文 + 標記 hadFallback，下次排程重試）。
 * 回傳 null 表示通過，否則回傳原因字串。
 */
function structureMismatch(src, out) {
  if (typeof out !== 'string') return '非字串';
  const srcLines = src.split('\n');
  const outLines = out.split('\n');
  const itemCount = (lines) => lines.filter(l => LIST_ITEM_RE.test(l)).length;

  if (srcLines.length === 1) {
    // 單行進、單行出。模型會把同一批的鄰近內容一起吐回來（含標題、下一個項目），
    // 那些多出來的行接回去就變成重複的清單項目。
    if (outLines.length !== 1) return `單行被拆成 ${outLines.length} 行`;
  } else if (itemCount(srcLines) > 0) {
    // 來源是多行清單 → 行數必須一比一對上
    if (outLines.length !== srcLines.length) {
      return `行數不符（來源 ${srcLines.length} 行、譯文 ${outLines.length} 行）`;
    }
  } else if (outLines.length * 2 < srcLines.length) {
    // 非清單的多行段落：允許模型併行重排，但砍掉一半以上的行必定是整段被吃掉
    return `行數暴減（來源 ${srcLines.length} 行、譯文 ${outLines.length} 行）`;
  }
  // 清單項目數不得增減（上面的行數檢查擋不到「把說明文字改寫成新的一項」）
  if (itemCount(outLines) !== itemCount(srcLines)) {
    return `清單項目數不符（來源 ${itemCount(srcLines)} 項、譯文 ${itemCount(outLines)} 項）`;
  }
  // 連結 URL 一律不得遺失或被改寫。
  // 例外：純頁內錨點（#xxx）本來就會跟著標題一起被翻譯，不能要求它原封不動。
  for (const m of src.matchAll(/\]\((\S+?)\)/g)) {
    if (m[1].startsWith('#')) continue;
    if (!out.includes(m[1])) return `遺失連結 ${m[1]}`;
  }
  return null;
}

/**
 * 修掉可安全修復的結構差異，免得整段退回原文（讀者會看到整行沒翻譯）。
 * 目前只處理清單記號被加上／拿掉：模型常自作主張把非清單的行改成 "- " 開頭
 * （來源用全形「＊」時特別常見），接回去就變成憑空多出來的清單項目。
 */
function repairListMarkers(src, out) {
  if (typeof out !== 'string') return out;
  const srcLines = src.split('\n');
  const outLines = out.split('\n');
  if (outLines.length !== srcLines.length) return out; // 行數都對不上就不是這種情形

  let changed = false;
  const fixed = outLines.map((line, i) => {
    const srcMarker = srcLines[i].match(LIST_ITEM_RE);
    const outIsItem = LIST_ITEM_RE.test(line);
    if (!srcMarker && outIsItem) {
      changed = true;
      return line.replace(LIST_ITEM_RE, '');
    }
    if (srcMarker && !outIsItem && line.trim()) {
      changed = true;
      return srcMarker[0] + line; // 沿用來源的縮排與記號樣式
    }
    return line;
  });
  return changed ? fixed.join('\n') : out;
}

function segmentBody(body) {
  const segments = [];
  // 先把 code block 整個換成佔位符
  const preserved = new Map();
  let pidx = 0;

  let processed = body.replace(/```[\s\S]*?```/g, (match) => {
    const key = `\x00CODE${pidx++}\x00`;
    preserved.set(key, match);
    return key;
  });

  // 把 {{block:xxx}} 也換掉
  // 部分 .mdx 檔案為了避免 MDX 把 {{ }} 當成 JSX expression 解析而寫成
  // \{\{block:xxx\}\} 轉義形式，這裡也要能辨識，否則翻譯 API 會把裡面的
  // 中文（如「戶外」）當成一般文字翻譯掉，變成 {{block:Outdoor}} 這種
  // 不存在的區塊名稱，導致 astro build 直接壞掉。
  processed = processed.replace(/\\?\{\\?\{block:[^}\\]+\\?\}\\?\}/g, (match) => {
    const key = `\x00BLOCK${pidx++}\x00`;
    preserved.set(key, match);
    return key;
  });

  // 按雙換行分割段落
  const paras = processed.split(/\n\n/);

  for (const para of paras) {
    const trimmed = para.trim();

    if (!trimmed) {
      segments.push({ type: 'empty', content: para });
      continue;
    }

    // 佔位符（code block / block tag）。
    // 一個段落可能含多個佔位符：{{block:a}} 與 {{block:b}} 寫在相鄰兩行時，
    // 中間沒有空行就會被 split(/\n\n/) 歸成同一段。舊版這裡用 ^…$ 錨定單一
    // 佔位符，這種段落比對失敗就被當成一般文字送去翻譯，佔位符再也沒機會
    // 還原，最後原封不動印在頁面上（曾造成 80 個頁面出現 BLOCK1、BLOCK2 字樣）。
    if (/^(?:\s*\x00(?:CODE|BLOCK)\d+\x00\s*)+$/.test(trimmed)) {
      segments.push({
        type: 'code',
        content: para.replace(PLACEHOLDER_RE, (k) => preserved.get(k) ?? k),
      });
      continue;
    }

    // 純圖片行
    if (/^!\[.*?\]\(.*?\)$/.test(trimmed)) {
      segments.push({ type: 'image', content: para });
      continue;
    }

    // update: 日期行（不翻譯，直接保留）
    if (/^update:\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
      segments.push({ type: 'code', content: para });
      continue;
    }

    // 連結清單（每行一個 "- " 項目）：拆成逐行翻譯，行數由結構固定住。
    // 整段丟給模型時，它偶爾只回傳第一行、或自己增刪項目，而回傳值是「一段看起來
    // 正常的譯文」，殘留中文檢查也攔不下來 —— 2026-07 起 blocks 的 en/zh-cn/id
    // 就這樣被吃到只剩 1 個項目（住宿 48→1、親子 37→1），zh-hk 則反向多長出項目。
    // 門檻是「有一行是項目就算」而不是「過半是項目」：每個項目底下各帶一行說明的
    // 寫法（- **標題**：\n說明文字）只有一半的行是項目，再多一行就會掉出過半門檻，
    // 整段又被當成一般文字送出去、又被模型縮成一兩行。
    const lines = para.split('\n');
    if (lines.length > 1 && lines.some(l => LIST_ITEM_RE.test(l))) {
      segments.push({ type: 'list', content: para, lines });
      continue;
    }

    // 一般文字
    segments.push({ type: 'text', content: para });
  }

  return { segments, preserved };
}

// ── DeepSeek API ──────────────────────────────────────────────────────────────

// 遞迴蒐集回傳 JSON 中所有陣列（含巢狀）。用來對付模型偶爾多包一層
// 例如 {"translations": [{"translations": [...真正的翻譯陣列...]}]} 的情況。
function collectArrays(node, out, depth) {
  if (depth > 5 || node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    out.push(node);
    for (const el of node) collectArrays(el, out, depth + 1);
  } else {
    for (const v of Object.values(node)) collectArrays(v, out, depth + 1);
  }
}

// 把單一元素正規化成字串；若是 {text|translation|value: "..."} 之類物件則取其字串值。
function normalizeItem(v) {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const s = Object.values(v).find((x) => typeof x === 'string');
    if (s != null) return s;
  }
  return null; // 無法轉成字串 → 交由呼叫端 fallback 原文
}

// 從模型回傳的 JSON 挑出正確的「字串陣列」，優先取長度等於 expectedLen 的候選，
// 避免整包物件被誤當成單一元素寫進 frontmatter（曾導致 title 變 object、build 失敗）。
function extractStringArray(parsed, expectedLen) {
  const arrays = [];
  collectArrays(parsed, arrays, 0);
  if (!arrays.length) return null;
  const normalized = arrays.map((a) => a.map(normalizeItem));
  const strCount = (a) => a.filter((x) => typeof x === 'string').length;
  // 1) 長度符合且全為字串
  let best = normalized.find((a) => a.length === expectedLen && a.every((x) => typeof x === 'string'));
  if (best) return best;
  // 2) 長度符合（少數 null 由呼叫端 fallback）
  best = normalized.find((a) => a.length === expectedLen);
  if (best) return best;
  // 3) 退而求其次：字串數量最多的候選
  best = normalized.slice().sort((a, b) => strCount(b) - strCount(a))[0];
  return best ?? null;
}

async function callDeepSeek(texts, lang) {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY 未設定');

  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V4-Flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[lang] },
        { role: 'user', content: JSON.stringify(texts) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`API 回傳非 JSON：${raw.slice(0, 300)}`);
  }

  // 穩健擷取字串陣列（支援 [...]、{"translations":[...]}、以及多包一層的巢狀物件）
  const arr = extractStringArray(parsed, texts.length);
  if (!arr) throw new Error(`API 回傳格式不符：${raw.slice(0, 300)}`);
  return arr;
}

/**
 * 翻譯文字陣列，使用段落級快取 + BATCH_SIZE 批次。
 * strictCount：texts 前幾筆是 frontmatter（title/description），殘留檢查採嚴格模式；
 *              其餘是內文段落，改用「中文字降幅」判斷（見 isUntranslatedResidue）。
 */
async function translateTexts(texts, lang, strictCount = texts.length) {
  const results = new Array(texts.length).fill(null);
  const hadFallback = new Set(); // origIdx 清單：翻譯失敗、暫時退回原文的項目
  const needTranslate = []; // { origIdx, text, stripped, videosSaved }
  const isStrict = (i) => i < strictCount;

  for (let i = 0; i < texts.length; i++) {
    const cacheKey = `${md5(texts[i])}:${lang}`;
    const cached = cache.paragraphs[cacheKey];
    // 舊快取可能存了驗證機制上線前的壞翻譯（殘留大量中文，或整段被吃掉只剩一行）；
    // 這種快取視同未命中，重新呼叫 API，讓壞掉的翻譯有機會自我修復。
    if (cached && !isUntranslatedResidue(cached, lang, texts[i], isStrict(i))
        && !structureMismatch(texts[i], cached)) {
      results[i] = cached;
    } else {
      // 提取 video URL，換成佔位符後再送翻譯
      const { text: stripped, saved: videosSaved } = extractVideoUrls(texts[i]);
      needTranslate.push({ origIdx: i, text: texts[i], stripped, videosSaved });
    }
  }

  if (needTranslate.length === 0) return { results, hadFallback };

  if (isDryRun) {
    const chars = needTranslate.reduce((s, t) => s + t.text.length, 0);
    console.log(`    [dry-run] ${needTranslate.length} 段落需翻譯（${chars} 字元）`);
    for (const { text } of needTranslate.slice(0, 3)) {
      console.log(`      "${text.slice(0, 60).replace(/\n/g, '↵')}..."`);
    }
    return { results: results.map((r, i) => r ?? texts[i]), hadFallback };
  }

  // 批次呼叫
  for (let start = 0; start < needTranslate.length; start += BATCH_SIZE) {
    const batch = needTranslate.slice(start, start + BATCH_SIZE);
    const batchTexts = batch.map(b => b.stripped); // 送已去除 video URL 的版本

    let translated;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        translated = await callDeepSeek(batchTexts, lang);
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    for (let j = 0; j < batch.length; j++) {
      const { origIdx, text, stripped, videosSaved } = batch[j];
      let t = translated[j];

      const strict = isStrict(origIdx);

      // 譯文不合格的原因（null = 通過）：型別錯、殘留原文、或結構被改掉（掉行／掉連結）
      const rejectReason = (v) =>
        typeof v !== 'string' ? '非字串'
        : isUntranslatedResidue(v, lang, text, strict) ? '殘留原文'
        : structureMismatch(stripped, v);

      // 不合格：先試著修掉可安全修復的結構差異，還是不行就同一輪內單獨重打一次 API，
      // 避免品質不穩的單一項目拖到下次排程才重試。
      t = repairListMarkers(stripped, t);
      let reason = rejectReason(t);
      if (reason) {
        try {
          const retry = await callDeepSeek([stripped], lang);
          const repaired = repairListMarkers(stripped, retry[0]);
          if (!rejectReason(repaired)) t = repaired;
        } catch { /* 重試失敗就沿用原本結果，交由下方 fallback 處理 */ }
        reason = rejectReason(t);
      }

      if (reason) {
        // 翻譯缺失、格式異常、殘留原文或結構被改：暫用原文，且「不」寫入快取，讓下次可重試。
        // 避免把物件/undefined、半殘留的中文，或被吃掉內容的殘缺譯文寫進內文或 frontmatter。
        if (reason !== '殘留原文') {
          console.warn(`    ⚠️ 譯文遭退回（${lang}）：${reason} — "${text.slice(0, 50).replace(/\n/g, '↵')}"`);
        }
        results[origIdx] = text;
        hadFallback.add(origIdx);
        continue;
      }
      // 翻譯結果還原 video URL
      const result = restoreVideoUrls(t, videosSaved);
      cache.paragraphs[`${md5(text)}:${lang}`] = result;
      results[origIdx] = result;
    }
    saveCache();
  }

  return { results, hadFallback };
}

// ── 主要翻譯邏輯 ─────────────────────────────────────────────────────────────

// 站內連結在 zh-tw 來源一律不帶語系前綴，翻譯後要補上 /{lang}/，否則讀者點連結會被切回中文頁。
//
// 但只有「該語言真的有對應路由」時才能補，不然就是 404。所以這張表的值 = 哪些語言有 /{lang}/... 版本，
// null 代表四個翻譯語言（en / zh-cn / zh-hk / id）全都有；列成陣列則只有陣列裡的語言會加前綴。
//
// 已知的坑：/map/ 底下只有 gojek-fare 有語系版本，其餘（/map/ubud/、/map/index 等地區地圖、
// favorites、itinerary）只有 src/pages/map/ 根路由，千萬不要用 'map' 一併加前綴。
// /go/ 和 /ask/ 同樣沒有語系版本，不列在這裡即可維持原樣。
//
// 新增路徑前先確認 src/pages/{en,zh-cn,zh-hk,id}/ 底下都有該檔案，缺哪個就把值寫成陣列排除掉。
const LOCALIZED_PATHS = {
  'blog': null,
  'trip-planner': null,
  'bali-budget-calculator': null,
  'map/gojek-fare': null,
  'tickets': null,   // src/pages/tickets.astro + en / zh-cn / zh-hk / id 五個路由都在
};
const LOCALIZED_PATH_ALT = Object.keys(LOCALIZED_PATHS).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const LOCALIZED_MD_LINK_RE = new RegExp(`\\]\\(/(${LOCALIZED_PATH_ALT})/`, 'g');
const LOCALIZED_ABS_URL_RE = new RegExp(`https://(www\\.)?gobaligo\\.id/(${LOCALIZED_PATH_ALT})/`, 'g');

const hasLangVariant = (path, lang) => {
  const langs = LOCALIZED_PATHS[path];
  return langs === null || langs.includes(lang);
};

function localizeInternalLinks(text, lang) {
  return text
    .replace(LOCALIZED_MD_LINK_RE, (m, p) => (hasLangVariant(p, lang) ? `](/${lang}/${p}/` : m))
    .replace(LOCALIZED_ABS_URL_RE, (m, www, p) =>
      hasLangVariant(p, lang) ? `https://${www || ''}gobaligo.id/${lang}/${p}/` : m);
}

// titleLocked 時，newFm.title/description 目前仍是來源語言（zh-tw）的值（來自 {...fm} 展開），
// 必須換成翻譯檔既有的英文（或其他語言）title/description，否則會把中文寫進翻譯檔。
function applyTitleLock(newFm, titleLocked, destPath) {
  if (!titleLocked || !existsSync(destPath)) return;
  try {
    const { data: destFm } = matter(readFileSync(destPath, 'utf-8'));
    if (destFm.title) newFm.title = destFm.title;
    if (destFm.description) newFm.description = destFm.description;
  } catch { /* fallthrough: keep source-language values */ }
}

async function translateFile(filename, lang) {
  const srcPath = join(SOURCE_DIR, filename);
  const srcContent = readFileSync(srcPath, 'utf-8');

  // 若 blog 源文件有 frontmatter slug，翻譯版使用 slug 作為輸出檔名
  let destFilename = filename;
  if (!isBlocks) {
    const { data: srcFm } = matter(srcContent);
    if (srcFm.slug && srcFm.slug.trim()) {
      const ext = filename.endsWith('.mdx') ? '.mdx' : '.md';
      destFilename = srcFm.slug.trim().replace(/^['"]|['"]$/g, '') + ext;
    }
  }

  const destPath = isBlocks
    ? join(`src/content/blocks/${lang}`, filename)
    : join(`src/content/${lang}`, destFilename);
  const srcHash = contentHash(srcContent);
  const fileCacheKey = `${isBlocks ? 'blocks:' : ''}${filename}:${lang}`;

  // 跳過未變動的已翻譯檔案
  // 優先讀取翻譯檔 frontmatter 裡存的 _srcHash（不依賴外部 cache，重啟後也有效）
  let priorAttempts = 0;
  if (!isDryRun && existsSync(destPath)) {
    try {
      const destContent = readFileSync(destPath, 'utf-8');
      const { data: destFm } = matter(destContent);
      if (destFm._srcHash === srcHash) return 'cached';
      // 同一份來源上次翻到一半：接續累計次數（來源改過的話 hash 不同，次數自動歸零）
      if (destFm._srcHash === `PENDING_RETRY_${srcHash}`) {
        priorAttempts = Number(destFm._translateAttempts) || 0;
      }
    } catch { /* fallthrough */ }
    // fallback: 舊版只有外部 cache 記錄
    if (cache.files[fileCacheKey] === srcHash) return 'cached';
  }

  const { data: fm, content: body } = matter(srcContent);
  const titleLocked = !isBlocks && isTitleLocked(lang, destFilename);

  // Frontmatter 可翻譯欄位
  const fmTranslatables = [];
  const fmKeys = [];
  // blocks 的 title 是區塊 slug 參考用，不能翻譯（否則文章找不到區塊）
  // titleLocked：人工優化過的 title/description，跳過重翻，保留翻譯檔現有內容
  if (fm.title && !isBlocks && !titleLocked) { fmTranslatables.push(fm.title); fmKeys.push('title'); }
  if (fm.description && !titleLocked) { fmTranslatables.push(fm.description); fmKeys.push('description'); }

  // Body 分割
  const { segments, preserved } = segmentBody(body);
  // 待翻譯的內文文字。一般段落佔 1 筆；清單段落逐行各佔 1 筆，
  // 讓行數由這裡的結構決定，而不是仰賴模型自己數清楚。
  const bodyTexts = [];
  const slots = []; // 與 bodyTexts 同索引：[segIdx, lineIdx]
  segments.forEach((seg, si) => {
    if (seg.type === 'text' && seg.content.trim()) {
      slots.push([si, 0]);
      bodyTexts.push(seg.content);
    } else if (seg.type === 'list') {
      seg.lines.forEach((line, li) => {
        if (!line.trim()) return;
        slots.push([si, li]);
        bodyTexts.push(line);
      });
    }
  });

  // 全部要翻譯的文字
  const allTexts = [...fmTranslatables, ...bodyTexts];

  if (allTexts.length === 0) {
    // 無可翻譯文字（純 iframe / HTML）：直接複製來源，加 lang + _srcHash
    if (!isDryRun) {
      const newFm = { ...fm, lang, _srcHash: srcHash };
      applyTitleLock(newFm, titleLocked, destPath);
      const newContent = matter.stringify(localizeInternalLinks(body, lang), newFm);
      writeFileSync(destPath, newContent, 'utf-8');
      cache.files[fileCacheKey] = srcHash;
      saveCache();
    }
    return 'translated';
  }

  const { results: translated, hadFallback } = await translateTexts(allTexts, lang, fmTranslatables.length);

  // 若有任何欄位（title/description/內文段落）翻譯失敗、暫用原文，
  // _srcHash 就不寫成功雜湊 —— 讓下次執行時這個檔案還是會被判定為「待翻譯」，
  // 不會因為寫入了跟來源相符的 _srcHash 而被永久跳過重試。
  // 但重試有上限：連續 MAX_TRANSLATE_ATTEMPTS 次都補不齊就收手，改寫正式 hash 並
  // 標記 _translateIncomplete，剩下的交給人工，不要讓排程無止盡重翻。
  const translationIncomplete = hadFallback.size > 0;
  const attempts = translationIncomplete ? priorAttempts + 1 : 0;
  const gaveUp = translationIncomplete && attempts >= MAX_TRANSLATE_ATTEMPTS;
  const stillRetrying = translationIncomplete && !gaveUp;
  const finalSrcHash = stillRetrying ? `PENDING_RETRY_${srcHash}` : srcHash;

  if (gaveUp) {
    console.log(`    ⚠️ ${destFilename} (${lang}) 連續 ${attempts} 次仍有 ${hadFallback.size} 段未翻成功，停止重試`);
  }

  // 更新 frontmatter
  const newFm = { ...fm, lang, _srcHash: finalSrcHash };
  if (stillRetrying) newFm._translateAttempts = attempts;
  if (gaveUp) newFm._translateIncomplete = true;
  fmKeys.forEach((key, i) => {
    // 最後防線：frontmatter（title/description）只接受非空字串，否則保留原文，
    // 確保絕不會把物件寫進 frontmatter（Astro schema 會直接 build 失敗）。
    const t = translated[i];
    newFm[key] = (typeof t === 'string' && t.trim()) ? t : fm[key];
  });
  applyTitleLock(newFm, titleLocked, destPath);

  // 修正無效 tags（空字串、多行字串 → 空陣列或正確陣列）
  if (newFm.tags != null && !Array.isArray(newFm.tags)) {
    const raw = String(newFm.tags).trim();
    newFm.tags = raw ? raw.split(/\n/).map(t => t.trim()).filter(Boolean) : [];
  }

  // 重建 body：照 slots 把譯文放回原本的 segment / 行位置，
  // 沒譯到的位置一律沿用來源那一行（寧可留原文，也不要讓行消失）。
  const bodyTrans = new Map(); // `segIdx:lineIdx` → 譯文
  slots.forEach(([si, li], i) => {
    const v = translated[fmTranslatables.length + i];
    if (typeof v === 'string') bodyTrans.set(`${si}:${li}`, v);
  });

  const newBody = segments.map((seg, si) => {
    if (seg.type === 'text' && seg.content.trim()) return bodyTrans.get(`${si}:0`) ?? seg.content;
    if (seg.type === 'list') return seg.lines.map((line, li) => bodyTrans.get(`${si}:${li}`) ?? line).join('\n');
    if (seg.type === 'empty') return '';
    return seg.content;
  }).join('\n\n');

  // 最後保險：任何殘留的佔位符一律還原。翻譯 API 有時會把佔位符連同周圍
  // 文字一起吐回譯文，那條路徑不經過上面的 segment 還原。
  const restoredBody = newBody.replace(PLACEHOLDER_RE, (k) => preserved.get(k) ?? k);
  if (restoredBody.includes('\x00')) {
    console.warn(`⚠️  ${destPath}：仍有無法還原的佔位符，請檢查（翻譯 API 可能改動了佔位符內容）`);
  }

  const newContent = matter.stringify(localizeInternalLinks(restoredBody, lang), newFm);

  if (!isDryRun) {
    writeFileSync(destPath, newContent, 'utf-8');
    cache.files[fileCacheKey] = finalSrcHash;
    saveCache();
  }

  return 'translated';
}

// ── 費用估算 ─────────────────────────────────────────────────────────────────

function estimateCost(files) {
  let totalChars = 0;
  for (const f of files) {
    totalChars += readFileSync(join(SOURCE_DIR, f), 'utf-8').length;
  }
  // DeepSeek: CJK ~1.5 char/token, input $0.07/M, output $0.28/M
  // Assume 1:1 input:output ratio, output is roughly same length
  const inputTokens = totalChars / 1.5;
  const outputTokens = inputTokens;
  const costPerLang = (inputTokens * 0.07 + outputTokens * 0.28) / 1_000_000;
  return { totalChars, inputTokens: Math.round(inputTokens), costPerLang };
}

// ── 並發控制 ─────────────────────────────────────────────────────────────────

const CONCURRENCY = parseInt(process.env.TRANSLATE_CONCURRENCY ?? '40', 10);

async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

async function main() {
  const allFiles = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const nonPrivateFiles = isBlocks ? allFiles : allFiles.filter(f => {
    const txt = readFileSync(join(SOURCE_DIR, f), 'utf-8');
    const m = txt.match(/^private:\s*(.+)$/m);
    return !(m && m[1].trim().toLowerCase() === 'true');
  });
  const files = targetFile ? nonPrivateFiles.filter(f => f.includes(targetFile)) : nonPrivateFiles;

  if (files.length === 0) {
    console.log('找不到符合條件的檔案');
    process.exit(1);
  }

  // 確保目標資料夾存在
  for (const lang of targetLangs) {
    const targetDir = isBlocks ? `src/content/blocks/${lang}` : `src/content/${lang}`;
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  }

  const { totalChars, inputTokens, costPerLang } = estimateCost(files);

  console.log('\n📚 gobaligo 翻譯腳本');
  console.log('─'.repeat(50));
  console.log(`來源檔案：${files.length} 篇`);
  console.log(`目標語言：${targetLangs.join(', ')}`);
  console.log(`並發數：${CONCURRENCY}`);
  console.log(`估計字元：~${totalChars.toLocaleString()} 字元 / ~${inputTokens.toLocaleString()} tokens`);
  console.log(`估計費用：~$${(costPerLang * targetLangs.length).toFixed(3)} USD（全部未快取）`);
  if (isDryRun) console.log('\n🔍 DRY RUN — 不會呼叫 API\n');
  console.log('─'.repeat(50));

  // 展開所有 (file × lang) 任務
  const tasks = [];
  for (const lang of targetLangs) {
    for (const file of files) {
      tasks.push({ file, lang });
    }
  }

  let translated = 0, cached = 0, errors = 0;
  const total = tasks.length;
  let done = 0;

  await runPool(tasks.map(({ file, lang }) => async () => {
    try {
      const result = await translateFile(file, lang);
      done++;
      if (result === 'cached') {
        cached++;
      } else if (result === 'translated') {
        translated++;
        console.log(`  [${done}/${total}] ✓ ${lang} / ${file.slice(0, 40)}`);
      }
    } catch (e) {
      done++;
      errors++;
      console.log(`  [${done}/${total}] ✗ ${lang} / ${file.slice(0, 30)} — ${e.message.slice(0, 50)}`);
    }
  }), CONCURRENCY);

  console.log('\n─'.repeat(50));
  console.log(`✅ 完成｜翻譯：${translated}，快取跳過：${cached}，錯誤：${errors}\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
