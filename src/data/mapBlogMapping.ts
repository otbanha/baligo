/**
 * 地圖 ↔ Blog 對應表
 *
 * 用於 <RelatedGuideCard> 與 <RelatedMapCard> 元件
 * 每張地圖對應一篇 blog（或 null，代表尚未有對應文章）
 *
 * 錨文字三型變化，避免 26 張地圖出現重複 anchor 被 Google 視為 template footer link：
 *   - full    完整型：含主關鍵字 + 內容類型
 *   - verb    動詞型：行動導向
 *   - keyword 純關鍵字型：SEO 收錨用
 *
 * 元件使用範例：
 *   <RelatedGuideCard mapSlug="seminyak" position="hero" />
 *   position="hero" 用 full 錨文字
 *   position="inline" 用 verb 錨文字
 *   position="footer" 用 keyword 錨文字
 */

export interface MapBlogLink {
  /** Blog 完整網址。null 表示尚未有對應文章，元件不渲染卡片 */
  blogUrl: string | null;
  /** Blog 文章標題（顯示用） */
  blogTitle: string;
  /** 一句話 teaser，作為卡片副標 */
  teaser: string;
  /** 三組變化錨文字 */
  anchors: {
    full: string;
    verb: string;
    keyword: string;
  };
}

export const mapBlogMapping: Record<string, MapBlogLink> = {
  // ─────────────────────────────────────────────
  // 分區攻略地圖（13）
  // ─────────────────────────────────────────────

  "kuta": {
    blogUrl: "https://gobaligo.id/blog/kuta-guide/",
    blogTitle: "庫塔完整旅遊攻略",
    teaser: "衝浪、購物、夜生活，峇里島最熱鬧旅遊區一次玩透",
    anchors: {
      full: "庫塔景點美食完整攻略",
      verb: "閱讀庫塔旅遊指南",
      keyword: "庫塔自由行攻略",
    },
  },

  "seminyak": {
    blogUrl: "https://gobaligo.id/blog/seminyak-guide/",
    blogTitle: "水明漾完整旅遊攻略",
    teaser: "從精品酒吧到時尚餐廳，水明漾深度旅遊全指南",
    anchors: {
      full: "水明漾景點美食完整攻略",
      verb: "閱讀水明漾旅遊指南",
      keyword: "水明漾自由行攻略",
    },
  },

  "canggu": {
    blogUrl: "https://gobaligo.id/blog/canggu-guide/",
    blogTitle: "長谷 Canggu 完整旅遊攻略",
    teaser: "衝浪、稻田、咖啡廳，數位遊牧聖地全攻略",
    anchors: {
      full: "長谷 Canggu 景點美食完整攻略",
      verb: "閱讀長谷旅遊指南",
      keyword: "Canggu 自由行攻略",
    },
  },

  "nuanu": {
    blogUrl: "https://gobaligo.id/blog/nuanu-creative-city-luna-guide/",
    blogTitle: "Nuanu Creative City & Luna 完整介紹",
    teaser: "峇里島新興創意園區，藝術、科技與永續生活全攻略",
    anchors: {
      full: "Nuanu Creative City 完整介紹",
      verb: "探索 Nuanu Creative City",
      keyword: "Nuanu 創意園區指南",
    },
  },

  "ubud": {
    blogUrl: "https://gobaligo.id/blog/ubud-guide/",
    blogTitle: "烏布完整旅遊攻略",
    teaser: "梯田、寺廟、工藝，藝術文化之都全指南",
    anchors: {
      full: "烏布景點美食完整攻略",
      verb: "閱讀烏布旅遊指南",
      keyword: "烏布自由行攻略",
    },
  },

  "jimbaran": {
    blogUrl: "https://gobaligo.id/blog/jimbaran-guide/",
    blogTitle: "金巴蘭完整旅遊攻略",
    teaser: "海鮮燒烤晚餐、絕美夕陽，寧靜海灣深度玩法",
    anchors: {
      full: "金巴蘭景點美食完整攻略",
      verb: "閱讀金巴蘭旅遊指南",
      keyword: "金巴蘭自由行攻略",
    },
  },

  "uluwatu": {
    blogUrl: "https://gobaligo.id/blog/uluwatu-guide/",
    blogTitle: "烏魯瓦圖完整旅遊攻略",
    teaser: "懸崖寺廟、頂級衝浪點與無邊際泳池全指南",
    anchors: {
      full: "烏魯瓦圖景點美食完整攻略",
      verb: "閱讀烏魯瓦圖旅遊指南",
      keyword: "烏魯瓦圖自由行攻略",
    },
  },

  "nusa-dua": {
    blogUrl: "https://gobaligo.id/blog/nusa-dua-guide/",
    blogTitle: "努沙杜瓦完整旅遊攻略",
    teaser: "五星度假村聚集區，平靜海水與高端旅遊全指南",
    anchors: {
      full: "努沙杜瓦景點美食完整攻略",
      verb: "閱讀努沙杜瓦旅遊指南",
      keyword: "努沙杜瓦自由行攻略",
    },
  },

  "sanur": {
    blogUrl: "https://gobaligo.id/blog/sanur-guide/",
    blogTitle: "沙努爾完整旅遊攻略",
    teaser: "峇里島最早旅遊勝地，老城悠閒與日出絕景全攻略",
    anchors: {
      full: "沙努爾景點美食完整攻略",
      verb: "閱讀沙努爾旅遊指南",
      keyword: "沙努爾自由行攻略",
    },
  },

  "amed": {
    blogUrl: "https://gobaligo.id/blog/amed-tulamben-diving-guide/",
    blogTitle: "Amed / Tulamben 潛水完整攻略",
    teaser: "東峇里島潛水天堂，珊瑚礁與沉船遺址完整指南",
    anchors: {
      full: "Amed Tulamben 潛水完整攻略",
      verb: "閱讀 Amed 潛水指南",
      keyword: "峇里島東部潛水攻略",
    },
  },

  "nusa-penida": {
    blogUrl: "https://gobaligo.id/blog/nusa-penida-guide/",
    blogTitle: "佩尼達島完整旅遊攻略",
    teaser: "網美打卡聖地，斷崖奇景與蝠鱝潛水全指南",
    anchors: {
      full: "佩尼達島景點完整攻略",
      verb: "閱讀佩尼達島旅遊指南",
      keyword: "Nusa Penida 自由行攻略",
    },
  },

  "lembongan": {
    blogUrl: "https://gobaligo.id/blog/nusa-lembongan-ceningan-guide/",
    blogTitle: "藍夢島 & 金銀島完整旅遊攻略",
    teaser: "峇里島近郊跳島天堂，水上活動與輕鬆步調全指南",
    anchors: {
      full: "藍夢島金銀島完整攻略",
      verb: "閱讀藍夢島跳島指南",
      keyword: "Nusa Lembongan 自由行攻略",
    },
  },

  "denpasar": {
    blogUrl: "https://gobaligo.id/blog/denpasar-culture-guide/",
    blogTitle: "登巴薩在地文化攻略",
    teaser: "峇里島首府，在地市場、傳統美食與文化景點深度玩",
    anchors: {
      full: "登巴薩在地文化攻略",
      verb: "探索登巴薩在地生活",
      keyword: "登巴薩自由行攻略",
    },
  },

  // ─────────────────────────────────────────────
  // 主題地圖（13）
  // ─────────────────────────────────────────────

  "gojek-fare": {
    blogUrl: "https://gobaligo.id/blog/2026-03-18-bali-gojek-grab-guide/",
    blogTitle: "峇里島 Gojek / Grab 叫車完整教學",
    teaser: "從註冊到叫車，叫車 App 使用全攻略",
    anchors: {
      full: "峇里島 Gojek Grab 使用完整教學",
      verb: "學會用 Gojek 叫車",
      keyword: "峇里島叫車 App 攻略",
    },
  },

  "money-changer": {
    blogUrl: "https://gobaligo.id/blog/bali-currency-exchange-guide/",
    blogTitle: "峇里島換匯避雷指南",
    teaser: "識別合法換匯所、避開詐騙、匯率比較全攻略",
    anchors: {
      full: "峇里島換匯避雷完整指南",
      verb: "閱讀峇里島換匯攻略",
      keyword: "峇里島換錢指南",
    },
  },

  "atm": {
    blogUrl: null,
    blogTitle: "",
    teaser: "",
    anchors: { full: "", verb: "", keyword: "" },
  },

  "supermarket": {
    blogUrl: "https://gobaligo.id/blog/bali-supermarket-guide-map/",
    blogTitle: "峇里島超市購物完整指南",
    teaser: "Bintang、Pepito、Grand Lucky、Coco 等品牌全介紹",
    anchors: {
      full: "峇里島超市購物完整指南",
      verb: "閱讀峇里島超市介紹",
      keyword: "峇里島購物超市攻略",
    },
  },

  "sim-card": {
    blogUrl: "https://gobaligo.id/blog/bali-sim-card-esim-guide/",
    blogTitle: "峇里島 SIM 卡 / eSIM / 漫遊比較指南",
    teaser: "Telkomsel、XL、Indosat 比較與機場購卡全攻略",
    anchors: {
      full: "峇里島 SIM 卡 eSIM 完整比較",
      verb: "閱讀 SIM 卡選擇指南",
      keyword: "峇里島網路 SIM 卡攻略",
    },
  },

  "motorbike-rental": {
    blogUrl: "https://gobaligo.id/blog/bali-motorbike-rental-tips/",
    blogTitle: "峇里島租機車注意事項",
    teaser: "日租價格、保險、駕照與安全注意事項全攻略",
    anchors: {
      full: "峇里島租機車完整攻略",
      verb: "閱讀租機車注意事項",
      keyword: "峇里島機車租賃指南",
    },
  },

  "tourist-police": {
    blogUrl: "https://gobaligo.id/blog/bali-emergency-guide/",
    blogTitle: "峇里島緊急求助指南 2026",
    teaser: "旅遊警察電話、國際醫院、各國代表處，出發前存進手機的救命懶人包",
    anchors: {
      full: "峇里島緊急電話與旅遊警察完整指南",
      verb: "閱讀峇里島緊急求助攻略",
      keyword: "峇里島旅遊警察指南",
    },
  },

  "hospital": {
    blogUrl: null,
    blogTitle: "",
    teaser: "",
    anchors: { full: "", verb: "", keyword: "" },
  },

  "canggu-hotel": {
    blogUrl: "https://gobaligo.id/blog/canggu-top-hotels-guide/",
    blogTitle: "長谷頂級住宿推薦",
    teaser: "海灘度假村、精品旅館與 Villa 完整評比",
    anchors: {
      full: "長谷住宿完整推薦",
      verb: "閱讀長谷住宿評比",
      keyword: "Canggu 飯店推薦",
    },
  },

  "seminyak-hotel": {
    blogUrl: "https://gobaligo.id/blog/seminyak-beach-resorts-guide/",
    blogTitle: "水明漾濱海度假村推薦",
    teaser: "精品 Villa、濱海酒店完整評比",
    anchors: {
      full: "水明漾濱海度假村完整推薦",
      verb: "閱讀水明漾住宿評比",
      keyword: "水明漾飯店推薦",
    },
  },

  "seminyak-eat-street": {
    blogUrl: "https://gobaligo.id/blog/seminyak-eat-street-guide/",
    blogTitle: "水明漾 Eat Street 美食指南",
    teaser: "從早午餐到晚餐，美食街精選餐廳一次掌握",
    anchors: {
      full: "水明漾 Eat Street 完整美食指南",
      verb: "閱讀 Eat Street 餐廳介紹",
      keyword: "水明漾美食街攻略",
    },
  },

  "ubud-villa": {
    blogUrl: "https://gobaligo.id/blog/ubud-villas-pool-guide/",
    blogTitle: "烏布私人泳池 Villa 推薦",
    teaser: "精選烏布 Villa，私人泳池與田園景觀完整介紹",
    anchors: {
      full: "烏布私人泳池 Villa 完整推薦",
      verb: "閱讀烏布 Villa 介紹",
      keyword: "烏布 Villa 推薦",
    },
  },

  "vegetarian": {
    blogUrl: "https://gobaligo.id/blog/bali-vegan-restaurants-guide/",
    blogTitle: "峇里島素食餐廳指南",
    teaser: "26 間素食友善餐廳完整評比，涵蓋各大熱門區域",
    anchors: {
      full: "峇里島素食餐廳完整指南",
      verb: "閱讀峇里島素食介紹",
      keyword: "峇里島蔬食餐廳推薦",
    },
  },
};

/**
 * 取得地圖對應的 blog 連結資料
 * @param mapSlug 地圖 slug（如 "seminyak"）
 * @returns 對應的 blog 資料；若無對應 blog 回傳 null
 */
export function getMapBlogLink(mapSlug: string): MapBlogLink | null {
  const entry = mapBlogMapping[mapSlug];
  if (!entry || !entry.blogUrl) return null;
  return entry;
}

/**
 * 反向查詢：給定 blog URL，回傳對應的 mapSlug
 * 用於 blog 頁面渲染 <RelatedMapCard />
 */
export function getMapSlugByBlogUrl(blogUrl: string): string | null {
  const normalized = blogUrl.replace(/\/$/, "");
  for (const [slug, entry] of Object.entries(mapBlogMapping)) {
    if (entry.blogUrl?.replace(/\/$/, "") === normalized) {
      return slug;
    }
  }
  return null;
}

/**
 * 取得指定位置該用哪一型錨文字
 */
export function getAnchorText(
  mapSlug: string,
  position: "hero" | "inline" | "footer"
): string | null {
  const entry = mapBlogMapping[mapSlug];
  if (!entry || !entry.blogUrl) return null;
  const map = {
    hero: entry.anchors.full,
    inline: entry.anchors.verb,
    footer: entry.anchors.keyword,
  };
  return map[position];
}
