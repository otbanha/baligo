# 峇里島新聞 — 每日發布 SOP

## 發布位置

Sveltia CMS → **文章**（`src/content/blog/`）新增一筆，`分類` 勾選「新聞存檔」。
新聞不是獨立 collection，就是一篇普通文章，只是分類是「新聞存檔」。

## 每天要填的欄位

| 欄位 | 必填 | 說明 |
|---|---|---|
| 標題 title | ✅ | 建議格式：「峇里島新聞｜XX、XX、最新旅遊消息整理（YYYY/M/D）」 |
| 描述 description | 建議填 | 60-120 字摘要，會變成 `/news/` 列表的摘要與 NewsArticle schema 的 description |
| 發佈日期 pubDate | ✅ | 當天日期 |
| 發佈時間 pubHour | 建議填 | 幾點發布（0-23），影響排序與 Google News 48 小時篩選窗口的判斷基準 |
| 分類 category | ✅ | 勾選「新聞存檔」 |
| **新聞分類 newsCategory** | 建議填 | 政策／交通／天氣／景點／簽證／治安／活動 其中一個，決定會出現在哪個 `/news/category/` 頁 |
| Tags | 建議填 | 用來讓「相關文章」自動關聯到既有深度攻略（例如寫了簽證相關新聞，tag 打「簽證」就會連到站內簽證攻略） |
| 首圖 heroImage | 建議填 | 不填會自動抓內文第一張圖 |
| **首圖替代文字 imageAlt** | 建議填 | 給無障礙與 SEO，不填則退回用標題 |
| **新聞出處名稱 source** | 建議填 | 例如「Bali Post」「The Bali Sun」，會顯示在文章頁並寫入 E-E-A-T 標註 |
| **新聞出處連結 sourceUrl** | 建議填 | 原文連結，會自動加 `rel="nofollow noopener"` |
| 內文 body | ✅ | 一般 Markdown 內文 |

**粗體**的四個欄位（newsCategory / imageAlt / source / sourceUrl）是這次新增的，舊文章沒有也不會壞，但新文章建議都填，才能餵飽分類頁與出處標註。

## 發布後系統會自動做的事（不用手動操作）

1. Push 到 `main` → Cloudflare Pages 自動建置部署（`npm run build`）。
2. 新文章一旦 `category` 含「新聞存檔」，就會自動：
   - 出現在 `/news/` hub 列表最上方（首頁 `/blog/` 的「峇里島新聞」widget 也會同步更新最新 5 則）
   - 出現在 `/news/category/{newsCategory}/`（如果有填 newsCategory）
   - 進入 `/news-sitemap.xml`（Google News sitemap，僅 48 小時內文章，超過會自動退出）
   - 進入 `/news/rss.xml`
   - 文章頁自動套用 `NewsArticle` schema、作者區塊（小傑）、出處標註（如有填 source）
3. GitHub Action `submit-to-google.yml` 偵測到 `src/content/blog/` 有變動 → 自動：
   - 提交網址給 Google Indexing API
   - 提交網址給 IndexNow（Bing 等引擎會收到）
   - 把當次提交的網址清單存成 workflow artifact（`submitted-urls-<run_id>`），保留 14 天，方便需要手動送 GSC 時下載
4. `bump-updated-date.yml`：之後如果回頭編輯這篇新聞（例如更正內容），實質修改會自動把 `updatedDate` 戳成當天，`sitemap` 的 `lastmod` 與文章頁「更新於」都會反映。

## 需要手動確認的事（尤其是第一批內容上線後）

- 打開 [gobaligo.id/news/](https://gobaligo.id/news/) 確認新文章有出現、日期/分類正確。
- 去 Google Search Console 用「網址檢查」貼上新文章網址，確認有被排入索引佇列（自動提交只是「請求」，不保證秒收）。
- 若某天忘記填 `newsCategory`，文章仍會出現在 `/news/` 總表，只是不會出現在對應的 `/news/category/` 分類頁，之後回填即可、下次 build 就會生效。
- 新聞內容如果引用外部新聞來源，記得填 `source` / `sourceUrl`，這是 E-E-A-T（新聞可信度）的重要訊號。

## 不要做的事

- 不要把新聞文章拆成獨立的 `/news/[slug]/` 頁面投稿——目前架構是新聞文章沿用 `/blog/[slug]/` 永久連結，`/news/` 只是 hub/分類頁，不要手動建立 `/news/xxx.md` 之類的檔案。
- 「新聞存檔」以外的分類文章不要填 `newsCategory`，沒有意義（該欄位只給新聞用）。
