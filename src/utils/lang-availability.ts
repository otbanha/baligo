import { getCollection } from 'astro:content';

/**
 * 建置時計算每個 slug 實際存在哪些語言版本，避免 hreflang 指向不存在的頁面（404）。
 * 結果以 module-level 快取，整個 build 只計算一次。
 */
let cache: Map<string, Set<string>> | null = null;

const COLLECTIONS: Array<[lang: string, collection: string]> = [
  ['zh-tw', 'blog'],
  ['zh-hk', 'zh-hk'],
  ['zh-cn', 'zh-cn'],
  ['en', 'en'],
  ['id', 'id'],
];

export async function getLangAvailability(): Promise<Map<string, Set<string>>> {
  if (cache) return cache;
  const map = new Map<string, Set<string>>();
  for (const [lang, collection] of COLLECTIONS) {
    const posts = await getCollection(collection as any);
    for (const p of posts) {
      const slug = (p.data as any).slug || p.id;
      if (!map.has(slug)) map.set(slug, new Set());
      map.get(slug)!.add(lang);
    }
  }
  cache = map;
  return map;
}

/** 取得某 slug 實際存在的語言集合（找不到時回傳全部語言，安全 fallback）。 */
export async function getAvailableLangs(slug: string): Promise<Set<string>> {
  const map = await getLangAvailability();
  return map.get(slug) ?? new Set(['zh-tw', 'zh-hk', 'zh-cn', 'en', 'id']);
}
