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
 * 2. Category keyword suffix (if description is short)
 */
export function enhancedDescription(desc: string, cats: string[], lang: string): string {
  let out = lang === 'zh-hk' ? applyHkSubs(desc) : desc;

  const langKey = ['en', 'zh-cn', 'zh-hk'].includes(lang) ? lang : 'zh-tw';

  for (const cat of cats) {
    const kwMap = CAT_KEYWORDS[cat];
    if (!kwMap) continue;
    const kw = kwMap[langKey] ?? kwMap['zh-tw'];
    if (!kw) continue;
    // Append only when description is short enough (Google shows ~155 chars)
    // and doesn't already contain the first keyword token
    const firstKw = kw.split(/[、·]/)[0].trim();
    if (out.length < 110 && !out.includes(firstKw)) {
      const sep = lang === 'en' ? ' · ' : '｜';
      out = `${out}${sep}${kw}`;
    }
    break;
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
