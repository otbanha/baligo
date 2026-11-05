/**
 * about-i18n.ts — 各語言版「關於編輯部」頁的文案
 *
 * 為什麼需要：BlogPost 的作者 byline 在每一個語言版本都連到繁中的 /about/
 * （約 4,000 頁從 /en/、/id/、/zh-cn/、/zh-hk/ 指進一個繁體中文頁面），
 * 文章 JSON-LD 的 author 也一律掛繁中的名稱與介紹。對英文與簡中版來說，
 * 作者實體等於是一個讀者看不懂的頁面，E-E-A-T 訊號傳不出去；
 * Header 的語言切換器又早就會產生 /en/about/ 這種連結（2026-11 之前是 404）。
 *
 * Organization 的 @id 五個語言共用一個（實體整合），只有可見文案與
 * name / description 依語言輸出。
 */

export type AboutLang = 'zh-tw' | 'zh-hk' | 'zh-cn' | 'en' | 'id';

export const ABOUT_LANGS: AboutLang[] = ['zh-tw', 'zh-hk', 'zh-cn', 'en', 'id'];

/** 語言 → /about/ 的網址前綴 */
export const aboutUrl = (lang: AboutLang): string =>
  lang === 'zh-tw' ? 'https://gobaligo.id/about/' : `https://gobaligo.id/${lang}/about/`;

export const aboutPath = (lang: AboutLang): string =>
  lang === 'zh-tw' ? '/about/' : `/${lang}/about/`;

/** sitemap / BaseHead 共用的 hreflang 清單 */
export const ABOUT_HREFLANGS = [
  { hreflang: 'x-default', href: aboutUrl('zh-tw') },
  { hreflang: 'zh-TW', href: aboutUrl('zh-tw') },
  { hreflang: 'zh-HK', href: aboutUrl('zh-hk') },
  { hreflang: 'zh-CN', href: aboutUrl('zh-cn') },
  { hreflang: 'en', href: aboutUrl('en') },
  { hreflang: 'id', href: aboutUrl('id') },
];

export interface AboutCopy {
  htmlLang: string;
  orgName: string;
  orgDescription: string;
  title: string;
  description: string;
  h1: string;
  role: string;
  intro: string;
  whatH2: string;
  what: string;
  trustH2: string;
  trust: string[];
  startH2: string;
  links: { href: string; label: string }[];
  socialH2: string;
  youtube: string;
  facebook: string;
  breadcrumbHome: string;
  breadcrumbSelf: string;
}

const ARTICLE_COUNT = '950';

export const ABOUT_COPY: Record<AboutLang, AboutCopy> = {
  'zh-tw': {
    htmlLang: 'zh-TW',
    orgName: 'Gobaligo編輯部',
    orgDescription:
      'Gobaligo編輯部是「小傑印尼」YouTube 頻道與 Go Bali Go 峇里島旅遊攻略站背後的內容團隊。長期蒐集與實查島上住宿、簽證、交通與景點資訊，持續更新第一手內容，只為幫每位第一次去峇里島的旅人少走冤枉路、訂房不踩雷。',
    title: '關於Gobaligo編輯部｜Go Bali Go 峇里島旅遊攻略團隊',
    description:
      '認識 Go Bali Go 背後的「Gobaligo編輯部」：經營「小傑印尼」YouTube 頻道的內容團隊，長期分享峇里島住宿、簽證、交通與景點的第一手攻略，幫你訂房不踩雷、自由行不走冤枉路。',
    h1: '關於Gobaligo編輯部',
    role: 'Go Bali Go・「小傑印尼」YouTube 頻道背後的內容團隊',
    intro:
      '嗨，我們是<strong>Gobaligo編輯部</strong>，<a href="https://www.youtube.com/@j_indonesia" target="_blank" rel="noopener">「小傑印尼」YouTube 頻道</a>與 <strong>Go Bali Go 峇里島旅遊攻略</strong>網站背後的內容團隊。因為愛上峇里島，我們把這幾年蒐集、整理與實際查證的資訊，做成一個持續更新的中文攻略站，希望幫每一位第一次去峇里島的旅人少走冤枉路。',
    whatH2: '這個站在做什麼',
    what:
      `Go Bali Go 目前收錄超過 <strong>${ARTICLE_COUNT} 篇</strong>峇里島旅遊文章，涵蓋<strong>住宿推薦、簽證通關、分區攻略、叫車包車、家庭親子與美食景點</strong>六大主題，並提供免費的行程規劃工具與預算計算機。所有住宿與價格資訊都會定期回頭校對、標註最後更新日期，讓你看到的是接近當下的實況，而不是過期資料。`,
    trustH2: '為什麼可以信任這裡的住宿建議',
    trust: [
      '📍 <strong>分區實查</strong>：水明漾、烏布、長谷、烏魯瓦圖、努沙杜瓦等各區的定位、交通與適合的旅人類型，都以在地角度整理比較。',
      '🏨 <strong>真實評價交叉比對</strong>：飯店與 Villa 推薦會參考 Agoda／Booking 的實際評分與房型資訊，不是隨機湊數。',
      '🔄 <strong>持續更新</strong>：印尼簽證、eVOA、Airbnb 取締等會變動的規定，一有變化就更新，避免害你在現場踩雷。',
      '🎥 <strong>公開露出</strong>：我們同時在 YouTube 與 Facebook 分享峇里島內容，歡迎交叉查證、留言指正。',
    ],
    startH2: '從這裡開始逛',
    links: [
      { href: '/blog/category/住宿推薦/', label: '🏨 峇里島住宿推薦｜分區精選 100+ 飯店 Villa' },
      { href: '/blog/category/峇里島分區攻略/', label: '📍 峇里島分區攻略｜庫塔、水明漾、烏布、長谷' },
      { href: '/trip-planner/', label: '🧭 峇里島行程規劃工具' },
      { href: '/bali-budget-calculator/', label: '💰 峇里島預算計算機' },
    ],
    socialH2: '找我們 / 追蹤',
    youtube: '▶ YouTube「小傑印尼」',
    facebook: 'f Facebook 峇里島旅遊攻略',
    breadcrumbHome: 'Go Bali Go',
    breadcrumbSelf: '關於Gobaligo編輯部',
  },

  'zh-hk': {
    htmlLang: 'zh-HK',
    orgName: 'Gobaligo編輯部',
    orgDescription:
      'Gobaligo編輯部係「小傑印尼」YouTube 頻道同 Go Bali Go 峇里島旅遊攻略站背後嘅內容團隊。長期蒐集同實查島上酒店、簽證、交通同景點資訊，持續更新第一手內容，幫每位第一次去峇里島嘅旅人少走冤枉路、網上訂房唔踩雷。',
    title: '關於Gobaligo編輯部｜Go Bali Go 峇里島旅遊攻略團隊',
    description:
      '認識 Go Bali Go 背後嘅「Gobaligo編輯部」：經營「小傑印尼」YouTube 頻道嘅內容團隊，長期分享峇里島酒店、簽證、交通同景點嘅第一手攻略，幫你網上訂房唔踩雷、自由行唔走冤枉路。',
    h1: '關於Gobaligo編輯部',
    role: 'Go Bali Go・「小傑印尼」YouTube 頻道背後嘅內容團隊',
    intro:
      '嗨，我們係<strong>Gobaligo編輯部</strong>，<a href="https://www.youtube.com/@j_indonesia" target="_blank" rel="noopener">「小傑印尼」YouTube 頻道</a>同 <strong>Go Bali Go 峇里島旅遊攻略</strong>網站背後嘅內容團隊。因為愛上峇里島，我們將這幾年蒐集、整理同實際查證嘅資訊，做成一個持續更新嘅中文攻略站，希望幫每一位第一次去峇里島嘅旅人少走冤枉路。',
    whatH2: '這個站做咩嘅',
    what:
      `Go Bali Go 目前收錄超過 <strong>${ARTICLE_COUNT} 篇</strong>峇里島旅遊文章，涵蓋<strong>住宿推薦、簽證通關、分區攻略、叫車包車、家庭親子同美食景點</strong>六大主題，亦提供免費嘅行程規劃工具同預算計算機。所有住宿同價格資訊都會定期回頭校對、標註最後更新日期，讓你睇到嘅係接近當下嘅實況，而唔係過期資料。`,
    trustH2: '點解可以信任這裡嘅住宿建議',
    trust: [
      '📍 <strong>分區實查</strong>：水明漾、烏布、長谷、烏魯瓦圖、努沙杜瓦等各區嘅定位、交通同適合嘅旅人類型，都以在地角度整理比較。',
      '🏨 <strong>真實評價交叉比對</strong>：酒店同 Villa 推薦會參考 Agoda／Booking 嘅實際評分同房型資訊，唔係隨機湊數。',
      '🔄 <strong>持續更新</strong>：印尼簽證、eVOA、Airbnb 取締等會變動嘅規定，一有變化就更新，避免害你在現場踩雷。',
      '🎥 <strong>公開露出</strong>：我們同時在 YouTube 同 Facebook 分享峇里島內容，歡迎交叉查證、留言指正。',
    ],
    startH2: '由這裡開始逛',
    links: [
      { href: '/zh-hk/blog/category/住宿推薦/', label: '🏨 峇里島住宿推薦｜分區精選 100+ 酒店 Villa' },
      { href: '/zh-hk/blog/category/峇里島分區攻略/', label: '📍 峇里島分區攻略｜庫塔、水明漾、烏布、長谷' },
      { href: '/zh-hk/trip-planner/', label: '🧭 峇里島行程規劃工具' },
      { href: '/zh-hk/bali-budget-calculator/', label: '💰 峇里島預算計算機' },
    ],
    socialH2: '搵我們 / 追蹤',
    youtube: '▶ YouTube「小傑印尼」',
    facebook: 'f Facebook 峇里島旅遊攻略',
    breadcrumbHome: 'Go Bali Go',
    breadcrumbSelf: '關於Gobaligo編輯部',
  },

  'zh-cn': {
    htmlLang: 'zh-CN',
    orgName: 'Gobaligo编辑部',
    orgDescription:
      'Gobaligo编辑部是「小杰印尼」YouTube 频道与 Go Bali Go 巴厘岛旅游攻略站背后的内容团队。长期搜集与实地核查岛上住宿、签证、交通与景点信息，持续更新第一手内容，只为帮每位第一次去巴厘岛的旅客少走弯路、订房不踩坑。',
    title: '关于Gobaligo编辑部｜Go Bali Go 巴厘岛旅游攻略团队',
    description:
      '认识 Go Bali Go 背后的「Gobaligo编辑部」：运营「小杰印尼」YouTube 频道的内容团队，长期分享巴厘岛住宿、签证、交通与景点的第一手攻略，帮你订房不踩坑、自由行不走弯路。',
    h1: '关于Gobaligo编辑部',
    role: 'Go Bali Go・「小杰印尼」YouTube 频道背后的内容团队',
    intro:
      '嗨，我们是<strong>Gobaligo编辑部</strong>，<a href="https://www.youtube.com/@j_indonesia" target="_blank" rel="noopener">「小杰印尼」YouTube 频道</a>与 <strong>Go Bali Go 巴厘岛旅游攻略</strong>网站背后的内容团队。因为爱上巴厘岛，我们把这几年搜集、整理与实际核查的信息，做成一个持续更新的中文攻略站，希望帮每一位第一次去巴厘岛的旅客少走弯路。',
    whatH2: '这个站在做什么',
    what:
      `Go Bali Go 目前收录超过 <strong>${ARTICLE_COUNT} 篇</strong>巴厘岛旅游文章，涵盖<strong>住宿推荐、签证通关、分区攻略、打车包车、家庭亲子与美食景点</strong>六大主题，并提供免费的行程规划工具与预算计算器。所有住宿与价格信息都会定期回头校对、标注最后更新日期，让你看到的是接近当下的实况，而不是过期资料。`,
    trustH2: '为什么可以信任这里的住宿建议',
    trust: [
      '📍 <strong>分区实查</strong>：水明漾、乌布、长谷、乌鲁瓦图、努沙杜瓦等各区的定位、交通与适合的旅客类型，都以当地角度整理比较。',
      '🏨 <strong>真实评价交叉比对</strong>：酒店与 Villa 推荐会参考 Agoda／Booking 的实际评分与房型信息，不是随机凑数。',
      '🔄 <strong>持续更新</strong>：印尼签证、eVOA、Airbnb 整治等会变动的规定，一有变化就更新，避免害你在现场踩坑。',
      '🎥 <strong>公开露出</strong>：我们同时在 YouTube 与 Facebook 分享巴厘岛内容，欢迎交叉核查、留言指正。',
    ],
    startH2: '从这里开始逛',
    links: [
      { href: '/zh-cn/blog/category/住宿推薦/', label: '🏨 巴厘岛住宿推荐｜分区精选 100+ 酒店 Villa' },
      { href: '/zh-cn/blog/category/峇里島分區攻略/', label: '📍 巴厘岛分区攻略｜库塔、水明漾、乌布、长谷' },
      { href: '/zh-cn/trip-planner/', label: '🧭 巴厘岛行程规划工具' },
      { href: '/zh-cn/bali-budget-calculator/', label: '💰 巴厘岛预算计算器' },
    ],
    socialH2: '找我们 / 关注',
    youtube: '▶ YouTube「小杰印尼」',
    facebook: 'f Facebook 巴厘岛旅游攻略',
    breadcrumbHome: 'Go Bali Go',
    breadcrumbSelf: '关于Gobaligo编辑部',
  },

  en: {
    htmlLang: 'en',
    orgName: 'Go Bali Go Editorial Team',
    orgDescription:
      'The Go Bali Go editorial team is the group behind the "Siao Jie Indonesia" YouTube channel and the Go Bali Go Bali travel guide. We research and verify accommodation, visa, transport and attraction information on the island, and keep it updated first-hand so first-time visitors to Bali book with confidence.',
    title: 'About the Go Bali Go Editorial Team | Bali Travel Guide',
    description:
      'Meet the editorial team behind Go Bali Go — the people running the "Siao Jie Indonesia" YouTube channel, publishing first-hand Bali guides on hotels, visas, transport and attractions so you book the right stay and skip the rookie mistakes.',
    h1: 'About the Go Bali Go Editorial Team',
    role: 'The content team behind Go Bali Go and the "Siao Jie Indonesia" YouTube channel',
    intro:
      'Hi — we are the <strong>Go Bali Go editorial team</strong>, the people behind the <a href="https://www.youtube.com/@j_indonesia" target="_blank" rel="noopener">"Siao Jie Indonesia" YouTube channel</a> and the <strong>Go Bali Go</strong> Bali travel guide. We fell for Bali, so we turned years of research, fact-checking and on-the-ground notes into a guide we keep updating — to spare first-time visitors the detours we took.',
    whatH2: 'What this site does',
    what:
      `Go Bali Go now publishes more than <strong>${ARTICLE_COUNT} Bali travel articles</strong> across six areas — <strong>where to stay, visas and entry, area guides, private drivers and ride-hailing, family travel, and food and attractions</strong> — plus free itinerary and budget planning tools. Stays and prices are re-checked on a schedule and stamped with a last-updated date, so what you read reflects the island as it is now rather than a snapshot from years ago.`,
    trustH2: 'Why you can trust the hotel recommendations here',
    trust: [
      '📍 <strong>Area by area</strong>: Seminyak, Ubud, Canggu, Uluwatu, Nusa Dua and the rest are compared on location, transport and the kind of traveller each one suits — from a local point of view.',
      '🏨 <strong>Cross-checked reviews</strong>: hotel and villa picks are weighed against real Agoda and Booking.com scores and room data, not padded out at random.',
      '🔄 <strong>Kept current</strong>: Indonesian visa rules, eVOA and the Airbnb crackdown all move, and we update as soon as they do so nothing catches you out on arrival.',
      '🎥 <strong>Out in the open</strong>: we publish the same Bali coverage on YouTube and Facebook — cross-check us, and tell us when we get something wrong.',
    ],
    startH2: 'Start here',
    links: [
      { href: '/en/blog/category/accommodation/', label: '🏨 Where to stay in Bali — 100+ hotels and villas by area' },
      { href: '/en/blog/category/area-guide/', label: '📍 Bali area guides — Kuta, Seminyak, Ubud, Canggu' },
      { href: '/en/trip-planner/', label: '🧭 Bali itinerary planner' },
      { href: '/en/bali-budget-calculator/', label: '💰 Bali budget calculator' },
    ],
    socialH2: 'Find us / follow',
    youtube: '▶ YouTube — Siao Jie Indonesia',
    facebook: 'f Facebook — Bali travel guide',
    breadcrumbHome: 'Go Bali Go',
    breadcrumbSelf: 'About the editorial team',
  },

  id: {
    htmlLang: 'id',
    orgName: 'Tim Redaksi Go Bali Go',
    orgDescription:
      'Tim Redaksi Go Bali Go adalah tim konten di balik kanal YouTube "Siao Jie Indonesia" dan panduan wisata Go Bali Go. Kami mengumpulkan dan mengecek langsung info akomodasi, visa, transportasi, dan tempat wisata di Bali, lalu terus memperbaruinya supaya wisatawan yang baru pertama kali ke Bali tidak salah pilih.',
    title: 'Tentang Tim Redaksi Go Bali Go | Panduan Wisata Bali',
    description:
      'Kenalan dengan tim redaksi di balik Go Bali Go — tim yang mengelola kanal YouTube "Siao Jie Indonesia" dan menulis panduan Bali soal akomodasi, visa, transportasi, dan tempat wisata dari pengalaman langsung.',
    h1: 'Tentang Tim Redaksi Go Bali Go',
    role: 'Tim konten di balik Go Bali Go dan kanal YouTube "Siao Jie Indonesia"',
    intro:
      'Hai, kami <strong>Tim Redaksi Go Bali Go</strong>, tim di balik <a href="https://www.youtube.com/@j_indonesia" target="_blank" rel="noopener">kanal YouTube "Siao Jie Indonesia"</a> dan panduan wisata <strong>Go Bali Go</strong>. Karena jatuh cinta sama Bali, kami kumpulkan hasil riset dan pengecekan lapangan selama bertahun-tahun jadi satu panduan yang terus diperbarui — biar yang baru pertama ke Bali nggak buang waktu.',
    whatH2: 'Apa yang dikerjakan situs ini',
    what:
      `Go Bali Go sekarang punya lebih dari <strong>${ARTICLE_COUNT} artikel wisata Bali</strong> di enam topik — <strong>akomodasi, visa dan imigrasi, panduan per kawasan, sewa mobil dan ride-hailing, wisata keluarga, serta kuliner dan tempat wisata</strong> — plus alat perencana itinerary dan kalkulator budget gratis. Info penginapan dan harga dicek ulang berkala dan diberi tanggal pembaruan, jadi yang kamu baca mendekati kondisi sekarang.`,
    trustH2: 'Kenapa rekomendasi penginapan di sini bisa dipercaya',
    trust: [
      '📍 <strong>Dibandingkan per kawasan</strong>: Seminyak, Ubud, Canggu, Uluwatu, Nusa Dua, dan lainnya kami bandingkan dari sisi lokasi, transportasi, dan cocok buat tipe wisatawan yang mana.',
      '🏨 <strong>Ulasan dicek silang</strong>: pilihan hotel dan villa dibandingkan dengan rating dan data kamar asli dari Agoda serta Booking.com, bukan asal banyak.',
      '🔄 <strong>Selalu diperbarui</strong>: aturan visa Indonesia, eVOA, sampai penertiban Airbnb sering berubah — begitu berubah kami perbarui.',
      '🎥 <strong>Terbuka</strong>: konten Bali yang sama kami bagikan di YouTube dan Facebook, silakan cek silang dan koreksi kami.',
    ],
    startH2: 'Mulai dari sini',
    links: [
      { href: '/id/blog/category/akomodasi/', label: '🏨 Penginapan di Bali — 100+ hotel & villa per kawasan' },
      { href: '/id/blog/category/panduan-area/', label: '📍 Panduan kawasan Bali — Kuta, Seminyak, Ubud, Canggu' },
      { href: '/id/trip-planner/', label: '🧭 Perencana itinerary Bali' },
      { href: '/id/bali-budget-calculator/', label: '💰 Kalkulator budget Bali' },
    ],
    socialH2: 'Hubungi / ikuti kami',
    youtube: '▶ YouTube — Siao Jie Indonesia',
    facebook: 'f Facebook — panduan wisata Bali',
    breadcrumbHome: 'Go Bali Go',
    breadcrumbSelf: 'Tentang tim redaksi',
  },
};
