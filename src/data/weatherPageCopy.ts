// /weather/ 五個語言版本的頁面文案。
//
// 版面與樣式在 src/components/WeatherPageBody.astro，五種語言共用一份 markup；
// 這裡只放文字，避免 5 個 page 檔各自複製 500 行後漸漸走鐘。
// FAQ 的答案是純文字（沒有標籤），因為同一份內容要餵給 FAQPage JSON-LD。

import type { WeatherLang } from './baliClimate';
import { BEST_MONTHS, WORST_MONTH, WORST_SCORE } from './baliClimate';

export interface FaqItem {
  q: string;
  a: string;
}

export interface RelatedLink {
  slug: string;
  text: string;
}

export interface WeatherCopy {
  htmlLang: string;
  inLanguage: string;
  /** 這個語言版的頁面路徑 */
  path: string;
  homePath: string;
  /** 內文連結的部落格前綴，例如 '/zh-cn/blog' */
  blogPrefix: string;
  breadcrumbHome: string;
  breadcrumbSelf: string;
  placeName: string;
  title: (year: number) => string;
  description: string;
  h1: string;
  subtitle: string;
  /** 導言，含 <strong> 標記，以 set:html 輸出 */
  ledeHtml: string;

  monthNames: string[];
  monthlyH2: string;
  monthlyIntro: string;
  tableHint: string;
  tableCaption: string;
  th: {
    month: string;
    season: string;
    rainChance: string;
    rainDays: string;
    temp: string;
    score: string;
    advice: string;
  };
  /** 降雨天數欄位的單位，接在數字後面（英文/印尼文為 ' days' / ' hari'） */
  daysUnit: string;

  seasonsH2: string;
  seasonsIntroHtml: string;
  dryTitle: string;
  dryPoints: string[];
  wetTitle: string;
  wetPoints: string[];
  seasonsOutroHtml: string;

  wearH2: string;
  wearPointsHtml: string[];

  regionsH2: string;
  regionPointsHtml: string[];

  faqH2: string;
  faqs: FaqItem[];

  camsH2: string;
  camsIntro: string;
  camLabels: [string, string];
  playAria: (label: string) => string;

  readMoreH2: string;
  bannerAlt: string;
  links: RelatedLink[];
}

const BEST = BEST_MONTHS;

// 中文版文案直接講「6 月與 9 月」讀起來自然，英文／印尼文的散文段落講
// "months 6 and 9" 就很生硬，所以另外備一份完整月份名給那兩個語言的內文用。
const EN_MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ID_MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const EN_BEST = BEST.map((m) => EN_MONTHS_LONG[m - 1]).join(' and ');
const EN_WORST = EN_MONTHS_LONG[WORST_MONTH - 1];
const ID_BEST = BEST.map((m) => ID_MONTHS_LONG[m - 1]).join(' dan ');
const ID_WORST = ID_MONTHS_LONG[WORST_MONTH - 1];

const COPY: Record<WeatherLang, WeatherCopy> = {
  // ─────────────────────────────────────────────────────────── 繁體中文（台灣）
  'zh-tw': {
    htmlLang: 'zh-TW',
    inLanguage: 'zh-TW',
    path: '/weather/',
    homePath: '/',
    blogPrefix: '/blog',
    breadcrumbHome: '首頁',
    breadcrumbSelf: '峇里島天氣',
    placeName: '峇里島',
    title: (y) => `峇里島天氣${y}｜即時氣溫・7天預報・12個月雨季乾季對照表 - Gobaligo`,
    description: `峇里島即時天氣與 7 天預報（庫塔、烏布、努沙杜瓦），加上 12 個月降雨機率、雨天數、平均氣溫與適合旅遊指數對照表。${BEST.join('、')} 月最適合旅遊，${WORST_MONTH} 月最需備案；另有乾季雨季差別、幾月去最好、海邊與寺廟該穿什麼。`,
    h1: '峇里島天氣',
    subtitle: '即時氣溫・濕度・降雨・UV 指數・未來 7 天預報，資料來源 Open-Meteo，每 10 分鐘更新',
    ledeHtml: `<strong>先講結論：</strong>峇里島全年氣溫都在 <strong>24–32°C</strong>，季節差別在雨不在溫度。<strong>乾季 4–10 月</strong>晴朗少雨、<strong>雨季 11–3 月</strong>以午後短時陣雨為主，很少下一整天。綜合降雨機率與舒適度，<strong>${BEST.join(' 月與 ')} 月最適合旅遊</strong>（指數 100%），<strong>${WORST_MONTH} 月最低</strong>（${WORST_SCORE}%，雨多又逢跨年旺季）。往下看逐月對照表與現在的即時天氣。`,

    monthNames: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
    monthlyH2: '峇里島 12 個月天氣一覽表：降雨機率、雨天數、氣溫與適合旅遊指數',
    monthlyIntro: '很多人問「峇里島幾月去最好」，其實只看乾季雨季太粗糙——同樣是乾季，7、8 月碰上暑假人潮，6 月和 9 月則是又乾爽又清靜。下表把每個月的降雨機率、實際會下雨的天數、平均氣溫，以及我們綜合這些條件算出的「適合旅遊指數」放在一起，方便你直接挑月份。',
    tableHint: '← 表格可左右滑動查看完整欄位 →',
    tableCaption: '峇里島逐月氣候與適合旅遊指數對照表。降雨天數為全島平均，山區與東部、北部通常高於南部平地；適合旅遊指數由 Go Bali Go 依降雨、氣候舒適度與遊客量綜合評估。',
    th: { month: '月份', season: '季節', rainChance: '平均降雨機率', rainDays: '降雨天數', temp: '平均氣溫', score: '適合旅遊指數', advice: '旅遊建議' },
    daysUnit: ' 天',

    seasonsH2: '峇里島乾季與雨季差在哪？',
    seasonsIntroHtml: '峇里島位在南緯 8 度、離赤道很近，沒有四季，只有乾季與雨季之分。兩者的氣溫幾乎一樣（月均溫差不到 2°C），真正的差別是<strong>濕度、降雨頻率與遊客量</strong>。',
    dryTitle: '乾季（4–10 月）',
    dryPoints: [
      '晴天為主，濕度較低、風較乾爽',
      '海況穩定，浮潛、潛水、跳島最適合',
      '7–8 月是暑假旺季，房價與人潮高峰',
      '6 月、9 月同樣乾爽但人少，CP 值最高',
    ],
    wetTitle: '雨季（11–3 月）',
    wetPoints: [
      '以午後、傍晚的短時強降雨為主，多半一小時內結束',
      '早晚偏涼舒適，正午沒有乾季那麼曬',
      '機票與住宿明顯較便宜，遊客較少',
      '梯田、瀑布水量最足、最翠綠',
    ],
    seasonsOutroHtml: '還有一個常被忽略的重點：<strong>峇里島很少全島同時下雨</strong>。中部山區與東部、北部的降雨明顯多於南部平地，庫塔在下雨時，努沙杜瓦可能還是大晴天。所以看到「峇里島在下雨」的資訊，先確認講的是哪一區。',

    wearH2: '峇里島該穿什麼？',
    wearPointsHtml: [
      '<strong>白天海邊</strong>：短袖短褲＋涼鞋，防曬係數 50 以上；UV 指數常破 10，中午盡量找遮蔭',
      '<strong>烏布山區</strong>：山區比海邊低 2–4°C，早晚建議加一件薄外套或長袖',
      '<strong>參觀寺廟</strong>：必須遮住肩膀與膝蓋，多數寺廟門口有紗龍（Sarong）可租借',
      '<strong>雨季（11–3 月）</strong>：午後陣雨多為短時強降雨，帶一把輕便折傘或雨衣即可，不需要雨鞋',
      '<strong>冷氣與夜間</strong>：餐廳與車上冷氣通常很強，隨身帶一件薄外套會舒服很多',
      '<strong>火山日出行程</strong>：巴杜爾火山（Batur）清晨山頂只有 10–15°C，一定要帶外套與長褲',
    ],

    regionsH2: '峇里島各區天氣差異',
    regionPointsHtml: [
      '<strong>庫塔 / 水明漾 / 金巴蘭</strong>：海邊氣候，日曬強、UV 指數高，全島降雨最少的一帶',
      '<strong>烏布山區</strong>：海拔較高，氣溫比海邊低 2–4°C，早晚偏涼，午後對流雨比南部多',
      '<strong>努沙杜瓦</strong>：位於南端半島，風浪較小，適合浮潛與水上活動',
      '<strong>金塔馬尼 / 巴杜爾火山</strong>：海拔 1,500 公尺以上，清晨可低到 10°C 上下',
      '<strong>北部（羅威那）與東部（艾湄灣）</strong>：山的另一側，雨勢與南部常常完全不同步',
    ],

    faqH2: '峇里島天氣常見問題',
    faqs: [
      { q: '峇里島現在天氣如何？', a: '本頁上方的即時天氣區塊會顯示庫塔、烏布、努沙杜瓦三區的當下氣溫、體感溫度、濕度、降雨與 UV 指數，資料來自 Open-Meteo，每 10 分鐘更新一次，並附未來 7 天預報。' },
      { q: '峇里島幾月去最好？', a: `以降雨機率、雨天數與氣候舒適度綜合計算，${BEST.join(' 月與 ')} 月的適合旅遊指數達 100%：乾爽少雨、氣溫舒適，且遊客量比 7、8 月暑假旺季少。5 月（95%）與 4 月、10 月（85%）也很適合。最需要準備室內備案的是 ${WORST_MONTH} 月（${WORST_SCORE}%），雨水豐沛又逢聖誕跨年旺季。` },
      { q: '峇里島雨季和乾季各是幾月？', a: '乾季大約是 4 月到 10 月，晴天為主、濕度較低；雨季大約是 11 月到隔年 3 月，以午後雷陣雨為主。4 月與 10 月屬於過渡期，天氣介於兩者之間。' },
      { q: '峇里島雨季會下整天的雨嗎？', a: '通常不會。峇里島雨季的典型型態是午後或傍晚的短時強降雨，多半一小時內就結束，早上和夜間常是晴朗的。而且全島同時下雨的情況很少見——山區與東部、北部比南部平地容易下雨，南部海邊下雨時，烏布或努沙杜瓦不一定在下。' },
      { q: '去峇里島該穿什麼？', a: '全年都是短袖短褲加涼鞋的天氣。海邊日曬強、UV 指數常破 10，防曬係數 50 以上是必備；烏布等山區比海邊低 2–4°C，早晚建議加一件薄外套；參觀寺廟必須遮住肩膀與膝蓋，多數寺廟門口可租借紗龍（Sarong）。餐廳與車上冷氣通常很強，隨身一件薄外套會舒服很多。' },
      { q: '峇里島一年氣溫變化大嗎？', a: '不大。峇里島接近赤道，全年平均氣溫都在 24–32°C 之間，月均溫差不到 2°C。真正的季節差別在「濕度與降雨」，不在氣溫——這也是為什麼行李幾乎不用隨季節改變，改變的是要不要多帶一把折傘。' },
      { q: '峇里島雨季旅遊有什麼好處嗎？', a: '有。雨季遊客較少、機票與住宿價格明顯較低，氣溫也比乾季正午舒服一些，梯田與瀑布在雨季反而最翠綠水量最足。只要行程安排時預留室內備案（SPA、咖啡廳、購物中心、博物館），雨季一樣好玩。' },
    ],

    camsH2: '峇里島即時攝影機',
    camsIntro: '想直接看現在的天空長什麼樣子，點下面的畫面就會載入 YouTube 即時直播。',
    camLabels: ['峇里島南部（庫塔 / 水明漾一帶）', '烏布'],
    playAria: (l) => `播放${l}即時直播`,

    readMoreH2: '延伸閱讀：峇里島天氣與雨季攻略',
    bannerAlt: '峇里島1-12月適合旅遊指數大解析',
    links: [
      { slug: 'bali-weather-tips', text: '為什麼別再問峇里島的天氣？下雨又如何？' },
      { slug: 'bali-best-time-to-visit', text: '峇里島最佳旅遊時間？深入了解乾季、雨季／優缺點解析' },
      { slug: 'bali-south-rainy-season', text: '峇里島雨季降雨分析 - 南部地區的雨季體驗' },
      { slug: 'bali-rainy-season-travel-guide', text: '峇里島雨季月份／降雨機率／降雨天數／平均氣溫／適合旅遊指數…大解析' },
      { slug: 'bali-weather-myths-explained', text: '峇里島的天氣怎麼看？會不會下雨？旅人常見誤解一次破解' },
      { slug: '2026-bali-indoor-activities', text: '峇里島雨季：碰到下雨天怎麼辦？60 個室內備案攻略' },
    ],
  },

  // ─────────────────────────────────────────────────────────── 简体中文
  'zh-cn': {
    htmlLang: 'zh-CN',
    inLanguage: 'zh-CN',
    path: '/zh-cn/weather/',
    homePath: '/zh-cn/',
    blogPrefix: '/zh-cn/blog',
    breadcrumbHome: '首页',
    breadcrumbSelf: '巴厘岛天气',
    placeName: '巴厘岛',
    title: (y) => `巴厘岛天气${y}｜实时气温・7天预报・12个月雨季干季对照表 - Gobaligo`,
    description: `巴厘岛实时天气与 7 天预报（库塔、乌布、努沙杜瓦），加上 12 个月降雨概率、雨天数、平均气温与适合旅游指数对照表。${BEST.join('、')} 月最适合旅游，${WORST_MONTH} 月最需备案；另有干季雨季差别、几月去最好、海边与寺庙该穿什么。`,
    h1: '巴厘岛天气',
    subtitle: '实时气温・湿度・降雨・UV 指数・未来 7 天预报，数据来源 Open-Meteo，每 10 分钟更新',
    ledeHtml: `<strong>先讲结论：</strong>巴厘岛全年气温都在 <strong>24–32°C</strong>，季节差别在雨不在温度。<strong>干季 4–10 月</strong>晴朗少雨、<strong>雨季 11–3 月</strong>以午后短时阵雨为主，很少下一整天。综合降雨概率与舒适度，<strong>${BEST.join(' 月与 ')} 月最适合旅游</strong>（指数 100%），<strong>${WORST_MONTH} 月最低</strong>（${WORST_SCORE}%，雨多又逢跨年旺季）。往下看逐月对照表与现在的实时天气。`,

    monthNames: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
    monthlyH2: '巴厘岛 12 个月天气一览表：降雨概率、雨天数、气温与适合旅游指数',
    monthlyIntro: '很多人问「巴厘岛几月去最好」，其实只看干季雨季太粗糙——同样是干季，7、8 月碰上暑假人潮，6 月和 9 月则是又干爽又清静。下表把每个月的降雨概率、实际会下雨的天数、平均气温，以及我们综合这些条件算出的「适合旅游指数」放在一起，方便你直接挑月份。',
    tableHint: '← 表格可左右滑动查看完整栏位 →',
    tableCaption: '巴厘岛逐月气候与适合旅游指数对照表。降雨天数为全岛平均，山区与东部、北部通常高于南部平地；适合旅游指数由 Go Bali Go 依降雨、气候舒适度与游客量综合评估。',
    th: { month: '月份', season: '季节', rainChance: '平均降雨概率', rainDays: '降雨天数', temp: '平均气温', score: '适合旅游指数', advice: '旅游建议' },
    daysUnit: ' 天',

    seasonsH2: '巴厘岛干季与雨季差在哪？',
    seasonsIntroHtml: '巴厘岛位在南纬 8 度、离赤道很近，没有四季，只有干季与雨季之分。两者的气温几乎一样（月均温差不到 2°C），真正的差别是<strong>湿度、降雨频率与游客量</strong>。',
    dryTitle: '干季（4–10 月）',
    dryPoints: [
      '晴天为主，湿度较低、风较干爽',
      '海况稳定，浮潜、潜水、跳岛最适合',
      '7–8 月是暑假旺季，房价与人潮高峰',
      '6 月、9 月同样干爽但人少，性价比最高',
    ],
    wetTitle: '雨季（11–3 月）',
    wetPoints: [
      '以午后、傍晚的短时强降雨为主，多半一小时内结束',
      '早晚偏凉舒适，正午没有干季那么晒',
      '机票与住宿明显较便宜，游客较少',
      '梯田、瀑布水量最足、最翠绿',
    ],
    seasonsOutroHtml: '还有一个常被忽略的重点：<strong>巴厘岛很少全岛同时下雨</strong>。中部山区与东部、北部的降雨明显多于南部平地，库塔在下雨时，努沙杜瓦可能还是大晴天。所以看到「巴厘岛在下雨」的信息，先确认讲的是哪一区。',

    wearH2: '巴厘岛该穿什么？',
    wearPointsHtml: [
      '<strong>白天海边</strong>：短袖短裤＋凉鞋，防晒系数 50 以上；UV 指数常破 10，中午尽量找遮荫',
      '<strong>乌布山区</strong>：山区比海边低 2–4°C，早晚建议加一件薄外套或长袖',
      '<strong>参观寺庙</strong>：必须遮住肩膀与膝盖，多数寺庙门口有纱笼（Sarong）可租借',
      '<strong>雨季（11–3 月）</strong>：午后阵雨多为短时强降雨，带一把轻便折伞或雨衣即可，不需要雨鞋',
      '<strong>空调与夜间</strong>：餐厅与车上空调通常很强，随身带一件薄外套会舒服很多',
      '<strong>火山日出行程</strong>：巴图尔火山（Batur）清晨山顶只有 10–15°C，一定要带外套与长裤',
    ],

    regionsH2: '巴厘岛各区天气差异',
    regionPointsHtml: [
      '<strong>库塔 / 水明漾 / 金巴兰</strong>：海边气候，日晒强、UV 指数高，全岛降雨最少的一带',
      '<strong>乌布山区</strong>：海拔较高，气温比海边低 2–4°C，早晚偏凉，午后对流雨比南部多',
      '<strong>努沙杜瓦</strong>：位于南端半岛，风浪较小，适合浮潜与水上活动',
      '<strong>金塔马尼 / 巴图尔火山</strong>：海拔 1,500 米以上，清晨可低到 10°C 上下',
      '<strong>北部（罗威那）与东部（艾湄湾）</strong>：山的另一侧，雨势与南部常常完全不同步',
    ],

    faqH2: '巴厘岛天气常见问题',
    faqs: [
      { q: '巴厘岛现在天气如何？', a: '本页上方的实时天气区块会显示库塔、乌布、努沙杜瓦三区的当下气温、体感温度、湿度、降雨与 UV 指数，数据来自 Open-Meteo，每 10 分钟更新一次，并附未来 7 天预报。' },
      { q: '巴厘岛几月去最好？', a: `以降雨概率、雨天数与气候舒适度综合计算，${BEST.join(' 月与 ')} 月的适合旅游指数达 100%：干爽少雨、气温舒适，且游客量比 7、8 月暑假旺季少。5 月（95%）与 4 月、10 月（85%）也很适合。最需要准备室内备案的是 ${WORST_MONTH} 月（${WORST_SCORE}%），雨水丰沛又逢圣诞跨年旺季。` },
      { q: '巴厘岛雨季和干季各是几月？', a: '干季大约是 4 月到 10 月，晴天为主、湿度较低；雨季大约是 11 月到隔年 3 月，以午后雷阵雨为主。4 月与 10 月属于过渡期，天气介于两者之间。' },
      { q: '巴厘岛雨季会下整天的雨吗？', a: '通常不会。巴厘岛雨季的典型型态是午后或傍晚的短时强降雨，多半一小时内就结束，早上和夜间常是晴朗的。而且全岛同时下雨的情况很少见——山区与东部、北部比南部平地容易下雨，南部海边下雨时，乌布或努沙杜瓦不一定在下。' },
      { q: '去巴厘岛该穿什么？', a: '全年都是短袖短裤加凉鞋的天气。海边日晒强、UV 指数常破 10，防晒系数 50 以上是必备；乌布等山区比海边低 2–4°C，早晚建议加一件薄外套；参观寺庙必须遮住肩膀与膝盖，多数寺庙门口可租借纱笼（Sarong）。餐厅与车上空调通常很强，随身一件薄外套会舒服很多。' },
      { q: '巴厘岛一年气温变化大吗？', a: '不大。巴厘岛接近赤道，全年平均气温都在 24–32°C 之间，月均温差不到 2°C。真正的季节差别在「湿度与降雨」，不在气温——这也是为什么行李几乎不用随季节改变，改变的是要不要多带一把折伞。' },
      { q: '巴厘岛雨季旅游有什么好处吗？', a: '有。雨季游客较少、机票与住宿价格明显较低，气温也比干季正午舒服一些，梯田与瀑布在雨季反而最翠绿水量最足。只要行程安排时预留室内备案（SPA、咖啡厅、购物中心、博物馆），雨季一样好玩。' },
    ],

    camsH2: '巴厘岛实时摄影机',
    camsIntro: '想直接看现在的天空长什么样子，点下面的画面就会载入 YouTube 实时直播。',
    camLabels: ['巴厘岛南部（库塔 / 水明漾一带）', '乌布'],
    playAria: (l) => `播放${l}实时直播`,

    readMoreH2: '延伸阅读：巴厘岛天气与雨季攻略',
    bannerAlt: '巴厘岛1-12月适合旅游指数大解析',
    links: [
      { slug: 'bali-weather-tips', text: '为什么别再问巴厘岛的天气？下雨又如何？' },
      { slug: 'bali-best-time-to-visit', text: '巴厘岛最佳旅游时间？深入了解干季、雨季／优缺点解析' },
      { slug: 'bali-south-rainy-season', text: '巴厘岛雨季降雨分析 - 南部地区的雨季体验' },
      { slug: 'bali-rainy-season-travel-guide', text: '巴厘岛雨季月份／降雨概率／降雨天数／平均气温／适合旅游指数…大解析' },
      { slug: 'bali-weather-myths-explained', text: '巴厘岛的天气怎么看？会不会下雨？旅人常见误解一次破解' },
      { slug: '2026-bali-indoor-activities', text: '巴厘岛雨季：碰到下雨天怎么办？60 个室内备案攻略' },
    ],
  },

  // ─────────────────────────────────────────────────────────── 繁體中文（香港）
  'zh-hk': {
    htmlLang: 'zh-HK',
    inLanguage: 'zh-HK',
    path: '/zh-hk/weather/',
    homePath: '/zh-hk/',
    blogPrefix: '/zh-hk/blog',
    breadcrumbHome: '首頁',
    breadcrumbSelf: '峇里島天氣',
    placeName: '峇里島',
    title: (y) => `峇里島天氣${y}｜即時氣溫・7天預報・12個月雨季乾季對照表 - Gobaligo`,
    description: `峇里島即時天氣同 7 天預報（庫塔、烏布、努沙杜瓦），仲有 12 個月降雨機率、落雨日數、平均氣溫同適合旅遊指數對照表。${BEST.join('、')} 月最啱去，${WORST_MONTH} 月最需要後備方案；另有乾季雨季分別、幾月去最好、海邊同寺廟應該著咩。`,
    h1: '峇里島天氣',
    subtitle: '即時氣溫・濕度・降雨・UV 指數・未來 7 天預報，資料來源 Open-Meteo，每 10 分鐘更新',
    ledeHtml: `<strong>先講結論：</strong>峇里島全年氣溫都喺 <strong>24–32°C</strong>，季節分別喺雨唔喺溫度。<strong>乾季 4–10 月</strong>天晴少雨、<strong>雨季 11–3 月</strong>主要係午後短暫大雨，好少落成日。綜合降雨機率同舒適度，<strong>${BEST.join(' 月同 ')} 月最啱去</strong>（指數 100%），<strong>${WORST_MONTH} 月最低</strong>（${WORST_SCORE}%，雨多又撞正跨年旺季）。往下睇逐月對照表同而家嘅即時天氣。`,

    monthNames: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月'],
    monthlyH2: '峇里島 12 個月天氣一覽表：降雨機率、落雨日數、氣溫同適合旅遊指數',
    monthlyIntro: '好多人問「峇里島幾月去最好」，其實淨係睇乾季雨季太粗略——同樣係乾季，7、8 月撞正暑假人潮，6 月同 9 月就係又乾爽又清靜。下表將每個月嘅降雨機率、實際會落雨嘅日數、平均氣溫，同埋我哋綜合呢啲條件計出嚟嘅「適合旅遊指數」放埋一齊，方便你直接揀月份。',
    tableHint: '← 表格可以左右掃睇齊所有欄位 →',
    tableCaption: '峇里島逐月氣候同適合旅遊指數對照表。落雨日數係全島平均，山區同東部、北部通常高過南部平地；適合旅遊指數由 Go Bali Go 按降雨、氣候舒適度同遊客量綜合評估。',
    th: { month: '月份', season: '季節', rainChance: '平均降雨機率', rainDays: '落雨日數', temp: '平均氣溫', score: '適合旅遊指數', advice: '旅遊建議' },
    daysUnit: ' 日',

    seasonsH2: '峇里島乾季同雨季分別喺邊？',
    seasonsIntroHtml: '峇里島喺南緯 8 度、離赤道好近，冇四季，只有乾季同雨季之分。兩者嘅氣溫幾乎一樣（月均溫差唔夠 2°C），真正嘅分別係<strong>濕度、落雨頻率同遊客量</strong>。',
    dryTitle: '乾季（4–10 月）',
    dryPoints: [
      '主要係天晴，濕度較低、風較乾爽',
      '海面穩定，浮潛、潛水、跳島最啱',
      '7–8 月係暑假旺季，房價同人潮高峰',
      '6 月、9 月一樣乾爽但人少，最抵玩',
    ],
    wetTitle: '雨季（11–3 月）',
    wetPoints: [
      '主要係午後、黃昏嘅短暫大雨，多數一個鐘內收',
      '朝早同夜晚涼啲舒服，晏晝冇乾季咁曬',
      '機票同住宿明顯平好多，遊客較少',
      '梯田、瀑布水量最足、最翠綠',
    ],
    seasonsOutroHtml: '仲有一個經常被忽略嘅重點：<strong>峇里島好少全島同時落雨</strong>。中部山區同東部、北部嘅降雨明顯多過南部平地，庫塔落緊雨嘅時候，努沙杜瓦可能仲係大晴天。所以見到「峇里島落緊雨」嘅資訊，先確認講緊邊一區。',

    wearH2: '峇里島應該著咩？',
    wearPointsHtml: [
      '<strong>日頭海邊</strong>：短袖短褲＋涼鞋，防曬系數 50 以上；UV 指數成日爆 10，晏晝盡量搵陰涼位',
      '<strong>烏布山區</strong>：山區比海邊低 2–4°C，朝早夜晚建議加件薄外套或長袖',
      '<strong>參觀寺廟</strong>：一定要遮住膊頭同膝頭，多數寺廟門口有紗籠（Sarong）可以租',
      '<strong>雨季（11–3 月）</strong>：午後陣雨多數係短時間大雨，帶把輕便縮骨遮或者雨衣就夠，唔使雨鞋',
      '<strong>冷氣同夜晚</strong>：餐廳同車上冷氣通常好勁，隨身帶件薄外套會舒服好多',
      '<strong>火山日出行程</strong>：巴杜爾火山（Batur）清晨山頂得 10–15°C，一定要帶外套同長褲',
    ],

    regionsH2: '峇里島各區天氣分別',
    regionPointsHtml: [
      '<strong>庫塔 / 水明漾 / 金巴蘭</strong>：海邊氣候，日曬強、UV 指數高，全島降雨最少嘅一帶',
      '<strong>烏布山區</strong>：海拔較高，氣溫比海邊低 2–4°C，朝早夜晚涼，午後對流雨多過南部',
      '<strong>努沙杜瓦</strong>：喺南端半島，風浪較細，啱浮潛同水上活動',
      '<strong>金塔馬尼 / 巴杜爾火山</strong>：海拔 1,500 米以上，清晨可以低到 10°C 左右',
      '<strong>北部（羅威那）同東部（艾湄灣）</strong>：山嘅另一邊，雨勢同南部經常完全唔同步',
    ],

    faqH2: '峇里島天氣常見問題',
    faqs: [
      { q: '峇里島而家天氣點？', a: '本頁上面嘅即時天氣區塊會顯示庫塔、烏布、努沙杜瓦三區嘅當下氣溫、體感溫度、濕度、降雨同 UV 指數，資料嚟自 Open-Meteo，每 10 分鐘更新一次，仲附未來 7 天預報。' },
      { q: '峇里島幾月去最好？', a: `以降雨機率、落雨日數同氣候舒適度綜合計算，${BEST.join(' 月同 ')} 月嘅適合旅遊指數達 100%：乾爽少雨、氣溫舒適，而且遊客量比 7、8 月暑假旺季少。5 月（95%）同 4 月、10 月（85%）都好啱。最需要準備室內後備方案嘅係 ${WORST_MONTH} 月（${WORST_SCORE}%），雨水多又撞正聖誕跨年旺季。` },
      { q: '峇里島雨季同乾季各係幾月？', a: '乾季大約係 4 月到 10 月，主要天晴、濕度較低；雨季大約係 11 月到下一年 3 月，主要係午後雷暴。4 月同 10 月屬於過渡期，天氣介乎兩者之間。' },
      { q: '峇里島雨季會唔會落成日雨？', a: '通常唔會。峇里島雨季嘅典型模式係午後或者黃昏嘅短時間大雨，多數一個鐘內就收，朝早同夜晚經常都係天晴。而且全島同時落雨嘅情況好少見——山區同東部、北部比南部平地容易落雨，南部海邊落緊雨嘅時候，烏布或者努沙杜瓦未必落。' },
      { q: '去峇里島應該著咩？', a: '全年都係短袖短褲加涼鞋嘅天氣。海邊日曬強、UV 指數成日爆 10，防曬系數 50 以上係必備；烏布等山區比海邊低 2–4°C，朝早夜晚建議加件薄外套；參觀寺廟一定要遮住膊頭同膝頭，多數寺廟門口可以租紗籠（Sarong）。餐廳同車上冷氣通常好勁，隨身一件薄外套會舒服好多。' },
      { q: '峇里島一年氣溫變化大唔大？', a: '唔大。峇里島近赤道，全年平均氣溫都喺 24–32°C 之間，月均溫差唔夠 2°C。真正嘅季節分別係「濕度同降雨」，唔係氣溫——所以行李幾乎唔使跟季節改，改嘅只係使唔使多帶把縮骨遮。' },
      { q: '雨季去峇里島有咩好處？', a: '有。雨季遊客較少、機票同住宿價格明顯平好多，氣溫亦比乾季晏晝舒服啲，梯田同瀑布喺雨季反而最翠綠、水量最足。只要行程安排時預留室內後備方案（SPA、咖啡店、商場、博物館），雨季一樣好玩。' },
    ],

    camsH2: '峇里島即時攝影機',
    camsIntro: '想直接睇下而家個天點，撳下面畫面就會載入 YouTube 即時直播。',
    camLabels: ['峇里島南部（庫塔 / 水明漾一帶）', '烏布'],
    playAria: (l) => `播放${l}即時直播`,

    readMoreH2: '延伸閱讀：峇里島天氣同雨季攻略',
    bannerAlt: '峇里島1-12月適合旅遊指數大解析',
    links: [
      { slug: 'bali-weather-tips', text: '為咩唔好再問峇里島嘅天氣？落雨又點？' },
      { slug: 'bali-best-time-to-visit', text: '峇里島最佳旅遊時間？旱季、雨季深入了解／優缺點解析' },
      { slug: 'bali-south-rainy-season', text: '峇里島雨季降雨分析 - 南部地區嘅雨季體驗' },
      { slug: 'bali-rainy-season-travel-guide', text: '峇里島雨季月份／降雨機率／降雨天數／平均氣溫／適合旅遊指數…大解析' },
      { slug: 'bali-weather-myths-explained', text: '峇里島嘅天氣點睇？會唔會落雨？旅人常見誤解一次破解' },
      { slug: '2026-bali-indoor-activities', text: '峇里島雨季：遇到落雨點算？60 個室內後備方案攻略' },
    ],
  },

  // ─────────────────────────────────────────────────────────── English
  'en': {
    htmlLang: 'en',
    inLanguage: 'en',
    path: '/en/weather/',
    homePath: '/en/',
    blogPrefix: '/en/blog',
    breadcrumbHome: 'Home',
    breadcrumbSelf: 'Bali Weather',
    placeName: 'Bali',
    title: (y) => `Bali Weather ${y} | Live Temperature, 7-Day Forecast & Month-by-Month Guide - Gobaligo`,
    description: `Live Bali weather and 7-day forecast for Kuta, Ubud and Nusa Dua, plus a month-by-month table of rain probability, rainy days, average temperature and travel-suitability index. ${EN_BEST} score highest; ${EN_WORST} needs the most backup plans. Includes dry vs wet season, best time to visit and what to wear.`,
    h1: 'Bali Weather',
    subtitle: 'Live temperature · humidity · rain · UV index · 7-day forecast. Data from Open-Meteo, updated every 10 minutes.',
    ledeHtml: `<strong>Short answer:</strong> Bali sits at <strong>24–32°C</strong> all year — the seasons differ in rain, not temperature. The <strong>dry season (April–October)</strong> is sunny with little rain; the <strong>wet season (November–March)</strong> brings short afternoon downpours that rarely last all day. Weighing rain probability against comfort, <strong>${EN_BEST} score highest</strong> (100%), while <strong>${EN_WORST} scores lowest</strong> (${WORST_SCORE}% — wettest, and peak holiday season). The month-by-month table and live conditions are below.`,

    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthlyH2: 'Bali Weather by Month: Rain Probability, Rainy Days, Temperature and Travel Index',
    monthlyIntro: '"When is the best time to visit Bali?" is hard to answer with just "dry season" — July and August are dry but packed with summer crowds, while June and September are just as dry and far quieter. The table below puts rain probability, actual rainy days, average temperature and our travel-suitability index side by side so you can pick a month directly.',
    tableHint: '← Scroll the table sideways to see every column →',
    tableCaption: 'Bali climate and travel-suitability index by month. Rainy days are an island-wide average; the highlands, east and north are consistently wetter than the southern lowlands. The travel index is a Go Bali Go assessment combining rainfall, comfort and crowd levels.',
    th: { month: 'Month', season: 'Season', rainChance: 'Rain probability', rainDays: 'Rainy days', temp: 'Avg. temperature', score: 'Travel index', advice: 'Notes' },
    daysUnit: ' days',

    seasonsH2: 'Dry Season vs Wet Season in Bali',
    seasonsIntroHtml: 'Bali sits 8 degrees south of the equator, so there are no four seasons — only dry and wet. Temperatures are near identical between them (under 2°C difference in monthly means); what actually changes is <strong>humidity, how often it rains, and how many people are there</strong>.',
    dryTitle: 'Dry season (April–October)',
    dryPoints: [
      'Mostly sunny, lower humidity, drier breeze',
      'Calm seas — best for snorkelling, diving and island hopping',
      'July–August is the summer peak: highest prices and crowds',
      'June and September are just as dry but much quieter',
    ],
    wetTitle: 'Wet season (November–March)',
    wetPoints: [
      'Short, heavy afternoon or evening downpours, usually over within an hour',
      'Cooler mornings and evenings; midday is less punishing than in the dry season',
      'Noticeably cheaper flights and hotels, fewer tourists',
      'Rice terraces and waterfalls at their greenest and fullest',
    ],
    seasonsOutroHtml: 'One thing people routinely miss: <strong>it rarely rains across the whole island at once</strong>. The central highlands, east and north get far more rain than the southern lowlands — it can be pouring in Kuta while Nusa Dua stays sunny. So when you read "it is raining in Bali", check which part.',

    wearH2: 'What to Wear in Bali',
    wearPointsHtml: [
      '<strong>Beaches during the day</strong>: T-shirt, shorts and sandals; SPF 50+ is essential — the UV index regularly passes 10, so find shade around midday',
      '<strong>Ubud and the highlands</strong>: 2–4°C cooler than the coast; bring a light layer for mornings and evenings',
      '<strong>Temple visits</strong>: shoulders and knees must be covered; most temples rent sarongs at the entrance',
      '<strong>Wet season (November–March)</strong>: downpours are short and heavy — a compact umbrella or rain jacket is enough, you do not need rain boots',
      '<strong>Air conditioning and evenings</strong>: restaurants and cars run the AC hard; a light jacket makes a real difference',
      '<strong>Volcano sunrise treks</strong>: the summit of Mount Batur is only 10–15°C before dawn — bring a jacket and long trousers',
    ],

    regionsH2: 'How Weather Varies Across Bali',
    regionPointsHtml: [
      '<strong>Kuta / Seminyak / Jimbaran</strong>: coastal, strong sun and high UV; the driest part of the island',
      '<strong>Ubud and the highlands</strong>: higher elevation, 2–4°C cooler, cool mornings and more afternoon convective rain than the south',
      '<strong>Nusa Dua</strong>: on the southern peninsula, calmer water, good for snorkelling and water sports',
      '<strong>Kintamani / Mount Batur</strong>: above 1,500 m, can drop to around 10°C before dawn',
      '<strong>North (Lovina) and east (Amed)</strong>: the far side of the mountains — rain there often has nothing to do with the south',
    ],

    faqH2: 'Bali Weather FAQ',
    faqs: [
      { q: 'What is the weather in Bali right now?', a: 'The live panel at the top of this page shows current temperature, feels-like, humidity, rain and UV index for Kuta, Ubud and Nusa Dua. Data comes from Open-Meteo, refreshes every 10 minutes, and includes a 7-day forecast.' },
      { q: 'What is the best month to visit Bali?', a: `Weighing rain probability, rainy days and overall comfort, ${EN_BEST} score 100% on our travel index: dry, comfortable, and quieter than the July–August summer peak. May (95%), plus April and October (85%), are also strong. ${EN_WORST} scores lowest at ${WORST_SCORE}% — the wettest month, and it coincides with Christmas and New Year crowds.` },
      { q: 'When exactly are the wet and dry seasons in Bali?', a: 'The dry season runs roughly April to October, mostly sunny with lower humidity. The wet season runs roughly November to March, dominated by afternoon thunderstorms. April and October are shoulder months that sit between the two.' },
      { q: 'Does it rain all day during Bali’s wet season?', a: 'Usually not. The typical pattern is a short, heavy downpour in the afternoon or evening that clears within an hour, with sunny mornings and nights. It also rarely rains island-wide at once — the highlands, east and north are wetter than the southern lowlands, so rain on the south coast does not mean rain in Ubud or Nusa Dua.' },
      { q: 'What should I pack for Bali?', a: 'It is T-shirt, shorts and sandals weather all year. Sun on the coast is strong and the UV index regularly passes 10, so SPF 50+ is essential. Ubud and the highlands run 2–4°C cooler, so bring a light layer for mornings and evenings. Temples require covered shoulders and knees, and most rent sarongs at the entrance. Restaurants and cars run the air conditioning hard, so a light jacket is worth carrying.' },
      { q: 'How much does the temperature vary through the year in Bali?', a: 'Very little. Bali is close to the equator and the annual average stays between 24 and 32°C, with less than 2°C difference between monthly means. The real seasonal change is humidity and rainfall, not temperature — which is why your packing list barely changes by season; only whether you add a folding umbrella.' },
      { q: 'Is there any upside to visiting Bali in the wet season?', a: 'Yes. There are fewer tourists, flights and hotels are noticeably cheaper, midday is less brutally hot than in the dry season, and the rice terraces and waterfalls are at their greenest and fullest. As long as your itinerary keeps indoor backups (spas, cafés, malls, museums), the wet season works well.' },
    ],

    camsH2: 'Bali Live Cams',
    camsIntro: 'Want to see the sky right now? Click a thumbnail to load the YouTube live stream.',
    camLabels: ['South Bali (Kuta / Seminyak area)', 'Ubud'],
    playAria: (l) => `Play the ${l} live stream`,

    readMoreH2: 'Further Reading: Bali Weather and Wet Season Guides',
    bannerAlt: 'Bali travel-suitability index by month, January to December',
    links: [
      { slug: 'bali-weather-tips', text: "Why Stop Worrying About Bali's Weather? Rain or Shine, Bali is Worth It" },
      { slug: 'bali-best-time-to-visit', text: 'Best Time to Visit Bali? Dry Season vs Wet Season Explained' },
      { slug: 'bali-south-rainy-season', text: 'Bali Wet Season Rainfall Analysis — South Bali Experience' },
      { slug: 'bali-rainy-season-travel-guide', text: 'Bali Wet Season: Rainfall Probability, Rainy Days & Travel Index by Month' },
      { slug: 'bali-weather-myths-explained', text: "How to Read Bali's Weather Forecast? Debunking Common Traveller Misconceptions" },
      { slug: '2026-bali-indoor-activities', text: 'Bali Rainy Season: 60 Backup Plans for Rainy Days in Bali' },
    ],
  },

  // ─────────────────────────────────────────────────────────── Bahasa Indonesia
  'id': {
    htmlLang: 'id',
    inLanguage: 'id',
    path: '/id/weather/',
    homePath: '/id/',
    blogPrefix: '/id/blog',
    breadcrumbHome: 'Beranda',
    breadcrumbSelf: 'Cuaca Bali',
    placeName: 'Bali',
    title: (y) => `Cuaca Bali ${y} | Suhu Terkini, Prakiraan 7 Hari & Panduan Bulanan - Gobaligo`,
    description: `Cuaca Bali terkini dan prakiraan 7 hari untuk Kuta, Ubud, dan Nusa Dua, lengkap dengan tabel bulanan: peluang hujan, hari hujan, suhu rata-rata, dan indeks kelayakan wisata. ${ID_BEST} paling ideal; ${ID_WORST} paling butuh rencana cadangan. Termasuk beda musim kemarau dan hujan serta panduan pakaian.`,
    h1: 'Cuaca Bali',
    subtitle: 'Suhu terkini · kelembaban · hujan · indeks UV · prakiraan 7 hari. Data dari Open-Meteo, diperbarui setiap 10 menit.',
    ledeHtml: `<strong>Ringkasnya:</strong> suhu Bali sepanjang tahun ada di <strong>24–32°C</strong> — yang berbeda antar musim adalah hujannya, bukan suhunya. <strong>Musim kemarau (April–Oktober)</strong> cerah dan minim hujan; <strong>musim hujan (November–Maret)</strong> didominasi hujan deras singkat di sore hari yang jarang berlangsung seharian. Dari peluang hujan dan kenyamanan, <strong>${ID_BEST} paling ideal</strong> (indeks 100%), sedangkan <strong>${ID_WORST} paling rendah</strong> (${WORST_SCORE}% — paling basah dan bertepatan dengan puncak liburan). Tabel bulanan dan kondisi terkini ada di bawah.`,

    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
    monthlyH2: 'Cuaca Bali per Bulan: Peluang Hujan, Hari Hujan, Suhu, dan Indeks Wisata',
    monthlyIntro: 'Pertanyaan "kapan waktu terbaik ke Bali?" tidak cukup dijawab dengan "musim kemarau" — Juli dan Agustus memang kering tapi padat wisatawan liburan, sementara Juni dan September sama keringnya dan jauh lebih sepi. Tabel di bawah menyatukan peluang hujan, jumlah hari hujan, suhu rata-rata, dan indeks kelayakan wisata supaya kamu bisa langsung memilih bulan.',
    tableHint: '← Geser tabel ke samping untuk melihat semua kolom →',
    tableCaption: 'Iklim Bali dan indeks kelayakan wisata per bulan. Hari hujan adalah rata-rata seluruh pulau; daerah pegunungan, timur, dan utara umumnya lebih basah daripada dataran selatan. Indeks kelayakan wisata disusun Go Bali Go dengan mempertimbangkan curah hujan, kenyamanan, dan kepadatan wisatawan.',
    th: { month: 'Bulan', season: 'Musim', rainChance: 'Peluang hujan', rainDays: 'Hari hujan', temp: 'Suhu rata-rata', score: 'Indeks wisata', advice: 'Catatan' },
    daysUnit: ' hari',

    seasonsH2: 'Beda Musim Kemarau dan Musim Hujan di Bali',
    seasonsIntroHtml: 'Bali berada di 8 derajat lintang selatan, jadi tidak ada empat musim — hanya kemarau dan hujan. Suhunya nyaris sama (selisih rata-rata bulanan di bawah 2°C); yang benar-benar berubah adalah <strong>kelembaban, frekuensi hujan, dan jumlah wisatawan</strong>.',
    dryTitle: 'Musim kemarau (April–Oktober)',
    dryPoints: [
      'Umumnya cerah, kelembaban lebih rendah, angin lebih kering',
      'Laut lebih tenang — paling pas untuk snorkeling, diving, dan island hopping',
      'Juli–Agustus puncak liburan: harga dan keramaian tertinggi',
      'Juni dan September sama keringnya tapi jauh lebih sepi',
    ],
    wetTitle: 'Musim hujan (November–Maret)',
    wetPoints: [
      'Hujan deras singkat sore atau petang, biasanya reda dalam sejam',
      'Pagi dan malam lebih sejuk; siang tidak sepanas musim kemarau',
      'Tiket pesawat dan penginapan jauh lebih murah, wisatawan lebih sedikit',
      'Sawah terasering dan air terjun paling hijau dan paling deras',
    ],
    seasonsOutroHtml: 'Satu hal yang sering terlewat: <strong>jarang sekali seluruh Bali hujan bersamaan</strong>. Pegunungan tengah, timur, dan utara jauh lebih basah daripada dataran selatan — Kuta bisa hujan deras sementara Nusa Dua tetap cerah. Jadi kalau membaca "Bali sedang hujan", pastikan dulu daerah mana yang dimaksud.',

    wearH2: 'Sebaiknya Pakai Apa di Bali?',
    wearPointsHtml: [
      '<strong>Pantai di siang hari</strong>: kaus, celana pendek, sandal; SPF 50+ wajib — indeks UV sering menembus 10, cari tempat teduh saat tengah hari',
      '<strong>Ubud dan pegunungan</strong>: 2–4°C lebih sejuk dari pesisir; bawa lapisan tipis untuk pagi dan malam',
      '<strong>Kunjungan ke pura</strong>: bahu dan lutut wajib tertutup; sebagian besar pura menyewakan sarung di pintu masuk',
      '<strong>Musim hujan (November–Maret)</strong>: hujannya deras tapi singkat — payung lipat atau jas hujan sudah cukup, tidak perlu sepatu boot',
      '<strong>AC dan malam hari</strong>: AC restoran dan mobil biasanya sangat dingin; jaket tipis sangat membantu',
      '<strong>Trekking sunrise gunung</strong>: puncak Gunung Batur hanya 10–15°C sebelum fajar — bawa jaket dan celana panjang',
    ],

    regionsH2: 'Perbedaan Cuaca Antar Wilayah di Bali',
    regionPointsHtml: [
      '<strong>Kuta / Seminyak / Jimbaran</strong>: iklim pesisir, matahari terik dan UV tinggi; wilayah paling kering di Bali',
      '<strong>Ubud dan pegunungan</strong>: lebih tinggi, 2–4°C lebih sejuk, pagi dingin, hujan konvektif sore lebih sering daripada di selatan',
      '<strong>Nusa Dua</strong>: di semenanjung selatan, ombak lebih tenang, cocok untuk snorkeling dan olahraga air',
      '<strong>Kintamani / Gunung Batur</strong>: di atas 1.500 m, bisa turun sampai sekitar 10°C menjelang fajar',
      '<strong>Utara (Lovina) dan timur (Amed)</strong>: di balik pegunungan — hujannya sering sama sekali tidak sejalan dengan selatan',
    ],

    faqH2: 'Pertanyaan Umum soal Cuaca Bali',
    faqs: [
      { q: 'Bagaimana cuaca Bali sekarang?', a: 'Panel cuaca terkini di bagian atas halaman ini menampilkan suhu, suhu terasa, kelembaban, hujan, dan indeks UV untuk Kuta, Ubud, dan Nusa Dua. Datanya dari Open-Meteo, diperbarui setiap 10 menit, lengkap dengan prakiraan 7 hari.' },
      { q: 'Bulan terbaik untuk ke Bali?', a: `Dengan mempertimbangkan peluang hujan, jumlah hari hujan, dan kenyamanan, ${ID_BEST} meraih indeks 100%: kering, nyaman, dan lebih sepi dibanding puncak liburan Juli–Agustus. Mei (95%) serta April dan Oktober (85%) juga bagus. ${ID_WORST} paling rendah di ${WORST_SCORE}% — paling basah sekaligus bertepatan dengan liburan Natal dan Tahun Baru.` },
      { q: 'Kapan tepatnya musim hujan dan kemarau di Bali?', a: 'Musim kemarau kira-kira April sampai Oktober, umumnya cerah dengan kelembaban lebih rendah. Musim hujan kira-kira November sampai Maret, didominasi hujan petir sore hari. April dan Oktober adalah bulan peralihan di antara keduanya.' },
      { q: 'Apakah musim hujan di Bali hujan seharian?', a: 'Umumnya tidak. Polanya adalah hujan deras singkat pada sore atau petang yang reda dalam sejam, dengan pagi dan malam yang sering cerah. Selain itu jarang sekali hujan merata di seluruh pulau — pegunungan, timur, dan utara lebih basah daripada dataran selatan, jadi hujan di pesisir selatan tidak berarti Ubud atau Nusa Dua ikut hujan.' },
      { q: 'Apa yang perlu dibawa ke Bali?', a: 'Sepanjang tahun cukup kaus, celana pendek, dan sandal. Matahari di pesisir terik dan indeks UV sering menembus 10, jadi SPF 50+ wajib. Ubud dan pegunungan 2–4°C lebih sejuk, bawa lapisan tipis untuk pagi dan malam. Pura mewajibkan bahu dan lutut tertutup, dan sebagian besar menyewakan sarung di pintu masuk. AC restoran dan mobil biasanya sangat dingin, jadi jaket tipis layak dibawa.' },
      { q: 'Seberapa besar perubahan suhu Bali sepanjang tahun?', a: 'Sangat kecil. Bali dekat khatulistiwa dan rata-rata tahunannya tetap di 24–32°C, dengan selisih rata-rata bulanan di bawah 2°C. Perubahan musim yang sebenarnya ada pada kelembaban dan curah hujan, bukan suhu — itulah kenapa daftar bawaan nyaris tidak berubah antar musim, yang berubah hanya perlu tidaknya payung lipat.' },
      { q: 'Adakah keuntungan ke Bali saat musim hujan?', a: 'Ada. Wisatawan lebih sedikit, tiket dan penginapan jauh lebih murah, siang hari tidak seterik musim kemarau, dan sawah terasering serta air terjun sedang paling hijau dan paling deras. Selama itinerary menyediakan rencana cadangan indoor (spa, kafe, mal, museum), musim hujan tetap menyenangkan.' },
    ],

    camsH2: 'Bali Live Cam',
    camsIntro: 'Ingin langsung melihat kondisi langit sekarang? Klik gambarnya untuk memuat siaran langsung YouTube.',
    camLabels: ['Bali Selatan (area Kuta / Seminyak)', 'Ubud'],
    playAria: (l) => `Putar siaran langsung ${l}`,

    readMoreH2: 'Bacaan Lanjutan: Cuaca dan Musim Hujan Bali',
    bannerAlt: 'Indeks kelayakan wisata Bali per bulan, Januari sampai Desember',
    links: [
      { slug: 'bali-weather-tips', text: 'Kenapa Tidak Perlu Khawatir Soal Cuaca Bali? Hujan atau Cerah, Bali Tetap Seru' },
      { slug: 'bali-best-time-to-visit', text: 'Kapan Waktu Terbaik ke Bali? Musim Kemarau vs Musim Hujan' },
      { slug: 'bali-south-rainy-season', text: 'Analisis Curah Hujan Musim Hujan Bali — Pengalaman Bali Selatan' },
      { slug: 'bali-rainy-season-travel-guide', text: 'Musim Hujan Bali: Curah Hujan Bulanan, Peluang Hujan & Indeks Wisata' },
      { slug: 'bali-weather-myths-explained', text: 'Gimana Cara Lihat Cuaca di Bali? Bongkar Mitos yang Sering Bikin Bingung' },
      { slug: '2026-bali-indoor-activities', text: 'Musim Hujan Bali: 60 Aktivitas Indoor untuk Hari Hujan' },
    ],
  },
};

export function getWeatherCopy(lang: WeatherLang): WeatherCopy {
  return COPY[lang] ?? COPY['zh-tw'];
}

export default COPY;

/**
 * 五個語言版 /weather/ 共用的 hreflang 叢集。
 * 之前各 page 檔各寫一份，結果 4 個版本漏掉 id、與 sitemap 宣告的 6 種語言
 * 不一致，互指破損；集中在這裡就不會再漂移。
 */
export const WEATHER_HREFLANGS = [
  { hreflang: 'zh-TW',     href: 'https://gobaligo.id/weather/' },
  { hreflang: 'zh-CN',     href: 'https://gobaligo.id/zh-cn/weather/' },
  { hreflang: 'zh-HK',     href: 'https://gobaligo.id/zh-hk/weather/' },
  { hreflang: 'en',        href: 'https://gobaligo.id/en/weather/' },
  { hreflang: 'id',        href: 'https://gobaligo.id/id/weather/' },
  { hreflang: 'x-default', href: 'https://gobaligo.id/weather/' },
];
