// 分類頁網址 slug 的單一來源（key 為繁中分類值）。
// en / id 用各自語言的 slug，其餘語言沿用繁中分類值原文。
// 使用者：src/lib/categoryConfig.ts、astro.config.mjs（sitemap hreflang）、src/rehype-internal-links.mjs。
// 改 slug 時記得在 public/_redirects 補舊網址 301。

export const CAT_SLUG_EN = {
  '新手指南': 'beginners-guide',
  '住宿推薦': 'accommodation',
  '峇里島分區攻略': 'area-guide',
  '簽證通關': 'visa-entry',
  '叫車包車': 'transport',
  '家庭親子': 'family-travel',
  '遊記分享': 'travel-stories',
  '美食景點活動': 'food-activities',
  '套裝行程': 'package-tours',
  '購物指南': 'shopping',
};

// 2026-10 起印尼文分類頁改用印尼文 slug（舊的繁中值網址在 public/_redirects 301 過來）
export const CAT_SLUG_ID = {
  '新手指南': 'panduan-pemula',
  '住宿推薦': 'akomodasi',
  '峇里島分區攻略': 'panduan-area',
  '簽證通關': 'visa-imigrasi',
  '叫車包車': 'transportasi',
  '家庭親子': 'liburan-keluarga',
  '遊記分享': 'cerita-traveling',
  '美食景點活動': 'makanan-aktivitas',
  '套裝行程': 'paket-wisata',
  '購物指南': 'belanja',
};

export const CAT_SLUGS_BY_LANG = { en: CAT_SLUG_EN, id: CAT_SLUG_ID };
