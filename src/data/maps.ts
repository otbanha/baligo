export interface MapArea {
  slug: string;
  name: string;
  nameEn: string;
  description: string;
  center: [number, number];
  zoom: number;
  kml: string;
  emoji: string;
  isThematic?: boolean;
}

export const maps: MapArea[] = [
  {
    slug: "kuta",
    name: "庫塔",
    nameEn: "Kuta",
    description: "峇里島最熱鬧的旅遊區，購物、夜生活、衝浪一次滿足",
    center: [-8.7195, 115.1686],
    zoom: 15,
    kml: "/maps/kuta.kml",
    emoji: "🏄",
  },
  {
    slug: "seminyak",
    name: "水明漾",
    nameEn: "Seminyak",
    description: "精品酒吧、時尚餐廳與頂級 Villa 的聚集地",
    center: [-8.6897, 115.1612],
    zoom: 15,
    kml: "/maps/seminyak.kml",
    emoji: "🍹",
  },
  {
    slug: "canggu",
    name: "長谷",
    nameEn: "Canggu",
    description: "衝浪客與數位遊牧民族的天堂，咖啡廳與稻田並存",
    center: [-8.6478, 115.1385],
    zoom: 15,
    kml: "/maps/canggu.kml",
    emoji: "🌊",
  },
  {
    slug: "nuanu",
    name: "Nuanu Creative City",
    nameEn: "Nuanu Creative City",
    description: "峇里島新興創意園區，匯集藝術、科技與永續生活",
    center: [-8.6295, 115.0978],
    zoom: 15,
    kml: "/maps/nuanu.kml",
    emoji: "🎨",
  },
  {
    slug: "ubud",
    name: "烏布",
    nameEn: "Ubud",
    description: "藝術文化之都，梯田、寺廟與傳統工藝的精髓所在",
    center: [-8.5069, 115.2625],
    zoom: 15,
    kml: "/maps/ubud.kml",
    emoji: "🌿",
  },
  {
    slug: "jimbaran",
    name: "金巴蘭",
    nameEn: "Jimbaran",
    description: "以海鮮燒烤晚餐與絕美夕陽聞名的寧靜海灣",
    center: [-8.7880, 115.1500],
    zoom: 13,
    kml: "/maps/jimbaran.kml",
    emoji: "🦞",
  },
  {
    slug: "uluwatu",
    name: "烏魯瓦圖",
    nameEn: "Uluwatu",
    description: "懸崖寺廟、頂級衝浪點與無邊際泳池的奢華體驗",
    center: [-8.8220, 115.1180],
    zoom: 13,
    kml: "/maps/uluwatu.kml",
    emoji: "🏯",
  },
  {
    slug: "nusa-dua",
    name: "努沙杜瓦",
    nameEn: "Nusa Dua",
    description: "五星級度假村聚集的高端旅遊區，海水清澈平靜",
    center: [-8.8004, 115.2320],
    zoom: 15,
    kml: "/maps/nusa-dua.kml",
    emoji: "🏨",
  },
  {
    slug: "sanur",
    name: "沙努爾",
    nameEn: "Sanur",
    description: "悠閒的老城區，峇里島最早的旅遊勝地，日出絕美",
    center: [-8.7024, 115.2622],
    zoom: 15,
    kml: "/maps/sanur.kml",
    emoji: "🌅",
  },
  {
    slug: "amed",
    name: "Amed / Tulamben",
    nameEn: "Amed / Tulamben",
    description: "東峇里島的潛水天堂，珊瑚礁與沉船遺址令人嘆為觀止",
    center: [-8.3280, 115.6350],
    zoom: 12,
    kml: "/maps/amed.kml",
    emoji: "🤿",
  },
  {
    slug: "nusa-penida",
    name: "佩尼達島",
    nameEn: "Nusa Penida",
    description: "網美打卡聖地，斷崖奇景與蝠鱝潛水令人震撼",
    center: [-8.7278, 115.5440],
    zoom: 13,
    kml: "/maps/nusa-penida.kml",
    emoji: "🦅",
  },
  {
    slug: "lembongan",
    name: "藍夢島 & 金銀島",
    nameEn: "Nusa Lembongan & Ceningan",
    description: "峇里島近郊的小島天堂，水上活動豐富、節奏輕鬆",
    center: [-8.6833, 115.4533],
    zoom: 14,
    kml: "/maps/lembongan.kml",
    emoji: "🏝️",
  },
  {
    slug: "denpasar",
    name: "登巴薩",
    nameEn: "Denpasar",
    description: "峇里島首府，在地市場、傳統美食與文化景點的真實峇里",
    center: [-8.6705, 115.2126],
    zoom: 14,
    kml: "/maps/denpasar.kml",
    emoji: "🏙️",
  },
  {
    slug: "vegetarian",
    name: "峇里島素食餐廳 Top 26",
    nameEn: "Top 26 Vegetarian Restaurants",
    description: "精選峇里島 26 間素食友善餐廳，涵蓋各大熱門區域",
    center: [-8.7195, 115.1686],
    zoom: 12,
    kml: "/maps/vegetarian.kml",
    emoji: "🥗",
    isThematic: true,
  },
  {
    slug: "ubud-villa",
    name: "烏布 Villa 推薦",
    nameEn: "Best Villas in Ubud",
    description: "精選烏布私人泳池 Villa，含地圖定位與詳細介紹",
    center: [-8.5069, 115.2625],
    zoom: 14,
    kml: "/maps/ubud-villa.kml",
    emoji: "🏡",
    isThematic: true,
  },
];

export function getMapBySlug(slug: string): MapArea | undefined {
  return maps.find((m) => m.slug === slug);
}

export const areaMaps = maps.filter((m) => !m.isThematic);
export const thematicMaps = maps.filter((m) => m.isThematic);
