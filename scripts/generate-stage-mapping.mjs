/**
 * 掃描 src/content/blog 的所有 .md/.mdx，推測每篇文章的讀者階段（stage）
 * 與所屬區域（region），選擇性 join 流量分析 CSV，輸出 stage-mapping.json
 * 到專案根目錄供人工覆核。
 *
 * 只讀取，不寫入任何文章檔案。
 *
 * 用法：node scripts/generate-stage-mapping.mjs [./content_analytics.csv]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const blogDir = join(root, 'src/content/blog');
const outputPath = join(root, 'stage-mapping.json');

const REVIEW_TOP_N = 100;

// ── 【一】排除 ──────────────────────────────────────────────
const EXCLUDE_CATEGORIES = ['新聞存檔'];

// ── 【二】分類決定階段（命中就短路，不跟關鍵字競爭）──────────────
const CATEGORY_STAGE = {
  '簽證通關': 'decide',
  '新手指南': 'decide',
  '遊記分享': 'decide',
  '峇里島分區攻略': 'choose-area',
  '家庭親子': 'choose-area',
  '住宿推薦': 'prepare',
  '叫車包車': 'prepare',
  '旅行技巧': 'prepare',
  '美食景點活動': 'onsite',
};

// prepare + 含「旅行技巧」+ 標題或 tag 命中以下任一詞 → 改判 onsite（confidence 降為 low）
const ONSITE_OVERRIDE_KEYWORDS = [
  '超市', '購物', '伴手禮', '紀念品', '餐廳', '美食', '咖啡', '酒吧',
  '藥局', '醫院', '緊急', '天氣', '濾水', '飲水', '小費', 'spa', '按摩',
];

// ── 【三】關鍵字後備（只在文章完全沒有 category 時使用）──────────
const KEYWORD_FALLBACK_PRIORITY = ['decide', 'choose-area', 'prepare', 'onsite'];
const KEYWORD_FALLBACK = {
  decide: ['行程規劃', '區域比較', '簽證', '入境', '注意事項', '新手'],
  'choose-area': ['住哪', '住宿推薦', '飯店推薦', 'villa', '民宿', '度假村'],
  prepare: ['門票', '票券', '一日遊', '預約', '包車', '接送'],
  onsite: ['美食', '餐廳', 'spa', '水療', '按摩', '購物', '景點'],
};

// ── 【四】區域別名表（計分制）──────────────────────────────────
// 金塔馬尼是獨立區域，不可併入 ubud
const REGION_ALIASES = {
  'ubud': ['ubud', '烏布'],
  'kintamani': ['kintamani', '金塔馬尼', '巴杜'],
  'kuta': ['kuta', '庫塔'],
  'seminyak': ['seminyak', '水明漾'],
  'canggu': ['canggu', '長谷'],
  'jimbaran': ['jimbaran', '金巴蘭'],
  'uluwatu': ['uluwatu', '烏魯瓦圖'],
  'nusa-dua': ['nusa-dua', 'nusa dua', '努沙杜瓦', '南灣'],
  'sanur': ['sanur', '沙努爾'],
  'nusa-penida': ['nusa-penida', 'nusa penida', '佩尼達'],
  'lembongan': ['lembongan', '藍夢島', '倫邦岸'],
  'east-bali': ['east-bali', 'east bali', 'amed', '東峇里', '艾湄', '圖蘭奔'],
  'north': ['lovina', '羅威那'],
  'komodo': ['komodo', '科摩多'],
};

function toArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.map(String) : typeof v === 'string' ? [v] : [];
}

// 與 Astro glob loader 行為一致：無 slug frontmatter 時用檔名（去日期前綴）做 slugify
function slugifyFilename(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function computeRegionScores(title, slug, categories, tags) {
  const titleLower = (title || '').toLowerCase();
  const slugLower = (slug || '').toLowerCase();
  const catLower = categories.join(' ').toLowerCase();
  const tagLower = tags.join(' ').toLowerCase();

  const scores = {};
  for (const [regionKey, aliases] of Object.entries(REGION_ALIASES)) {
    let score = 0;
    const hitsIn = (text) => aliases.some(a => text.includes(a.toLowerCase()));
    if (hitsIn(titleLower)) score += 3;
    if (hitsIn(slugLower)) score += 1;
    if (hitsIn(catLower)) score += 1;
    if (hitsIn(tagLower)) score += 1;
    if (score > 0) scores[regionKey] = score;
  }
  return scores;
}

function pickRegion(regionScores) {
  const entries = Object.entries(regionScores);
  if (entries.length === 0) return { guessedRegion: null, multiRegion: false };
  const maxScore = Math.max(...entries.map(([, s]) => s));
  const top = entries.filter(([, s]) => s === maxScore);
  if (top.length > 1) return { guessedRegion: null, multiRegion: true };
  return { guessedRegion: top[0][0], multiRegion: false };
}

function decideStage(title, slug, categories, tags) {
  // 【二】分類決定（第一個能對應到 CATEGORY_STAGE 的分類勝出，短路、不跟關鍵字競爭）
  const catHit = categories.find(c => CATEGORY_STAGE[c]);
  if (catHit) {
    let guessedStage = CATEGORY_STAGE[catHit];
    let confidence = 'high';
    let decidedBy = catHit;
    const matchedKeywords = {};

    if (guessedStage === 'prepare' && categories.includes('旅行技巧')) {
      const titleTagHaystack = [title, ...tags].join(' ').toLowerCase();
      const overrideHits = ONSITE_OVERRIDE_KEYWORDS.filter(k => titleTagHaystack.includes(k.toLowerCase()));
      if (overrideHits.length) {
        guessedStage = 'onsite';
        confidence = 'low';
        decidedBy = `旅行技巧+override`;
        matchedKeywords.onsiteOverride = overrideHits;
      }
    }
    return { guessedStage, confidence, decidedBy, matchedKeywords };
  }

  // 【三】關鍵字後備：只在完全沒有 category 時使用
  if (categories.length === 0) {
    const haystack = [title, slug, ...tags].join(' ');
    const matchedKeywords = {};
    for (const stage of KEYWORD_FALLBACK_PRIORITY) {
      const hits = KEYWORD_FALLBACK[stage].filter(k => haystack.includes(k));
      if (hits.length) matchedKeywords[stage] = hits;
    }
    const winner = KEYWORD_FALLBACK_PRIORITY.find(s => matchedKeywords[s]?.length);
    if (winner) {
      return { guessedStage: winner, confidence: 'low', decidedBy: 'keyword-fallback', matchedKeywords };
    }
    return { guessedStage: null, confidence: 'none', decidedBy: null, matchedKeywords };
  }

  return { guessedStage: null, confidence: 'none', decidedBy: null, matchedKeywords: {} };
}

// 遊記分享 + 已鎖定單一區域（非多區）→ 改判 choose-area。
// 須在區域分數算完（pickRegion）之後才能判斷，故在主迴圈裡排在區域推測之後執行。
function applyTravelogueRegionOverride(decision, categories, guessedRegion, multiRegion) {
  if (categories.includes('遊記分享') && guessedRegion !== null && !multiRegion) {
    return { ...decision, guessedStage: 'choose-area', confidence: 'low', decidedBy: 'category+region' };
  }
  return decision;
}

// 標題或 slug 命中在地消費/日常需求類關鍵字 → 強制 onsite（蓋過先前所有判定）
const ONSITE_FORCE_KEYWORDS = [
  '超市', 'supermarket', 'spa', '按摩', '水療', '伴手禮', '紀念品', '藥局', '濾水', '餐廳', '美食',
];
// 標題或 slug 命中行程／團體旅遊類關鍵字 → 強制 prepare（蓋過先前所有判定，含遊記+region 的 choose-area）
// 「日遊」「行程」太廣會誤抓規劃期文章，已排除
const PREPARE_FORCE_KEYWORDS = [
  '一日遊', '跳島', '套裝', 'package', 'tour',
];

function applyForcedKeywordOverrides(decision, title, slug) {
  const haystack = [title, slug].join(' ').toLowerCase();
  let result = decision;

  if (ONSITE_FORCE_KEYWORDS.some(k => haystack.includes(k.toLowerCase()))) {
    result = { ...result, guessedStage: 'onsite', decidedBy: 'onsite-forced' };
  }
  if (PREPARE_FORCE_KEYWORDS.some(k => haystack.includes(k.toLowerCase()))) {
    result = { ...result, guessedStage: 'prepare', decidedBy: 'prepare-forced' };
  }
  return result;
}

// ── 【五】join 流量資料 ──────────────────────────────────────
function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function toNumber(v) {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const LOCALE_PREFIXES = ['/zh-cn/', '/zh-hk/', '/en/', '/id/'];

function loadVisits(csvPath) {
  const map = new Map();
  if (!csvPath || !existsSync(csvPath)) {
    return { map, joined: false };
  }

  const raw = readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return { map, joined: false };

  const header = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const pageIdx = header.indexOf('page');
  const visitsIdx = header.indexOf('visits');
  const earningsIdx = header.indexOf('potential_earnings');
  if (pageIdx === -1) return { map, joined: false };

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const page = (fields[pageIdx] || '').trim();
    if (!page) continue;
    if (LOCALE_PREFIXES.some(p => page.startsWith(p))) continue;

    const m = page.match(/\/blog\/([^/?#]+)/);
    if (!m) continue;
    const slug = m[1];

    const visits = visitsIdx !== -1 ? toNumber(fields[visitsIdx]) : 0;
    const earnings = earningsIdx !== -1 ? toNumber(fields[earningsIdx]) : 0;

    const existing = map.get(slug);
    if (existing) {
      existing.visits += visits;
      existing.earnings += earnings;
    } else {
      map.set(slug, { visits, earnings });
    }
  }
  return { map, joined: true };
}

// ── 主流程 ────────────────────────────────────────────────
const csvArg = process.argv[2];
const csvPath = csvArg ? (isAbsolute(csvArg) ? csvArg : join(process.cwd(), csvArg)) : null;
const { map: visitsMap, joined: analyticsJoined } = loadVisits(csvPath);

const files = readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

const results = [];
let excludedArticles = 0;
const stageCounts = { decide: 0, 'choose-area': 0, prepare: 0, onsite: 0, unmatched: 0 };
const regionCounts = {};

for (const file of files) {
  const raw = readFileSync(join(blogDir, file), 'utf-8');
  const { data } = matter(raw);

  const id = file.replace(/\.mdx?$/, '');
  const slug = data.slug || slugifyFilename(id);
  const title = data.title || '';
  const categories = toArray(data.category);
  const tags = toArray(data.tags);

  if (categories.some(c => EXCLUDE_CATEGORIES.includes(c))) {
    excludedArticles++;
    continue;
  }

  // 區域推測要先算完，階段判定裡的 category+region override 才有 guessedRegion 可用
  const regionScores = computeRegionScores(title, slug, categories, tags);
  const { guessedRegion, multiRegion } = pickRegion(regionScores);

  const primaryDecision = decideStage(title, slug, categories, tags);
  const regionOverridden = applyTravelogueRegionOverride(primaryDecision, categories, guessedRegion, multiRegion);
  const { guessedStage, confidence, decidedBy, matchedKeywords } =
    applyForcedKeywordOverrides(regionOverridden, title, slug);

  if (guessedStage) stageCounts[guessedStage]++;
  else stageCounts.unmatched++;
  if (guessedRegion) regionCounts[guessedRegion] = (regionCounts[guessedRegion] || 0) + 1;

  const av = visitsMap.get(slug);
  const visits = av ? av.visits : 0;
  const earnings = av ? av.earnings : 0;

  results.push({
    file,
    slug,
    title,
    category: categories,
    guessedStage,
    confidence,
    decidedBy,
    matchedKeywords,
    guessedRegion,
    multiRegion,
    regionScores,
    visits,
    earnings,
    needsReview: false, // 排序後再依 REVIEW_TOP_N 覆寫
  });
}

// ── 【六】輸出 ────────────────────────────────────────────
results.sort((a, b) => b.visits - a.visits);
results.forEach((r, i) => { r.needsReview = i < REVIEW_TOP_N; });

const unmatchedVisits = results
  .filter(r => r.guessedStage === null)
  .reduce((sum, r) => sum + r.visits, 0);

const output = {
  generatedAt: new Date().toISOString(),
  totalArticles: results.length,
  excludedArticles,
  analyticsJoined,
  reviewTopN: REVIEW_TOP_N,
  stageCounts,
  regionCounts,
  unmatchedVisits,
  articles: results,
};

writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

const top100LowConfidence = results.slice(0, REVIEW_TOP_N).filter(r => r.confidence !== 'high').length;

console.log(`已掃描 ${results.length} 篇文章（排除新聞存檔 ${excludedArticles} 篇）→ ${outputPath}`);
console.log('analyticsJoined：', analyticsJoined);
console.log('stageCounts：', stageCounts);
console.log('regionCounts：', regionCounts);
console.log('unmatchedVisits：', unmatchedVisits);
console.log(`前 ${REVIEW_TOP_N} 篇（依 visits 排序）中 confidence 非 high 的篇數：`, top100LowConfidence);
