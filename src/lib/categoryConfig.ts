// 多語言部落格「分類頁」設定（en / zh-cn / zh-hk / id 共用）
// 注意：繁中（zh-tw）有自己的 src/pages/blog/category/[cat].astro，富設定維護在那邊；
// 本模組提供其餘 4 語言的分類頁設定，並集中管理 hreflang cluster 用的語言中繼資料。
// 文章的 category 值一律為繁中（例：住宿推薦），各語言只 overlay 標題/描述，不影響分類比對。

export type Lang = 'zh-tw' | 'zh-hk' | 'zh-cn' | 'en' | 'id';

// hreflang cluster 用：所有語言的分類頁網址（指向真實 /blog/category/ 頁，非 ?cat=）
export const HREFLANG_LANGS: Lang[] = ['zh-tw', 'zh-hk', 'zh-cn', 'en', 'id'];

export const LANG_META: Record<Lang, {
  htmlLang: string; ogLocale: string; hreflang: string; urlPrefix: string;
}> = {
  'zh-tw': { htmlLang: 'zh-TW', ogLocale: 'zh_TW', hreflang: 'zh-TW', urlPrefix: '' },
  'zh-hk': { htmlLang: 'zh-HK', ogLocale: 'zh_HK', hreflang: 'zh-HK', urlPrefix: 'zh-hk' },
  'zh-cn': { htmlLang: 'zh-CN', ogLocale: 'zh_CN', hreflang: 'zh-CN', urlPrefix: 'zh-cn' },
  'en':    { htmlLang: 'en',    ogLocale: 'en_US', hreflang: 'en',    urlPrefix: 'en' },
  'id':    { htmlLang: 'id',    ogLocale: 'id_ID', hreflang: 'id',    urlPrefix: 'id' },
};

// 語言前綴路徑（path 不含開頭斜線）
export function lp(lang: Lang, path: string): string {
  const pre = LANG_META[lang].urlPrefix;
  return pre ? `/${pre}/${path}` : `/${path}`;
}

// 分類頁 canonical（含結尾斜線、cat 編碼）
export function categoryUrl(lang: Lang, cat: string): string {
  return `https://gobaligo.id${lp(lang, `blog/category/${encodeURIComponent(cat)}/`)}`;
}

// 各語言分類顯示名稱（key 為繁中分類值）
const CAT_LABEL: Record<Lang, Record<string, string>> = {
  'zh-tw': {
    '新手指南': '新手指南', '住宿推薦': '住宿推薦', '峇里島分區攻略': '峇里島分區攻略',
    '簽證通關': '簽證通關', '叫車包車': '叫車包車', '家庭親子': '家庭親子',
    '遊記分享': '遊記分享', '美食景點活動': '美食景點活動', '新聞存檔': '新聞存檔', '旅行技巧': '旅行技巧',
  },
  'zh-hk': {
    '新手指南': '新手指南', '住宿推薦': '住宿推薦', '峇里島分區攻略': '峇里島分區攻略',
    '簽證通關': '簽證通關', '叫車包車': '叫車包車', '家庭親子': '家庭親子',
    '遊記分享': '遊記分享', '美食景點活動': '美食景點活動', '新聞存檔': '新聞存檔', '旅行技巧': '旅行技巧',
  },
  'zh-cn': {
    '新手指南': '新手指南', '住宿推薦': '住宿推荐', '峇里島分區攻略': '巴厘岛分区攻略',
    '簽證通關': '签证通关', '叫車包車': '叫车包车', '家庭親子': '家庭亲子',
    '遊記分享': '游记分享', '美食景點活動': '美食景点活动', '新聞存檔': '新闻存档', '旅行技巧': '旅行技巧',
  },
  'en': {
    '新手指南': "Beginner's Guide", '住宿推薦': 'Accommodation', '峇里島分區攻略': 'Area Guide',
    '簽證通關': 'Visa & Entry', '叫車包車': 'Transport', '家庭親子': 'Family Travel',
    '遊記分享': 'Travel Stories', '美食景點活動': 'Food & Activities', '新聞存檔': 'News Archive', '旅行技巧': 'Travel Tips',
  },
  'id': {
    '新手指南': 'Panduan Pemula', '住宿推薦': 'Akomodasi', '峇里島分區攻略': 'Panduan Area',
    '簽證通關': 'Visa & Imigrasi', '叫車包車': 'Transportasi', '家庭親子': 'Liburan Keluarga',
    '遊記分享': 'Cerita Traveling', '美食景點活動': 'Makanan & Aktivitas', '新聞存檔': 'Arsip Berita', '旅行技巧': 'Tips Traveling',
  },
};

export function catLabel(lang: Lang, cat: string): string {
  return CAT_LABEL[lang]?.[cat] ?? cat;
}

// 介面文字（依語言）
type UI = {
  home: string;
  h1: (label: string, count: number) => string;
  faqHeading: (label: string) => string;
  more: (label: string) => string;
  back: (label: string) => string;
  itemListName: (label: string) => string;
  collectionName: (label: string) => string;
  allArticles: string;
};

export const UI: Record<Lang, UI> = {
  'zh-tw': {
    home: '首頁',
    h1: (l, c) => `峇里島${l}｜${c} 篇完整攻略`,
    faqHeading: (l) => `❓ ${l}常見問題`,
    more: (l) => `更多${l}文章`,
    back: (l) => `← 在分類頁瀏覽所有${l}文章（含搜尋與篩選）`,
    itemListName: (l) => `峇里島${l}精選攻略`,
    collectionName: (l) => `峇里島${l}`,
    allArticles: '全部文章',
  },
  'zh-hk': {
    home: '首頁',
    h1: (l, c) => `峇里島${l}｜${c} 篇完整攻略`,
    faqHeading: (l) => `❓ ${l}常見問題`,
    more: (l) => `更多${l}文章`,
    back: (l) => `← 喺分類頁睇晒所有${l}文章（連搜尋同篩選）`,
    itemListName: (l) => `峇里島${l}精選攻略`,
    collectionName: (l) => `峇里島${l}`,
    allArticles: '全部文章',
  },
  'zh-cn': {
    home: '首页',
    h1: (l, c) => `巴厘岛${l}｜${c} 篇完整攻略`,
    faqHeading: (l) => `❓ ${l}常见问题`,
    more: (l) => `更多${l}文章`,
    back: (l) => `← 在分类页浏览所有${l}文章（含搜索与筛选）`,
    itemListName: (l) => `巴厘岛${l}精选攻略`,
    collectionName: (l) => `巴厘岛${l}`,
    allArticles: '全部文章',
  },
  'en': {
    home: 'Home',
    h1: (l, c) => `Bali ${l} — ${c} In-Depth Guides`,
    faqHeading: (l) => `❓ ${l} FAQ`,
    more: (l) => `More ${l} Articles`,
    back: (l) => `← Browse all ${l} articles (with search & filters)`,
    itemListName: (l) => `Featured Bali ${l} Guides`,
    collectionName: (l) => `Bali ${l}`,
    allArticles: 'All Articles',
  },
  'id': {
    home: 'Beranda',
    h1: (l, c) => `${l} Bali — ${c} Panduan Lengkap`,
    faqHeading: (l) => `❓ Tanya Jawab ${l}`,
    more: (l) => `Artikel ${l} Lainnya`,
    back: (l) => `← Lihat semua artikel ${l} (dengan pencarian & filter)`,
    itemListName: (l) => `Panduan ${l} Bali Pilihan`,
    collectionName: (l) => `${l} Bali`,
    allArticles: 'Semua Artikel',
  },
};

export type RelatedItem = { path: string; label: string; desc: string };
export type Faq = { q: string; a: string };
export type Group = { emoji: string; name: string; slugs: string[] };

export type ResolvedConfig = {
  title: string;
  description: string;
  ogDescription: string;
  pillarSlug: string;
  pillarEyebrow: string;
  pillarTitle: string;
  pillarText: string;
  pillarDesc: string;
  introHtml: string;
  groups: Group[];
  featuredSlugs?: string[];
  faqs?: Faq[];
  relatedTitle: string;
  relatedItems: RelatedItem[];
  isRich: boolean;       // 有手動精選分組（需補「更多文章」）
};

// ── 住宿推薦：分組的文章 slug（所有語言共用，僅名稱本地化）──────────────
const ACCOM_GROUP_SLUGS: { key: string; emoji: string; slugs: string[] }[] = [
  { key: 'seminyak', emoji: '🏖️', slugs: ['seminyak-eat-street-hotels-villas', 'seminyak-beach-resorts-guide', 'seminyak-private-villas-guide', 'seminyak-budget-villas-guide', 'seminyak-budget-hotels-guide', 'hotel-indigo-seminyak-review', 'potato-head-suites-seminyak-review', 'ize-seminyak-hotel-review'] },
  { key: 'ubud', emoji: '🌴', slugs: ['ubud-resorts-guide', 'ubud-villa-pool-guide', 'ubud-yoga-retreats-bali', 'ubud-treehouse-bamboo-villa-stays', 'capella-ubud-luxury-resort', 'Sanggraloka-Ubud', 'alaya-suites-ubud', 'hiliwatu-marriott-ubud'] },
  { key: 'canggu', emoji: '🏄', slugs: ['canggu-top-hotels-guide', 'canggu-villas-guide', 'regent-bali-canggu', 'holiday-inn-bali-canggu', 'maja-canggu-mediterranean-stay', 'belajar-bali-boutique-hotel'] },
  { key: 'uluwatu', emoji: '🌅', slugs: ['uluwatu-bali-villas-resorts-guide', 'alila-villas-uluwatu-bali', 'bvlgari-resort-bali-uluwatu', 'six-senses-uluwatu-review', 'renaissance-bali-uluwatu-resort', 'radisson-blu-bali-uluwatu', 'le-cliff-bali-uluwatu'] },
  { key: 'jimbaran', emoji: '🐟', slugs: ['jimbaran-beachfront-hotels-guide', 'four-seasons-bali-jimbaran-bay', 'raffles-bali-luxury-resort', 'platinum-hotel-jimbaran-beach'] },
  { key: 'nusadua', emoji: '🏨', slugs: ['nusa-dua-resorts-guide', 'nusa-dua-guide', 'apurva-kempinski-bali-nusa-dua', 'Paradisus-by-Melia-Bali', 'mulia-resort-bali-luxury', 'st-regis-bali-resort'] },
  { key: 'sanur', emoji: '🌊', slugs: ['sanur-luxury-budget-resorts', 'the-meru-sanur', 'sanur-family-beach-guide', 'bali-beach-hotel-sunur-review'] },
  { key: 'kuta', emoji: '🛍️', slugs: ['best-kuta-hotels-list', 'kuta-beach-hotels', 'kuta-bali-accommodation-pros-cons'] },
  { key: 'islands', emoji: '⛵', slugs: ['nusa-lembongan-ceningan-accommodation-guide', 'nusa-penida-hotels-guide'] },
  { key: 'family', emoji: '👨‍👩‍👧‍👦', slugs: ['bali-family-room-resorts', 'bali-family-resorts-kids-club', 'bali-family-resorts-water-slides', 'bali-group-villa-stay', 'bali-safari-marine-park-hotel'] },
  { key: 'honeymoon', emoji: '💕', slugs: ['bali-honeymoon-resorts-guide', 'bali-private-jet-villa-guide', 'bali-honeymoon-destination'] },
  { key: 'luxury', emoji: '💎', slugs: ['bali-best-resorts-2025', '2026-top-hotels-bali', 'top-bali-hotels-asia-rankings', 'ayana-resort-bali-guide', 'apurva-kempinski-bali-deal'] },
  { key: 'budget', emoji: '💰', slugs: ['bali-best-villas-top20-part1', 'bali-best-villas-top20-part2', 'bali-boutique-hotels-under-30', 'seminyak-budget-villas-guide', 'bali-bamboo-villa-experience'] },
  { key: 'villa', emoji: '🏡', slugs: ['bali-private-villa-recommendations', 'ubud-villa-pool-guide', 'seminyak-private-villas-guide', 'canggu-villas-guide'] },
  { key: 'booking', emoji: '📝', slugs: ['bali-accommodation-area-guide', 'bali-hotel-booking-tips', 'hotel-room-type-guide', 'airbnb-alert-2026', 'bali-airbnb-warning-2026'] },
];

const ACCOM_FEATURED = [
  'bali-accommodation-area-guide', 'seminyak-beach-resorts-guide', 'ubud-resorts-guide',
  'canggu-top-hotels-guide', 'uluwatu-bali-villas-resorts-guide', 'nusa-dua-resorts-guide',
  'bali-honeymoon-resorts-guide', 'bali-family-room-resorts', 'bali-best-villas-top20-part1',
  'bali-hotel-booking-tips',
];

// 住宿推薦：各語言分組名稱（key → 名稱）
const ACCOM_GROUP_NAMES: Record<Lang, Record<string, string>> = {
  'zh-tw': { seminyak: '水明漾 Seminyak 住宿', ubud: '烏布 Ubud 住宿', canggu: '長谷／倉古 Canggu 住宿', uluwatu: '烏魯瓦圖 Uluwatu 住宿', jimbaran: '金巴蘭 Jimbaran 住宿', nusadua: '努沙杜瓦 Nusa Dua 住宿', sanur: '沙努爾 Sanur 住宿', kuta: '庫塔 Kuta 住宿', islands: '離島 藍夢島／佩尼達島', family: '親子家庭度假村', honeymoon: '蜜月浪漫住宿', luxury: '五星奢華度假村', budget: '平價高 CP 值住宿', villa: '私人泳池 Villa 推薦', booking: '訂房教學與避雷' },
  'zh-hk': { seminyak: '水明漾 Seminyak 住宿', ubud: '烏布 Ubud 住宿', canggu: '長谷／倉古 Canggu 住宿', uluwatu: '烏魯瓦圖 Uluwatu 住宿', jimbaran: '金巴蘭 Jimbaran 住宿', nusadua: '努沙杜瓦 Nusa Dua 住宿', sanur: '沙努爾 Sanur 住宿', kuta: '庫塔 Kuta 住宿', islands: '離島 藍夢島／佩尼達島', family: '親子家庭度假村', honeymoon: '蜜月浪漫住宿', luxury: '五星奢華度假村', budget: '抵玩高 CP 值住宿', villa: '私人泳池 Villa 推薦', booking: '訂房教學與避雷' },
  'zh-cn': { seminyak: '水明漾 Seminyak 住宿', ubud: '乌布 Ubud 住宿', canggu: '长谷／仓古 Canggu 住宿', uluwatu: '乌鲁瓦图 Uluwatu 住宿', jimbaran: '金巴兰 Jimbaran 住宿', nusadua: '努沙杜瓦 Nusa Dua 住宿', sanur: '沙努尔 Sanur 住宿', kuta: '库塔 Kuta 住宿', islands: '离岛 蓝梦岛／佩尼达岛', family: '亲子家庭度假村', honeymoon: '蜜月浪漫住宿', luxury: '五星奢华度假村', budget: '平价高 CP 值住宿', villa: '私人泳池 Villa 推荐', booking: '订房教学与避雷' },
  'en': { seminyak: 'Seminyak Accommodation', ubud: 'Ubud Accommodation', canggu: 'Canggu Accommodation', uluwatu: 'Uluwatu Accommodation', jimbaran: 'Jimbaran Accommodation', nusadua: 'Nusa Dua Accommodation', sanur: 'Sanur Accommodation', kuta: 'Kuta Accommodation', islands: 'Nusa Lembongan & Penida (Islands)', family: 'Family Resorts', honeymoon: 'Honeymoon Stays', luxury: 'Luxury 5-Star Resorts', budget: 'Budget & Value Stays', villa: 'Private Pool Villas', booking: 'Booking Tips & Pitfalls' },
  'id': { seminyak: 'Akomodasi Seminyak', ubud: 'Akomodasi Ubud', canggu: 'Akomodasi Canggu', uluwatu: 'Akomodasi Uluwatu', jimbaran: 'Akomodasi Jimbaran', nusadua: 'Akomodasi Nusa Dua', sanur: 'Akomodasi Sanur', kuta: 'Akomodasi Kuta', islands: 'Nusa Lembongan & Penida (Pulau)', family: 'Resor Keluarga', honeymoon: 'Akomodasi Bulan Madu', luxury: 'Resor Mewah Bintang 5', budget: 'Akomodasi Hemat & Terjangkau', villa: 'Vila Kolam Renang Pribadi', booking: 'Tips Booking & Jebakan' },
};

// 住宿推薦：各語言文案（除分組名稱外）
type AccomStrings = Omit<ResolvedConfig, 'groups' | 'featuredSlugs' | 'isRich'>;

const ACCOM: Record<Lang, AccomStrings> = {
  'zh-tw': {
    title: '峇里島住宿推薦 2026｜100+ 飯店 Villa 分區精選與訂房攻略 - Go Bali Go',
    description: '峇里島住哪一區好？水明漾、烏布、長谷、烏魯瓦圖、努沙杜瓦、金巴蘭、沙努爾、庫塔分區精選 100+ 飯店與私人泳池 Villa：親子度假村、蜜月奢華、平價高 CP、訂房省錢技巧一次看，2026 最新評測。',
    ogDescription: '峇里島住哪一區好？8 大熱門區域 100+ 飯店與 Villa 精選：親子、蜜月、奢華、平價與訂房省錢攻略，2026 最新評測。',
    pillarSlug: 'bali-accommodation-area-guide',
    pillarEyebrow: '選區必讀 · 五大區域比較',
    pillarTitle: '不知道住哪一區？先看這篇分區比較',
    pillarText: '讀「峇里島五大住宿區域比較」→',
    pillarDesc: '庫塔、水明漾、長谷、烏布、努沙杜瓦——一篇看懂每區優缺點、適合誰、價位與交通。選對區域，是訂房不踩雷的第一步。',
    introHtml: '峇里島這麼大，第一次來最常卡關的就是「到底要住哪一區」。<strong>水明漾（Seminyak）</strong>時尚好逛、<strong>長谷（Canggu）</strong>衝浪文青、<strong>烏布（Ubud）</strong>森林療癒、<strong>烏魯瓦圖（Uluwatu）</strong>懸崖海景，<strong>努沙杜瓦／金巴蘭</strong>適合親子與蜜月，<strong>庫塔</strong>則最方便購物與機場過境。這裡依「分區」與「主題」整理了 100+ 篇<strong>峇里島住宿推薦</strong>，從一晚不到 30 美元的高 CP 值飯店，到懸崖無邊際泳池的頂奢<strong>私人泳池 Villa</strong>，幫你快速鎖定最適合的<strong>峇里島飯店</strong>與度假村。',
    relatedTitle: '📚 訂房前必看工具與攻略',
    relatedItems: [
      { path: 'blog/bali-accommodation-area-guide/', label: '🗺️ 峇里島五大住宿區域比較', desc: '庫塔、水明漾、長谷、烏布、努沙杜瓦怎麼選' },
      { path: 'blog/bali-hotel-booking-tips/', label: '💡 峇里島訂房省錢 7 大技巧', desc: '訂房前必看，少花冤枉錢' },
      { path: 'bali-budget-calculator/', label: '💰 峇里島預算計算機', desc: '估算 5/7/10 天住宿與旅費' },
      { path: 'trip-planner/', label: '🧭 峇里島行程規劃工具', desc: '依天數與區域產生個人化行程' },
    ],
    faqs: [
      { q: '第一次去峇里島住哪一區最好？', a: '新手最推薦水明漾（Seminyak）與沙努爾（Sanur）。水明漾餐廳、酒吧、購物最集中，到哪都方便；沙努爾海灘平靜、步調慢、最適合親子與長輩。想要衝浪文青氛圍選長谷（Canggu），想要森林療癒選烏布（Ubud）。詳細比較可看分區攻略。' },
      { q: '峇里島住飯店還是 Villa 好？', a: '想要泳池、餐廳、Kids Club 等完整設施與服務，選飯店或度假村；想要私密空間、私人泳池、適合家庭或多人同遊，選 Villa 更划算自由。峇里島 Villa 性價比很高，一晚約 60～100 美元就能有獨棟私人泳池。' },
      { q: '峇里島住宿一晚大概多少錢？', a: '平價乾淨的飯店約美金 25～50，中價精品飯店與 Villa 約美金 60～120，五星度假村與懸崖海景 Villa 則從美金 200 起跳。淡季（雨季 11～3 月）與提早預訂通常更便宜。' },
      { q: '帶小孩去峇里島住哪裡比較適合？', a: '建議選有 Kids Club、淺水泳池或滑水道的親子度假村，區域以努沙杜瓦、沙努爾、金巴蘭最安全方便。許多度假村提供四人房或兩大兩小免費入住方案。' },
      { q: '峇里島訂房怎麼訂最省？', a: '善用 Agoda／Booking 的會員價與限時優惠、避開連假與旺季、提早 1～2 個月預訂，並比較含早餐與否的價差。長住或多人同遊訂整棟 Villa 通常比飯店划算。' },
      { q: '峇里島的 Airbnb 民宿還能訂嗎？', a: '2026 年印尼政府開始取締未取得合法執照的民宿與 Villa，部分 Airbnb 房源面臨拆遷或停業風險。建議優先選擇有合法營業執照的飯店或正規 Villa，避免抵達後訂房被取消。' },
    ],
  },
  'zh-hk': {
    title: '峇里島住宿推薦 2026｜100+ 酒店 Villa 分區精選＋訂房攻略 - Go Bali Go',
    description: '峇里島住邊區好？水明漾、烏布、長谷、烏魯瓦圖、努沙杜瓦、金巴蘭、沙努爾、庫塔分區精選 100+ 酒店同私人泳池 Villa：親子度假村、蜜月奢華、抵玩高 CP、訂房慳錢貼士一次睇晒，2026 最新評測。',
    ogDescription: '峇里島住邊區好？8 大熱門區域 100+ 酒店同 Villa 精選：親子、蜜月、奢華、抵玩同訂房慳錢攻略，2026 最新評測。',
    pillarSlug: 'bali-accommodation-area-guide',
    pillarEyebrow: '揀區必讀 · 五大區域比較',
    pillarTitle: '唔知住邊區好？先睇呢篇分區比較',
    pillarText: '睇「峇里島五大住宿區域比較」→',
    pillarDesc: '庫塔、水明漾、長谷、烏布、努沙杜瓦——一篇睇晒每區優缺點、啱邊個、價位同交通。揀啱區域，係訂房唔中伏嘅第一步。',
    introHtml: '峇里島咁大，第一次嚟最常諗唔掂嘅就係「到底住邊區」。<strong>水明漾（Seminyak）</strong>時尚好行、<strong>長谷（Canggu）</strong>衝浪文青、<strong>烏布（Ubud）</strong>森林療癒、<strong>烏魯瓦圖（Uluwatu）</strong>懸崖海景，<strong>努沙杜瓦／金巴蘭</strong>啱親子同蜜月，<strong>庫塔</strong>就最方便購物同機場過境。呢度按「分區」同「主題」整理咗 100+ 篇<strong>峇里島住宿推薦</strong>，由一晚唔使 30 美元嘅抵玩酒店，到懸崖無邊際泳池嘅頂級<strong>私人泳池 Villa</strong>，幫你快速鎖定最啱嘅<strong>峇里島酒店</strong>同度假村。',
    relatedTitle: '📚 訂房前必睇工具同攻略',
    relatedItems: [
      { path: 'blog/bali-accommodation-area-guide/', label: '🗺️ 峇里島五大住宿區域比較', desc: '庫塔、水明漾、長谷、烏布、努沙杜瓦點揀' },
      { path: 'blog/bali-hotel-booking-tips/', label: '💡 峇里島訂房慳錢 7 大貼士', desc: '訂房前必睇，慳返冤枉錢' },
      { path: 'bali-budget-calculator/', label: '💰 峇里島預算計算機', desc: '估算 5/7/10 日住宿同旅費' },
      { path: 'trip-planner/', label: '🧭 峇里島行程規劃工具', desc: '按日數同區域整個人化行程' },
    ],
    faqs: [
      { q: '第一次去峇里島住邊區最好？', a: '新手最推薦水明漾（Seminyak）同沙努爾（Sanur）。水明漾餐廳、酒吧、購物最集中，去邊都方便；沙努爾海灘平靜、節奏慢、最啱親子同長輩。想要衝浪文青氛圍揀長谷（Canggu），想要森林療癒揀烏布（Ubud）。詳細比較可以睇分區攻略。' },
      { q: '峇里島住酒店定 Villa 好？', a: '想要泳池、餐廳、Kids Club 等完整設施同服務，揀酒店或度假村；想要私隱、私人泳池、啱家庭或多人同遊，揀 Villa 更抵更自由。峇里島 Villa 性價比好高，一晚約 60～100 美元就有獨棟私人泳池。' },
      { q: '峇里島住宿一晚大概幾錢？', a: '抵玩乾淨嘅酒店約美金 25～50，中價精品酒店同 Villa 約美金 60～120，五星度假村同懸崖海景 Villa 就由美金 200 起。淡季（雨季 11～3 月）同早訂通常平啲。' },
      { q: '帶細路去峇里島住邊度好？', a: '建議揀有 Kids Club、淺水泳池或滑水梯嘅親子度假村，區域以努沙杜瓦、沙努爾、金巴蘭最安全方便。好多度假村提供四人房或兩大兩細免費入住。' },
      { q: '峇里島訂房點訂最抵？', a: '善用 Agoda／Booking 嘅會員價同限時優惠、避開長假同旺季、提早 1～2 個月訂，再比較有無早餐嘅價差。長住或多人同遊訂成棟 Villa 通常比酒店抵。' },
      { q: '峇里島嘅 Airbnb 民宿仲訂得嗎？', a: '2026 年印尼政府開始取締無合法牌照嘅民宿同 Villa，部分 Airbnb 房源面臨拆卸或停業風險。建議優先揀有合法營業牌照嘅酒店或正規 Villa，避免到埗後訂房被取消。' },
    ],
  },
  'zh-cn': {
    title: '巴厘岛住宿推荐 2026｜100+ 酒店 Villa 分区精选与订房攻略 - Go Bali Go',
    description: '巴厘岛住哪一区好？水明漾、乌布、长谷、乌鲁瓦图、努沙杜瓦、金巴兰、沙努尔、库塔分区精选 100+ 酒店与私人泳池 Villa：亲子度假村、蜜月奢华、平价高 CP、订房省钱技巧一次看，2026 最新评测。',
    ogDescription: '巴厘岛住哪一区好？8 大热门区域 100+ 酒店与 Villa 精选：亲子、蜜月、奢华、平价与订房省钱攻略，2026 最新评测。',
    pillarSlug: 'bali-accommodation-area-guide',
    pillarEyebrow: '选区必读 · 五大区域比较',
    pillarTitle: '不知道住哪一区？先看这篇分区比较',
    pillarText: '读「巴厘岛五大住宿区域比较」→',
    pillarDesc: '库塔、水明漾、长谷、乌布、努沙杜瓦——一篇看懂每区优缺点、适合谁、价位与交通。选对区域，是订房不踩雷的第一步。',
    introHtml: '巴厘岛这么大，第一次来最常卡关的就是「到底要住哪一区」。<strong>水明漾（Seminyak）</strong>时尚好逛、<strong>长谷（Canggu）</strong>冲浪文青、<strong>乌布（Ubud）</strong>森林疗愈、<strong>乌鲁瓦图（Uluwatu）</strong>悬崖海景，<strong>努沙杜瓦／金巴兰</strong>适合亲子与蜜月，<strong>库塔</strong>则最方便购物与机场过境。这里依「分区」与「主题」整理了 100+ 篇<strong>巴厘岛住宿推荐</strong>，从一晚不到 30 美元的高 CP 值酒店，到悬崖无边际泳池的顶奢<strong>私人泳池 Villa</strong>，帮你快速锁定最适合的<strong>巴厘岛酒店</strong>与度假村。',
    relatedTitle: '📚 订房前必看工具与攻略',
    relatedItems: [
      { path: 'blog/bali-accommodation-area-guide/', label: '🗺️ 巴厘岛五大住宿区域比较', desc: '库塔、水明漾、长谷、乌布、努沙杜瓦怎么选' },
      { path: 'blog/bali-hotel-booking-tips/', label: '💡 巴厘岛订房省钱 7 大技巧', desc: '订房前必看，少花冤枉钱' },
      { path: 'bali-budget-calculator/', label: '💰 巴厘岛预算计算机', desc: '估算 5/7/10 天住宿与旅费' },
      { path: 'trip-planner/', label: '🧭 巴厘岛行程规划工具', desc: '依天数与区域产生个人化行程' },
    ],
    faqs: [
      { q: '第一次去巴厘岛住哪一区最好？', a: '新手最推荐水明漾（Seminyak）与沙努尔（Sanur）。水明漾餐厅、酒吧、购物最集中，到哪都方便；沙努尔海滩平静、步调慢、最适合亲子与长辈。想要冲浪文青氛围选长谷（Canggu），想要森林疗愈选乌布（Ubud）。详细比较可看分区攻略。' },
      { q: '巴厘岛住酒店还是 Villa 好？', a: '想要泳池、餐厅、Kids Club 等完整设施与服务，选酒店或度假村；想要私密空间、私人泳池、适合家庭或多人同游，选 Villa 更划算自由。巴厘岛 Villa 性价比很高，一晚约 60～100 美元就能有独栋私人泳池。' },
      { q: '巴厘岛住宿一晚大概多少钱？', a: '平价干净的酒店约美金 25～50，中价精品酒店与 Villa 约美金 60～120，五星度假村与悬崖海景 Villa 则从美金 200 起跳。淡季（雨季 11～3 月）与提早预订通常更便宜。' },
      { q: '带小孩去巴厘岛住哪里比较适合？', a: '建议选有 Kids Club、浅水泳池或滑水道的亲子度假村，区域以努沙杜瓦、沙努尔、金巴兰最安全方便。许多度假村提供四人房或两大两小免费入住方案。' },
      { q: '巴厘岛订房怎么订最省？', a: '善用 Agoda／Booking 的会员价与限时优惠、避开连假与旺季、提早 1～2 个月预订，并比较含早餐与否的价差。长住或多人同游订整栋 Villa 通常比酒店划算。' },
      { q: '巴厘岛的 Airbnb 民宿还能订吗？', a: '2026 年印尼政府开始取缔未取得合法执照的民宿与 Villa，部分 Airbnb 房源面临拆迁或停业风险。建议优先选择有合法营业执照的酒店或正规 Villa，避免抵达后订房被取消。' },
    ],
  },
  'en': {
    title: 'Bali Accommodation Guide 2026 | 100+ Hotels & Villas by Area + Booking Tips - Go Bali Go',
    description: 'Where to stay in Bali? 100+ hand-picked hotels and private pool villas across Seminyak, Ubud, Canggu, Uluwatu, Nusa Dua, Jimbaran, Sanur & Kuta — family resorts, honeymoon luxury, budget value and money-saving booking tips. Updated for 2026.',
    ogDescription: 'Where to stay in Bali? 100+ hotels & villas across 8 top areas — family, honeymoon, luxury, budget and booking tips. Updated for 2026.',
    pillarSlug: 'bali-accommodation-area-guide',
    pillarEyebrow: 'Start here · Compare the 5 areas',
    pillarTitle: 'Not sure which area to stay in? Start with this comparison',
    pillarText: 'Read "Bali’s 5 Best Areas to Stay Compared" →',
    pillarDesc: 'Kuta, Seminyak, Canggu, Ubud, Nusa Dua — understand each area’s pros, cons, who it suits, price and transport. Choosing the right area is step one to booking without regret.',
    introHtml: 'Bali is big, and the question that trips up most first-timers is simply "which area should I stay in?" <strong>Seminyak</strong> is stylish and walkable, <strong>Canggu</strong> is surf-and-cafe cool, <strong>Ubud</strong> is jungle and wellness, <strong>Uluwatu</strong> has the clifftop ocean views, <strong>Nusa Dua and Jimbaran</strong> suit families and honeymooners, and <strong>Kuta</strong> is the most convenient for shopping and airport stopovers. Below we’ve organised 100+ <strong>Bali accommodation</strong> guides by <strong>area</strong> and by <strong>theme</strong> — from value hotels under US$30 a night to clifftop infinity-pool <strong>private villas</strong> — to help you quickly find the right <strong>Bali hotel</strong> or resort.',
    relatedTitle: '📚 Tools & guides to read before you book',
    relatedItems: [
      { path: 'blog/bali-accommodation-area-guide/', label: '🗺️ Bali’s 5 Best Areas Compared', desc: 'Kuta, Seminyak, Canggu, Ubud, Nusa Dua — how to choose' },
      { path: 'blog/bali-hotel-booking-tips/', label: '💡 7 Bali Hotel Booking Money-Savers', desc: 'Read before you book' },
      { path: 'bali-budget-calculator/', label: '💰 Bali Budget Calculator', desc: 'Estimate accommodation & trip cost for 5/7/10 days' },
      { path: 'trip-planner/', label: '🧭 Bali Trip Planner', desc: 'Build a personalised plan by days and area' },
    ],
    faqs: [
      { q: 'Which area is best to stay in Bali for first-timers?', a: 'For first-timers, Seminyak and Sanur are the easiest picks. Seminyak has the densest mix of restaurants, bars and shopping; Sanur has a calm beach and slower pace, ideal for families and older travellers. Choose Canggu for a surf/cafe vibe, or Ubud for jungle and wellness. See our area comparison for details.' },
      { q: 'Should I stay in a hotel or a villa in Bali?', a: 'If you want pools, restaurants and kids’ clubs with full service, pick a hotel or resort. If you want privacy, your own pool and great value for families or groups, a villa is more flexible. Bali villas are excellent value — a private-pool villa can cost just US$60–100 a night.' },
      { q: 'How much does accommodation in Bali cost per night?', a: 'Clean budget hotels run about US$25–50, mid-range boutique hotels and villas about US$60–120, and five-star resorts or clifftop ocean-view villas from US$200 up. Low season (rainy season, Nov–Mar) and booking early are usually cheaper.' },
      { q: 'Where should I stay in Bali with kids?', a: 'Choose family resorts with a kids’ club, shallow pool or water slides; Nusa Dua, Sanur and Jimbaran are the safest, most convenient areas. Many resorts offer four-person rooms or free stays for two children.' },
      { q: 'How do I book Bali accommodation for the best price?', a: 'Use member rates and flash deals on Agoda/Booking, avoid public holidays and peak season, book 1–2 months ahead, and compare prices with and without breakfast. For long stays or groups, renting a whole villa often beats a hotel.' },
      { q: 'Can I still book Airbnb stays in Bali?', a: 'In 2026 the Indonesian government began cracking down on unlicensed guesthouses and villas, and some Airbnb listings face demolition or closure. Prefer hotels or licensed villas with a valid operating permit to avoid having your booking cancelled after arrival.' },
    ],
  },
  'id': {
    title: 'Panduan Akomodasi Bali 2026 | 100+ Hotel & Vila per Area + Tips Booking - Go Bali Go',
    description: 'Menginap di mana saat ke Bali? 100+ hotel pilihan dan vila kolam pribadi di Seminyak, Ubud, Canggu, Uluwatu, Nusa Dua, Jimbaran, Sanur & Kuta — resor keluarga, bulan madu mewah, pilihan hemat, dan tips hemat booking. Diperbarui untuk 2026.',
    ogDescription: 'Menginap di mana saat ke Bali? 100+ hotel & vila di 8 area teratas — keluarga, bulan madu, mewah, hemat, dan tips booking. Update 2026.',
    pillarSlug: 'bali-accommodation-area-guide',
    pillarEyebrow: 'Mulai di sini · Bandingkan 5 area',
    pillarTitle: 'Bingung pilih area? Mulai dari perbandingan ini',
    pillarText: 'Baca "Perbandingan 5 Area Terbaik untuk Menginap di Bali" →',
    pillarDesc: 'Kuta, Seminyak, Canggu, Ubud, Nusa Dua — pahami kelebihan, kekurangan, cocok untuk siapa, harga, dan transportasi tiap area. Memilih area yang tepat adalah langkah pertama booking tanpa menyesal.',
    introHtml: 'Bali itu luas, dan yang paling sering membingungkan pemula adalah "harus menginap di area mana?" <strong>Seminyak</strong> stylish dan mudah dijelajahi, <strong>Canggu</strong> bernuansa surfing dan kafe, <strong>Ubud</strong> hutan dan wellness, <strong>Uluwatu</strong> punya pemandangan laut dari tebing, <strong>Nusa Dua dan Jimbaran</strong> cocok untuk keluarga dan bulan madu, sedangkan <strong>Kuta</strong> paling praktis untuk belanja dan transit bandara. Di bawah ini kami menyusun 100+ panduan <strong>akomodasi Bali</strong> berdasarkan <strong>area</strong> dan <strong>tema</strong> — dari hotel hemat di bawah US$30 per malam hingga <strong>vila kolam pribadi</strong> dengan infinity pool di tebing — agar kamu cepat menemukan <strong>hotel Bali</strong> atau resor yang tepat.',
    relatedTitle: '📚 Alat & panduan untuk dibaca sebelum booking',
    relatedItems: [
      { path: 'blog/bali-accommodation-area-guide/', label: '🗺️ 5 Area Terbaik Bali Dibandingkan', desc: 'Kuta, Seminyak, Canggu, Ubud, Nusa Dua — cara memilih' },
      { path: 'blog/bali-hotel-booking-tips/', label: '💡 7 Tips Hemat Booking Hotel Bali', desc: 'Baca sebelum booking' },
      { path: 'bali-budget-calculator/', label: '💰 Kalkulator Budget Bali', desc: 'Perkirakan biaya akomodasi & perjalanan 5/7/10 hari' },
      { path: 'trip-planner/', label: '🧭 Perencana Perjalanan Bali', desc: 'Susun rencana personal berdasarkan hari & area' },
    ],
    faqs: [
      { q: 'Area mana yang terbaik untuk menginap di Bali bagi pemula?', a: 'Untuk pemula, Seminyak dan Sanur adalah pilihan termudah. Seminyak punya konsentrasi restoran, bar, dan belanja terpadat; Sanur berpantai tenang dan berirama santai, ideal untuk keluarga dan lansia. Pilih Canggu untuk suasana surfing/kafe, atau Ubud untuk hutan dan wellness. Lihat perbandingan area kami untuk detailnya.' },
      { q: 'Lebih baik menginap di hotel atau vila di Bali?', a: 'Jika ingin kolam, restoran, dan kids club dengan layanan lengkap, pilih hotel atau resor. Jika ingin privasi, kolam sendiri, dan nilai terbaik untuk keluarga atau rombongan, vila lebih fleksibel. Vila Bali sangat worth it — vila kolam pribadi bisa hanya US$60–100 per malam.' },
      { q: 'Berapa biaya akomodasi di Bali per malam?', a: 'Hotel hemat yang bersih sekitar US$25–50, hotel butik dan vila kelas menengah sekitar US$60–120, dan resor bintang lima atau vila tepi tebing dari US$200 ke atas. Musim sepi (musim hujan, Nov–Mar) dan booking lebih awal biasanya lebih murah.' },
      { q: 'Di mana sebaiknya menginap di Bali bersama anak?', a: 'Pilih resor keluarga dengan kids club, kolam dangkal, atau seluncuran air; Nusa Dua, Sanur, dan Jimbaran adalah area paling aman dan praktis. Banyak resor menawarkan kamar untuk empat orang atau menginap gratis untuk dua anak.' },
      { q: 'Bagaimana cara booking akomodasi Bali dengan harga terbaik?', a: 'Manfaatkan harga member dan flash deal di Agoda/Booking, hindari hari libur dan musim ramai, pesan 1–2 bulan sebelumnya, dan bandingkan harga dengan/tanpa sarapan. Untuk menginap lama atau rombongan, menyewa satu vila utuh sering lebih hemat daripada hotel.' },
      { q: 'Apakah masih bisa booking Airbnb di Bali?', a: 'Pada 2026 pemerintah Indonesia mulai menertibkan guesthouse dan vila tanpa izin, dan sebagian listing Airbnb terancam dibongkar atau ditutup. Utamakan hotel atau vila berlisensi dengan izin usaha yang sah agar booking tidak dibatalkan setelah tiba.' },
    ],
  },
};

// generic fallback：pillar / intro / related（依語言）
const GENERIC: Record<Lang, {
  pillarEyebrow: string; pillarTitle: string; pillarText: string; pillarDesc: string;
  intro: (label: string) => string;
  title: (label: string, count: number) => string;
  description: (label: string, count: number) => string;
  ogDescription: (label: string) => string;
  relatedTitle: string;
  relatedItems: RelatedItem[];
}> = {
  'zh-tw': {
    pillarEyebrow: '熱門推薦 · 終極指南', pillarTitle: '第一次去峇里島？從這裡開始',
    pillarText: '讀「2026 峇里島自由行終極指南」→',
    pillarDesc: '26 項行前準備、現地實用知識、真實踩雷經驗與省錢技巧全收錄。一篇看完，新手變老手。',
    intro: (l) => `這裡集結了峇里島${l}相關的所有文章，持續更新最新資訊。`,
    title: (l, c) => `峇里島${l}｜${c} 篇完整攻略 - Go Bali Go`,
    description: (l, c) => `峇里島${l}相關文章完整收錄，${c} 篇深度攻略持續更新。`,
    ogDescription: (l) => `峇里島${l}相關文章完整收錄，持續更新。`,
    relatedTitle: '📚 相關實用工具',
    relatedItems: [
      { path: 'trip-planner/', label: '🗺️ 峇里島行程規劃工具', desc: '5分鐘產生個人化分區推薦' },
      { path: 'bali-budget-calculator/', label: '💰 峇里島預算計算機', desc: '估算 5/7/10 天需要多少預算' },
      { path: 'blog/category/住宿推薦/', label: '🏨 峇里島住宿推薦系列', desc: '全島最完整住宿精選' },
      { path: 'blog/category/峇里島分區攻略/', label: '📍 峇里島分區攻略系列', desc: '庫塔、水明漾、烏布、長谷全攻略' },
    ],
  },
  'zh-hk': {
    pillarEyebrow: '熱門推薦 · 終極指南', pillarTitle: '第一次去峇里島？由呢度開始',
    pillarText: '睇「2026 峇里島自由行終極指南」→',
    pillarDesc: '26 項行前準備、現地實用知識、真實中伏經驗同慳錢貼士全收錄。一篇睇完，新手變老手。',
    intro: (l) => `呢度集合咗峇里島${l}相關嘅所有文章，持續更新最新資訊。`,
    title: (l, c) => `峇里島${l}｜${c} 篇完整攻略 - Go Bali Go`,
    description: (l, c) => `峇里島${l}相關文章完整收錄，${c} 篇深度攻略持續更新。`,
    ogDescription: (l) => `峇里島${l}相關文章完整收錄，持續更新。`,
    relatedTitle: '📚 相關實用工具',
    relatedItems: [
      { path: 'trip-planner/', label: '🗺️ 峇里島行程規劃工具', desc: '5分鐘整個人化分區推薦' },
      { path: 'bali-budget-calculator/', label: '💰 峇里島預算計算機', desc: '估算 5/7/10 日要幾多預算' },
      { path: 'blog/category/住宿推薦/', label: '🏨 峇里島住宿推薦系列', desc: '全島最完整住宿精選' },
      { path: 'blog/category/峇里島分區攻略/', label: '📍 峇里島分區攻略系列', desc: '庫塔、水明漾、烏布、長谷全攻略' },
    ],
  },
  'zh-cn': {
    pillarEyebrow: '热门推荐 · 终极指南', pillarTitle: '第一次去巴厘岛？从这里开始',
    pillarText: '读「2026 巴厘岛自由行终极指南」→',
    pillarDesc: '26 项行前准备、现地实用知识、真实踩雷经验与省钱技巧全收录。一篇看完，新手变老手。',
    intro: (l) => `这里集结了巴厘岛${l}相关的所有文章，持续更新最新资讯。`,
    title: (l, c) => `巴厘岛${l}｜${c} 篇完整攻略 - Go Bali Go`,
    description: (l, c) => `巴厘岛${l}相关文章完整收录，${c} 篇深度攻略持续更新。`,
    ogDescription: (l) => `巴厘岛${l}相关文章完整收录，持续更新。`,
    relatedTitle: '📚 相关实用工具',
    relatedItems: [
      { path: 'trip-planner/', label: '🗺️ 巴厘岛行程规划工具', desc: '5分钟产生个人化分区推荐' },
      { path: 'bali-budget-calculator/', label: '💰 巴厘岛预算计算机', desc: '估算 5/7/10 天需要多少预算' },
      { path: 'blog/category/住宿推薦/', label: '🏨 巴厘岛住宿推荐系列', desc: '全岛最完整住宿精选' },
      { path: 'blog/category/峇里島分區攻略/', label: '📍 巴厘岛分区攻略系列', desc: '库塔、水明漾、乌布、长谷全攻略' },
    ],
  },
  'en': {
    pillarEyebrow: 'Editor’s pick · Ultimate guide', pillarTitle: 'First time in Bali? Start here',
    pillarText: 'Read "The Ultimate 2026 Bali Travel Guide" →',
    pillarDesc: '26 pre-trip essentials, on-the-ground know-how, real pitfalls and money-saving tips — everything in one read to take you from newbie to pro.',
    intro: (l) => `Every article on Bali ${l}, gathered in one place and kept up to date.`,
    title: (l, c) => `Bali ${l} | ${c} In-Depth Guides - Go Bali Go`,
    description: (l, c) => `A complete library of Bali ${l} articles — ${c} in-depth guides, continuously updated.`,
    ogDescription: (l) => `A complete library of Bali ${l} articles, continuously updated.`,
    relatedTitle: '📚 Handy tools',
    relatedItems: [
      { path: 'trip-planner/', label: '🗺️ Bali Trip Planner', desc: 'Personalised area picks in 5 minutes' },
      { path: 'bali-budget-calculator/', label: '💰 Bali Budget Calculator', desc: 'Estimate the cost of a 5/7/10-day trip' },
      { path: 'blog/category/住宿推薦/', label: '🏨 Bali Accommodation Guides', desc: 'The island’s most complete stay picks' },
      { path: 'blog/category/峇里島分區攻略/', label: '📍 Bali Area Guides', desc: 'Kuta, Seminyak, Ubud, Canggu and more' },
    ],
  },
  'id': {
    pillarEyebrow: 'Pilihan editor · Panduan utama', pillarTitle: 'Pertama kali ke Bali? Mulai di sini',
    pillarText: 'Baca "Panduan Lengkap Wisata Bali 2026" →',
    pillarDesc: '26 persiapan sebelum berangkat, pengetahuan praktis di lokasi, jebakan nyata, dan tips hemat — semua dalam satu bacaan, dari pemula jadi mahir.',
    intro: (l) => `Semua artikel ${l} Bali, terkumpul di satu tempat dan terus diperbarui.`,
    title: (l, c) => `${l} Bali | ${c} Panduan Lengkap - Go Bali Go`,
    description: (l, c) => `Koleksi lengkap artikel ${l} Bali — ${c} panduan mendalam, terus diperbarui.`,
    ogDescription: (l) => `Koleksi lengkap artikel ${l} Bali, terus diperbarui.`,
    relatedTitle: '📚 Alat berguna',
    relatedItems: [
      { path: 'trip-planner/', label: '🗺️ Perencana Perjalanan Bali', desc: 'Rekomendasi area personal dalam 5 menit' },
      { path: 'bali-budget-calculator/', label: '💰 Kalkulator Budget Bali', desc: 'Perkirakan biaya perjalanan 5/7/10 hari' },
      { path: 'blog/category/住宿推薦/', label: '🏨 Panduan Akomodasi Bali', desc: 'Pilihan menginap terlengkap di pulau ini' },
      { path: 'blog/category/峇里島分區攻略/', label: '📍 Panduan Area Bali', desc: 'Kuta, Seminyak, Ubud, Canggu, dan lainnya' },
    ],
  },
};

/**
 * 取得指定語言＋分類的分類頁設定。
 * - 住宿推薦：富設定（分區＋主題分組、FAQ、精選 schema）
 * - 其餘分類：generic（單一「全部文章」分組，文章 slug 由呼叫端帶入）
 */
export function getCategoryConfig(lang: Lang, cat: string, count: number, allSlugs: string[]): ResolvedConfig {
  const label = catLabel(lang, cat);

  if (cat === '住宿推薦') {
    const s = ACCOM[lang];
    const names = ACCOM_GROUP_NAMES[lang];
    return {
      ...s,
      groups: ACCOM_GROUP_SLUGS.map(g => ({ emoji: g.emoji, name: names[g.key], slugs: g.slugs })),
      featuredSlugs: ACCOM_FEATURED,
      isRich: true,
    };
  }

  const g = GENERIC[lang];
  return {
    title: g.title(label, count),
    description: g.description(label, count),
    ogDescription: g.ogDescription(label),
    pillarSlug: 'bali-ultimate-guide-2026',
    pillarEyebrow: g.pillarEyebrow,
    pillarTitle: g.pillarTitle,
    pillarText: g.pillarText,
    pillarDesc: g.pillarDesc,
    introHtml: g.intro(label),
    groups: [{ emoji: '📄', name: UI[lang].allArticles, slugs: allSlugs }],
    relatedTitle: g.relatedTitle,
    relatedItems: g.relatedItems,
    isRich: false,
  };
}
