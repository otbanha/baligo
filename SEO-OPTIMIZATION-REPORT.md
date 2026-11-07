# gobaligo.id 多語系 SEO 優化報告

**執行日期：** 2026-11-05
**範圍：** 繁體中文版（`/`、`/blog/`）、簡體中文版（`/zh-cn/`）、英文版（`/en/`）
**附帶修正：** 港版（`/zh-hk/`）與印尼文版（`/id/`）凡屬同一支程式造成的問題一併修好

稽核方式：完整 `npm run build` 之後，對產出的 **5,150 個 HTML 檔**逐頁解析
`<title>`、`<meta description>`、canonical、`hreflang`、`<html lang>`、H1 層級、
JSON-LD 結構化資料、圖片 alt 與語言混雜情況，再依量測結果決定要改什麼。

---

## 一、修正前後對照

| 項目 | 修正前 | 修正後 |
|---|---|---|
| 繁中標題超出 SERP 顯示長度 | 729 頁 | 15 頁 |
| 簡中標題超出 SERP 顯示長度 | 724 頁 | 14 頁 |
| 港版標題超出 SERP 顯示長度 | 721 頁 | 9 頁 |
| 繁中描述超出 SERP 顯示長度 | 690 頁 | 1 頁 |
| 簡中描述超出 SERP 顯示長度 | 693 頁 | 2 頁 |
| 港版描述超出 SERP 顯示長度 | 688 頁 | 2 頁 |
| 一頁兩個 `<h1>`（標題層級斷掉） | 879 頁 | 0 頁 |
| 無效的 JSON-LD 結構化資料區塊 | 3 個（三個語系的 `/blog/`） | 0 個 |
| 印尼文頁面的 meta 夾雜中文關鍵字 | 63 頁 | 0 頁 |
| 英文頁面的 meta 夾雜中文 | 4 頁 | 0 頁 |
| Lorem ipsum 樣板佔位文章被收錄 | 20 頁 | 0 頁 |
| 未翻譯就上線的中文複製頁（掛在 `/en/`、`/id/` 等底下） | 8 頁 | 0 頁（noindex 且移出 sitemap） |
| 各語言的「關於編輯部」E-E-A-T 實體頁 | 1 頁（只有繁中） | 5 頁 |
| 薄內容的詢問表單頁可被索引 | 12 頁 | 0 頁 |
| 沒有任何內容的 iframe 空殼頁可被索引 | 4 頁 | 0 頁 |

---

## 二、各項修正說明

### P1. 三個中文語系的標題與描述加上 SERP 長度控制 ★ 影響最大
`src/utils/seo-keywords.ts` 原本只對英文／印尼文做長度裁切，註解寫著
「繁中／簡中／港版本來就在合理範圍，不動」。實際量測產出結果並非如此：

- 標題中位數 **38 個全形字**（Google 中文 SERP 大約只顯示 30～33 個）
- 描述中位數 **102 個全形字**，最長 **378 個**（大約只顯示 78～80 個）

也就是說中位數的頁面，標題尾段與描述後 20% 都被截掉，摘要常常斷在句子中間。

改法：長度預算改用「視覺寬度」計算（全形字算 2、半形字算 1），中文語系的
標題預算 64 單位（≈32 全形字，含品牌後綴）、描述 160 單位（≈80 全形字），
並在中文標點（`｜`、`：`、`，`、`。`）上斷句，讓裁切後仍是完整語意。
放得下品牌後綴就接、放不下就不接（原本是一律硬接 ` | Go Bali Go`）。

> 只影響 `<meta>` 與 JSON-LD，**不動 `<h1>` 與 frontmatter**，所以不會改到
> `content_hash`、不會觸發 `translate.yml` 的整批重新翻譯。

結果：2,976 篇中文文章標題全部落在預算內（中位數 77 → 56），0 篇超標。

### P2. 印尼文頁面的 meta 描述被接上繁體中文關鍵字
`enhancedDescription()` 的語言白名單漏了 `'id'`，印尼文因此 fallback 到繁中
關鍵字表，產出像這樣的描述：

```
Panduan lengkap memilih villa di Seminyak...｜Villa、飯店住宿推薦、峇里島訂房優惠
```

63 個 `/id/` 頁面中標。已補上 9 組分類關鍵字與 8 組長尾關鍵字的印尼文版本，
分隔符也改用拉丁語系的 ` · `。同時把關鍵字後綴改成「接上去之後整句仍放得進
SERP 預算才接」，避免白白吃掉描述尾段又讓摘要斷在半句。

### P3. 879 個頁面有兩個 `<h1>`
178 篇文章的 markdown 內文開頭又寫了一行 `# 標題`（搬站時連標題一起複製進
內文），版面本身已經用 frontmatter 的 title 輸出 `<h1>`，於是變成
`h1 → h1 → h2`，標題層級斷掉。五個語系合計 879 頁。

改法：新增 `src/rehype-demote-h1.mjs`，在 build 時把內文的 `h1` 降成 `h2`。
**在渲染層處理而不改內容檔**，同樣是為了不觸發整批重新翻譯。
只降一級、不連動推 `h2 → h3`，`SEO.astro` 依 H2 產生的
FAQPage / HowTo / TouristDestination schema 完全不受影響；另外加了一道
防護，把「和文章標題同一句」的那個標題排除在這些 schema 之外。

### P4. 未翻譯就上線的中文複製頁
各語言的 `[...slug].astro` 在找不到翻譯時會退回繁中原文
（`langMapBySlug.get(slug) ?? blogPost`），產出的頁面是**整篇中文**，卻掛在
`<html lang="en">` 底下、自己 canonical 自己、還進 sitemap。翻譯是每天凌晨跑的，
所以**每篇新文章發佈後都會有一段時間在四個語言各留一份中文複製頁**。

改法：路由把「有沒有翻譯」傳給 `BlogPost`，沒有翻譯就輸出
`noindex, follow`，sitemap 也一併排除；翻譯進來後自動恢復可索引。
這是一個會持續發生的問題，這次是修機制而不只是修當下那 8 頁。

### P5. 三個語系的 `/blog/` 有無效的 JSON-LD
`<script type="application/ld+json" id="newbie-schema-slot"></script>` 是個空的
結構化資料區塊（等 JS 在特定分類下才填）。空的 ld+json 本身就是 Search Console
的解析錯誤。改成需要時才用 JS 建立該元素。

### P6. 20 篇 Astro 樣板佔位文章還在站上
`first-post` / `second-post` / `third-post` / `using-mdx` 五個語系各一份，內容是
`Lorem ipsum dolor sit amet`，而且 `sitemap-priorities.json` 還給了 0.8 的高權重。
已全數刪除並清掉權重設定。

### P7. 英文／印尼文的 meta 夾雜未翻譯的中文
逐字比對後修掉實際殘留的中文：英文 5 處（`at网红 beach`、`Ubud food攻略`、
`organize专属 activities`、`snorkeling at the断层`、`(繁/简/Eng Sub)`），
印尼文 37 處（含 4 篇標題整句是中文、`【2026版】`、`【Bali景点】`、
`攻略`、`行程`、`海底漫步` 等夾字）。

### P8. 各語言的「關於編輯部」頁（E-E-A-T）
原本只有繁中 `/about/`，但：

- 每篇文章的作者 byline 都連到它 → 約 4,000 個 `/en/`、`/id/`、`/zh-cn/`、
  `/zh-hk/` 頁面把作者實體指向一個讀者看不懂的頁面
- 文章 JSON-LD 的 `author` 一律掛繁中名稱與介紹
- Header 的語言切換器早就會產生 `/en/about/` 這種連結，而那是 **404**
- 頁尾完全沒有連到它，從首頁、分類頁、工具頁都走不到

改法：新增 `/en/about/`、`/zh-cn/about/`、`/zh-hk/about/`、`/id/about/`
（文案在 `src/data/about-i18n.ts`，五語言共用一個 Organization `@id` 做實體整合），
sitemap 補上 hreflang 群組，文章 byline 改連該語言自己的 about 頁，
文章 JSON-LD 的 author 名稱／介紹依語言輸出，頁尾也補上連結。

### P9. 工具 iframe 沒有跟著語言換
`{{block:交通選擇表單}}` 在五個語言的區塊檔裡都 iframe 繁中版的
`/tools/bali-transport-quiz.html` ——**英文讀者在 `/en/blog/bali-transport-quiz/`
看到的是一個全中文的測驗**（英文、簡中、港版的檔案早就存在，只是沒被用到）。
改在 `remark-blocks.mjs` 依語言改寫 iframe 的 src，不會被下次重新翻譯蓋回去。

### P10. 爬取預算與薄內容清理
- `/forms/*.html` 12 個詢問表單 → `noindex, follow`
- `/tools/bali-transport-quiz*.html` 4 個 iframe 空殼（沒有任何伺端內容）→ `noindex, follow`，`lang` 統一成 `zh-TW` / `zh-CN` / `zh-HK` / `en`
- `/index-all/` 純連結索引頁 → `noindex, follow`
- `/ebook/峇里島新手完全指南.html` 整頁 10 個 `<h1>` → 1 個 H1 + 9 個 H2，並補上 title／description／canonical
- `/biz-register.html` 補上 description 與 canonical
- `/map/` 原本整頁沒有任何 `<h1>`（主題只靠 hero 圖傳達）→ 補上可見標題

### P11. hreflang 與語言代碼一致性
- `/trip-planner/` 系列與 `/zh-cn/`、`/zh-hk/` 空殼頁缺 `hreflang="id"` → 補齊
- `/en/`、`/id/`、`/zh-cn/`、`/zh-hk/` 的 hreflang 指向會 301 的語言根路徑 → 改指最終網址 `/xx/blog/`（指向轉址的 hreflang 會被 Google 判為無效）
- `<html lang>` 的 `zh-Hans` / `zh-Hant-HK` / `zh-Hant` → 統一成 `zh-CN` / `zh-HK` / `zh-TW`，與站上 hreflang、sitemap 的標籤一致

### P12. 問答頁與首頁描述
- `/ask/*` 的標題是「問題全文 — 峇里島求救箱 | Go Bali Go」，視覺寬度 70～74（預算 64）→ 走同一套長度控制
- 首頁 meta 描述還寫「610+ 篇深度文章」，實際約 980 篇 → 更新為 950+

---

## 三、需要你本人操作的一件事

`src/consts.ts` 的中國搜尋引擎站長平台驗證碼目前是空的：

```ts
export const CN_SITE_VERIFICATION = { baidu: '', so360: '', sogou: '', shenma: '' };
```

簡體中文版的主要流量來源是百度／360／搜狗／神馬，而這四家都要先在站長平台
驗證網站所有權才會開始收錄與提供數據。驗證碼必須用你的帳號去申請，程式這邊
已經接好（填進去就會自動輸出對應的 meta，簡中 sitemap `sitemap-zh-cn.xml`
也早就產好了）：

- 百度 <https://ziyuan.baidu.com> → 用户中心 → 站点管理 → 添加网站 → HTML标签验证
- 360 <https://zhanzhang.so.com> → 添加网站 → 代码验证
- 搜狗 <https://zhanzhang.sogou.com> → 添加网站 → 验证网站 → HTML标签验证
- 神马 <https://zhanzhang.sm.cn> → 添加网站 → HTML标签验证

拿到四組 content 值填進 `CN_SITE_VERIFICATION` 即可。

---

## 四、建議的後續項目（本次未做）

1. **印尼文版的交通測驗**：`/tools/` 目前沒有印尼文版，暫時指向英文版（比指向中文版好）。要做就是把那支 21KB 的 HTML 字串翻成印尼文。
2. **每日新聞存檔的描述重複**：11 篇繁中新聞共用同一段描述。這批文章 45 天後就會自動 noindex 並由 `/news/` hub 承接，影響有限，但若要長期產出每日新聞，描述產生邏輯值得改成帶入當天重點。
3. **60 張圖片缺 alt**：集中在繁中內文（共 26,940 張，缺 60 張）。改內容檔會觸發重新翻譯，建議併入下次內容批次維護。
4. **剩下 15 篇繁中標題仍超預算**：這些是標題本身沒有任何可斷句的分隔符、又長到硬切會砍掉關鍵字的情況，適合人工重寫而不是程式裁切。

---

## 五、驗證方式

```bash
npm run build     # 通過，產出 5,150 個 HTML
```

稽核腳本與前後報表留在本次工作目錄（非專案檔）。若要重跑驗證，重點檢查項目：

- 中文標題視覺寬度 ≤ 64、描述 ≤ 160
- 每頁（排除 `<script>` 內的樣板字串）剛好一個 `<h1>`
- 所有 JSON-LD 區塊皆可 `JSON.parse`
- `/en/`、`/id/` 的 meta 不含漢字
- `/xx/blog/<slug>/` 若該語言沒有內容檔，則該頁 `noindex` 且不在 sitemap 內

---

# 第二輪（2026-11-07）

## 一、首頁空連結、英文標題、`[待補連結]`

**首頁三個 `href="#"` 空連結。** `/blog/`（各語系的實際首頁）的「編輯精選」三張卡片是
伺端就渲染好的佔位 `<a href="#">`：整個區塊預設 `display:none`，只有選了分類才由 JS
填入網址與標題。結果每個語系的首頁都固定送出三個死連結（可見文字只有「精選」徽章）
與三個 `src=""` 的 `<img>`。改成需要時才由 JS 建立卡片元素，五個語系現在都是 0 個。

**繁中／簡中／港版首頁上的英文標題。** 側欄區塊標題硬寫成英文：
`🏨 Accommodations`（三個中文語系都有）與 `📰 Bali News`（簡中、港版）。
英文版與印尼文版本來就有自己的字串，只有中文語系漏了。已改為
住宿推薦／住宿推荐、峇里島新聞／巴厘岛新闻。

**`[待補連結]`。** 全站掃描 `待補`、`待补`、`Link to be added`、`Tautan menyusul`、`TBD`
後，真正的佔位只有一處：森林系餐廳那篇的 Bread Yard 留了
`**Google Maps：** [待補連結]`，五個語系都有。同一篇另外四家餐廳都沒有 Google Maps
欄位，所以整個欄位移除，與其他四家一致。

> 節慶文章裡的 `TBD` 不是佔位：繁中原文就是「**未定** Ubud Food Festival」，
> 英文版翻成 `TBD:` 是正確翻譯，保留。

## 二、新聞頁：每月新聞彙整 + 每日新聞 noindex

兩個選項都做了，以「每月彙整」為主：

**新增 `/news/archive/YYYY-MM/`（9 頁，每月自動增加一頁）。** 每一頁收錄該月所有新聞的
日期、分類、標題與摘要，附 CollectionPage + ItemList + BreadcrumbList schema、
上下月導覽與全部月份的快捷列。`/news/` 首頁也加上「每月彙整」導覽列。

**每日新聞的可索引窗口從 45 天縮到 3 天。** 211 篇（五語系合計約 1,055 頁）薄內容，
現在只有最新 3 天內的會被索引，其餘一律 `noindex, follow` 並移出 sitemap，
排名集中到 `/news/` 首頁與月彙整頁。

> **為什麼不是「一律 noindex」：** `src/pages/news-sitemap.xml.ts` 是 Google News
> sitemap，只收 48 小時內的新聞。若每日新聞全部 noindex，那份 sitemap 會自相矛盾
> （送出一批叫 Google 不要索引的網址），Google News 與 Discover 的曝光也一併放棄。
> 所以窗口設成剛好覆蓋它的 3 天（`NEWS_INDEX_DAYS`，在 `BlogPost.astro` 與
> `astro.config.mjs` 各一份且數值一致）。要完全不索引每日新聞，把它設成 `0`，
> 同時移除 `news-sitemap.xml` 與 `robots.txt` 裡那一行即可。

**`/news/2/` 之後的分頁改 `noindex, follow` 並移出 sitemap** —— 內容與月彙整頁高度重疊。

## 三、旅遊專題／購物指南分類頁；Logo 改連 `/blog/`

**兩個分類原本沒有靜態分類頁**，只能靠 `/blog/?cat=` 的前端篩選，爬蟲看不到任何文章。
其中**旅遊專題是全站最大的分類（236 篇）**。另外 `旅遊專題` 連 `CAT_SLUG_EN` /
`CAT_SLUG_ID` 都沒有，所以英文與印尼文連 slug 都不存在，sitemap 的分類 hreflang
也整個跳過它。

已補上：

- `CAT_SLUG_EN['旅遊專題'] = 'travel-tips'`、`CAT_SLUG_ID['旅遊專題'] = 'tips-traveling'`
- 五個語系各新增 2 頁，共 **10 個分類頁**，全部進 sitemap 並帶完整 hreflang 群組
- 頁尾分類清單、文章側欄、首頁的 ItemList schema（順便補上漏掉的「套裝行程」，
  9 項 → 11 項）全部改指真實分類頁

**Logo 改連 `/blog/`。** Header 與 Footer 的 logo 原本指向 `/blog/?lang=tw`，等於全站
每一頁都連到一個帶參數的非 canonical 網址。`?lang=tw` 原本的用途是避免
`navigator.languages` 誤判跳轉，現在改由 `/blog/` 的偵測腳本在「站內導覽進來」或
「瀏覽器本來就是繁中」時把語言寫進 cookie（`rememberZhTw`），連結本身就能用乾淨網址。
語言切換器仍保留 `?lang=tw`（那是使用者主動選擇，語意正確）。

**內文的 `?cat=` 篩選連結一併導正。** 35 篇文章內文用
`/blog/?cat=住宿推薦`、甚至 `/en/blog/?lang=tw&cat=<繁中分類值>` 這種寫法連分類。
在 `rehype-internal-links.mjs` 加一條規則，build 時改寫成該語言正確的
`/blog/category/<slug>/`（不動內容檔，所以不會觸發重新翻譯）。
dist 裡現在 0 個 `?cat=` 連結。

## 四、vocus 舊文導引

584 篇文章是從 vocus.cc 搬過來的，舊文還活著且多半比新站早被收錄，等於自己跟自己
搶關鍵字。跨站 canonical 我們無法自己設，只能在 vocus 每篇放導引連結。

vocus 沒有公開 API，也不在本專案的部署範圍內，所以產出的是**可直接作業的完整對照表**：

- `npm run vocus-map` → `scripts/generate-vocus-redirect-map.mjs`
- `docs/vocus-redirect-map.csv` — 584 列，含 vocus 網址、標題、發佈日、新網址、
  **可直接複製貼上的導引文字**，以及四個語言版本的網址
- `docs/vocus-redirect-map.json` — 機器可讀版
- `docs/vocus-redirect-sop.md` — 作業方式與注意事項

**584 篇全部驗證過新網址在 dist 裡有對應頁面，沒有任何導引會指向 404**，
而且 584 篇的 en / id / zh-cn / zh-hk 四個語言版本都齊全。
CSV 已依發佈日由新到舊排序，先做前面幾十篇效益最高，不必一次做完。

> **要你本人操作的部分：** 實際貼上導引必須在 vocus 後台進行（我沒有、也不應該有
> 你的 vocus 帳號）。SOP 裡有逐篇步驟，重點是**不要刪除 vocus 原文** —— 直接刪掉會讓
> 既有排名與外部連結一起消失，留著並導引過來，權重才會慢慢轉移。

## 五、驗證

```bash
npm run build     # 通過，產出 5,169 個 HTML
```

| 檢查 | 結果 |
|---|---|
| 首頁 `href="#"` 空連結 | 5 語系皆 0（原本各 3 個） |
| 首頁 `src=""` 空圖 | 5 語系皆 0（原本各 3 個） |
| 中文語系首頁的英文標題 | 0 |
| 全站 `待補` / `Link to be added` | 0 |
| `/news/archive/` 月彙整頁 | 9 頁，皆可索引且進 sitemap |
| `/news/N/` 分頁進 sitemap | 0（已 noindex） |
| 新分類頁 | 10 頁（5 語系 × 2），皆進 sitemap 且帶 hreflang |
| 全站 `?cat=` 篩選連結 | 0 |
| Logo href | `/blog/`、`/en/blog/` …（無 `?lang=tw`） |
| vocus 導引指向 404 | 0 / 584 |
| 第一輪的各項指標 | 無退步（標題、描述、H1、JSON-LD、hreflang 全數維持） |
