// 首頁 Accommodations 2×2 的置頂文章清單 —— 五個語系（zh-tw / zh-hk / zh-cn / en / id）共用這一份。
//
// 行為：
//   上面兩格每次從這份清單「隨機挑 2 篇不重複」—— 清單裡每篇都輪得到曝光。
//   下面兩格從最新 12 篇住宿推薦隨機挑，且不會跟上面兩格重複。
//   清單少於 2 篇時，不足的格子自動用隨機住宿遞補；清單留空 = 四格全隨機。
//
// 填法：
//   填文章的 slug，也就是網址 /blog/<這一段>/ 的那一段。
//   沒有設定 slug 的文章就填檔名去掉 .md（例如 '2026-06-19-013143'）。
//   置頂不受「最新 12 篇」和「住宿推薦」分類限制，任何已發佈的文章都能指定。
//   打錯字、文章未發佈或被標成 private 時會自動略過，不會開天窗（那一格改用隨機遞補）。
export const ACCOMMODATION_PINS: string[] = [
  'sanur-luxury-budget-resorts',
  'nusa-dua-resorts-guide',
  'uluwatu-bali-villas-resorts-guide',
  'jimbaran-beachfront-hotels-guide',
  'kuta-beach-hotels',
  'seminyak-beach-resorts-guide',
  'seminyak-private-villas-guide',
  'canggu-villas-guide',
  'canggu-top-hotels-guide',
  'ubud-resorts-guide',
  'ubud-villa-pool-guide',
  'ubud-treehouse-bamboo-villa-stays',
  'ayana-resort-bali-guide',
  'nusa-penida-hotels-guide',
  'nusa-lembongan-ceningan-accommodation-guide',
  'bali-family-resorts-kids-club',
  'bali-family-room-resorts',
  'bali-family-resorts-water-slides',
];
