const ALLOWED_ORIGIN = 'https://gobaligo.id';

// 關鍵字 → 優先顯示文章（每組可有多篇，依序顯示）
const PINNED_ARTICLES = [
  {
    keywords: ['包車', '司機', '交通推薦', '中文司機', '地陪', '私家車', '搭車', '叫車', '租車',
               'driver', 'Driver', 'charter', 'Charter', 'chartered', 'Chartered',
               'private car', 'private driver', 'private transport', 'hired car', 'car hire',
               'hire a driver', 'book a driver', 'bali driver', 'Bali driver'],
    articles: [
      { title: '【峇里島包車司機推薦名人榜】巴里島司機網友評鑑大全：看網友真實點評找到適合你的好司機', url: '/blog/2024-07-07-668aaea7fd89780001981840/' },
      { title: '峇里島包車自由行全攻略 - 常見問題、費用、預訂方式、優勢分析', url: '/blog/2024-01-12-65a0a163fd8978000115f37a/' },
      { title: '峇里島什麼時候包車？什麼場合叫車？包車 vs. 叫車：如何選擇最適合你的旅行方式？', url: '/blog/2024-05-05-6636f348fd897800013df126/' },
    ],
  },
  {
    keywords: ['第一次', '新手', '初次', '請教', '首次', '初嚟', '唔識', '點玩', '點開始',
               'first time', 'first visit', 'first trip', 'beginner', 'newbie',
               'guide for beginners', 'travel tips', 'where to start', 'how to plan'],
    articles: [
      { title: '峇里島新手必讀完整攻略', url: '/blog/2026-03-08-657598bdfd8978000120fe20/' },
    ],
  },
  {
    keywords: ['換匯', '換錢', '匯率', '印尼盾', '台幣', '印尼幣', '划算', '換散紙', '兌換',
               'money exchange', 'currency exchange', 'money changer', 'exchange rate',
               'rupiah', 'IDR', 'where to exchange', 'exchange money', 'best exchange'],
    articles: [
      { title: '峇里島換匯攻略，哪裡換最划算？', url: '/blog/2024-01-28-65b5c7e2fd89780001e96fac/' },
    ],
  },
  {
    keywords: ['多少美金', '帶多少錢', '帶多少現金', '現金夠用', '費用', '花費', '預算',
               '使費', '洗費', '要幾多錢', '夠唔夠錢', '要帶幾多',
               'budget', 'cost', 'how much money', 'expenses', 'spending', 'travel cost',
               'how much to bring', 'daily budget', 'how much cash', 'bali cost'],
    articles: [
      { title: '峇里島旅遊費用? 峇里島旅遊要準備多少現金？', url: '/blog/2023-09-11-64fdaddefd89780001bdb780/' },
    ],
  },
  {
    keywords: ['SIM卡', 'SIM', 'sim卡', 'sim', '網路', '電話', '最穩', '上網', '上網卡', '數據卡',
               'SIM card', 'data plan', 'internet', 'mobile data', 'eSIM', 'e-SIM',
               'wifi', 'roaming', 'data roaming', 'bali sim', 'prepaid sim'],
    articles: [
      { title: '峇里島 SIM 卡推薦，最穩上網方案', url: '/blog/2024-03-21-65f916bbfd89780001b916e0/' },
    ],
  },
  {
    keywords: ['簽證', '簽証', 'visa', 'VISA', '海關', '申請', '通關', '入境', '電子簽', '落地簽',
               '落地簽証', 'VoA', 'VOA', 'visa on arrival', 'on arrival visa',
               'e-visa', 'evisa', 'immigration', 'passport', 'entry requirement'],
    articles: [
      { title: '峇里島簽證申請攻略', url: '/blog/2025-08-14-689dcce7fd8978000125fc52/' },
    ],
  },
  {
    keywords: ['美食', '必吃', '好吃', '食物', '餐廳', '吃什麼', '吃甚麼', '食乜', '食邊樣',
               '髒鴨飯', '烤乳豬', '沙嗲', '街頭小吃', '小吃', '烏布美食', '庫塔美食', '水明漾美食',
               'culinary', 'culiner', 'food', 'Food', 'restaurant', 'Restaurant',
               'must eat', 'must try', 'best food', 'local food', 'bali food',
               'where to eat', 'what to eat', 'dining', 'eat in bali'],
    articles: [
      { title: '【2026 峇里島美食攻略】10 大必吃經典與街頭小吃：烤乳豬、沙嗲到髒鴨飯全紀錄', url: '/blog/2026-01-12-693aaf9dfd897800013bfe3f/' },
      { title: '峇里島必嚐10大印尼美食指南：從髒鴨餐到烤乳豬，舌尖上的南洋風情', url: '/blog/2025-05-10-681ed810fd89780001472eb1/' },
      { title: '烏布美食推薦｜峇里島最強食記：從髒鴨飯、豬肋排到稻田網美咖啡廳', url: '/blog/2026-02-02-69809444fd897800019bddac/' },
      { title: '庫塔美食推薦｜峇里島最強美食攻略', url: '/blog/2025-06-03-683ea99cfd897800010202aa/' },
      { title: '水明漾美食攻略｜浪漫、精緻與地道峇里島的完美結合', url: '/blog/2025-06-02-683c262efd89780001852be7/' },
    ],
  },
  {
    keywords: ['bali belly', 'Bali belly', 'BALI BELLY',
               '峇里島肚子', '峇里島腹瀉', '髒水病', '拉肚子', '水土不服', '腸胃炎', '腸胃不適',
               '肚子痛', '肚痛', '腹痛', '上吐下瀉', '腹瀉', '食物中毒',
               'diarrhea', 'diarrhoea', 'food poisoning', 'stomach bug', 'stomach ache',
               'upset stomach', 'sick stomach', 'traveler diarrhea'],
    articles: [
      { title: '峇里島肚子不適/Bali Belly完整攻略：預防、症狀與治療方法', url: '/blog/2026-01-02-69523427fd89780001caa652/' },
    ],
  },
  {
    keywords: ['ATV', 'atv', 'quad bike', 'quad biking', 'off-road', '越野車', '越野'],
    articles: [
      { title: '峇里島 ATV 越野車體驗推薦', url: '/blog/2024-01-30-65b6ef65fd89780001f5d032/' },
    ],
  },
  {
    keywords: ['泛舟', 'rafting', 'Rafting', 'white water rafting', 'river rafting', '激流泛舟'],
    articles: [
      { title: '峇里島泛舟體驗推薦', url: '/blog/2025-03-28-67e62aa8fd89780001888620/' },
    ],
  },
  {
    keywords: ['獨棟', 'villa', 'Villa', 'VILLA', '包棟', '別墅', '三房', '四房', '五房', '六房',
               '家庭villa', '包villa', '租villa', '住villa',
               'private villa', 'Private Villa', 'romantic villa', 'Romantic Villa',
               'family villa', 'Family Villa', 'big villa', 'large villa', 'luxury villa',
               'pool villa', 'villa rental', 'villa bali', 'Bali villa', 'group villa',
               'villa with pool', 'private pool villa'],
    articles: [
      { title: '峇里島團體自由行旅遊：包棟villa 三房/四房/五房/六房以上的家庭別墅住宿推薦', url: '/blog/2024-04-30-662e156bfd8978000130c73c/' },
    ],
  },
  {
    keywords: ['水上活動', '浮潛', '潛水', '香蕉船', '拖曳傘', '水上玩意',
               'water sports', 'water activities', 'snorkeling', 'snorkelling',
               'diving', 'scuba', 'banana boat', 'parasailing', 'jet ski', 'surfing'],
    articles: [
      { title: '峇里島水上活動推薦：浮潛、潛水、香蕉船', url: '/blog/2026-01-20-694122b8fd89780001f514c9/' },
    ],
  },
  {
    keywords: ['佩尼達', '佩妮達', '珀尼達', 'penida', 'Penida', 'PENIDA',
               'nusa penida', 'Nusa Penida', 'manta', '曼塔', 'manta ray', 'Manta Ray'],
    articles: [
      { title: '【峇里島 - Nusa Penida 佩尼達島全攻略】地圖、搭船、住宿、交通、包車、活動、攝影、景點', url: '/blog/2023-08-16-64db6b82fd897800013a9942/' },
      { title: '【Nusa Penida攻略五】佩尼達島的住宿推薦: 14間從奢華到平價的 Nusa Penida 好評住宿', url: '/blog/2024-02-12-65c8e2dffd89780001346aa9/' },
    ],
  },
  {
    keywords: ['ijen', 'Ijen', 'IJEN', '伊真', '伊真火山', '藍火', 'blue fire', 'Blue Fire', 'blue flame'],
    articles: [
      { title: '🌋【伊真火山+峇里島】夢幻藍火+賽武瀑布+布羅莫日出｜輕奢五日遊全包', url: '/blog/2025-04-01-67eb9e4afd89780001eb48fb/' },
    ],
  },
  {
    keywords: ['canggu', 'Canggu', 'CANGGU', '長谷', '倉古', 'Berawa', 'berawa', 'Batu Bolong', 'batu bolong'],
    articles: [
      { title: '峇里島Canggu完美探險地圖：100個長谷/倉古必遊景點｜2025指南', url: '/blog/2023-02-11-64db6b7efd897800013a9815/' },
      { title: '長谷區16間私人泳池別墅推薦 Canggu Villa 你不能錯過的峇里島別墅', url: '/blog/2024-08-07-66b20b15fd89780001ceef6b/' },
      { title: 'Holiday Inn Resort Bali Canggu 峇里島長谷假日酒店：兩大入住兩小免費 豪華與舒適都有', url: '/blog/2025-10-07-68e51c8efd897800014e36a6/' },
    ],
  },
  {
    keywords: ['seminyak', 'Seminyak', 'SEMINYAK', '水明漾', 'Legian', 'legian', '雷吉安'],
    articles: [
      { title: '【水明漾攻略】峇里島水明漾景點Seminyak必去地點地圖：100個吃喝玩樂全面介紹｜2026最佳旅遊指南', url: '/blog/2023-08-15-64db7fc2fd897800013d367c/' },
      { title: '【峇里島住宿推薦】巴里島VILLA泳池別墅私密天堂:水明漾22間令人驚艷的峇里島villa', url: '/blog/2025-08-11-660e6e92fd89780001e6047e/' },
      { title: '峇里島住宿推薦：水明漾的濱海精緻主題住宿指南', url: '/blog/2023-11-06-65472977fd89780001cf3ce6/' },
    ],
  },
  {
    keywords: ['ubud', 'Ubud', 'UBUD', '烏布', 'Tegallalang', 'tegallalang', 'rice terrace', 'monkey forest'],
    articles: [
      { title: '2026峇里島完整烏布攻略：100種深入認識烏布的方式｜探索烏布的魅力', url: '/blog/2023-11-17-655054b1fd897800011d4d2c/' },
      { title: '【烏布住宿推薦】烏布泳池別墅私密天堂: 20間令人驚艷的峇里島villa推薦', url: '/blog/2024-04-24-6628f08cfd8978000190a575/' },
      { title: '【峇里島烏布住宿】烏布特色住宿推薦，體驗峇里島山林美景中的奇幻之旅！', url: '/blog/2024-02-20-65d21157fd897800013be576/' },
    ],
  },
  {
    keywords: ['uluwatu', 'Uluwatu', 'ULUWATU', '烏魯瓦圖', '情人崖',
               'cliff temple', 'sunset temple', 'kecak', 'Kecak', '火舞', 'bali temple'],
    articles: [
      { title: '【烏魯瓦圖攻略】Uluwatu烏魯瓦圖景點 50個吃喝玩樂推薦', url: '/blog/2024-03-07-65dfd410fd897800019f4b40/' },
      { title: '烏魯瓦圖 Uluwatu住宿推薦：14間無敵海景的私密別墅渡假村', url: '/blog/2023-11-04-6544f321fd89780001bb240c/' },
      { title: '峇里島烏魯瓦圖廟/情人崖旅遊指南：必看亮點與實用建議', url: '/blog/2025-01-18-678b1d81fd89780001f7fe4d/' },
    ],
  },
  {
    keywords: ['nusa dua', 'Nusa Dua', 'NUSA DUA', 'benoa', 'Benoa', 'BENOA',
               '努沙杜瓦', '南灣', '丹絨貝諾', 'tanjung benoa', 'Tanjung Benoa'],
    articles: [
      { title: '努沙杜瓦、南灣：峇里島豪華度假的首選之地40個住宿、美食、活動攻略地圖 Nusa Dua/Tanjung Benoa', url: '/blog/2024-01-25-65afb7bbfd897800017023b4/' },
    ],
  },
  {
    keywords: ['sanur', 'Sanur', 'SANUR', '沙努爾'],
    articles: [
      { title: '峇里島家庭親子自由行：Sanur沙努爾攻略地圖｜超過50項吃喝玩樂，還有SPA和住宿推薦喔！', url: '/blog/2024-02-11-65bf2f75fd89780001dbf162/' },
      { title: '峇里島住宿推薦：Sanur沙努爾22家從奢華到平價的渡假村/villa收集', url: '/blog/2024-08-21-66c3e440fd897800014425a8/' },
      { title: '峇里島家庭親子旅遊首選: 最安全的戲水海灘 - 沙努爾', url: '/blog/2025-06-25-685a4e9dfd897800015f493d/' },
    ],
  },
  {
    keywords: ['kids club', 'Kids Club', 'KIDS CLUB', 'kidsclub', 'kids pool', 'waterpark', 'water park'],
    articles: [
      { title: '峇里島18家 kids club 親子度假村｜庫塔、水明漾、長谷、金巴蘭、烏魯瓦圖、烏布適合家庭度假的最佳選擇', url: '/blog/2024-05-14-66405077fd89780001f23b72/' },
    ],
  },
  {
    keywords: ['親子', '家庭', '小朋友', '小孩', '帶孩子', '帶小孩', '兒童',
               '一家大細', '帶細路', '帶BB', '帶囡囡', '帶仔女',
               'family travel', 'family friendly', 'family trip', 'family vacation',
               'family holiday', 'kids', 'children', 'with kids', 'travelling with kids',
               'baby', 'toddler', 'infant', 'child friendly'],
    articles: [
      { title: '【峇里島親子遊】峇里島家庭親子友善景點大全｜巴里島超過100樣適合親子同樂活動', url: '/blog/2023-03-05-64db6b81fd897800013a98b4/' },
      { title: '峇里島親子樂園：十五家擁有滑水道溜滑梯的親子渡假村 TOP 15', url: '/blog/2024-01-16-65a51edbfd89780001ffc7b2/' },
      { title: '峇里島18家 kids club 親子度假村｜庫塔、水明漾、長谷、金巴蘭、烏魯瓦圖、烏布適合家庭度假的最佳選擇', url: '/blog/2024-05-14-66405077fd89780001f23b72/' },
    ],
  },
  {
    keywords: ['暑假', '寒假', '七月', '八月', '過年', '旺季', '連假', '開齋節', '聖誕節',
               '假期', '長假', '出行',
               'peak season', 'high season', 'holiday season', 'summer holiday',
               'summer vacation', 'Chinese New Year', 'Christmas', 'school holiday',
               'busy season', 'when to go', 'best time'],
    articles: [
      { title: '峇里島居然有五個旅遊旺季！如何避開旺季聰明旅遊？', url: '/blog/2024-06-04-665ef28dfd89780001adfa98/' },
      { title: '峇里島旺季旅遊攻略：如何避開交通擁堵，輕鬆享受假期', url: '/blog/2024-12-10-67581b8ffd89780001f5b5dc/' },
      { title: '暑假/寒假峇里島親子旅遊攻略：全方位指南，讓家庭出遊更輕鬆 - 水明漾篇', url: '/blog/2025-02-15-67ac4321fd897800015b9a11/' },
    ],
  },
  {
    keywords: ['雨季', '下雨', '雨天', '濕季', '旱季', '天氣', '落雨', '幾時去好',
               'rainy season', 'dry season', 'weather', 'rain', 'monsoon',
               'best time to visit', 'when to visit', 'wet season'],
    articles: [
      { title: '峇里島的天氣怎麼看？會不會下雨？旅人常見誤解一次破解！', url: '/blog/2025-04-09-67f65841fd897800017d3ea2/' },
      { title: '峇里島雨季：旅遊峇里島碰到下雨天怎麼辦？峇里島下雨天的60個備案攻略', url: '/blog/2024-01-06-6598c6fffd89780001047d76/' },
      { title: '暑假/寒假峇里島親子旅遊攻略：全方位指南，讓家庭出遊更輕鬆 - 水明漾篇', url: '/blog/2025-02-15-67ac4321fd897800015b9a11/' },
    ],
  },
  {
    keywords: ['庫塔', 'kuta', 'Kuta', 'KUTA', 'Kuta Beach', 'kuta beach', 'Legian', 'legian', '雷吉安'],
    articles: [
      { title: '峇里島旅遊庫塔攻略：50個必訪景點、熱鬧夜生活、美食、推薦SPA全收集', url: '/blog/2026-03-08-657598bdfd8978000120fe20/' },
      { title: '峇里島攻略之認識峇里島區域：峇里島住宿推薦指南 - 認識庫塔 水明漾 倉古 烏布', url: '/blog/2026-02-24-65839fbafd89780001e876b5/' },
      { title: '庫塔美食推薦｜峇里島最強美食攻略', url: '/blog/2025-06-03-683ea99cfd897800010202aa/' },
    ],
  },
  {
    keywords: ['金巴蘭', 'jimbaran', 'Jimbaran', 'JIMBARAN', '武吉', 'bukit', 'Bukit', 'BUKIT',
               'Jimbaran beach', 'jimbaran beach', 'Bukit peninsula', 'southern Bali'],
    articles: [
      { title: '峇里島自由行金巴蘭攻略：推薦30個玩樂景點全攻略｜2026旅遊指南', url: '/blog/2023-11-09-654b8438fd897800016bf4cc/' },
      { title: '【武吉半島冒險指南】從金巴蘭日落到烏魯瓦圖懸崖寺廟：峇里島南端的隱藏天堂', url: '/blog/2024-10-31-67061b07fd897800012f87b5/' },
      { title: '峇里島金巴蘭海鮮推薦：10家海鮮餐廳不踩雷推薦', url: '/blog/2023-09-17-6506748dfd897800018d6be2/' },
    ],
  },
  {
    keywords: ['海鮮', 'seafood', 'Seafood', 'SEAFOOD', '海鮮餐廳', '食海鮮',
               'fish', 'prawn', 'lobster', 'seafood dinner', 'seafood restaurant'],
    articles: [
      { title: '峇里島金巴蘭海鮮推薦：10家海鮮餐廳不踩雷推薦', url: '/blog/2023-09-17-6506748dfd897800018d6be2/' },
    ],
  },
  {
    keywords: ['ayana', 'Ayana', 'AYANA', '阿雅那', '阿雅娜', 'rockbar', 'rock bar', 'Rock Bar', 'ROCKBAR',
               'sunset bar', 'cliff bar', 'infinity pool bar', 'RIMBA', 'rimba', 'Rimba'],
    articles: [
      { title: '【峇里島阿雅那】Ayana Bali 住宿懶人包》Ayana Segara, RIMBA, Ayana Resort..', url: '/blog/2023-10-26-653914f6fd89780001fef733/' },
      { title: '【峇里島】阿雅娜度假村體驗之旅：Ayana Villa 奢華別墅與金巴蘭的五星級享受', url: '/blog/2024-11-10-66fcb508fd897800012664ef/' },
      { title: '峇里島金巴蘭岩石酒吧 Rock Bar 如何預約？完整體驗攻略！', url: '/blog/2024-11-03-67270573fd89780001adf758/' },
    ],
  },
  {
    keywords: ['行程', '安排', '幾天', '幾日', '規劃', '怎麼玩', '怎麼安排', '幾天幾夜',
               '點安排', '幾日幾夜', '點玩好', '行程建議',
               'itinerary', 'travel plan', 'day trip', 'how many days', 'how long',
               'schedule', 'trip planning', 'bali itinerary', 'days in bali'],
    intro: '在給你行程建議之前，請先參考',
    articles: [
      { title: '「如何規劃峇里島自由行？」峇里島旅行規劃攻略：7 個步驟輕鬆搞定巴里島完美旅程！', url: '/blog/2023-12-06-65708c78fd89780001f418c2/' },
      { title: '只想放鬆？這些峇里島Klook一日遊行程讓你0規劃也能玩得盡興', url: '/blog/2025-05-01-6812dc5dfd897800018e284b/' },
    ],
  },
];

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_TTL = 3600;
const INPUT_MAX_CHARS = 200;
const OUTPUT_MAX_TOKENS = 500;
const CACHE_TTL = 86400; // 24h response cache
const CACHE_VERSION = 'v3'; // increment to bust stale cached responses

async function msgCacheKey(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CACHE_VERSION + ':' + msg.toLowerCase().trim()));
  return 'qc:' + Array.from(new Uint8Array(buf)).slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 廣東話特有字符（不出現在普通話書寫）
const CANTONESE_RE = /[咁喺唔嗰咩嘅囉喎冇啩㗎]/;
// 簡體中文特有字符（不出現在繁體/廣東話書寫）
const SIMPLIFIED_RE = /[们来这说学从还国车吗岛凯宾问时东为动实际门话联发观边过进样设华总应线费]/;

// 簡體 → 繁體對應表（用於搜尋文章索引）
const SIMP_TO_TRAD = {
  '们':'們','来':'來','这':'這','说':'說','学':'學','从':'從','还':'還',
  '国':'國','车':'車','话':'話','门':'門','问':'問','时':'時','东':'東',
  '为':'為','动':'動','实':'實','际':'際','岛':'島','凯':'凱','宾':'賓',
  '吗':'嗎','么':'麼','长':'長','爱':'愛','历':'歷','专':'專','发':'發',
  '观':'觀','边':'邊','过':'過','进':'進','约':'約','级':'級','样':'樣',
  '设':'設','华':'華','总':'總','应':'應','线':'線','费':'費','联':'聯',
  '试':'試','认':'認','锁':'鎖','场':'場','换':'換','针':'針','坏':'壞',
};
function toTraditional(text) {
  return text.split('').map(c => SIMP_TO_TRAD[c] || c).join('');
}

function detectLanguage(text, pageLang) {
  // 1. 沒有 CJK 字符 → 英文
  if (!/[\u4e00-\u9fff]/.test(text)) return 'en';

  // 2. 廣東話特有字 → zh-HK
  if (CANTONESE_RE.test(text)) return 'zh-HK';

  // 3. 簡體特有字 → zh-CN
  if (SIMPLIFIED_RE.test(text)) return 'zh-CN';

  // 4. 以 pageLang 判斷繁中變體
  if (pageLang) {
    const l = pageLang.toLowerCase();
    if (l === 'zh-hk') return 'zh-HK';
    if (l === 'zh-cn') return 'zh-CN';
  }

  return 'zh-TW';
}

/** 依語系取得文章 URL prefix */
function getLangUrlPrefix(lang) {
  if (lang === 'zh-CN') return '/zh-cn';
  if (lang === 'zh-HK') return '/zh-hk';
  if (lang === 'en') return '/en';
  return ''; // zh-TW 預設路徑
}

/** 將 /blog/xxx/ 轉換為語系版本 URL */
function localizeUrl(url, lang) {
  const prefix = getLangUrlPrefix(lang);
  if (!prefix) return url;
  // /blog/xxx/ → /zh-cn/blog/xxx/
  if (url.startsWith('/blog/')) return prefix + url;
  return url;
}

function findPinnedArticles(query) {
  const lower = query.toLowerCase();
  const matched = [];
  const seen = new Set();
  let customIntro = null;
  for (const pin of PINNED_ARTICLES) {
    if (pin.keywords.some(k => lower.includes(k.toLowerCase()))) {
      if (pin.intro && !customIntro) customIntro = pin.intro;
      for (const article of pin.articles) {
        if (!seen.has(article.url)) {
          matched.push(article);
          seen.add(article.url);
        }
      }
    }
  }
  return { articles: matched, customIntro };
}

/** 從查詢文字產生搜尋詞（支援 CJK n-gram 斷詞 + 簡繁轉換） */
function getSearchTerms(text, lang) {
  // 空格/標點分詞（英文、混合文）；先去掉 ASCII 標點避免 "kempinski?" 無法匹配
  const words = text.toLowerCase().replace(/[?!.,;:'"()\[\]]/g, ' ').split(/[\s,，。？！、。\n！？]+/).filter(w => w.length >= 2);

  // CJK n-gram（2~4字）：讓「凱賓斯基」可從「凱賓斯基好嗎？」中被抓到
  const cjk = text.replace(/[^\u4e00-\u9fff]/g, '');
  const ngrams = [];
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i <= cjk.length - n; i++) {
      ngrams.push(cjk.slice(i, i + n).toLowerCase());
    }
  }

  let terms = [...new Set([...words, ...ngrams])];

  // zh-CN：加入繁體版本以便匹配繁體文章索引
  if (lang === 'zh-CN') {
    const tradTerms = terms.map(t => toTraditional(t));
    terms = [...new Set([...terms, ...tradTerms])];
  }

  return terms;
}

function findRelatedArticles(query, articles, lang) {
  const queryTerms = getSearchTerms(query, lang);
  const scored = articles.map(article => {
    let score = 0;
    const titleLower = (article.title || '').toLowerCase();
    const descLower = (article.description || '').toLowerCase();
    const categoriesStr = (article.category || []).join(' ').toLowerCase();
    const tagsStr = (article.tags || []).join(' ').toLowerCase();
    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 3;
      if (categoriesStr.includes(term)) score += 2;
      if (tagsStr.includes(term)) score += 2;
      if (descLower.includes(term)) score += 1;
    }
    return { ...article, score };
  });
  return scored.filter(a => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

function buildSystemPrompt(lang, relatedArticles, customIntro) {
  if (relatedArticles.length > 0) {
    const linkList = relatedArticles.map(a => `- [${a.title}](${a.url})`).join('\n');
    if (lang === 'en') {
      return `You are "Baligo AI" from gobaligo.id.
STRICT RULE: You MUST output ONLY the article links below — do not answer the question yourself.
Start with one short sentence in English introducing the links, then list them.
Translate each link's display text into English naturally. Keep the URL exactly as provided.
Format: [English Title](URL)

Articles:
${linkList}`;
    }
    if (lang === 'zh-CN') {
      const intro = customIntro
        ? `先说「${customIntro}」，再逐行列出下方文章链接。`
        : '用一句话引导读者，再逐行列出下方文章链接。';
      return `你是「峇里岛知识库AI」，代表 gobaligo.id。

【强制规则】：
1. 不可自行回答问题细节，一律引导至以下文章。
2. 回复格式：${intro}
3. 每个链接单独一行，格式为 [简体中文标题](URL)——将方括号内的标题翻译成简体中文，URL 保持不变。
4. 禁止提到「客服」「联系我们」——本站无客服。
5. 若问到报价，只说「直接咨询司机」。

相关文章：
${linkList}`;
    }
    if (lang === 'zh-HK') {
      const intro = customIntro
        ? `先講「${customIntro}」，再逐行列出下方文章連結。`
        : '用一句話引導讀者，再逐行列出下方文章連結。';
      return `你係「峇里島知識庫AI」，代表 gobaligo.id。請用廣東話（香港用語）回覆。

【強制規則】：
1. 唔可以自己回答問題細節，一律引導去以下文章。
2. 回覆格式：${intro}
3. 每條連結單獨一行，格式為 [標題](URL)。
4. 禁止提到「客服」「聯絡我們」——本站冇客服。
5. 問到報價，只係話「直接問司機」。

相關文章：
${linkList}`;
    }
    const intro = customIntro
      ? `先說「${customIntro}」，再逐行列出下方文章連結。`
      : '用一句話引導讀者，再逐行列出下方文章連結。';
    return `你是「峇里島知識庫AI」，代表 gobaligo.id。

【強制規則】：
1. 不可自行回答問題細節，一律引導至以下文章。
2. 回覆格式：${intro}
3. 每個連結單獨一行，格式為 [標題](URL)。
4. 禁止提到「客服」「聯繫我們」——本站無客服。
5. 若問到報價，只說「直接洽詢司機」。

相關文章：
${linkList}`;
  }

  if (lang === 'en') {
    return `You are "Baligo AI", a Bali travel expert from gobaligo.id. Answer in English only, concisely (under 80 words).
Answer questions related to Bali travel. Do not make up specific details; if unsure, say so.`;
  }

  if (lang === 'zh-HK') {
    return `你係「峇里島知識庫AI」，代表旅遊網站 gobaligo.id，專門回答峇里島旅遊相關問題。
請用廣東話（香港慣用語）回覆，語氣親切自然，簡潔（80字以內）。
唔確定嘅資訊請如實說明，唔好捏造細節。

【嚴格禁止】：
- 絕對唔可以提到「客服」「聯絡我們」——本站冇客服。
- 問到包車報價，只係話「直接問司機報價」。`;
  }

  if (lang === 'zh-CN') {
    return `你是「峇里岛知识库AI」，代表旅游网站 gobaligo.id，专门回答巴厘岛旅游相关问题。
请用简体中文回答，语气亲切自然，简洁（80字以内）。
不确定的信息请如实说明，不要捏造细节。

【严格禁止】：
- 绝对不可提到「客服」「联系我们」——本站没有客服。
- 若问到包车报价，只能说「直接咨询司机报价」。`;
  }

  return `你是「峇里島知識庫AI」，代表旅遊網站 gobaligo.id，專門回答峇里島旅遊相關問題。
請用繁體中文回答，語氣親切自然，簡潔（80字以內）。
回答範疇包含：峇里島旅遊、出發、返程、行前準備、抵台後的交通銜接等與峇里島行程有關的問題。
不確定的資訊請如實說明，不要捏造細節。

【特定知識】：
- 當被問到「佩尼達島/Nusa Penida 一日遊還是住宿」時，正確回答是：雖然一日遊的確方便，可以快速走訪最熱門的景點，但若能留宿一晚，你將擁有更大的自由，能慢慢探索人少的秘境，甚至有機會欣賞到日出或日落時最空靈的景色。住宿一晚的好處還有一個，就是時間可以完全錯開恐怖的一日遊觀光人潮，許多著名景點在清晨或傍晚幾乎只剩下少數旅人，氛圍截然不同。因此，如果行程允許，不妨給自己多一點時間，好好體驗佩尼達島的獨特魅力。

【嚴格禁止】：
- 絕對不可提到「客服」「客服團隊」「聯繫我們」或任何暗示 gobaligo.id 有客服人員的說法——本站沒有客服。
- 若問到包車報價，只能說「直接洽詢司機報價」，不可說聯繫客服或網站。`;
}

async function checkRateLimit(kv, ip) {
  const key = `rl:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return false;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
  return true;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const isAllowed = origin === ALLOWED_ORIGIN || origin.endsWith('.gobaligo.id') || origin.includes('localhost');
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!env.DEEPINFRA_API_KEY) {
    return Response.json({ error: '尚未設定 DEEPINFRA_API_KEY' }, { status: 503, headers: corsHeaders });
  }

  let message, pageLang;
  try {
    const body = await request.json();
    message = (body.message || '').trim().slice(0, INPUT_MAX_CHARS);
    pageLang = body.lang || '';
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!message) {
    return Response.json({ error: '訊息不能為空' }, { status: 400, headers: corsHeaders });
  }

  // ── Response cache (checked before rate limit — cached hits are free) ────────
  const cacheKey = await msgCacheKey(message);
  if (env.RATE_LIMIT) {
    const cached = await env.RATE_LIMIT.get(cacheKey);
    if (cached) return Response.json({ reply: cached }, { headers: corsHeaders });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────────
  if (env.RATE_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const allowed = await checkRateLimit(env.RATE_LIMIT, ip);
    if (!allowed) {
      return Response.json({ error: '您的提問次數已達上限，請一小時後再試。' }, { status: 429, headers: corsHeaders });
    }
  }

  let articles = [];
  try {
    const indexUrl = new URL('/article-index.json', request.url);
    const indexRes = await fetch(indexUrl.toString(), { cf: { cacheEverything: true, cacheTtl: 3600 } });
    if (indexRes.ok) articles = await indexRes.json();
  } catch { /* silently fail */ }

  const lang = detectLanguage(message, pageLang);
  const { articles: pinned, customIntro } = findPinnedArticles(message);
  const fromIndex = findRelatedArticles(message, articles, lang);
  const pinnedUrls = new Set(pinned.map(a => a.url));
  // 將文章 URL 轉換為對應語系版本
  const relatedArticles = [...pinned, ...fromIndex.filter(a => !pinnedUrls.has(a.url))]
    .slice(0, 3)
    .map(a => ({ ...a, url: localizeUrl(a.url, lang) }));
  const systemPrompt = buildSystemPrompt(lang, relatedArticles, customIntro);

  // ── DeepInfra / DeepSeek API (OpenAI-compatible) ─────────────────────────────
  const aiRes = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      max_tokens: OUTPUT_MAX_TOKENS,
      temperature: relatedArticles.length > 0 ? 0 : 0.6,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!aiRes.ok) {
    console.error('DeepInfra API error:', await aiRes.text());
    return Response.json({ error: '抱歉，AI 暫時無法回應，請稍後再試。' }, { status: 502, headers: corsHeaders });
  }

  const aiData = await aiRes.json();
  const reply = aiData.choices?.[0]?.message?.content || '抱歉，無法取得回覆。';

  // ── Store reply in cache ───────────────────────────────────────────────────────
  if (env.RATE_LIMIT) {
    await env.RATE_LIMIT.put(cacheKey, reply, { expirationTtl: CACHE_TTL });
  }

  return Response.json({ reply }, { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
