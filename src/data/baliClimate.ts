// 峇里島逐月氣候與適合旅遊指數
//
// 資料來源：Go Bali Go 自有整理（原始圖表見 /blog/bali-rainy-season-travel-guide/）。
// 原本這份表只存在於一張 PNG 圖表裡，搜尋引擎讀不到；改成結構化資料後
// 可同時輸出成 /weather/ 的 HTML 表格與 JSON-LD，讓 Google 與 AI 摘要抓得到。
//
// 註：這裡不用 ERA5 等重分析資料的「降雨天數」。ERA5 對熱帶毛毛雨嚴重高估
// （7 月庫塔會算出 15–18 個雨天，實際只有 1–3 天），拿來做月份對照會誤導讀者。

export type Season = 'wet' | 'dry' | 'shoulder';

export interface ClimateMonth {
  /** 1–12 */
  month: number;
  season: Season;
  /** 平均降雨機率（%），區間 */
  rainChance: [number, number];
  /** 該月大約的降雨天數，區間 */
  rainDays: [number, number];
  /** 平均氣溫（°C）低—高 */
  temp: [number, number];
  /** 適合旅遊指數（%），100 為最佳 */
  travelScore: number;
  /** 該月旅遊建議 */
  advice: string;
}

export const SEASON_LABEL: Record<Season, string> = {
  wet: '雨季',
  dry: '乾季',
  shoulder: '過渡期',
};

export const BALI_CLIMATE: ClimateMonth[] = [
  { month: 1,  season: 'wet',      rainChance: [60, 80], rainDays: [10, 15], temp: [24, 31], travelScore: 60,  advice: '降雨較頻繁，規劃戶外活動需有備案' },
  { month: 2,  season: 'wet',      rainChance: [60, 75], rainDays: [10, 15], temp: [24, 31], travelScore: 55,  advice: '仍然潮濕，但有間歇晴天，適合短途出遊' },
  { month: 3,  season: 'wet',      rainChance: [50, 70], rainDays: [7, 11],  temp: [25, 32], travelScore: 70,  advice: '雨勢漸減，適合適當規劃戶外行程' },
  { month: 4,  season: 'shoulder', rainChance: [30, 50], rainDays: [5, 9],   temp: [25, 32], travelScore: 85,  advice: '轉乾季，氣候宜人，適合各種戶外活動' },
  { month: 5,  season: 'dry',      rainChance: [20, 40], rainDays: [4, 8],   temp: [25, 31], travelScore: 95,  advice: '天氣穩定，乾爽宜人，適合各種活動' },
  { month: 6,  season: 'dry',      rainChance: [10, 30], rainDays: [2, 4],   temp: [24, 31], travelScore: 100, advice: '乾爽舒適，適合戶外探險與海灘活動' },
  { month: 7,  season: 'dry',      rainChance: [10, 20], rainDays: [1, 3],   temp: [24, 31], travelScore: 90,  advice: '峇里島最乾爽的月份之一，但暑假人較多' },
  { month: 8,  season: 'dry',      rainChance: [10, 20], rainDays: [1, 3],   temp: [24, 31], travelScore: 90,  advice: '適合浮潛、潛水、沙灘活動，暑假人較多' },
  { month: 9,  season: 'dry',      rainChance: [15, 30], rainDays: [2, 4],   temp: [24, 30], travelScore: 100, advice: '微涼舒適，適合戶外活動，遊客較少' },
  { month: 10, season: 'shoulder', rainChance: [30, 50], rainDays: [5, 9],   temp: [25, 30], travelScore: 85,  advice: '開始有午後雷陣雨，需注意天氣變化' },
  { month: 11, season: 'wet',      rainChance: [50, 70], rainDays: [10, 15], temp: [24, 30], travelScore: 60,  advice: '下雨的天數增多，規劃戶外活動需有備案' },
  { month: 12, season: 'wet',      rainChance: [60, 80], rainDays: [10, 15], temp: [24, 31], travelScore: 50,  advice: '雨水豐沛，較適合室內行程' },
];

/** 指數最高的月份（並列時全部回傳） */
export const BEST_MONTHS = BALI_CLIMATE
  .filter((m) => m.travelScore === Math.max(...BALI_CLIMATE.map((x) => x.travelScore)))
  .map((m) => m.month);

/** 指數最低的月份 */
export const WORST_MONTH = BALI_CLIMATE
  .reduce((lo, m) => (m.travelScore < lo.travelScore ? m : lo)).month;
