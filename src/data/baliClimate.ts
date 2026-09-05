// 峇里島逐月氣候與適合旅遊指數
//
// 資料來源：Go Bali Go 自有整理（原始圖表見 /blog/bali-rainy-season-travel-guide/）。
// 原本這份表只存在於一張 PNG 圖表裡，搜尋引擎讀不到；改成結構化資料後
// 可同時輸出成 /weather/ 的 HTML 表格與 JSON-LD，讓 Google 與 AI 摘要抓得到。
//
// 註：這裡不用 ERA5 等重分析資料的「降雨天數」。ERA5 對熱帶毛毛雨嚴重高估
// （7 月庫塔會算出 15–18 個雨天，實際只有 1–3 天），拿來做月份對照會誤導讀者。

export type WeatherLang = 'zh-tw' | 'zh-cn' | 'zh-hk' | 'en' | 'id';

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
}

/** 數值部分與語言無關，各語言共用同一份 */
export const BALI_CLIMATE: ClimateMonth[] = [
  { month: 1,  season: 'wet',      rainChance: [60, 80], rainDays: [10, 15], temp: [24, 31], travelScore: 60  },
  { month: 2,  season: 'wet',      rainChance: [60, 75], rainDays: [10, 15], temp: [24, 31], travelScore: 55  },
  { month: 3,  season: 'wet',      rainChance: [50, 70], rainDays: [7, 11],  temp: [25, 32], travelScore: 70  },
  { month: 4,  season: 'shoulder', rainChance: [30, 50], rainDays: [5, 9],   temp: [25, 32], travelScore: 85  },
  { month: 5,  season: 'dry',      rainChance: [20, 40], rainDays: [4, 8],   temp: [25, 31], travelScore: 95  },
  { month: 6,  season: 'dry',      rainChance: [10, 30], rainDays: [2, 4],   temp: [24, 31], travelScore: 100 },
  { month: 7,  season: 'dry',      rainChance: [10, 20], rainDays: [1, 3],   temp: [24, 31], travelScore: 90  },
  { month: 8,  season: 'dry',      rainChance: [10, 20], rainDays: [1, 3],   temp: [24, 31], travelScore: 90  },
  { month: 9,  season: 'dry',      rainChance: [15, 30], rainDays: [2, 4],   temp: [24, 30], travelScore: 100 },
  { month: 10, season: 'shoulder', rainChance: [30, 50], rainDays: [5, 9],   temp: [25, 30], travelScore: 85  },
  { month: 11, season: 'wet',      rainChance: [50, 70], rainDays: [10, 15], temp: [24, 30], travelScore: 60  },
  { month: 12, season: 'wet',      rainChance: [60, 80], rainDays: [10, 15], temp: [24, 31], travelScore: 50  },
];

export const SEASON_LABEL: Record<WeatherLang, Record<Season, string>> = {
  'zh-tw': { wet: '雨季',   dry: '乾季',      shoulder: '過渡期' },
  'zh-cn': { wet: '雨季',   dry: '干季',      shoulder: '过渡期' },
  'zh-hk': { wet: '雨季',   dry: '乾季',      shoulder: '過渡期' },
  'en':    { wet: 'Wet',    dry: 'Dry',       shoulder: 'Shoulder' },
  'id':    { wet: 'Hujan',  dry: 'Kemarau',   shoulder: 'Peralihan' },
};

/** 每月旅遊建議，索引 0 = 1 月 */
export const CLIMATE_ADVICE: Record<WeatherLang, string[]> = {
  'zh-tw': [
    '降雨較頻繁，規劃戶外活動需有備案',
    '仍然潮濕，但有間歇晴天，適合短途出遊',
    '雨勢漸減，適合適當規劃戶外行程',
    '轉乾季，氣候宜人，適合各種戶外活動',
    '天氣穩定，乾爽宜人，適合各種活動',
    '乾爽舒適，適合戶外探險與海灘活動',
    '峇里島最乾爽的月份之一，但暑假人較多',
    '適合浮潛、潛水、沙灘活動，暑假人較多',
    '微涼舒適，適合戶外活動，遊客較少',
    '開始有午後雷陣雨，需注意天氣變化',
    '下雨的天數增多，規劃戶外活動需有備案',
    '雨水豐沛，較適合室內行程',
  ],
  'zh-cn': [
    '降雨较频繁，规划户外活动需有备案',
    '仍然潮湿，但有间歇晴天，适合短途出游',
    '雨势渐减，适合适当规划户外行程',
    '转干季，气候宜人，适合各种户外活动',
    '天气稳定，干爽宜人，适合各种活动',
    '干爽舒适，适合户外探险与海滩活动',
    '巴厘岛最干爽的月份之一，但暑假人较多',
    '适合浮潜、潜水、沙滩活动，暑假人较多',
    '微凉舒适，适合户外活动，游客较少',
    '开始有午后雷阵雨，需注意天气变化',
    '下雨的天数增多，规划户外活动需有备案',
    '雨水丰沛，较适合室内行程',
  ],
  'zh-hk': [
    '落雨較頻密，戶外活動要預埋後備方案',
    '仍然潮濕，但有間歇晴天，啱短途出遊',
    '雨勢漸減，可以開始安排戶外行程',
    '轉乾季，天氣宜人，啱各種戶外活動',
    '天氣穩定，乾爽舒服，啱各種活動',
    '乾爽舒適，啱戶外探險同沙灘活動',
    '峇里島最乾爽嘅月份之一，不過暑假人多',
    '啱浮潛、潛水、沙灘活動，暑假人多',
    '微涼舒服，啱戶外活動，遊客較少',
    '開始有午後雷暴，要留意天氣變化',
    '落雨日數增加，戶外活動要預埋後備方案',
    '雨水多，比較啱室內行程',
  ],
  'en': [
    'Frequent rain — keep an indoor backup for outdoor plans',
    'Still humid, but with sunny spells; fine for short trips',
    'Rain easing off; outdoor plans become workable again',
    'Turning dry and pleasant, good for all outdoor activities',
    'Stable and dry — comfortable for just about anything',
    'Dry and comfortable; ideal for hiking and beach days',
    "One of Bali's driest months, but busy with summer holidays",
    'Great for snorkelling, diving and beach days; still busy',
    'Mild and comfortable, good for outdoors, fewer tourists',
    'Afternoon thunderstorms return — keep an eye on the forecast',
    'More rainy days; keep a backup plan for outdoor activities',
    'Heaviest rain of the year — lean towards indoor plans',
  ],
  'id': [
    'Hujan cukup sering — siapkan rencana cadangan untuk aktivitas luar',
    'Masih lembap, tapi ada jeda cerah; cocok untuk trip singkat',
    'Hujan mulai mereda, aktivitas luar ruang mulai nyaman',
    'Mulai kemarau, cuaca nyaman untuk semua aktivitas luar',
    'Cuaca stabil dan kering, nyaman untuk segala kegiatan',
    'Kering dan nyaman; ideal untuk petualangan dan hari pantai',
    'Salah satu bulan terkering, tapi ramai karena libur musim panas',
    'Cocok untuk snorkeling, diving, dan pantai; masih ramai',
    'Sejuk dan nyaman, bagus untuk luar ruang, wisatawan lebih sedikit',
    'Hujan sore mulai muncul lagi — perhatikan prakiraan',
    'Hari hujan bertambah; siapkan rencana cadangan',
    'Curah hujan tertinggi — lebih cocok untuk agenda indoor',
  ],
};

const MAX_SCORE = Math.max(...BALI_CLIMATE.map((m) => m.travelScore));

/** 指數最高的月份（並列時全部回傳） */
export const BEST_MONTHS = BALI_CLIMATE
  .filter((m) => m.travelScore === MAX_SCORE)
  .map((m) => m.month);

/** 指數最低的月份 */
export const WORST_MONTH = BALI_CLIMATE
  .reduce((lo, m) => (m.travelScore < lo.travelScore ? m : lo)).month;

/** 指數最低的月份的分數，給文案引用 */
export const WORST_SCORE = BALI_CLIMATE
  .reduce((lo, m) => (m.travelScore < lo.travelScore ? m : lo)).travelScore;
