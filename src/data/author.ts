/**
 * author.ts — 站方掛名作者：小傑爸（真人 EEAT 實體）
 *
 * 用於：
 *   - SEO.astro：文章 JSON-LD 的 author（Person，取代原本的 Organization）
 *   - about.astro：作者頁的 ProfilePage + Person 主體（@id 一致，做實體整合）
 *   - BlogPost.astro：文章可見的作者 byline
 *   - BaseHead.astro：<meta name="author">
 *
 * sameAs 對應真實社群帳號（與 src/pages/index.astro 的 Organization sameAs 一致），
 * 讓 Google 把「小傑爸」這個作者實體與 YouTube 頻道／FB 專頁綁在一起，補強 E-E-A-T。
 */

export const AUTHOR = {
  name: '小傑爸',
  // 作者頁（Person 實體的正規網址；@id 用於跨頁實體整合）
  url: 'https://gobaligo.id/about/',
  id: 'https://gobaligo.id/about/#person',
  jobTitle: '峇里島旅遊部落客 / YouTuber',
  sameAs: [
    'https://www.youtube.com/@j_indonesia',
    'https://www.facebook.com/bali.guide.blog',
  ],
  description:
    '小傑爸是「小傑印尼」YouTube 頻道與 Go Bali Go 峇里島旅遊攻略站的經營者。熱愛峇里島，長期蒐集與實查島上住宿、簽證、交通與景點資訊，持續更新第一手內容，只為幫每位第一次去峇里島的旅人少走冤枉路、訂房不踩雷。',
} as const;

/** 可直接嵌入 JSON-LD `author` 欄位的 Person 物件 */
export const AUTHOR_PERSON = {
  '@type': 'Person',
  '@id': AUTHOR.id,
  name: AUTHOR.name,
  url: AUTHOR.url,
  jobTitle: AUTHOR.jobTitle,
  description: AUTHOR.description,
  sameAs: AUTHOR.sameAs,
} as const;
