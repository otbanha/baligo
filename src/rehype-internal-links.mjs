// 站內連結正規化：build 時把文章與 block 內容裡指向「會轉址」的站內網址，直接換成最終網址。
//
//   1. 舊日期碼網址（/blog/2026-04-02-112654/ 等）與改過名的舊 slug → 換成最終網址
//      對照表 = functions/redirect-map.json（middleware 301 用，npm run build 會先產生）
//             + public/_redirects 的靜態 301 規則
//      某語言沒有對應規則時，借用其他語言對同一個 slug 的規則再套回語言前綴
//   2. /en/、/id/ 的分類頁若寫成繁中分類值（/id/blog/category/住宿推薦/）→ 換成該語言的 slug
//
// 這些連結原本都能靠 301 到達，但站內連結指向轉址會浪費爬取、稀釋連結權重。
// 在 build 時處理而不改內容檔：改內容檔會讓 content_hash 變動、觸發重新翻譯。
//
// 同時處理 hast element 節點與 raw HTML 節點（remark-blocks 會輸出字串 <a>），
// 作法與 rehype-external-links.mjs 一致。
//
// ⚠️ 快取：Astro 只在 astro.config 的可序列化內容變動時才清掉 content layer 快取
// （node_modules/.astro/data-store.json），外掛函式本身的改動看不出來。
// 改了這支檔案的邏輯，請把 astro.config.mjs 裡傳給它的 cacheVersion 加 1，
// 否則沒改過的文章會繼續用舊的渲染結果（Cloudflare 的 build cache 也一樣）。
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { CAT_SLUGS_BY_LANG } from './lib/categorySlugs.mjs';

let redirectMap = null;
function getRedirectMap() {
  if (redirectMap) return redirectMap;
  redirectMap = {};
  try {
    Object.assign(redirectMap, JSON.parse(readFileSync(join(process.cwd(), 'functions/redirect-map.json'), 'utf-8')));
  } catch {}
  try {
    for (const line of readFileSync(join(process.cwd(), 'public/_redirects'), 'utf-8').split('\n')) {
      const m = line.trim().match(/^(\/\S*?\/)\s+(\/\S*?\/)\s+30[18]$/);   // 只取單純的「路徑 → 路徑」規則
      if (m && !m[1].includes('*') && !m[1].includes(':')) {
        let from = m[1];
        try { from = decodeURIComponent(from); } catch {}
        redirectMap[from] ??= m[2];
      }
    }
  } catch {}
  return redirectMap;
}

// slug 層級的對照（slug 各語言共用）：某語言缺規則時，借用任一語言對同一個 slug 的規則
let slugMap = null;
function getSlugMap() {
  if (slugMap) return slugMap;
  slugMap = {};
  for (const [from, to] of Object.entries(getRedirectMap())) {
    const f = from.match(/^\/(?:(?:en|zh-cn|zh-hk|id)\/)?blog\/([^/]+)\/$/);
    const t = to.match(/^\/(?:(?:en|zh-cn|zh-hk|id)\/)?blog\/([^/]+)\/$/);
    if (f && t) slugMap[f[1]] ??= t[1];
  }
  return slugMap;
}

// 目前實際存在的文章 slug：slug 層級的借用只套在「不存在的 slug」上，避免改到有效連結
let liveSlugs = null;
function getLiveSlugs() {
  if (liveSlugs) return liveSlugs;
  liveSlugs = new Set();
  const dir = join(process.cwd(), 'src/content/blog');
  try {
    for (const f of readdirSync(dir).filter(f => /\.mdx?$/.test(f))) {
      const id = f.replace(/\.mdx?$/, '');
      const slug = (readFileSync(join(dir, f), 'utf-8').match(/^slug:\s*['"]?([^'"\n]+?)['"]?\s*$/m) || [])[1];
      liveSlugs.add(slug || id);
    }
  } catch {}
  return liveSlugs;
}

// 先查該語言的完整路徑規則；沒有的話用 slug 層級對照，套回原本的語言前綴
function lookupRedirect(path) {
  const map = getRedirectMap();
  const key = path.endsWith('/') ? path : path + '/';
  if (map[key]) return map[key];
  const lm = key.match(/^(\/(?:(?:en|zh-cn|zh-hk|id)\/)?blog\/)([^/]+)\/$/);
  if (!lm || getLiveSlugs().has(lm[2])) return null;
  const to = getSlugMap()[lm[2]];
  return to ? `${lm[1]}${to}/` : null;
}

const ORIGIN = 'https://gobaligo.id';

// 有靜態分類頁的分類（與各語言 blog/category/[cat].astro 的 getStaticPaths 一致）。
// 新聞存檔沒有分類頁（由 /news/ hub 承接），所以不在這裡，?cat= 連結原樣保留。
const STATIC_CATEGORY_PAGES = new Set([
  '新手指南', '住宿推薦', '峇里島分區攻略', '簽證通關', '叫車包車', '家庭親子',
  '遊記分享', '美食景點活動', '套裝行程', '旅遊專題', '購物指南',
]);

export function resolveInternalHref(href) {
  if (typeof href !== 'string') return href;
  const hasOrigin = href.startsWith(ORIGIN + '/');
  const rel = hasOrigin ? href.slice(ORIGIN.length) : href;
  if (!rel.startsWith('/')) return href;

  const m = rel.match(/^([^?#]*)(.*)$/);
  const path = m[1];
  let rest = m[2];
  let target = null;

  // 3. /blog/?cat=住宿推薦 這類「前端篩選」網址 → 真正的 /blog/category/<slug>/ 頁
  //    內文裡有 35 篇文章這樣連（含 ?lang=tw&cat=...），而且 en / id 的連結還帶著
  //    繁中分類值。這種網址不是 canonical、內容由 JS 才長出來，爬蟲看不到文章，
  //    站內連結的權重也傳不到真正的分類頁（2026-11 稽核）。
  const filterMatch = path.match(/^\/((?:en|id|zh-cn|zh-hk)\/)?blog\/?$/);
  if (filterMatch && rest) {
    const params = new URLSearchParams(rest.replace(/^[?#]/, ''));
    const wanted = params.get('cat');
    if (wanted && !params.get('q') && !params.get('page')) {
      const prefix = filterMatch[1] ? `/${filterMatch[1].replace(/\/$/, '')}` : '';
      const lang = filterMatch[1] ? filterMatch[1].replace(/\/$/, '') : 'zh-tw';
      const slugMap = CAT_SLUGS_BY_LANG[lang];
      const seg = slugMap?.[wanted] ?? wanted;
      if (STATIC_CATEGORY_PAGES.has(wanted)) {
        return (hasOrigin ? ORIGIN : '') + `${prefix}/blog/category/${encodeURIComponent(seg)}/`;
      }
    }
  }

  const cat = path.match(/^\/(en|id)\/blog\/category\/([^/]+)\/?$/);
  if (cat) {
    let seg = cat[2];
    try { seg = decodeURIComponent(seg); } catch {}
    const slug = CAT_SLUGS_BY_LANG[cat[1]][seg];
    if (slug) target = `/${cat[1]}/blog/category/${slug}/`;
  } else if (/^\/(?:(?:en|zh-cn|zh-hk|id)\/)?blog\/[^/]+\/?$/.test(path)) {
    target = lookupRedirect(path);
  }

  if (!target) return href;
  return (hasOrigin ? ORIGIN : '') + target + rest;
}

// cacheVersion 只用來讓 Astro 的 config digest 變動（見上方說明），外掛本身不使用。
export function rehypeInternalLinks(_options = {}) {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        if (node.properties && typeof node.properties.href === 'string') {
          node.properties.href = resolveInternalHref(node.properties.href);
        }
      } else if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<a ')) {
        node.value = node.value.replace(
          /(<a\b[^>]*?\bhref=)(["'])([^"']*)\2/gi,
          (all, pre, q, href) => `${pre}${q}${resolveInternalHref(href)}${q}`,
        );
      }
      if (node.children) node.children.forEach(visit);
    };
    visit(tree);
  };
}
