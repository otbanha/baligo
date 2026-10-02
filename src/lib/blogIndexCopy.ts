// en / id 部落格首頁（src/components/LangBlogIndex.astro）的文案。
// FAQ 裡的數字與規定取自所連文章，文章更新時這裡要一起改。
// id 版的讀者以印尼國內旅客為主：不放簽證／SIM 卡題，改放觀光稅（只向外國旅客收）、QRIS 等。
import type { IndexLang } from './langBlogPosts';

type Link = { href: string; label: string };
export type HubFaq = { q: string; a: string; links: Link[] };

export type BlogIndexCopy = {
  htmlLang: string;
  pageTitle: (year: number) => string;
  pageDescription: (year: number, count: number) => string;
  h1: (year: number) => string;
  tagline: (count: number) => string;
  bullets: (total: number) => string[];
  catLabels: Record<string, string>;
  categories: string;
  home: string;
  accommodations: string;
  comingSoon: string;
  essentialGuides: string;
  articles: string;
  guideNames: Record<string, string>;
  driverName: string;
  driverDesc: string;
  baliNews: string;
  viewAllNews: string;
  ytTitle: string;
  popular: string;
  editorsPicks: string;
  featuredBadge: string;
  latestHeading: string;
  latestListName: string;
  hubHeading: (year: number) => string;
  hubIntro: (blogBase: string, langBase: string) => string;
  readMore: string;
  hubFaqs: (blogBase: string, langBase: string, year: number) => HubFaq[];
  pager: { prev: string; next: string; page: string };
  promoCta: string;
};

const CAT_EN: Record<string, string> = {
  '新手指南': "Beginner's Guide",
  '住宿推薦': 'Accommodation', '住宿推荐': 'Accommodation',
  '峇里島分區攻略': 'Area Guide', '峇里岛分区攻略': 'Area Guide',
  '簽證通關': 'Visa & Entry', '签证通关': 'Visa & Entry',
  '叫車包車': 'Transport', '叫车包车': 'Transport',
  '家庭親子': 'Family Travel', '家庭亲子': 'Family Travel',
  '遊記分享': 'Travel Stories', '游记分享': 'Travel Stories',
  '美食景點活動': 'Food & Activities', '美食景点活动': 'Food & Activities',
  '套裝行程': 'Package Tours',
  '購物指南': 'Shopping', '购物指南': 'Shopping',
  '新聞存檔': 'News Archive', '新闻存档': 'News Archive',
  '旅行技巧': 'Travel Tips',
};

const CAT_ID: Record<string, string> = {
  '新手指南': 'Panduan Pemula',
  '住宿推薦': 'Akomodasi', '住宿推荐': 'Akomodasi',
  '峇里島分區攻略': 'Panduan Area', '峇里岛分区攻略': 'Panduan Area',
  '簽證通關': 'Visa & Imigrasi', '签证通关': 'Visa & Imigrasi',
  '叫車包車': 'Transportasi', '叫车包车': 'Transportasi',
  '家庭親子': 'Liburan Keluarga', '家庭亲子': 'Liburan Keluarga',
  '遊記分享': 'Cerita Traveling', '游记分享': 'Cerita Traveling',
  '美食景點活動': 'Makanan & Aktivitas', '美食景点活动': 'Makanan & Aktivitas',
  '套裝行程': 'Paket Wisata',
  '購物指南': 'Panduan Belanja', '购物指南': 'Panduan Belanja',
  '新聞存檔': 'Arsip Berita', '新闻存档': 'Arsip Berita',
  '旅行技巧': 'Tips Traveling',
};

export const BLOG_INDEX_COPY: Record<IndexLang, BlogIndexCopy> = {
  en: {
    htmlLang: 'en',
    pageTitle: (y) => `Bali Travel Guide & Blog ${y}: Visa, Transport, Where to Stay`,
    pageDescription: (y, n) => `${n}+ on-the-ground Bali guides: ${y} visa and arrival rules, Gojek vs private drivers, where to stay in Seminyak, Ubud or Canggu, real prices and itineraries.`,
    h1: (y) => `Bali Travel Guide & Blog ${y}`,
    tagline: (n) => `${n}+ on-the-ground guides to Bali visas, getting around, where to stay, food and itineraries, plus daily exchange rates, free planning tools and trusted driver recommendations`,
    bullets: (total) => [
      `${total} in-depth guides, continuously updated`,
      '300+ Bali hotels & villas handpicked reviews',
      'Daily IDR exchange rates for accurate budgeting',
      'Free trip planner & budget calculator',
      'Community-tested, 1000+ verified drivers',
    ],
    catLabels: CAT_EN,
    categories: '📂 Categories',
    home: 'Home',
    accommodations: '🏨 Accommodations',
    comingSoon: 'Coming soon',
    essentialGuides: '📚 Essential Guides',
    articles: 'articles',
    guideNames: { '新手指南': "Beginner's Guide", '簽證通關': 'Visa & Entry', '住宿推薦': 'Accommodation', '峇里島分區攻略': 'Area Guide', '美食景點活動': 'Food & Activities' },
    driverName: 'Driver Recommendations',
    driverDesc: 'Find reliable drivers',
    baliNews: '📰 Bali News',
    viewAllNews: 'View all Bali news →',
    ytTitle: 'Bali Travel Videos',
    popular: '🔥 Popular This Week',
    editorsPicks: "⭐ Editor's Picks",
    featuredBadge: 'Featured',
    latestHeading: '🆕 Latest Bali Travel Guides',
    latestListName: 'Latest Bali travel guides',
    hubHeading: (y) => `Bali Travel Essentials: Quick Answers for ${y}`,
    hubIntro: (b, l) => `First trip to Bali? Start with our <a href="${b}/category/beginners-guide/">Bali beginner's guide</a> and the <a href="${b}/2026-bali-trip-planning-guide/">7-step Bali trip planning checklist</a>, then use the free <a href="${l}/trip-planner/">Bali trip planner</a> and <a href="${l}/bali-budget-calculator/">Bali budget calculator</a>. Here are the questions travellers ask us most often.`,
    readMore: 'Read more:',
    hubFaqs: (b, l, y) => [
      {
        q: `Do I need a visa to visit Bali in ${y}?`,
        a: 'Most visitors need a Visa on Arrival (e-VOA). It costs IDR 500,000, is valid for 30 days and can be extended once for another 30 days. Apply online on the official evisa.imigrasi.go.id site before you fly to skip the airport queue, or buy it when you land.',
        links: [
          { href: `${b}/bali-evisa-application-guide/`, label: 'Bali e-VOA application guide' },
          { href: `${b}/bali-visa-landing-vs-electronic/`, label: 'Visa on Arrival vs e-Visa' },
        ],
      },
      {
        q: 'What else do I need to prepare before flying to Bali?',
        a: 'In the 3 days before your flight, fill in the All Indonesia Arrival Card, which combines the customs and health declarations, and save the QR code. Bali also charges every foreign visitor a tourist levy of IDR 150,000 per entry, payable online through the official Love Bali system.',
        links: [
          { href: `${b}/bali-all-indonesia-arrival-guide/`, label: 'All Indonesia Arrival Card guide' },
          { href: `${b}/bali-entry-requirements/`, label: 'Bali entry requirements checklist' },
        ],
      },
      {
        q: 'When is the best time to visit Bali?',
        a: 'The dry season from April to October brings the most sunshine, with July, August and the Christmas–New Year holidays the busiest and most expensive. The rainy season from November to March usually means short tropical downpours rather than all-day rain, plus fewer crowds and lower hotel rates.',
        links: [
          { href: `${b}/bali-best-time-to-visit/`, label: 'Best time to visit Bali' },
          { href: `${l}/weather/`, label: 'Live Bali weather & monthly rainfall' },
        ],
      },
      {
        q: 'How do I get around Bali?',
        a: 'Bali has very little public transport, so most travellers combine two options: Gojek or Grab for short point-to-point rides, and a private driver for day trips with several stops. A private car with driver typically costs around IDR 600,000–800,000 for 10 hours, priced per car rather than per person.',
        links: [
          { href: `${b}/bali-transportation-guide-car-rental/`, label: 'Private driver vs Gojek/Grab' },
          { href: `${b}/2026-03-18-bali-gojek-grab-guide/`, label: 'Gojek vs Grab in Bali' },
          { href: `${b}/bali-private-car-drivers-guide/`, label: 'Recommended Bali drivers' },
        ],
      },
      {
        q: 'Where should I stay in Bali?',
        a: 'Seminyak suits first-timers who want restaurants and shopping on foot, Canggu is the surf-and-café hub, and Ubud is for rice terraces, culture and wellness. Uluwatu has clifftop views and beach clubs, Nusa Dua, Jimbaran and Sanur offer calmer beaches for families, and Kuta is the budget pick closest to the airport.',
        links: [
          { href: `${b}/category/accommodation/`, label: 'Bali hotels & villas by area' },
          { href: `${b}/category/area-guide/`, label: 'Bali area guides' },
        ],
      },
      {
        q: 'What currency is used in Bali, and how should I exchange money?',
        a: 'Bali uses only the Indonesian Rupiah (IDR). Cards work at hotels and larger restaurants, but you will need cash for warungs, markets and small shops. Bringing US or Australian dollars and exchanging them at an authorised money changer usually gets the best rate. Avoid street booths advertising rates that look too good to be true.',
        links: [
          { href: `${b}/bali-currency-exchange-guide/`, label: 'Bali currency exchange guide' },
          { href: `${b}/bali-money-exchange-scams/`, label: 'Money exchange scams to avoid' },
        ],
      },
      {
        q: 'Should I get a SIM card or an eSIM for Bali?',
        a: 'For trips under about 5 days an eSIM is easiest, since you install it at home and it works on landing. For 1–2 weeks, or if you need a local phone number, a Telkomsel SIM bought at the airport gives the widest coverage, including in rural areas.',
        links: [
          { href: `${b}/bali-sim-card-esim-guide/`, label: 'Bali SIM card & eSIM guide' },
        ],
      },
    ],
    pager: { prev: '← Previous', next: 'Next →', page: 'Page' },
    promoCta: 'View Offer →',
  },

  id: {
    htmlLang: 'id',
    pageTitle: (y) => `Panduan Wisata Bali ${y}: Transportasi, Hotel & Tips Liburan`,
    pageDescription: (y, n) => `${n}+ panduan wisata Bali dari lapangan: waktu terbaik, sewa mobil vs Gojek, area menginap di Seminyak, Ubud & Canggu, harga tiket, dan itinerary liburan ${y}.`,
    h1: (y) => `Blog & Panduan Wisata Bali ${y}`,
    tagline: (n) => `${n}+ panduan lengkap seputar transportasi, area menginap, kuliner, tempat wisata, dan itinerary Bali, plus kurs harian, tools perencanaan gratis, dan rekomendasi sopir terpercaya`,
    bullets: (total) => [
      `${total} panduan mendalam, terus diperbarui`,
      '300+ hotel & villa Bali pilihan dengan review',
      'Kurs IDR harian untuk budgeting yang akurat',
      'Trip planner & kalkulator budget gratis',
      'Rekomendasi driver terpercaya, 1000+ terverifikasi',
    ],
    catLabels: CAT_ID,
    categories: '📂 Kategori',
    home: 'Beranda',
    accommodations: '🏨 Akomodasi',
    comingSoon: 'Segera hadir',
    essentialGuides: '📚 Panduan Penting',
    articles: 'artikel',
    guideNames: { '新手指南': 'Panduan Pemula', '簽證通關': 'Visa & Imigrasi', '住宿推薦': 'Akomodasi', '峇里島分區攻略': 'Panduan Area', '美食景點活動': 'Makanan & Aktivitas' },
    driverName: 'Rekomendasi Driver',
    driverDesc: 'Temukan driver terpercaya',
    baliNews: '📰 Berita Bali',
    viewAllNews: 'Lihat semua berita Bali →',
    ytTitle: 'Video Wisata Bali',
    popular: '🔥 Populer Minggu Ini',
    editorsPicks: '⭐ Pilihan Editor',
    featuredBadge: 'Pilihan',
    latestHeading: '🆕 Panduan Wisata Bali Terbaru',
    latestListName: 'Panduan wisata Bali terbaru',
    hubHeading: (y) => `Info Penting Liburan ke Bali: Tanya Jawab ${y}`,
    hubIntro: (b, l) => `Pertama kali ke Bali? Mulai dari <a href="${b}/category/panduan-pemula/">panduan pemula wisata Bali</a> dan <a href="${b}/2026-bali-trip-planning-guide/">7 langkah merencanakan liburan ke Bali</a>, lalu pakai <a href="${l}/trip-planner/">trip planner Bali</a> dan <a href="${l}/bali-budget-calculator/">kalkulator budget Bali</a> gratis kami. Berikut pertanyaan yang paling sering ditanyakan traveler.`,
    readMore: 'Baca juga:',
    hubFaqs: (b, l, y) => [
      {
        q: `Kapan waktu terbaik liburan ke Bali di ${y}?`,
        a: 'Musim kemarau (April–Oktober) paling cerah dan cocok untuk ke pantai maupun trekking, tapi musim libur sekolah, Juli–Agustus, serta Natal dan Tahun Baru adalah masa paling ramai dan mahal. Musim hujan (November–Maret) biasanya berupa hujan deras singkat, bukan seharian, dan hotel cenderung lebih sepi serta lebih murah.',
        links: [
          { href: `${b}/bali-best-time-to-visit/`, label: 'Waktu terbaik ke Bali' },
          { href: `${l}/weather/`, label: 'Cuaca Bali hari ini & curah hujan bulanan' },
        ],
      },
      {
        q: 'Bagaimana cara keliling Bali?',
        a: 'Transportasi umum di Bali sangat terbatas, jadi kebanyakan wisatawan menggabungkan Gojek atau Grab untuk perjalanan jarak dekat dengan sewa mobil plus sopir untuk tur seharian ke beberapa tempat. Sewa mobil dengan sopir umumnya sekitar Rp600.000–800.000 untuk 10 jam, dihitung per mobil, bukan per orang. Sewa motor juga populer, tapi pastikan kamu punya SIM C dan selalu pakai helm.',
        links: [
          { href: `${b}/bali-transportation-guide-car-rental/`, label: 'Sewa mobil vs Gojek/Grab' },
          { href: `${b}/2026-03-18-bali-gojek-grab-guide/`, label: 'Panduan Gojek & Grab di Bali' },
          { href: `${b}/bali-private-car-drivers-guide/`, label: 'Rekomendasi sopir di Bali' },
          { href: `${b}/bali-motorbike-rental-tips/`, label: 'Tips sewa motor di Bali' },
        ],
      },
      {
        q: 'Sebaiknya menginap di area mana di Bali?',
        a: 'Seminyak cocok untuk liburan pertama karena dekat restoran dan tempat belanja, Canggu untuk suasana surfing dan kafe, sedangkan Ubud untuk sawah, budaya, dan wellness. Uluwatu menawarkan pemandangan tebing dan beach club, Nusa Dua, Jimbaran, dan Sanur punya pantai yang lebih tenang untuk keluarga, sementara Kuta paling hemat dan paling dekat ke bandara.',
        links: [
          { href: `${b}/category/akomodasi/`, label: 'Hotel & villa Bali per area' },
          { href: `${b}/category/panduan-area/`, label: 'Panduan area Bali' },
          { href: `${b}/bali-hotel-booking-tips/`, label: 'Tips hemat booking hotel' },
        ],
      },
      {
        q: 'Apakah wisatawan Indonesia harus bayar pungutan wisatawan Bali?',
        a: 'Tidak. Pungutan wisatawan Bali sebesar Rp150.000 per kedatangan hanya berlaku untuk wisatawan asing. Kalau kamu liburan bersama teman atau keluarga berkewarganegaraan asing, mereka perlu membayarnya secara online lewat sistem resmi Love Bali sebelum tiba.',
        links: [
          { href: `${b}/bali-visa-tourism-tax/`, label: 'Aturan pungutan wisatawan Bali' },
        ],
      },
      {
        q: 'Berapa budget liburan ke Bali?',
        a: 'Biaya paling bervariasi ada di penginapan dan transportasi. Makan di warung lokal relatif murah, sementara beach club dan restoran wisata bisa jauh lebih mahal, dan harga tiket objek wisata juga terus naik. Hitung perkiraan biaya sesuai jumlah hari, gaya liburan, dan jumlah orang dengan kalkulator budget Bali gratis kami.',
        links: [
          { href: `${l}/bali-budget-calculator/`, label: 'Kalkulator budget Bali' },
          { href: `${b}/bali-attraction-ticket-prices-2026/`, label: 'Harga tiket wisata Bali terbaru' },
          { href: `${b}/bali-travel-cash-budget-guide/`, label: 'Berapa uang tunai yang perlu disiapkan' },
        ],
      },
      {
        q: 'Di Bali lebih baik bayar tunai, kartu, atau QRIS?',
        a: 'QRIS makin banyak diterima di Bali, mulai dari restoran dan toko sampai sebagian tiket objek wisata dan parkir, jadi dompet digital atau mobile banking kamu bisa langsung dipakai. Tetap bawa uang tunai secukupnya untuk warung kecil, pasar, dan tempat yang sinyalnya lemah.',
        links: [
          { href: `${b}/QRIS/`, label: 'Panduan bayar pakai QRIS di Bali' },
          { href: `${b}/bali-credit-card-travel-tips/`, label: 'Pakai kartu kredit di Bali' },
        ],
      },
      {
        q: 'Bagaimana cara menghindari penipuan wisata di Bali?',
        a: 'Waspadai money changer pinggir jalan yang menawarkan kurs terlalu bagus, calo yang menawarkan tur dadakan, dan sopir yang tidak mau menyepakati harga di awal. Pakai aplikasi resmi, sepakati harga sebelum berangkat, dan pelajari modus penipuan terbaru sebelum liburan.',
        links: [
          { href: `${b}/bali-tourist-scams-2026/`, label: 'Modus penipuan wisata terbaru di Bali' },
          { href: `${b}/bali-grab-gojek-scam-tips/`, label: 'Trik sopir Grab/Gojek yang perlu diwaspadai' },
        ],
      },
    ],
    pager: { prev: '← Sebelumnya', next: 'Berikutnya →', page: 'Halaman' },
    promoCta: 'Lihat Promo →',
  },
};
