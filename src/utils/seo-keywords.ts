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
  },
  '簽證通關': {
    'zh-tw': '2026最新攻略、VOA簽證申請教學、峇里島通關流程',
    'zh-hk': '2026最新攻略、VOA簽證申請教學、峇里島通關流程',
    'zh-cn': '2026最新攻略、VOA签证申请教程、峇里岛通关流程',
    'en':    'Bali 2026 visa guide · VOA on arrival · entry tips',
  },
  '峇里島分區攻略': {
    'zh-tw': '地區全攻略、交通指南、隱藏景點推薦',
    'zh-hk': '地區全攻略、交通指南、隱藏景點推薦',
    'zh-cn': '地区全攻略、交通指南、隐藏景点推荐',
    'en':    'complete area guide · transport tips · hidden gems',
  },
  '美食景點活動': {
    'zh-tw': '峇里島美食、必去景點、特色活動推薦',
    'zh-hk': '峇里島美食、必去景點、特色活動推薦',
    'zh-cn': '峇里岛美食、必去景点、特色活动推荐',
    'en':    'Bali food · top attractions · must-do activities',
  },
  '新手指南': {
    'zh-tw': '峇里島自由行新手攻略、行程規劃建議',
    'zh-hk': '峇里島自由行新手攻略、行程規劃建議',
    'zh-cn': '峇里岛自由行新手攻略、行程规划建议',
    'en':    'Bali first-timer guide · itinerary planning tips',
  },
  '旅行技巧': {
    'zh-tw': '峇里島旅行技巧、省錢攻略、必知資訊',
    'zh-hk': '峇里島旅行技巧、慳錢攻略、必知資訊',
    'zh-cn': '峇里岛旅行技巧、省钱攻略、必知资讯',
    'en':    'Bali travel hacks · money-saving tips · insider advice',
  },
  '叫車包車': {
    'zh-tw': '峇里島包車、計程車、交通租車攻略',
    'zh-hk': '峇里島包車、的士、交通租車攻略',
    'zh-cn': '峇里岛包车、出租车、交通租车攻略',
    'en':    'Bali private car hire · transport · taxi tips',
  },
  '家庭親子': {
    'zh-tw': '峇里島親子旅遊、家庭行程推薦',
    'zh-hk': '峇里島親子旅遊、家庭行程推薦',
    'zh-cn': '峇里岛亲子旅游、家庭行程推荐',
    'en':    'Bali family travel · kid-friendly activities',
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
  },
  'ubud-resorts-guide': {
    'zh-tw': '烏布叢林 Villa 泳池早餐、市中心飯店',
    'zh-hk': '烏布叢林 Villa 泳池早餐、市中心酒店',
    'zh-cn': '乌布丛林 Villa 泳池早餐、市中心酒店',
    'en':    'Ubud jungle villa with pool breakfast · central hotels',
  },
  'canggu-top-hotels-guide': {
    'zh-tw': '長谷衝浪住宿、咖啡廳周邊飯店推薦',
    'zh-hk': '長谷衝浪住宿、咖啡廳周邊酒店推薦',
    'zh-cn': '长谷冲浪住宿、咖啡厅周边酒店推荐',
    'en':    'Canggu surf stays · cafe district hotels',
  },
  'uluwatu-bali-villas-resorts-guide': {
    'zh-tw': '烏魯瓦圖懸崖 Villa、無邊際泳池推薦',
    'zh-hk': '烏魯瓦圖懸崖 Villa、無邊際泳池推薦',
    'zh-cn': '乌鲁瓦图悬崖 Villa、无边际泳池推荐',
    'en':    'Uluwatu clifftop villa · infinity pool recommendations',
  },
  'nusa-dua-resorts-guide': {
    'zh-tw': '努沙杜瓦親子飯店、全包式度假村',
    'zh-hk': '努沙杜瓦親子酒店、全包式度假村',
    'zh-cn': '努沙杜瓦亲子酒店、全包式度假村',
    'en':    'Nusa Dua family hotels · all-inclusive resorts',
  },
  'jimbaran-beachfront-hotels-guide': {
    'zh-tw': '金巴蘭海景飯店、海鮮夕陽餐廳推薦',
    'zh-hk': '金巴蘭海景酒店、海鮮日落餐廳推薦',
    'zh-cn': '金巴兰海景酒店、海鲜夕阳餐厅推荐',
    'en':    'Jimbaran beachfront hotels · seafood sunset dining',
  },
  'sanur-luxury-budget-resorts': {
    'zh-tw': '沙努爾親子飯店、日出海灘住宿',
    'zh-hk': '沙努爾親子酒店、日出海灘住宿',
    'zh-cn': '沙努尔亲子酒店、日出海滩住宿',
    'en':    'Sanur family hotels · sunrise beach stays',
  },
  'best-kuta-hotels-list': {
    'zh-tw': '庫塔機場飯店、庫塔購物住宿推薦',
    'zh-hk': '庫塔機場酒店、庫塔購物住宿推薦',
    'zh-cn': '库塔机场酒店、库塔购物住宿推荐',
    'en':    'Kuta airport hotels · shopping district stays',
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

/**
 * Enhance title with Cantonese substitutions (zh-HK only)
 */
export function enhancedTitle(title: string, cats: string[], lang: string): string {
  return lang === 'zh-hk' ? applyHkSubs(title) : title;
}

/**
 * Enhance description with:
 * 1. Cantonese substitutions (zh-HK)
 * 2. Slug-level long-tail keyword suffix (if available), else category keyword suffix
 *    (only when description is short enough to still have room)
 */
export function enhancedDescription(desc: string, cats: string[], lang: string, slug?: string): string {
  let out = lang === 'zh-hk' ? applyHkSubs(desc) : desc;

  const langKey = ['en', 'zh-cn', 'zh-hk'].includes(lang) ? lang : 'zh-tw';

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
    // Append only when description is short enough (Google shows ~155 chars)
    // and doesn't already contain the first keyword token
    const firstKw = kw.split(/[、·]/)[0].trim();
    if (out.length < 110 && !out.includes(firstKw)) {
      const sep = lang === 'en' ? ' · ' : '｜';
      out = `${out}${sep}${kw}`;
    }
  }

  return out;
}

/**
 * Companion category for related-posts siloing
 */
export const COMPANION_CAT: Record<string, string> = {
  '住宿推薦':      '峇里島分區攻略',
  '峇里島分區攻略': '住宿推薦',
  '簽證通關':      '新手指南',
  '新手指南':      '旅行技巧',
  '旅行技巧':      '新手指南',
  '美食景點活動':   '峇里島分區攻略',
  '遊記分享':      '美食景點活動',
  '家庭親子':      '住宿推薦',
  '叫車包車':      '峇里島分區攻略',
  '新聞存檔':      '旅行技巧',
};
