#!/usr/bin/env node
/**
 * rebuild-spa-sections.mjs
 * 從 spa-list.json 重新生成 en / zh-cn / zh-hk 的 SPA 清單段落，
 * 並取代對應語系 .md 檔案中的舊版 SPA 清單區塊。
 *
 * 用法：node scripts/rebuild-spa-sections.mjs
 */

import { readFileSync, writeFileSync } from 'fs';

const json = JSON.parse(readFileSync('src/data/spa-list.json', 'utf-8'));

// ── 描述文字翻譯表 ───────────────────────────────────────────────────────────
// key = zh-tw description, value = { en, 'zh-cn', 'zh-hk' }
const DESC = {
  '奢華spa體驗': {
    en: 'Luxurious spa experience',
    'zh-cn': '奢华spa体验',
    'zh-hk': '奢華spa體驗',
  },
  '烏魯瓦圖萬麗度假酒店': {
    en: 'at Renaissance Uluwatu Resort',
    'zh-cn': '乌鲁瓦图万丽度假酒店',
    'zh-hk': '烏魯瓦圖萬麗度假酒店',
  },
  '峇里島最頂級的SPA': {
    en: "Bali's most exclusive spa",
    'zh-cn': '巴厘岛最顶级的SPA',
    'zh-hk': '峇里島最頂級嘅SPA',
  },
  '超五星級SPA': {
    en: 'Ultra five-star spa',
    'zh-cn': '超五星级SPA',
    'zh-hk': '超五星級SPA',
  },
  '享受中東國王/皇后般尊榮': {
    en: 'Experience royal treatment like a Middle Eastern king or queen',
    'zh-cn': '享受中东国王/皇后般尊荣',
    'zh-hk': '享受中東國王/皇后般尊榮',
  },
  '體驗': {
    en: 'Experience',
    'zh-cn': '体验',
    'zh-hk': '體驗',
  },
  '黃金面部護理按摩體驗': {
    en: 'Golden facial massage experience',
    'zh-cn': '黄金面部护理按摩体验',
    'zh-hk': '黃金面部護理按摩體驗',
  },
  'Experience': {
    en: 'Experience',
    'zh-cn': '体验',
    'zh-hk': '體驗',
  },
  '奢華至臻的五星級SPA': {
    en: 'A luxurious five-star spa experience',
    'zh-cn': '奢华至臻的五星级SPA',
    'zh-hk': '奢華至臻嘅五星級SPA',
  },
  '肉桂酒店水療體驗': {
    en: 'Kayumanis Spa experience',
    'zh-cn': '肉桂酒店水疗体验',
    'zh-hk': '肉桂酒店水療體驗',
  },
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
  'Kuta 區知名的 Spa': {
    en: 'A well-known spa in the Kuta area',
    'zh-cn': '库塔区知名的Spa',
    'zh-hk': 'Kuta 區知名嘅 Spa',
  },
  '水明漾值得推薦的spa': {
    en: 'A highly recommended spa in Seminyak',
    'zh-cn': '水明漾值得推荐的spa',
    'zh-hk': '水明漾值得推薦嘅spa',
  },
  '水明漾spa。團友大推！情侶按摩3小時+飯店接送還不到3000元': {
    en: 'Seminyak spa. Highly recommended! Couples massage 3hr + hotel transfer for under USD$97',
    'zh-cn': '水明漾spa。团友大推！情侣按摩3小时+酒店接送还不到USD$97',
    'zh-hk': '水明漾spa。團友大推！情侶按摩3小時+酒店接送仲唔使USD$97',
  },
  '水療按摩體驗': {
    en: 'Spa and massage experience',
    'zh-cn': '水疗按摩体验',
    'zh-hk': '水療按摩體驗',
  },
  '以獨特的溫熱竹子按摩和強力足部按摩聞名': {
    en: 'Known for its unique heated bamboo massage and powerful foot massage',
    'zh-cn': '以独特的温热竹子按摩和强力足部按摩闻名',
    'zh-hk': '以獨特嘅溫熱竹子按摩同強力足部按摩聞名',
  },
  '可以試試他們有名的四手按摩喔！': {
    en: 'Try their famous four-hand massage!',
    'zh-cn': '可以试试他们有名的四手按摩哦！',
    'zh-hk': '可以試吓佢哋有名嘅四手按摩！',
  },
  '庫塔區好評SPA': {
    en: 'A highly-rated spa in Kuta',
    'zh-cn': '库塔区好评SPA',
    'zh-hk': '庫塔區好評SPA',
  },
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
  '靠近機場的金巴蘭spa': {
    en: 'A spa near the airport in Jimbaran',
    'zh-cn': '靠近机场的金巴兰spa',
    'zh-hk': '靠近機場嘅金巴蘭spa',
  },
  '好評Spa，光是外型就值得好好拍照': {
    en: 'Highly-rated spa with stunning architecture worth photographing',
    'zh-cn': '好评Spa，光是外型就值得好好拍照',
    'zh-hk': '好評Spa，光係外型就值得好好影相',
  },
  '森林景觀水療＆按摩體驗': {
    en: 'Forest View Spa & Massage Experience',
    'zh-cn': '森林景观水疗＆按摩体验',
    'zh-hk': '森林景觀水療＆按摩體驗',
  },
  '山谷景觀水療＆按摩體驗': {
    en: 'Valley View Spa & Massage Experience',
    'zh-cn': '山谷景观水疗＆按摩体验',
    'zh-hk': '山谷景觀水療＆按摩體驗',
  },
  '按摩體驗': {
    en: 'Massage experience',
    'zh-cn': '按摩体验',
    'zh-hk': '按摩體驗',
  },
  '環境很好細節也到位！': {
    en: 'Great environment with attention to detail!',
    'zh-cn': '环境很好细节也到位！',
    'zh-hk': '環境好好細節都到位！',
  },
  '2022年環球小姐指定水療中心': {
    en: 'Official spa of the 2022 Miss Universe pageant',
    'zh-cn': '2022年环球小姐指定水疗中心',
    'zh-hk': '2022年環球小姐指定水療中心',
  },
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
  '水療體驗': {
    en: 'Spa and wellness experience',
    'zh-cn': '水疗体验',
    'zh-hk': '水療體驗',
  },
  // home_service item names (these appear as the spa name, description may be empty)
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

// SPA 名稱翻譯（只有中文名稱需要翻譯）
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
  '上門到府按摩': { en: 'In-Home Massage Service', 'zh-cn': '上门到府按摩', 'zh-hk': '上門到府按摩' },
  '烏布周邊': { en: 'Around Ubud', 'zh-cn': '乌布周边', 'zh-hk': '烏布周邊' },
  '到府服務 Spa': { en: 'Home Service Spa', 'zh-cn': '上门服务Spa', 'zh-hk': '到府服務Spa' },
};

// 分類標題翻譯
const CAT = {
  '五星奢華SPA': { en: '## **Five-Star Luxury Spas**', 'zh-cn': '## **五星奢华SPA**', 'zh-hk': '## **五星奢華SPA**' },
  '中價位好評SPA': { en: '## **Mid-Range Spa Recommendations**', 'zh-cn': '## **中价位好评SPA**', 'zh-hk': '## **中價位好評SPA**' },
  '到旅館/villa內按摩': { en: '## **In-Hotel/Villa Massage**', 'zh-cn': '## **到旅馆/villa内按摩**', 'zh-hk': '## **到旅館/villa內按摩**' },
};

function t(text, lang) {
  if (!text) return '';
  if (lang === 'zh-tw') return text;
  return DESC[text]?.[lang] ?? text;
}

function tName(name, lang) {
  if (lang === 'zh-tw') return name;
  return NAME[name]?.[lang] ?? name;
}

function buildLinks(links, lang) {
  const parts = [];
  if (links?.klook) parts.push(`[Klook](${links.klook})`);
  if (links?.kkday) parts.push(`[KKday](${links.kkday})`);
  if (links?.trip) parts.push(`[Trip.com](${links.trip})`);
  return parts.join(' · ');
}

function buildSpaLine(spa, lang) {
  const name = tName(spa.name, lang);
  const desc = t(spa.description, lang);
  const links = buildLinks(spa.links, lang);

  let line = '';
  if (spa.href) {
    line = `- **[${name}](${spa.href})**`;
  } else if (spa.links?.klook) {
    line = `- **[${name}](${spa.links.klook})**`;
  } else {
    line = `- **${name}**`;
  }

  if (desc) line += `: ${desc}`;

  // Append extra platform links (skip klook if already used as primary)
  const extraParts = [];
  if (!spa.href && spa.links?.klook && spa.links?.kkday) extraParts.push(`[KKday](${spa.links.kkday})`);
  else if (!spa.href && spa.links?.klook && !spa.links?.kkday) { /* nothing extra */ }
  else if (!spa.href && !spa.links?.klook && spa.links?.kkday) extraParts.push(`[KKday](${spa.links.kkday})`);
  else if (spa.href && spa.links?.klook) extraParts.push(`[Klook](${spa.links.klook})`);
  else if (spa.href && spa.links?.kkday) extraParts.push(`[KKday](${spa.links.kkday})`);

  if (!spa.href && spa.links?.trip) extraParts.push(`[Trip.com](${spa.links.trip})`);
  if (spa.href && spa.links?.trip) extraParts.push(`[Trip.com](${spa.links.trip})`);

  // Re-build links more cleanly
  const badges = [];
  if (!spa.href && spa.links?.klook) { /* already used as primary, skip */ }
  else if (spa.links?.klook) badges.push(`[Klook](${spa.links.klook})`);
  if (spa.links?.kkday) badges.push(`[KKday](${spa.links.kkday})`);
  if (spa.links?.trip) badges.push(`[Trip.com](${spa.links.trip})`);

  if (badges.length > 0) line += ' — ' + badges.join(' · ');

  return line;
}

function buildSection(sectionKey, lang) {
  const section = json[sectionKey];
  const lines = section.spas.map(spa => buildSpaLine(spa, lang));
  return `### **${section.title}**\n\n${lines.join('\n')}`;
}

// ── 產生各語系的完整 SPA markdown 區塊 ───────────────────────────────────────

function buildFullSpaBlock(lang) {
  const luxuryLabel = CAT['五星奢華SPA'][lang];
  const midLabel = CAT['中價位好評SPA'][lang];
  const homeLabel = CAT['到旅館/villa內按摩'][lang];

  const luxuryIntro = {
    en: 'Indulge yourself, indulge your loved one',
    'zh-cn': '宠爱自己，宠爱身边的那个他',
    'zh-hk': '寵愛自己，寵愛身邊嗰個佢',
  }[lang];

  const midIntro = {
    en: "If you're looking to save on your trip, we also have highly-rated mid-range spas, all offering great value for under USD$32!",
    'zh-cn': '如果您想节省旅费，我们也有中价位好评SPA，都是不到USD$32的超值享受哦！',
    'zh-hk': '如果你想慳啲旅費，我哋都有中價位好評SPA，全部都係唔使USD$32嘅超值享受！',
  }[lang];

  const homeIntro = {
    en: 'Enjoy the comfort and luxury of professional massage services directly in your accommodation or hotel room.',
    'zh-cn': '舒适尊荣享受，专业按摩服务直接到您的住处或旅馆房间内。',
    'zh-hk': '舒適尊榮享受，專業按摩服務直接到您嘅住處或旅館房間內。',
  }[lang];

  const homeNote = {
    en: "**Note:** Not all hotels or resorts allow outsiders to enter, so it's best to confirm with your accommodation before arranging an in-room massage.",
    'zh-cn': '**注意：**不是所有的旅馆、度假村都允许外人进入，最好先跟您的住处确认可以叫人到房里按摩喔！',
    'zh-hk': '**注意：**唔係所有嘅旅館、渡假村都允許外人進入，最好先同您嘅住處確認可以叫人到房裡按摩喔！',
  }[lang];

  const pranaCap = {
    en: 'Prana Spa is itself a Middle Eastern castle',
    'zh-cn': 'Prana Spa 本身就是一座中东城堡',
    'zh-hk': 'Prana Spa 本身就係一座中東城堡',
  }[lang];

  const mayaCap = {
    en: 'The Spa at Maya Ubud Resort offers exclusive views of the river valley',
    'zh-cn': 'Maya Ubud Resort 的 The Spa 独享河谷美景',
    'zh-hk': 'Maya Ubud Resort 嘅 The Spa 獨享河谷美景',
  }[lang];

  const outro = {
    en: "These are the top-rated spas by travelers! This list will continue to be updated, so be sure to save it to your travel bucket list!",
    'zh-cn': '这些就是网友评鉴的优质SPA啦！这份名单还会持续更新，记得把它放到你的口袋清单喔！',
    'zh-hk': '呢啲就係網友評鑑嘅優質SPA啦！呢份名單仲會持續更新，記得將佢放入你嘅口袋清單喔！',
  }[lang];

  return `${luxuryLabel}

${luxuryIntro}

${buildSection('luxury_jimbaran', lang)}

${buildSection('luxury_canggu', lang)}

![Prana Spa 本身就是一座中東城堡](https://images.gobaligo.id/vocus/vocus_a648794bf21db4674dde17dfe4c93ecc.png)

${pranaCap}

${buildSection('luxury_ubud', lang)}

![Maya Ubud Resort 的 The Spa 獨享河谷美景](https://images.gobaligo.id/vocus/vocus_5723ddc758fbe9bcc60c822e2c059a97.png)

${mayaCap}

${buildSection('luxury_nusadua', lang)}

{{block:klook}}

${midLabel}

![raw-image](https://images.gobaligo.id/vocus/vocus_844aaa154f2429de266eba648907cceb.png)

${midIntro}

${buildSection('mid_kuta', lang)}

${buildSection('mid_jimbaran', lang)}

${buildSection('mid_ubud', lang)}

${buildSection('mid_nusadua', lang)}

${buildSection('mid_sanur', lang)}

---

${homeLabel}

![raw-image](https://images.gobaligo.id/vocus/vocus_415983f1bfe9303f45fcf24061876859.png)

${homeIntro}

${buildSection('home_service', lang)}

${homeNote}

${outro}`;
}

// ── 取代目標檔案中的 SPA 段落 ─────────────────────────────────────────────────

/**
 * 找到 ## **五星... 到最後提醒 之前的位置，取代整段
 */
function patchFile(filePath, lang) {
  const content = readFileSync(filePath, 'utf-8');

  // 找到 frontmatter 結束位置（第二個 ---）
  const fmEnd = content.indexOf('---', 3) + 3;
  const header = content.slice(0, fmEnd);

  // 找到開頭文字（SPA list 之前的引言段落）與 ## 五星 之間
  // 策略：保留 frontmatter + 開頭段落（在第一個 ## 之前），取代其後到最後提醒之前的內容
  const firstH2 = content.indexOf('\n## ');
  if (firstH2 === -1) {
    console.error(`找不到 ## 標題: ${filePath}`);
    return;
  }

  const intro = content.slice(0, firstH2); // frontmatter + 引言

  // 找到「最後提醒」段落
  const finalReminderPatterns = [
    '\n## 最後提醒',
    '\n## 最后提醒',
    '\n## Final Reminder',
  ];
  let finalIdx = -1;
  for (const p of finalReminderPatterns) {
    const idx = content.indexOf(p);
    if (idx !== -1) { finalIdx = idx; break; }
  }

  let footer = '';
  if (finalIdx !== -1) {
    footer = '\n' + content.slice(finalIdx + 1);
  }

  const newContent = intro + '\n' + buildFullSpaBlock(lang) + '\n\n' + footer.trimStart();
  writeFileSync(filePath, newContent, 'utf-8');
  console.log(`✅ 已更新：${filePath}`);
}

// ── 執行 ─────────────────────────────────────────────────────────────────────

patchFile('src/content/en/2023-01-22-64db6b7efd897800013a97ed.md', 'en');
patchFile('src/content/zh-cn/2023-01-22-64db6b7efd897800013a97ed.md', 'zh-cn');
patchFile('src/content/zh-hk/2023-01-22-64db6b7efd897800013a97ed.md', 'zh-hk');

console.log('\n完成！請執行 npm run build 確認無錯誤。');
