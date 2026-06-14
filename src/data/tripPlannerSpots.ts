/**
 * Trip Planner — 景點主資料 (Spot[])
 *
 * 涵蓋 TripPlannerContent.astro 中 ALL_SPOTS_DATA / i18n spot 標籤所列的約 80 個景點。
 * 每個景點的 id 對應原本 chip 的 data-val（例如 u_palace、k_surf、ji_gwk…），
 * 讓 generateItinerary() 可以直接吃使用者勾選的 spotIds。
 *
 * ⚠️ 注意：durationHours / bestTime / audience / intensity 目前皆為「合理預設值」，
 *    係依景點性質估算，尚未經人工逐筆審核。後續可由在地編輯校正。
 *    travel/交通時間請見 regionTravelMatrix.ts。
 *
 * name 採用 zh-TW 既有標籤（與 TripPlannerContent.astro 的 i18n 標籤一致）。
 * blogUrl 取自 ALL_SPOTS_DATA[key].url（站內 /blog/ 連結或 YouTube/Klook 外連）。
 */

export type RegionId =
  | 'ubud'
  | 'kuta'
  | 'seminyak'
  | 'canggu'
  | 'jimbaran'
  | 'uluwatu'
  | 'nusa-dua'
  | 'sanur'
  | 'nusa-penida'
  | 'lembongan'
  | 'east-bali'
  | 'komodo';

export type Audience = 'solo' | 'couple' | 'family' | 'friends' | 'elderly' | 'group';

export type SlotTime = 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'evening';

export interface Spot {
  /** 對應 TripPlannerContent.astro chip 的 data-val（如 u_palace、k_surf） */
  id: string;
  /** zh-TW 顯示名稱 */
  name: string;
  region: RegionId;
  /** 預估停留時數（估算值，含景點本身體驗，不含區間交通） */
  durationHours: number;
  /** 最適合的時段 */
  bestTime: SlotTime | 'any';
  /** 適合的同行對象 */
  audience: Audience[];
  /** 強度：1 輕鬆、2 中等、3 高強度（長輩不排 3） */
  intensity: 1 | 2 | 3;
  /** 是否為整天行程（佩尼達/藍夢/科摩多跳島、火山日出等） */
  isFullDay?: boolean;
  /**
   * 限定可排入的時段（例如日出限定、日落限定、晚上才開放等）。
   * 若有設定，景點只會被排進這些時段；若這些時段當天都已被佔用，則該景點不排入。
   * 未設定者視為彈性景點，可排入 bestTime 或任一剩餘時段。
   */
  allowedTimes?: SlotTime[];
  /** 站內深入攻略連結（部分為 YouTube / Klook 外連） */
  blogUrl?: string;
  /** Klook 搜尋關鍵字（預留欄位，目前多為空） */
  klookKeyword?: string;
  notes?: string;
}

/**
 * 約 80 個景點。durationHours/bestTime/audience/intensity 為估算預設值。
 */
export const tripPlannerSpots: Spot[] = [
  // ── Ubud ──────────────────────────────────────────────────────────
  { id: 'u_palace', name: '烏布皇宮', region: 'ubud', durationHours: 1, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/ubud-royal-palace-tour-guide/' },
  { id: 'u_market', name: '烏布市場', region: 'ubud', durationHours: 1, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'family', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/ubud-art-markets-guide/' },
  { id: 'u_tirta', name: '聖泉寺', region: 'ubud', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/tirta-empul-temple-guide/' },
  { id: 'u_monkey', name: '聖猴森林', region: 'ubud', durationHours: 1.5, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-monkey-safety-tips/' },
  { id: 'u_terraces', name: '烏布梯田', region: 'ubud', durationHours: 1.5, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-rice-terraces-comparison/' },
  { id: 'u_skywalk', name: '烏布天空步道', region: 'ubud', durationHours: 2, bestTime: 'sunrise', audience: ['solo', 'couple', 'friends', 'group'], intensity: 2, allowedTimes: ['sunrise', 'morning'], blogUrl: '/blog/ubud-campuhan-ridge-walk/' },
  { id: 'u_coffee', name: '火山咖啡', region: 'ubud', durationHours: 1, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/batur-lake-volcano-guide/' },
  { id: 'u_zoo', name: '峇里島野生動物園', region: 'ubud', durationHours: 4, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-safari-night-experience/' },
  { id: 'u_waterfall', name: '瀑布探秘', region: 'ubud', durationHours: 3, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/ubud-waterfalls-guide/' },
  { id: 'u_fairy', name: '仙女園', region: 'ubud', durationHours: 1.5, bestTime: 'morning', audience: ['couple', 'friends', 'group', 'solo'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/taman-dedari-ubud-food-scenery/' },
  { id: 'u_junglepool', name: '烏布叢林泳池俱樂部', region: 'ubud', durationHours: 3, bestTime: 'afternoon', audience: ['couple', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/wanna-jungle-pool-club-ubud/' },
  { id: 'u_jeep', name: '日出火山吉普車', region: 'ubud', durationHours: 6, bestTime: 'sunrise', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, isFullDay: true, allowedTimes: ['sunrise'], blogUrl: '/blog/batur-volcano-jeep-sunrise-tour/' },
  { id: 'u_sunsetjeep', name: '日落吉普車', region: 'ubud', durationHours: 6, bestTime: 'afternoon', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, isFullDay: true, allowedTimes: ['afternoon'], blogUrl: '/blog/batur-volcano-sunset-jeep-tour/' },
  { id: 'u_singing', name: '頌缽音療', region: 'ubud', durationHours: 1.5, bestTime: 'afternoon', audience: ['solo', 'couple', 'elderly'], intensity: 1, allowedTimes: ['afternoon'], blogUrl: '/blog/ubud-sound-healing/' },
  { id: 'u_swing', name: '叢林鞦韆', region: 'ubud', durationHours: 1.5, bestTime: 'morning', audience: ['couple', 'friends', 'group', 'solo'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/ubud-jungle-swings-photo-guide/' },
  { id: 'u_mario', name: '叢林瑪利歐賽車', region: 'ubud', durationHours: 1.5, bestTime: 'afternoon', audience: ['friends', 'family', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/ubud-jungle-cart-adventure/' },
  { id: 'su_food', name: '想吃烏布美食', region: 'ubud', durationHours: 1.5, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, blogUrl: '/blog/ubud-food-guide/', klookKeyword: 'ubud food' },
  { id: 'u_spa', name: '烏布SPA', region: 'ubud', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },
  { id: 'u_penglipuran', name: 'Penglipuran 傳統村落', region: 'ubud', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/penglipuran-village-bali-experience/' },
  { id: 'u_cave_rafting', name: '洞穴漂流河', region: 'ubud', durationHours: 3, bestTime: 'morning', audience: ['friends', 'group', 'solo'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/nukuwera-river-tubing-adventure/' },
  { id: 'su_bird_park', name: '峇里島鳥園', region: 'ubud', durationHours: 3, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-bird-park-guide/' },
  { id: 'su_reptile_park', name: '峇里島爬蟲公園', region: 'ubud', durationHours: 2, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/Bali-Reptile-Park/' },
  { id: 'rafting', name: '泛舟激流', region: 'ubud', durationHours: 4, bestTime: 'morning', audience: ['friends', 'group', 'solo', 'couple'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-rafting-ayung-telaga-waja/' },
  { id: 'atv', name: 'ATV叢林越野', region: 'ubud', durationHours: 3, bestTime: 'morning', audience: ['friends', 'group', 'solo', 'couple'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-atv-adventure-guide/' },

  // ── Kuta ──────────────────────────────────────────────────────────
  { id: 'k_surf', name: '庫塔海灘學衝浪', region: 'kuta', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/2026-bali-water-activities/' },
  { id: 'k_waterbom', name: 'Waterbom 水上樂園', region: 'kuta', durationHours: 5, bestTime: 'morning', audience: ['family', 'friends', 'group', 'couple'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/waterbom-bali-water-park-guide/' },
  { id: 'k_beachwalk', name: 'Beachwalk 購物中心', region: 'kuta', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://youtu.be/IReL1ztxL7c' },
  { id: 'k_turtle', name: '海龜中心', region: 'kuta', durationHours: 1, bestTime: 'morning', audience: ['family', 'friends', 'group', 'couple'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-turtle-watching-guide/' },
  { id: 'k_beerbus', name: '庫塔啤酒巴士', region: 'kuta', durationHours: 2, bestTime: 'evening', audience: ['friends', 'group'], intensity: 2, allowedTimes: ['evening'], blogUrl: '/blog/kuta-beer-on-wheels-bali/' },
  { id: 'k_food', name: '庫塔美食', region: 'kuta', durationHours: 1.5, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, blogUrl: '/blog/kuta-best-food-guide/' },
  { id: 'k_spa', name: 'SPA按摩', region: 'kuta', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },
  { id: 'k_trans', name: 'Trans Studio Bali', region: 'kuta', durationHours: 6, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning'], blogUrl: '/blog/trans-studio-bali/' },

  // ── Seminyak ──────────────────────────────────────────────────────
  { id: 'se_daytour', name: '水明漾一日遊', region: 'seminyak', durationHours: 6, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/seminyak-day-trip-guide/' },
  { id: 'se_surf', name: '水明漾衝浪', region: 'seminyak', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-surf-beaches-guide/' },
  { id: 'se_food', name: '水明漾美食', region: 'seminyak', durationHours: 1.5, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, blogUrl: '/blog/seminyak-restaurants-food-guide/' },
  { id: 'se_club', name: '水明漾五大夜店', region: 'seminyak', durationHours: 3, bestTime: 'evening', audience: ['friends', 'group', 'couple', 'solo'], intensity: 2, allowedTimes: ['evening'], blogUrl: '/blog/seminyak-nightclubs-guide/' },
  { id: 'se_spa', name: 'SPA按摩', region: 'seminyak', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },

  // ── Canggu ────────────────────────────────────────────────────────
  { id: 'cg_tanah', name: '海神廟（Tanah Lot）', region: 'canggu', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-tanah-lot-guide/' },
  { id: 'cg_labrisa', name: 'La Brisa 最美餐廳', region: 'canggu', durationHours: 2, bestTime: 'sunset', audience: ['couple', 'friends', 'group', 'solo'], intensity: 1, allowedTimes: ['sunset'], blogUrl: '/blog/canggu-la-brisa-restaurant-guide/' },
  { id: 'cg_horse', name: '沙灘騎馬', region: 'canggu', durationHours: 1, bestTime: 'sunset', audience: ['couple', 'family', 'friends', 'group'], intensity: 2, allowedTimes: ['afternoon', 'sunset'], blogUrl: 'https://www.klook.com/zh-TW/activity/77068-horse-riding-combo-experience-bali-trip-premium/' },
  { id: 'cg_nuanu', name: 'Nuanu Creative City', region: 'canggu', durationHours: 3, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/nuanu-creative-city-luna-guide/' },
  { id: 'cg_surf', name: '長谷衝浪', region: 'canggu', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-surf-beaches-guide/' },
  { id: 'cg_spa', name: 'SPA按摩', region: 'canggu', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },

  // ── Jimbaran ──────────────────────────────────────────────────────
  { id: 'ji_gwk', name: '神鷹文化廣場（GWK）', region: 'jimbaran', durationHours: 2.5, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon', 'sunset'], blogUrl: '/blog/gwk-cultural-park-bali/' },
  { id: 'ji_rockbar', name: '預約 Rock Bar', region: 'jimbaran', durationHours: 2, bestTime: 'sunset', audience: ['couple', 'friends', 'group', 'solo'], intensity: 1, allowedTimes: ['sunset'], blogUrl: '/blog/bali-rock-bar-reservation-guide/' },
  { id: 'ji_seafood', name: '夕陽海鮮餐廳', region: 'jimbaran', durationHours: 2, bestTime: 'sunset', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['sunset'], blogUrl: '/blog/jimbaran-seafood-restaurants-list/' },
  { id: 'ji_shopping', name: '金巴蘭逛街', region: 'jimbaran', durationHours: 1.5, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://youtu.be/RodQvCZKwD0' },
  { id: 'ji_annspa', name: '台灣老闆娘五星SPA', region: 'jimbaran', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/ann-spa-jimbaran/' },
  { id: 'ji_spa', name: 'SPA按摩', region: 'jimbaran', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },

  // ── Uluwatu ───────────────────────────────────────────────────────
  { id: 'ul_temple', name: '烏魯瓦圖廟', region: 'uluwatu', durationHours: 2, bestTime: 'sunset', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['afternoon', 'sunset'], blogUrl: '/blog/uluwatu-temple-travel-guide/' },
  { id: 'ul_kecak', name: '震撼火舞（Kecak）', region: 'uluwatu', durationHours: 1.5, bestTime: 'sunset', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['sunset'], blogUrl: '/blog/kecak-fire-dance-bali/' },
  { id: 'ul_oneeighty', name: 'Oneeighty 懸崖泳池', region: 'uluwatu', durationHours: 3, bestTime: 'afternoon', audience: ['couple', 'friends', 'group', 'solo'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/oneeighty-dayclub-uluwatu-pool/' },
  { id: 'ul_highway', name: '藍色/斷崖公路', region: 'uluwatu', durationHours: 1.5, bestTime: 'afternoon', audience: ['solo', 'couple', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/batu-barak-cliff-road/' },
  { id: 'ul_beach', name: '秘境沙灘探索', region: 'uluwatu', durationHours: 3, bestTime: 'afternoon', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-hidden-beaches-guide/' },
  { id: 'ul_paraglide', name: '玩滑翔翼', region: 'uluwatu', durationHours: 1, bestTime: 'afternoon', audience: ['friends', 'group', 'solo', 'couple'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/uluwatu-paragliding-ocean-view/' },
  { id: 'ul_vw', name: 'VW敞篷車觀光', region: 'uluwatu', durationHours: 2, bestTime: 'afternoon', audience: ['couple', 'friends', 'group', 'family'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://www.klook.com/zh-TW/activity/74691-vw-safari-tour-uluwatu-bali/' },
  { id: 'ul_surf', name: '衝浪課程', region: 'uluwatu', durationHours: 2, bestTime: 'morning', audience: ['solo', 'friends', 'group'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://www.klook.com/zh-TW/activity/105831-surfing-lesson-cakrawala-asia-uluwatu-bali/' },
  { id: 'ul_spa', name: 'SPA按摩', region: 'uluwatu', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },

  // ── Nusa Dua ──────────────────────────────────────────────────────
  { id: 'nd_buffet', name: '五星餐廳吃到飽', region: 'nusa-dua', durationHours: 2, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['evening'], blogUrl: '/blog/nusa-dua-guide/' },
  { id: 'nd_lobster', name: '龍蝦先生海鮮大餐', region: 'nusa-dua', durationHours: 2, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['evening'], blogUrl: '/blog/mr-lobster-seafood-restaurant-bali/' },
  { id: 'nd_bali_collection', name: 'Bali Collection 購物', region: 'nusa-dua', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://youtu.be/3AqPucmnSLE' },
  { id: 'nd_watersport', name: '水上活動大本營', region: 'nusa-dua', durationHours: 4, bestTime: 'morning', audience: ['family', 'friends', 'group', 'couple'], intensity: 3, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/tanjung-benoa-water-activities/' },
  { id: 'nd_devdan', name: 'Devdan Show 天譚秀', region: 'nusa-dua', durationHours: 2, bestTime: 'evening', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['evening'], blogUrl: '/blog/devdan-show-nusa-dua/' },
  { id: 'nd_turtle_island', name: '海龜島+玻璃船', region: 'nusa-dua', durationHours: 3, bestTime: 'morning', audience: ['family', 'friends', 'group', 'couple'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://www.klook.com/zh-TW/activity/59606-turtle-island-glass-bottom-boat-mangrove-cruise-bali/' },
  { id: 'nd_spa', name: 'SPA按摩', region: 'nusa-dua', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },
  { id: 'nd_snorkel', name: '（兒童）浮潛', region: 'nusa-dua', durationHours: 2, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://www.klook.com/zh-TW/activity/53090-snorkeling-nusa-dua-bali/' },

  // ── Sanur ─────────────────────────────────────────────────────────
  { id: 'sa_icon', name: 'Icon Bali 購物中心', region: 'sanur', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/icon-bali-shopping-mall-sanur/' },
  { id: 'sa_cycling', name: '海灘日出自行車', region: 'sanur', durationHours: 3, bestTime: 'sunrise', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 2, allowedTimes: ['sunrise'], blogUrl: 'https://www.klook.com/zh-TW/activity/72445-bali-sanur-beach-sunrise-half-day-trip/' },
  { id: 'sa_turtle', name: '海龜中心', region: 'sanur', durationHours: 1, bestTime: 'morning', audience: ['family', 'friends', 'group', 'couple'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-turtle-watching-guide/' },
  { id: 'sa_fishing', name: '出海釣魚', region: 'sanur', durationHours: 4, bestTime: 'morning', audience: ['friends', 'group', 'family'], intensity: 2, allowedTimes: ['sunrise', 'morning'], blogUrl: 'https://www.klook.com/zh-TW/activity/57653-bali-fishing-trip/' },
  { id: 'sa_aerox', name: 'AeroXSpace 室內遊樂場', region: 'sanur', durationHours: 3, bestTime: 'afternoon', audience: ['family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/aeroxspace-sanur-indoor-playground/' },
  { id: 'sa_climbing', name: "Clip'n'Climb 攀岩", region: 'sanur', durationHours: 2, bestTime: 'afternoon', audience: ['family', 'friends', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/clip-n-climb-sanur-bali/' },
  { id: 'sa_spa', name: 'SPA按摩', region: 'sanur', durationHours: 2, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['afternoon', 'evening'], blogUrl: '/blog/spa/' },
  { id: 'sa_snorkel', name: '離岸浮潛', region: 'sanur', durationHours: 3, bestTime: 'morning', audience: ['friends', 'group', 'couple', 'solo'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: 'https://www.klook.com/zh-TW/activity/134495-snorkeling-experience-in-sanur-coastal/' },
  { id: 'sa_marine', name: 'Bali Exotic Marine Park', region: 'sanur', durationHours: 2, bestTime: 'morning', audience: ['family', 'friends', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/Bali-Exotic-Marine-Park/' },
  { id: 'sa_biggarden', name: 'Big Garden Corner', region: 'sanur', durationHours: 1, bestTime: 'afternoon', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 1, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/sanur-guide/#big-garden-corner-bali%E5%9C%B0%E5%9C%96' },

  // ── Nusa Penida（整天跳島） ────────────────────────────────────────
  { id: 'np_snorkel', name: '佩尼達浮潛一日遊', region: 'nusa-penida', durationHours: 9, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, isFullDay: true, blogUrl: '/blog/nusa-penida-snorkeling-guide/', notes: '需搭快艇，建議整天，請見跳島攻略' },
  { id: 'np_tour', name: '佩尼達景點一日遊', region: 'nusa-penida', durationHours: 9, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 3, isFullDay: true, blogUrl: '/blog/nusa-penida-guide/', notes: '惡魔的眼淚、Kelingking 等需搭快艇整天' },

  // ── Nusa Lembongan（整天跳島） ────────────────────────────────────
  { id: 'nl_tour', name: '藍夢島一日遊', region: 'lembongan', durationHours: 9, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 2, isFullDay: true, blogUrl: '/blog/nusa-lembongan-ceningan-guide/', notes: '需搭快艇，建議整天' },

  // ── East Bali（多為一日遊，車程遠） ───────────────────────────────
  { id: 'eb_lempuyang', name: '天空之門 Lempuyang', region: 'east-bali', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'group'], intensity: 3, allowedTimes: ['sunrise', 'morning'], blogUrl: '/blog/lempuyang-temple-gate-of-heaven/', notes: '需早起，排隊久' },
  { id: 'eb_tirta', name: '恆河聖泉 Tirta Gangga', region: 'east-bali', durationHours: 2, bestTime: 'morning', audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'], intensity: 2, allowedTimes: ['morning', 'afternoon'], blogUrl: '/blog/bali-tirta-gangga-empul/' },
  { id: 'volcano', name: '火山健行', region: 'east-bali', durationHours: 7, bestTime: 'sunrise', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, isFullDay: true, allowedTimes: ['sunrise'], blogUrl: '/blog/batur-lake-volcano-guide/', notes: '巴杜爾火山日出登山，凌晨出發' },

  // ── Komodo（多日專程） ────────────────────────────────────────────
  { id: 'ko_tour', name: '科摩多島跳島行程', region: 'komodo', durationHours: 9, bestTime: 'morning', audience: ['solo', 'couple', 'friends', 'group'], intensity: 3, isFullDay: true, blogUrl: '/blog/komodo-island-labuan-bajo-travel/', notes: '需飛 Labuan Bajo，建議專程 3 天以上' },
];

/** 依 id 快速查表 */
export const spotById: Record<string, Spot> = Object.fromEntries(
  tripPlannerSpots.map((s) => [s.id, s]),
);

/** 取得某區所有景點 */
export function spotsByRegion(region: RegionId): Spot[] {
  return tripPlannerSpots.filter((s) => s.region === region);
}
