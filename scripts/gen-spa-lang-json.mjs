#!/usr/bin/env node
/**
 * gen-spa-lang-json.mjs
 * 從 spa-list.json 產生 en / zh-cn / zh-hk 版本的 JSON，
 * 只翻譯 description 欄位，links / href / name 完全保留。
 */
import { readFileSync, writeFileSync } from 'fs';

const src = JSON.parse(readFileSync('src/data/spa-list.json', 'utf-8'));

// 描述翻譯表
const DESC = {
  '奢華spa體驗': { en: 'Luxurious spa experience', 'zh-cn': '奢华spa体验', 'zh-hk': '奢華spa體驗' },
  '烏魯瓦圖萬麗度假酒店': { en: 'at Renaissance Uluwatu Resort', 'zh-cn': '乌鲁瓦图万丽度假酒店', 'zh-hk': '烏魯瓦圖萬麗度假酒店' },
  '峇里島最頂級的SPA': { en: "Bali's most exclusive spa", 'zh-cn': '巴厘岛最顶级的SPA', 'zh-hk': '峇里島最頂級嘅SPA' },
  '超五星級SPA': { en: 'Ultra five-star spa', 'zh-cn': '超五星级SPA', 'zh-hk': '超五星級SPA' },
  '享受中東國王/皇后般尊榮': { en: 'Experience royal treatment like a Middle Eastern king or queen', 'zh-cn': '享受中东国王/皇后般尊荣', 'zh-hk': '享受中東國王/皇后般尊榮' },
  '體驗': { en: 'Experience', 'zh-cn': '体验', 'zh-hk': '體驗' },
  '黃金面部護理按摩體驗': { en: 'Golden facial massage experience', 'zh-cn': '黄金面部护理按摩体验', 'zh-hk': '黃金面部護理按摩體驗' },
  'Experience': { en: 'Experience', 'zh-cn': '体验', 'zh-hk': '體驗' },
  '奢華至臻的五星級SPA': { en: 'A luxurious five-star spa experience', 'zh-cn': '奢华至臻的五星级SPA', 'zh-hk': '奢華至臻嘅五星級SPA' },
  '肉桂酒店水療體驗': { en: 'Kayumanis Spa experience', 'zh-cn': '肉桂酒店水疗体验', 'zh-hk': '肉桂酒店水療體驗' },
  '萬豪的會員？Westin Resort 裡的「天夢 Spa」就是你的最佳選擇': {
    en: "Marriott member? The 'Heavenly Spa' at Westin Resort is your best choice",
    'zh-cn': "万豪的会员？Westin Resort里的「天梦Spa」就是你的最佳选择",
    'zh-hk': "萬豪嘅會員？Westin Resort 入面嘅「天夢 Spa」就係你嘅最佳選擇",
  },
  '獲得印尼旅遊部門頒發的「最佳獨立Spa」': {
    en: "Awarded 'Best Independent Spa' by the Indonesian tourism department",
    'zh-cn': "获得印尼旅游部门颁发的「最佳独立Spa」",
    'zh-hk': "獲得印尼旅遊部門頒發嘅「最佳獨立Spa」",
  },
  'Kuta 區知名的 Spa': { en: 'A well-known spa in the Kuta area', 'zh-cn': '库塔区知名的Spa', 'zh-hk': 'Kuta 區知名嘅 Spa' },
  '水明漾值得推薦的spa': { en: 'A highly recommended spa in Seminyak', 'zh-cn': '水明漾值得推荐的spa', 'zh-hk': '水明漾值得推薦嘅spa' },
  '水明漾spa。團友大推！情侶按摩3小時+飯店接送還不到3000元': {
    en: 'Seminyak spa. Highly recommended! Couples massage 3hr + hotel transfer for under USD$97',
    'zh-cn': '水明漾spa。团友大推！情侣按摩3小时+酒店接送还不到USD$97',
    'zh-hk': '水明漾spa。團友大推！情侶按摩3小時+酒店接送仲唔使USD$97',
  },
  '水療按摩體驗': { en: 'Spa and massage experience', 'zh-cn': '水疗按摩体验', 'zh-hk': '水療按摩體驗' },
  '以獨特的溫熱竹子按摩和強力足部按摩聞名': {
    en: 'Known for its unique heated bamboo massage and powerful foot massage',
    'zh-cn': '以独特的温热竹子按摩和强力足部按摩闻名',
    'zh-hk': '以獨特嘅溫熱竹子按摩同強力足部按摩聞名',
  },
  '可以試試他們有名的四手按摩喔！': { en: 'Try their famous four-hand massage!', 'zh-cn': '可以试试他们有名的四手按摩哦！', 'zh-hk': '可以試吓佢哋有名嘅四手按摩！' },
  '庫塔區好評SPA': { en: 'A highly-rated spa in Kuta', 'zh-cn': '库塔区好评SPA', 'zh-hk': '庫塔區好評SPA' },
  '距離機場10分鐘，轉機/回程的優質選擇': {
    en: '10 minutes from the airport — ideal for layovers or your return journey',
    'zh-cn': '距离机场10分钟，转机/回程的优质选择',
    'zh-hk': '距離機場10分鐘，轉機/回程嘅優質選擇',
  },
  '2025/10 新開幕，台灣老闆娘，中文可通': {
    en: 'Opening October 2025, Taiwanese owner, Mandarin-speaking',
    'zh-cn': '2025/10新开业，台湾老板娘，中文可通',
    'zh-hk': '2025/10 新開幕，台灣老闆娘，中文可通',
  },
  '靠近機場的金巴蘭spa': { en: 'A spa near the airport in Jimbaran', 'zh-cn': '靠近机场的金巴兰spa', 'zh-hk': '靠近機場嘅金巴蘭spa' },
  '好評Spa，光是外型就值得好好拍照': {
    en: 'Highly-rated spa with stunning architecture worth photographing',
    'zh-cn': '好评Spa，光是外型就值得好好拍照',
    'zh-hk': '好評Spa，光係外型就值得好好影相',
  },
  '森林景觀水療＆按摩體驗': { en: 'Forest View Spa & Massage Experience', 'zh-cn': '森林景观水疗＆按摩体验', 'zh-hk': '森林景觀水療＆按摩體驗' },
  '山谷景觀水療＆按摩體驗': { en: 'Valley View Spa & Massage Experience', 'zh-cn': '山谷景观水疗＆按摩体验', 'zh-hk': '山谷景觀水療＆按摩體驗' },
  '按摩體驗': { en: 'Massage experience', 'zh-cn': '按摩体验', 'zh-hk': '按摩體驗' },
  '環境很好細節也到位！': { en: 'Great environment with attention to detail!', 'zh-cn': '环境很好细节也到位！', 'zh-hk': '環境好好細節都到位！' },
  '2022年環球小姐指定水療中心': { en: 'Official spa of the 2022 Miss Universe pageant', 'zh-cn': '2022年环球小姐指定水疗中心', 'zh-hk': '2022年環球小姐指定水療中心' },
  '峇里島最佳選擇之一，結合豐富的峇里式按摩和舒適環境。': {
    en: 'One of the best choices in Bali, combining rich Balinese massage techniques with a comfortable environment.',
    'zh-cn': '巴厘岛最佳选择之一，结合丰富的巴厘式按摩和舒适环境。',
    'zh-hk': '峇里島最佳選擇之一，結合豐富嘅峇里式按摩同舒適環境。',
  },
  '中價位的家庭SPA，打造舒適寧靜的氛圍，專為家庭提供愉悅體驗。': {
    en: 'A mid-range family spa offering a serene atmosphere, perfect for a relaxing family experience.',
    'zh-cn': '中价位的家庭SPA，打造舒适宁静的氛围，专为家庭提供愉悦体验。',
    'zh-hk': '中價位嘅家庭SPA，打造舒適寧靜嘅氛圍，專為家庭提供愉悅體驗。',
  },
  "2023 Travelers' Choice，中價位中的瑰寶，提供多樣身心療癒選擇，讓您感受峇里文化之美。": {
    en: "2023 Travelers' Choice gem, offering diverse healing options that let you immerse in Balinese culture.",
    'zh-cn': "2023 Travelers' Choice，中价位中的瑰宝，提供多样身心疗愈选择，让您感受巴厘文化之美。",
    'zh-hk': "2023 Travelers' Choice，中價位中嘅瑰寶，提供多樣身心療癒選擇，讓您感受峇里文化之美。",
  },
  '中價位中的私密天地，以簡約雅致風格打造尊榮SPA體驗。': {
    en: 'A mid-range sanctuary with a minimalist and elegant style, offering a luxurious spa experience.',
    'zh-cn': '中价位中的私密天地，以简约雅致风格打造尊荣SPA体验。',
    'zh-hk': '中價位中嘅私密天地，以簡約雅致風格打造尊榮SPA體驗。',
  },
  '中價位中的花卉療癒，注重於自然元素，帶來愜意與寧靜。': {
    en: 'A mid-range floral healing spa focusing on natural elements, bringing tranquility and relaxation.',
    'zh-cn': '中价位中的花卉疗愈，注重于自然元素，带来惬意与宁静。',
    'zh-hk': '中價位中嘅花卉療癒，注重於自然元素，帶來愜意與寧靜。',
  },
  '中價位中的宛如花園的SPA，提供高品質療程，讓您沉浸在植物芬芳中。': {
    en: 'A mid-range garden-like spa offering high-quality treatments surrounded by botanical aromas.',
    'zh-cn': '中价位中的宛如花园的SPA，提供高品质疗程，让您沉浸在植物芬芳中。',
    'zh-hk': '中價位中嘅宛如花園嘅SPA，提供高品質療程，讓您沉浸在植物芬芳中。',
  },
  '也是旅客評價的熱門景點，TripAdvisor 上的評價也很高。': {
    en: 'A popular spot among travelers, with high ratings on TripAdvisor.',
    'zh-cn': '也是旅客评价的热门景点，TripAdvisor上的评价也很高。',
    'zh-hk': '都係旅客評價嘅熱門景點，TripAdvisor 上嘅評價都好高。',
  },
  "2022「Tripadvisor Travelers' Choice大賞」遊客大肯定": {
    en: "Winner of the 2022 Tripadvisor Travelers' Choice Award, highly praised by visitors.",
    'zh-cn': "2022「Tripadvisor Travelers' Choice大赏」游客大肯定",
    'zh-hk': "2022「Tripadvisor Travelers' Choice大賞」遊客大肯定",
  },
  '水療體驗': { en: 'Spa and wellness experience', 'zh-cn': '水疗体验', 'zh-hk': '水療體驗' },
  '（Kuta, Legian, Seminyak, Kerobokan, Umalas and Berawa）': {
    en: '(Kuta, Legian, Seminyak, Kerobokan, Umalas and Berawa)',
    'zh-cn': '（库塔, Legian, 水明漾, Kerobokan, Umalas and Berawa）',
    'zh-hk': '（庫塔、Legian、水明漾、Kerobokan、Umalas 同 Berawa）',
  },
  '（Canggu, Seminyak, and Sanur）': {
    en: '(Canggu, Seminyak, and Sanur)',
    'zh-cn': '（坎古, 水明漾, and 沙努尔）',
    'zh-hk': '（坎古、水明漾、同沙努爾）',
  },
  '（Kuta, Legian, Seminyak, Jimbaran, Nusa Dua, Canggu, Uluwatu, Badung, and Mengwi）': {
    en: '(Kuta, Legian, Seminyak, Jimbaran, Nusa Dua, Canggu, Uluwatu, Badung, and Mengwi)',
    'zh-cn': '（库塔, Legian, 水明漾, 金巴兰, 努沙杜瓦, 坎古, 乌鲁瓦图, Badung, and Mengwi）',
    'zh-hk': '（庫塔、Legian、水明漾、金巴蘭、努沙杜瓦、坎古、Uluwatu、Badung 同 Mengwi）',
  },
  '(Canggu, Kuta, Nusa Dua, Jimbaran, Ubud, Legian, Seminyak, Denpasar, Sanur, Gianyar)': {
    en: '(Canggu, Kuta, Nusa Dua, Jimbaran, Ubud, Legian, Seminyak, Denpasar, Sanur, Gianyar)',
    'zh-cn': '（坎古, 库塔, 努沙杜瓦, 金巴兰, 乌布, Legian, 水明漾, 登巴萨, 沙努尔, Gianyar）',
    'zh-hk': '（坎古、庫塔、努沙杜瓦、金巴蘭、烏布、Legian、水明漾、Denpasar、沙努爾、Gianyar）',
  },
};

// SPA 名稱翻譯（中文名稱才需翻）
const NAME = {
  'ASAI 水療中心': { en: 'ASAI Spa Center', 'zh-cn': 'ASAI 水疗中心', 'zh-hk': 'ASAI 水療中心' },
  'The Spa 按摩體驗': { en: 'The Spa Experience', 'zh-cn': 'The Spa按摩体验', 'zh-hk': 'The Spa按摩體驗' },
  'W Hotel 之 AWAY Spa': { en: 'AWAY Spa at W Hotel', 'zh-cn': 'W Hotel之AWAY Spa', 'zh-hk': 'W Hotel之AWAY Spa' },
  '金巴蘭 Hua Spa': { en: 'Hua Spa Jimbaran', 'zh-cn': '金巴兰Hua Spa', 'zh-hk': '金巴蘭Hua Spa' },
  '桑卡拉度假村 Radha Spa 體驗': { en: 'Radha Spa at Sankara Resort', 'zh-cn': '桑卡拉度假村Radha Spa体验', 'zh-hk': '桑卡拉度假村Radha Spa體驗' },
  '南迪尼叢林水療度假村溪谷 Spa': { en: 'Sungai Spa at Nandini Jungle Resort', 'zh-cn': '南迪尼丛林水疗度假村溪谷Spa', 'zh-hk': '南迪尼叢林水療度假村溪谷Spa' },
  'Plataran Ubud Padma Spa': { en: 'Padma Spa at Plataran Ubud', 'zh-cn': 'Plataran Ubud Padma Spa', 'zh-hk': 'Plataran Ubud Padma Spa' },
  '五星villa內的巴里式按摩＆漂浮下午茶': {
    en: 'Balinese Massage & Floating Afternoon Tea in a 5-Star Villa',
    'zh-cn': '五星villa内的巴里式按摩＆漂浮下午茶',
    'zh-hk': '五星villa內嘅巴里式按摩＆漂浮下午茶',
  },
  '沙努爾到府按摩服務': { en: 'Sanur In-Home Massage Service', 'zh-cn': '沙努尔上门按摩服务', 'zh-hk': '沙努爾到府按摩服務' },
  'Kuta 周邊': { en: 'Around Kuta', 'zh-cn': '库塔周边', 'zh-hk': '庫塔周邊' },
  'Canggu 周邊': { en: 'Around Canggu', 'zh-cn': '坎古周边', 'zh-hk': '坎古周邊' },
  '上門到府按摩': { en: 'In-Home Massage Service', 'zh-cn': '上门按摩服务', 'zh-hk': '上門到府按摩' },
  '烏布周邊': { en: 'Around Ubud', 'zh-cn': '乌布周边', 'zh-hk': '烏布周邊' },
  '到府服務 Spa': { en: 'Home Service Spa', 'zh-cn': '上门服务Spa', 'zh-hk': '到府服務Spa' },
};

function translateSection(section, lang) {
  return {
    ...section,
    spas: section.spas.map(spa => ({
      ...spa,
      name: NAME[spa.name]?.[lang] ?? spa.name,
      description: DESC[spa.description]?.[lang] ?? spa.description ?? '',
    })),
  };
}

for (const lang of ['en', 'zh-cn', 'zh-hk']) {
  const out = {};
  for (const [key, section] of Object.entries(src)) {
    out[key] = translateSection(section, lang);
  }
  const suffix = lang === 'en' ? 'en' : lang;
  writeFileSync(`src/data/spa-list-${suffix}.json`, JSON.stringify(out, null, 2));
  console.log(`✅ src/data/spa-list-${suffix}.json`);
}
console.log('完成！');
