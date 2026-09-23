/**
 * author.ts — 站方掛名作者：Gobaligo編輯部（團隊 EEAT 實體）
 *
 * 用於：
 *   - SEO.astro：文章 JSON-LD 的 author（Organization）
 *   - about.astro：作者頁的 AboutPage + Organization 主體（@id 一致，做實體整合）
 *   - BlogPost.astro：文章可見的作者 byline
 *   - BaseHead.astro：<meta name="author">
 *
 * sameAs 對應真實社群帳號（與 src/pages/index.astro 的 Organization sameAs 一致），
 * 讓 Google 把「Gobaligo編輯部」這個作者實體與 YouTube 頻道／FB 專頁綁在一起，補強 E-E-A-T。
 */

export const AUTHOR = {
  name: 'Gobaligo編輯部',
  // 作者頁（作者實體的正規網址；@id 用於跨頁實體整合）
  url: 'https://gobaligo.id/about/',
  id: 'https://gobaligo.id/about/#editorial-team',
  sameAs: [
    'https://www.youtube.com/@j_indonesia',
    'https://www.facebook.com/bali.guide.blog',
  ],
  description:
    'Gobaligo編輯部是「小傑印尼」YouTube 頻道與 Go Bali Go 峇里島旅遊攻略站背後的內容團隊。長期蒐集與實查島上住宿、簽證、交通與景點資訊，持續更新第一手內容，只為幫每位第一次去峇里島的旅人少走冤枉路、訂房不踩雷。',
} as const;

/** 可直接嵌入 JSON-LD `author` 欄位的 Organization 物件 */
export const AUTHOR_ORG = {
  '@type': 'Organization',
  '@id': AUTHOR.id,
  name: AUTHOR.name,
  url: AUTHOR.url,
  description: AUTHOR.description,
  sameAs: AUTHOR.sameAs,
} as const;
