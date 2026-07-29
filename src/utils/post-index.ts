import { getCollection } from 'astro:content';

type Post = Awaited<ReturnType<typeof getCollection>>[number];

/**
 * 文章集合的派生資料（分類清單／各分類篇數／分類→文章索引）在同一個 collection 內
 * 對每一頁都相同，但 .astro layout 的 frontmatter 每 render 一頁就跑一次。
 * 4300+ 頁重複掃 900 篇文章是 build 時間的一大塊，這裡用 module scope 快取算一次。
 */
export type PostIndex = {
  allPosts: Post[];
  categories: string[];
  categoryCounts: Record<string, number>;
  byCategory: Map<string, Post[]>;
};

const CATEGORY_ORDER = [
  '新手指南',
  '住宿推薦',
  '峇里島分區攻略',
  '簽證通關',
  '叫車包車',
  '家庭親子',
  '遊記分享',
  '美食景點活動',
  '新聞存檔',
];

const cache = new Map<string, Promise<PostIndex>>();

function toCats(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean) as string[];
  return v ? [v as string] : [];
}

async function build(collectionName: string): Promise<PostIndex> {
  const allPosts = await getCollection(collectionName as any);

  const byCategory = new Map<string, Post[]>();
  for (const p of allPosts) {
    for (const c of toCats(p.data.category)) {
      const list = byCategory.get(c);
      if (list) list.push(p);
      else byCategory.set(c, [p]);
    }
  }

  const seen = [...byCategory.keys()];
  const categories = [
    ...CATEGORY_ORDER.filter(c => byCategory.has(c)),
    ...seen.filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  const categoryCounts: Record<string, number> = {};
  for (const c of categories) categoryCounts[c] = byCategory.get(c)?.length ?? 0;

  return { allPosts, categories, categoryCounts, byCategory };
}

export function getPostIndex(collectionName: string): Promise<PostIndex> {
  let hit = cache.get(collectionName);
  if (!hit) {
    hit = build(collectionName);
    cache.set(collectionName, hit);
  }
  return hit;
}

/* ── 穩定亂數 ────────────────────────────────────────────────────────────
 * 相關文章以前用 Math.random() 洗牌，等於每次 build 每一頁的 HTML 都不一樣，
 * Cloudflare Pages 因此每次都要重傳全部 4300+ 個 HTML。
 * 改成以 slug 當種子：每篇文章的推薦組合依然各自不同，但跨 build 穩定，
 * 只有真正改動的頁面會被重新上傳。
 */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
