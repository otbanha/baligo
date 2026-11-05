/**
 * seo-keywords.ts
 * Category-aware keyword injection + Cantonese term substitution
 */

// Category → language → keyword suffix (appended to short descriptions)
const CAT_KEYWORDS: Record<string, Record<string, string>> = {
  '住宿推薦': {
    'zh-tw': 'Villa、飯店住宿推薦、峇里島訂房優惠',
    'zh-hk': 'Villa、酒店住宿推薦、峇里島網上預約',
    'zh-cn': 'Villa、酒店住宿推荐、峇里岛订房优惠',
    'en':    'Bali villa · hotel deals · best accommodation',
    'id':    'villa Bali · promo hotel · rekomendasi penginapan terbaik',
  },
  '簽證通關': {
    'zh-tw': '2026最新攻略、VOA簽證申請教學、峇里島通關流程',
    'zh-hk': '2026最新攻略、VOA簽證申請教學、峇里島通關流程',
    'zh-cn': '2026最新攻略、VOA签证申请教程、峇里岛通关流程',
    'en':    'Bali 2026 visa guide · VOA on arrival · entry tips',
    'id':    'panduan visa Bali 2026 · VOA on arrival · tips imigrasi',
  },
  '峇里島分區攻略': {
    'zh-tw': '地區全攻略、交通指南、隱藏景點推薦',
    'zh-hk': '地區全攻略、交通指南、隱藏景點推薦',
    'zh-cn': '地区全攻略、交通指南、隐藏景点推荐',
    'en':    'complete area guide · transport tips · hidden gems',
    'id':    'panduan lengkap per kawasan · tips transportasi · spot tersembunyi',
  },
  '美食景點活動': {
    'zh-tw': '峇里島美食、必去景點、特色活動推薦',
    'zh-hk': '峇里島美食、必去景點、特色活動推薦',
    'zh-cn': '峇里岛美食、必去景点、特色活动推荐',
    'en':    'Bali food · top attractions · must-do activities',
    'id':    'kuliner Bali · tempat wisata terbaik · aktivitas wajib coba',
  },
  '新手指南': {
    'zh-tw': '峇里島自由行新手攻略、行程規劃建議',
    'zh-hk': '峇里島自由行新手攻略、行程規劃建議',
    'zh-cn': '峇里岛自由行新手攻略、行程规划建议',
    'en':    'Bali first-timer guide · itinerary planning tips',
    'id':    'panduan pemula ke Bali · tips menyusun itinerary',
  },
  '旅遊專題': {
    'zh-tw': '峇里島旅行技巧、省錢攻略、必知資訊',
    'zh-hk': '峇里島旅行技巧、慳錢攻略、必知資訊',
    'zh-cn': '峇里岛旅行技巧、省钱攻略、必知资讯',
    'en':    'Bali travel hacks · money-saving tips · insider advice',
    'id':    'tips hemat liburan Bali · trik perjalanan · info penting',
  },
  '叫車包車': {
    'zh-tw': '峇里島包車、計程車、交通租車攻略',
    'zh-hk': '峇里島包車、的士、交通租車攻略',
    'zh-cn': '峇里岛包车、出租车、交通租车攻略',
    'en':    'Bali private car hire · transport · taxi tips',
    'id':    'sewa mobil dengan driver · transportasi Bali · tips taksi',
  },
  '家庭親子': {
    'zh-tw': '峇里島親子旅遊、家庭行程推薦',
    'zh-hk': '峇里島親子旅遊、家庭行程推薦',
    'zh-cn': '峇里岛亲子旅游、家庭行程推荐',
    'en':    'Bali family travel · kid-friendly activities',
    'id':    'wisata keluarga ke Bali · aktivitas ramah anak',
  },
  '套裝行程': {
    'zh-tw': '峇里島套裝行程、跟團旅遊推薦、包套行程比較',
    'zh-hk': '峇里島套裝行程、跟團旅遊推薦、包套行程比較',
    'zh-cn': '峇里岛套装行程、跟团旅游推荐、套餐行程比较',
    'en':    'Bali package tours · guided tour packages · all-inclusive itineraries',
    'id':    'paket tur Bali · tur berpemandu · itinerary all-inclusive',
  },
};

// Slug → language → long-tail keyword suffix.
// 頭部字（如「峇里島住宿推薦」）被 Agoda/Klook/真人部落客卡死，短期難搶；
// 這裡針對 8 篇分區住宿 pillar 文章補長尾字（對手較弱、轉換率較高），
// 只影響 meta description / JSON-LD description（渲染層），不碰 frontmatter，
// 不會動 content_hash、不會觸發翻譯（見 project_translate_hash_trigger）。
const SLUG_KEYWORDS: Record<string, Record<string, string>> = {
  'seminyak-beach-resorts-guide': {
    'zh-tw': '水明漾平價住宿、機場接送飯店推薦',
    'zh-hk': '水明漾抵住酒店、機場接送酒店推薦',
    'zh-cn': '水明漾平价住宿、机场接送酒店推荐',
    'en':    'Seminyak budget stays · airport transfer hotels',
    'id':    'penginapan murah Seminyak · hotel dengan antar-jemput bandara',
  },
  'ubud-resorts-guide': {
    'zh-tw': '烏布叢林 Villa 泳池早餐、市中心飯店',
    'zh-hk': '烏布叢林 Villa 泳池早餐、市中心酒店',
    'zh-cn': '乌布丛林 Villa 泳池早餐、市中心酒店',
    'en':    'Ubud jungle villa with pool breakfast · central hotels',
    'id':    'villa hutan Ubud kolam pribadi · hotel pusat kota',
  },
  'canggu-top-hotels-guide': {
    'zh-tw': '長谷衝浪住宿、咖啡廳周邊飯店推薦',
    'zh-hk': '長谷衝浪住宿、咖啡廳周邊酒店推薦',
    'zh-cn': '长谷冲浪住宿、咖啡厅周边酒店推荐',
    'en':    'Canggu surf stays · cafe district hotels',
    'id':    'penginapan dekat spot surfing Canggu · hotel kawasan kafe',
  },
  'uluwatu-bali-villas-resorts-guide': {
    'zh-tw': '烏魯瓦圖懸崖 Villa、無邊際泳池推薦',
    'zh-hk': '烏魯瓦圖懸崖 Villa、無邊際泳池推薦',
    'zh-cn': '乌鲁瓦图悬崖 Villa、无边际泳池推荐',
    'en':    'Uluwatu clifftop villa · infinity pool recommendations',
    'id':    'villa tebing Uluwatu · rekomendasi infinity pool',
  },
  'nusa-dua-resorts-guide': {
    'zh-tw': '努沙杜瓦親子飯店、全包式度假村',
    'zh-hk': '努沙杜瓦親子酒店、全包式度假村',
    'zh-cn': '努沙杜瓦亲子酒店、全包式度假村',
    'en':    'Nusa Dua family hotels · all-inclusive resorts',
    'id':    'hotel keluarga Nusa Dua · resor all-inclusive',
  },
  'jimbaran-beachfront-hotels-guide': {
    'zh-tw': '金巴蘭海景飯店、海鮮夕陽餐廳推薦',
    'zh-hk': '金巴蘭海景酒店、海鮮日落餐廳推薦',
    'zh-cn': '金巴兰海景酒店、海鲜夕阳餐厅推荐',
    'en':    'Jimbaran beachfront hotels · seafood sunset dining',
    'id':    'hotel tepi pantai Jimbaran · seafood sunset',
  },
  'sanur-luxury-budget-resorts': {
    'zh-tw': '沙努爾親子飯店、日出海灘住宿',
    'zh-hk': '沙努爾親子酒店、日出海灘住宿',
    'zh-cn': '沙努尔亲子酒店、日出海滩住宿',
    'en':    'Sanur family hotels · sunrise beach stays',
    'id':    'hotel keluarga Sanur · penginapan pantai sunrise',
  },
  'best-kuta-hotels-list': {
    'zh-tw': '庫塔機場飯店、庫塔購物住宿推薦',
    'zh-hk': '庫塔機場酒店、庫塔購物住宿推薦',
    'zh-cn': '库塔机场酒店、库塔购物住宿推荐',
    'en':    'Kuta airport hotels · shopping district stays',
    'id':    'hotel dekat bandara Kuta · penginapan pusat perbelanjaan',
  },
};

// Cantonese (zh-HK) term substitutions for localized search relevance
const HK_SUBS: [RegExp, string][] = [
  [/飯店/g, '酒店'],
  [/預訂/g, '網上預約'],
  [/訂房/g, '網上訂房'],
  [/旅遊攻略/g, '旅遊攻略'],  // keep as-is (same in HK)
];

export function applyHkSubs(text: string): string {
  let out = text;
  for (const [re, rep] of HK_SUBS) out = out.replace(re, rep);
  return out;
}

// ─── SERP 長度控制 ──────────────────────────────────────────────────────────
//
// 只作用於 meta title / meta description，不影響 <h1> 與 JSON-LD——BlogPost
// 把原始 frontmatter 直接餵給那兩處，這裡的輸出只進 <BaseHead>。
//
// en / id 的標題與描述是從繁中直譯過來的，沒有考慮拉丁字母比中文佔更多字元，
// 導致 title 中位數 102 字元、description 中位數 320 字元，在 SERP 幾乎必被截斷。
//
// 繁中／簡中／港版原本被當成「本來就在合理範圍」而不處理，但 2026-11 量測 dist
// 實際輸出後發現並非如此：三個中文語系的 title 中位數 38 個全形字、description
// 中位數 102 個全形字（最長 378 個），Google 中文 SERP 大約只顯示 30～33 個全形
// 字的標題與 78～80 個全形字的描述，等於中位數的頁面標題尾段與描述後 20% 都被
// 截掉——摘要常常斷在句子中間，CTR 直接受損。
//
// 因此長度預算改用「視覺寬度」計算：全形字算 2、半形字算 1。拉丁語系的預算與
// 斷點邏輯與原本完全相同（60 / 160 個半形字），中文語系則是 64 / 160 個視覺單位
// （≈32 / 80 個全形字），並且在中文標點（｜、：、，、。）上斷句。

const SERP_TITLE_MAX = 60;      // en / id：半形字元
const SERP_DESC_MAX = 160;      // en / id：半形字元
const SERP_TITLE_MAX_W = 64;    // 中文：視覺寬度（≈32 全形字，含品牌後綴）
const SERP_DESC_MAX_W = 160;    // 中文：視覺寬度（≈80 全形字）
const BRAND_SUFFIX = ' | Go Bali Go';
const LATIN_LANGS = new Set(['en', 'id']);

/** 全形字（CJK 文字、全形標點、假名、諺文）算 2 個單位，其餘算 1 */
const FULLWIDTH_RE =
  /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;

function charWidth(ch: string): number {
  return FULLWIDTH_RE.test(ch) ? 2 : 1;
}

export function visualWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += charWidth(ch);
  return w;
}

/** 取出視覺寬度不超過 max 的最長前綴（絕不切在一個字的中間） */
function sliceToWidth(s: string, max: number): string {
  let out = '', w = 0;
  for (const ch of s) {
    const cw = charWidth(ch);
    if (w + cw > max) break;
    out += ch;
    w += cw;
  }
  return out;
}

/** 句尾殘留的連接詞／冠詞（英文＋印尼文），截斷後要一併清掉 */
const DANGLING_WORD =
  /\s+(?:and|or|but|the|an?|to|of|in|on|at|for|with|by|from|dan|atau|yang|di|ke|dari|untuk|dengan|pada|serta|&)$/i;

function stripBrand(s: string): string {
  return s.replace(/\s*[|｜\-–—]\s*Go\s*Bali\s*Go\s*$/i, '').trim();
}

/** 【X】Y → 「X: Y」；【X】 → 「X」。中日韓的方頭括號在英文/印尼文 SERP 讀起來突兀，且白吃 2 個字元 */
function unbracket(s: string): string {
  const m = s.match(/^【([^】]+)】\s*(.*)$/);
  if (!m) return s;
  return m[2] ? `${m[1]}: ${m[2]}` : m[1];
}

function trimClean(s: string): string {
  let out = s.trim().replace(/[\s,;:、，。·|｜–—-]+$/u, '');
  while (DANGLING_WORD.test(out)) out = out.replace(DANGLING_WORD, '');
  return out.trim();
}

/** 在 max 內找最好的斷點：優先結構分隔符，其次字詞邊界，絕不切在字中間 */
function fitTitle(s: string, max: number): string {
  if (s.length <= max) return s;
  const win = s.slice(0, max + 1);
  const sep = Math.max(
    win.lastIndexOf(' — '), win.lastIndexOf(' – '), win.lastIndexOf(' - '),
    win.lastIndexOf(', '), win.lastIndexOf('; '), win.lastIndexOf(' | '), win.lastIndexOf('｜'),
  );
  // 分隔符太靠前的話寧可用字詞邊界，避免砍掉大半標題
  if (sep >= Math.floor(max * 0.55)) return trimClean(win.slice(0, sep));
  const sp = win.lastIndexOf(' ');
  return trimClean(sp > 0 ? win.slice(0, sp) : win.slice(0, max));
}

/** 中文標題／描述結尾殘留的標點，截斷後要一併清掉 */
const CJK_TAIL = /[\s、，。．；：・…·｜|／\/\-—–~～「『（(\[【&+]+$/u;

function trimCleanCjk(s: string): string {
  return s.trim().replace(CJK_TAIL, '').trim();
}

/** 中文標題斷點：全形／半形的結構分隔符，依序試，取視窗內最後一個 */
const CJK_TITLE_SEPS = ['｜', ' | ', '｜', '——', ' — ', ' – ', ' - ', '：', ': ', '』', '」', '】', '，', '、', '；'];

/**
 * 中文標題在 max（視覺寬度）內找最好的斷點。
 * 這些標題幾乎都是「主關鍵字｜補充說明」的結構，切在分隔符上剛好留下主關鍵字；
 * 分隔符太靠前（不到預算 55%）就寧可直接截斷，避免只剩兩三個字的標題。
 */
function fitTitleCjk(s: string, max: number): string {
  if (visualWidth(s) <= max) return s;
  const win = sliceToWidth(s, max);
  const floor = Math.floor(max * 0.55);
  let best = -1;
  for (const sep of CJK_TITLE_SEPS) {
    const i = win.lastIndexOf(sep);
    if (i <= 0) continue;
    // 』」】是「後括號」，斷點要落在它後面才讀得通
    const end = /[』」】]/.test(sep) ? i + sep.length : i;
    if (end > best) best = end;
  }
  if (best > 0 && visualWidth(win.slice(0, best)) >= floor) return trimCleanCjk(win.slice(0, best));
  return trimCleanCjk(win);
}

/** 中文描述句末標點（斷在這裡讀起來是完整句子） */
const CJK_SENTENCE_END = /[。！？；!?]/gu;

/**
 * 中文描述在 max（視覺寬度）內找最好的斷點：
 * 句末標點 → 結構分隔符（加省略號）→ 硬切（加省略號）。
 */
function fitDescCjk(s: string, max: number): string {
  // 沒超出預算也要清掉結尾的「：」「，」之類懸空標點（內文摘要備援常留下）
  if (visualWidth(s) <= max) return s.replace(/[\s，、；：,;:]+$/u, '');
  const win = sliceToWidth(s, max);
  const floor = Math.floor(max * 0.6);

  const ends = [...win.matchAll(CJK_SENTENCE_END)];
  if (ends.length) {
    const cut = (ends[ends.length - 1].index ?? -1) + 1;
    if (cut > 0 && visualWidth(win.slice(0, cut)) >= floor) return win.slice(0, cut).trim();
  }

  let best = -1;
  for (const sep of ['｜', '，', '、', '；', ': ', '：', ', ']) {
    const i = win.lastIndexOf(sep);
    if (i > best) best = i;
  }
  if (best > 0 && visualWidth(win.slice(0, best)) >= floor) return trimCleanCjk(win.slice(0, best)) + '…';

  // 硬切時先把省略號的寬度讓出來，總寬度才不會超出預算
  return trimCleanCjk(sliceToWidth(win, max - 2)) + '…';
}

/**
 * Enhance title with Cantonese substitutions (zh-HK) and SERP length fitting (en/id).
 *
 * en/id 回傳的是「最終」標題：放得下就自己接品牌後綴，放不下就不接。
 * 因此 BlogPost 對這兩個語系會傳 noSuffix 給 BaseHead，避免再被追加一次。
 */
export function enhancedTitle(title: string, cats: string[], lang: string): string {
  const localized = lang === 'zh-hk' ? applyHkSubs(title) : title;

  if (LATIN_LANGS.has(lang)) {
    const base = trimClean(unbracket(stripBrand(localized)));
    return base.length + BRAND_SUFFIX.length <= SERP_TITLE_MAX
      ? base + BRAND_SUFFIX
      : fitTitle(base, SERP_TITLE_MAX);
  }

  // 中文語系：同樣回傳「最終」標題（放得下就自己接品牌後綴），BlogPost 一律傳 noSuffix
  const base = trimCleanCjk(stripBrand(localized));
  return visualWidth(base) + visualWidth(BRAND_SUFFIX) <= SERP_TITLE_MAX_W
    ? base + BRAND_SUFFIX
    : fitTitleCjk(base, SERP_TITLE_MAX_W);
}

/** description 有時混進 markdown 語法（**粗體**、[文字](網址)），meta 標籤裡要清掉 */
function stripMarkdown(s: string): string {
  return s
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]{1,3}/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** description 空白或短到沒有資訊量時，從內文取開頭當備援 */
function excerptFromBody(body: string): string {
  const plain = stripMarkdown(
    body
      .replace(/^\s*\{\{[^}]*\}\}\s*$/gm, '')   // {{block:xxx}} 佔位
      .replace(/^\s*\|.*\|\s*$/gm, '')          // 表格
      .replace(/^\s*[-*+]\s+/gm, ''),
  );
  return plain.slice(0, 400).trim();
}

function fitDesc(s: string, max: number): string {
  if (s.length <= max) return s;
  // 視窗剛好 max，斷點索引才不會超出預算（句尾符號落在最後一格時仍算合法）
  const win = s.slice(0, max);
  const sentences = [...win.matchAll(/[.!?。！？](?=\s|$)/g)];
  const lastEnd = sentences.length ? (sentences[sentences.length - 1].index ?? -1) + 1 : -1;
  // 句號落點夠靠後就切在句尾，讀起來是完整句子
  if (lastEnd >= Math.floor(max * 0.6)) return win.slice(0, lastEnd).trim();
  const sp = win.lastIndexOf(' ');
  return trimClean(sp > 0 ? win.slice(0, sp) : win.slice(0, max - 1)) + '…';
}

/**
 * Enhance description with:
 * 1. Cantonese substitutions (zh-HK)
 * 2. Slug-level long-tail keyword suffix (if available), else category keyword suffix
 *    (only when description is short enough to still have room)
 * 3. Body fallback when the description is empty or too short to say anything
 * 4. SERP length fitting (en/id only)
 */
export function enhancedDescription(
  desc: string,
  cats: string[],
  lang: string,
  slug?: string,
  body?: string,
): string {
  let out = lang === 'zh-hk' ? applyHkSubs(desc) : desc;

  // description 缺漏或短到沒有資訊量時改用內文開頭。全語系適用：原本會輸出
  // 空的 meta，或只剩關鍵字後綴的「 · Bali private car hire · transport」。
  if (stripMarkdown(out).length < 20 && body) {
    const fallback = excerptFromBody(body);
    if (fallback.length >= 20) out = lang === 'zh-hk' ? applyHkSubs(fallback) : fallback;
  }

  // 'id' 原本沒列進來，印尼文頁面因此吃到繁中的關鍵字後綴
  // （例：「...liburan keluarga di Bali.｜Villa、飯店住宿推薦、峇里島訂房優惠」），
  // 等於在印尼文 SERP 上掛一串中文（2026-11 量測：63 個 /id/ 頁面受影響）。
  const langKey = ['en', 'id', 'zh-cn', 'zh-hk'].includes(lang) ? lang : 'zh-tw';

  const slugKwMap = slug ? SLUG_KEYWORDS[slug] : undefined;
  const kw = slugKwMap
    ? (slugKwMap[langKey] ?? slugKwMap['zh-tw'])
    : (() => {
        for (const cat of cats) {
          const kwMap = CAT_KEYWORDS[cat];
          if (!kwMap) continue;
          const k = kwMap[langKey] ?? kwMap['zh-tw'];
          if (k) return k;
        }
        return undefined;
      })();

  if (kw) {
    // 只在後綴接上去之後整句仍放得進 SERP 預算時才接，否則等一下就被截掉，
    // 白白吃掉描述尾段又讓摘要斷在半句（原本只看字元數 < 110，中文幾乎必被截）
    const firstKw = kw.split(/[、·]/)[0].trim();
    const sep = LATIN_LANGS.has(lang) ? ' · ' : '｜';
    const budget = LATIN_LANGS.has(lang) ? SERP_DESC_MAX : SERP_DESC_MAX_W;
    const width = LATIN_LANGS.has(lang) ? (t: string) => t.length : visualWidth;
    if (!out.includes(firstKw) && width(out) + width(sep + kw) <= budget) {
      out = `${out}${sep}${kw}`;
    }
  }

  // 換行正規化對所有語系生效：frontmatter 的 YAML 多行區塊（description: |-）
  // 會把實體換行原封不動寫進 <meta content="...">，產生跨行的標籤。
  out = out.replace(/\s+/g, ' ').trim();

  if (!LATIN_LANGS.has(lang)) return fitDescCjk(stripMarkdown(out), SERP_DESC_MAX_W);
  return fitDesc(stripMarkdown(out), SERP_DESC_MAX);
}

/**
 * Companion category for related-posts siloing
 */
export const COMPANION_CAT: Record<string, string> = {
  '住宿推薦':      '峇里島分區攻略',
  '峇里島分區攻略': '住宿推薦',
  '簽證通關':      '新手指南',
  '新手指南':      '旅遊專題',
  '旅遊專題':      '新手指南',
  '美食景點活動':   '峇里島分區攻略',
  '遊記分享':      '美食景點活動',
  '家庭親子':      '住宿推薦',
  '叫車包車':      '峇里島分區攻略',
  '新聞存檔':      '旅遊專題',
  '套裝行程':      '美食景點活動',
};
