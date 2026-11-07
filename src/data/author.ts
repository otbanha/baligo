/**
 * author.ts — 站方掛名作者：小傑爸（真人作者，EEAT 實體）
 *
 * 用於：
 *   - SEO.astro：文章 JSON-LD 的 author（Person；新聞存檔文章例外，見 getArticleAuthorSchema）
 *   - about.astro：作者頁的 ProfilePage + Person 主體（@id 一致，做實體整合）
 *   - BlogPost.astro：文章可見的作者 byline
 *   - BaseHead.astro：<meta name="author">
 *
 * sameAs 對應真實社群帳號（與 src/pages/index.astro 的 Organization sameAs 一致），
 * 讓 Google 把「小傑爸」這個作者實體與 YouTube 頻道／FB 專頁／討論區綁在一起，補強 E-E-A-T。
 */

export type Lang = 'zh-tw' | 'zh-hk' | 'zh-cn' | 'en' | 'id';

const SAME_AS = [
  'https://www.facebook.com/bali.guide.blog',
  'https://www.facebook.com/groups/indonesia.travelguide',
  'https://www.youtube.com/@j_indonesia',
  'https://www.instagram.com/go.bali.go/',
  'https://www.threads.com/@go.bali.go',
  'https://community.gobaligo.id/',
] as const;

const AVATAR = 'https://gobaligo.id/images/author/xiaojie-ba.jpg';

const NAMES: Record<Lang, string> = {
  'zh-tw': '小傑爸',
  'zh-hk': '小傑爸',
  'zh-cn': '小杰爸',
  en: "Mac (J's Dad)",
  id: 'Mac (Ayah J)',
};

// byline 下方那行短介紹
const BIOS: Record<Lang, string> = {
  'zh-tw': '台灣人，長住印尼，Go Bali Go 站長',
  'zh-hk': '台灣人，長住印尼，Go Bali Go 站長',
  'zh-cn': '台湾人，长住印尼，Go Bali Go 站长',
  en: 'Taiwanese, long-term resident of Indonesia, founder of Go Bali Go',
  id: 'Orang Taiwan, tinggal lama di Indonesia, pendiri Go Bali Go',
};

export const AUTHOR_URL = 'https://gobaligo.id/about/';
export const AUTHOR_ID = 'https://gobaligo.id/about/#person';

function normalizeLang(lang?: string): Lang {
  return (lang && lang in NAMES) ? (lang as Lang) : 'zh-tw';
}

export function getAuthorName(lang?: string): string {
  return NAMES[normalizeLang(lang)];
}

export function getAuthorBio(lang?: string): string {
  return BIOS[normalizeLang(lang)];
}

/** 預設（zh-TW）作者資料，供尚未改用 getAuthorName/getAuthorPerson 的地方讀取 */
export const AUTHOR = {
  name: NAMES['zh-tw'],
  url: AUTHOR_URL,
  id: AUTHOR_ID,
  avatar: AVATAR,
  sameAs: SAME_AS,
  description: BIOS['zh-tw'],
} as const;

/** 可直接嵌入 JSON-LD `author` 欄位的 Person 物件 */
export function getAuthorPerson(lang?: string) {
  return {
    '@type': 'Person',
    '@id': AUTHOR_ID,
    name: getAuthorName(lang),
    url: AUTHOR_URL,
    image: AVATAR,
    description: getAuthorBio(lang),
    sameAs: [...SAME_AS],
  } as const;
}

// ── 新聞存檔例外 ──────────────────────────────────────────────────────────────
// /news/ 與 bali-news-* 文章不掛小傑爸，改用「Go Bali Go 新聞室」（Organization）。
const NEWS_AUTHOR_NAMES: Record<Lang, string> = {
  'zh-tw': 'Go Bali Go 新聞室',
  'zh-hk': 'Go Bali Go 新聞室',
  'zh-cn': 'Go Bali Go 新闻室',
  en: 'Go Bali Go Newsroom',
  id: 'Redaksi Berita Go Bali Go',
};

export function getNewsAuthorName(lang?: string): string {
  return NEWS_AUTHOR_NAMES[normalizeLang(lang)];
}

export function getNewsAuthorOrg(lang?: string) {
  return {
    '@type': 'Organization',
    name: getNewsAuthorName(lang),
    url: 'https://gobaligo.id/news/',
  } as const;
}

/** 文章 JSON-LD 的 author：新聞存檔用 Organization，其餘用小傑爸 Person */
export function getArticleAuthorSchema(lang: string | undefined, isNews: boolean) {
  return isNews ? getNewsAuthorOrg(lang) : getAuthorPerson(lang);
}
