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
