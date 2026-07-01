# 多語言 SEO 改動交接與驗收清單

> 建立日期：2026-07-01
> 目標：讓 **簡體（zh-cn）、粵語（zh-hk）、英文（en）、印尼語（id）** 用戶都能在搜尋引擎輕易找到 gobaligo.id 的內容。

---

## 0. 一句話結論

網站在搜尋端的**技術地基已完成**：5 語言都有可索引的內容、分類中樞與完整 hreflang 互連。
剩下的是「等 Google 重爬收錄」——那是時間問題，靠 GSC 追蹤即可，網站端不需再大改。

---

## 1. 這次做了什麼（改動總表）

| # | 項目 | 說明 | 主要檔案 | Commit |
|---|---|---|---|---|
| 1 | 住宿推薦分類頁強化 | zh-tw 住宿推薦頁改成「分區＋主題」15 分組、訂房意圖標題/描述、6 題 FAQ + FAQPage schema | `src/pages/blog/category/[cat].astro` | `2c8c481` |
| 2 | 修正分類頁 hreflang | en 原本指向無效的 `?cat=beginner-guide`（0 篇），改用正確分類值並補上 id | `src/pages/blog/category/[cat].astro` | `7fd9844` |
| 3 | 4 語言真實分類頁 | en/zh-cn/zh-hk/id 各建 8 個真實 `/blog/category/` 靜態頁（共 40 頁），hreflang cluster 全部指向 canonical 頁 | `src/lib/categoryConfig.ts`、`src/components/BlogCategoryPage.astro`、`src/pages/{en,zh-cn,zh-hk,id}/blog/category/[cat].astro`、`astro.config.mjs` | `809f700` |
| 4 | 首頁內部連結修正 | 各語言首頁「必讀攻略」原本連 `?cat=` 前端殼（權重流失），改連真實分類頁；分類頁 Footer/ChatBot 補上正確語言 | `src/pages/{en,zh-cn,zh-hk,id}/blog/index.astro`、`src/pages/bali-hotels/index.astro`、`src/components/BlogCategoryPage.astro` | `d7e3834` |
| 5 | 全站頁尾分類導覽 | Footer 新增「文章分類」欄，每一頁都連到該語言的真實分類中樞 | `src/components/Footer.astro` | `7b18c0b` |
| 6 | 工具頁 hreflang | sitemap 為 5 語言皆有的 trip-planner／預算計算機／天氣補 hreflang | `astro.config.mjs` | `93e174c` |
| 7 | `/go/` 短連結修復 | 短連結找不到時前綴還原，還原不了就 302 導回首頁，消除硬 404 | `functions/go/[id].js` | `f5f3779` |

**產出量**：5 語言 × 8 分類 = **40 個真實可索引分類頁**；全站每頁都帶指向 8 大分類的內部連結；hreflang 覆蓋文章／分類／首頁／門票／工具。

> ⚠️ 全程**唯讀**載入既有翻譯 collection，未觸發任何重新翻譯，未改動任何來源文章。

---

## 2. GSC 驗收清單（你要追蹤的）

到 [Google Search Console](https://search.google.com/search-console) → 選 gobaligo.id：

| 要看什麼 | 在哪看 | 現況/目標 | 預期見效 | 你的動作 |
|---|---|---|---|---|
| **各語言收錄數** | 搜尋 `site:gobaligo.id/en/`、`/id/`、`/zh-cn/`、`/zh-hk/` | 目前各 20+；應隨時間上升 | 2–6 週 | 每 2 週記錄一次數字 |
| **分類頁被索引** | 網址檢查工具，輸入 `https://gobaligo.id/en/blog/category/住宿推薦/` | 應為「已建立索引」 | 1–4 週 | 可對幾個分類頁點「要求建立索引」加速 |
| **404 已消除** | 頁面索引 → Not found (404) | /go/ 那批應清零 | 部署後 1–2 週 | 點 **「驗證修正」** |
| **hreflang 無誤** | 舊版報表「國際定位」或用第三方 hreflang 檢查器 | 無「missing return tag」錯誤 | 1–3 週 | 有錯再回報 |
| **Duplicate canonical** | 頁面索引 → Duplicate, Google chose different canonical | 數字不應大幅上升 | 觀察 | 見第 3 點，多為正常 |
| **各語言曝光/點擊** | 成效 → 依「網頁」篩 `/en/`、`/id/` 等前綴 | 應緩步成長 | 4–12 週 | 這是最終成效指標 |

**加速收錄的動作**：
1. GSC → Sitemaps → 確認 `sitemap-index.xml` 已提交且「成功」。
2. 對重點分類頁（如各語言住宿推薦）用「網址檢查 → 要求建立索引」。
3. 404 報告按「驗證修正」讓 Google 重爬。

---

## 3.「看起來像問題、其實正常」對照表

未收錄的頁面裡，**絕大多數是 Google 正確運作**，不要誤判成網站壞了：

| GSC 顯示 | 是否要處理 | 原因 |
|---|---|---|
| **Page with redirect**（約 1,900） | ❌ 不用 | `_redirects` 有 2,900+ 條舊網址 301，Google 爬到舊網址看到轉址就歸這類，設計本意 |
| **Alternate page with proper canonical** | ❌ 不用 | `?cat=` 篩選頁、hreflang 替代版本被正確歸併，代表 canonical 生效（好事） |
| **Excluded by 'noindex'** | ❌ 不用 | admin 後台、forum、`/go/`、share 頁刻意掛 noindex |
| **Duplicate, Google chose different canonical**（約 187） | 🟡 多數不用 | 135 筆是舊日期碼網址歸併；**zh-hk 粵語版被折疊進繁中版屬正常**（同繁體、內容幾乎相同，不值得硬拚）；zh-cn 僅約 6 篇（<1%）；少數是真重複文章 |
| **Crawled – currently not indexed** | 🟡 觀察 | 新頁面排隊中＋部分較薄內容，會隨內部連結強化與時間自然消化 |

**關於 zh-hk（粵語）**：因為和繁中是同一種書寫文字、內容幾乎一樣，Google 幾乎一定會去重、用繁中版當 canonical。但粵語使用者被導到繁中版**照樣讀得懂、體驗一樣**，實質損失接近零。**建議接受，不要為它改寫 771 篇。**

---

## 4. 未來維護必讀（踩雷提醒）

| 情境 | 規則 |
|---|---|
| **改住宿推薦分組/FAQ** | rich 設定存在**兩處**：zh-tw 在 `src/pages/blog/category/[cat].astro` inline、其餘 4 語言在 `src/lib/categoryConfig.ts`。**兩處都要改**否則語言間不一致 |
| **新增/修改任何頁面** | 必須同時處理 4 語言版本，Header 要傳正確 `basePath`（語言切換才不會跑掉） |
| **批量修改來源文章連結** | 會讓 content_hash 變動、觸發大量重新翻譯。批量改動要在 commit 或內容加 `[skip translate]` |
| **新文章上線** | 舊網址靠 `_redirects` 301；新文章要跑 `generate-redirects --write`，否則舊格式網址會 404 |
| **新分類頁類型** | 若加新分類，記得同步 5 個 `[cat].astro` 的 `getStaticPaths`，並確認 `categoryConfig.ts` 有對應標籤 |

---

## 5. 關鍵檔案索引

| 檔案 | 角色 |
|---|---|
| `src/lib/categoryConfig.ts` | 4 語言分類頁的 i18n 單一來源（標籤、住宿 rich 文案、FAQ、generic fallback） |
| `src/components/BlogCategoryPage.astro` | en/zh-cn/zh-hk/id 分類頁共用版型 |
| `src/pages/blog/category/[cat].astro` | 繁中（zh-tw）分類頁（住宿/新手 rich 設定 inline） |
| `src/pages/{en,zh-cn,zh-hk,id}/blog/category/[cat].astro` | 各語言分類頁路由 |
| `src/components/Footer.astro` | 全站頁尾（含各語言分類導覽） |
| `astro.config.mjs` | sitemap 設定（文章/首頁/門票/分類/工具的 hreflang 規則） |
| `functions/go/[id].js` | `/go/` 短連結重導（含前綴還原與首頁 fallback） |
| `public/_redirects` | 舊網址 301（2,900+ 條） |
| `public/robots.txt` | 全開放 + sitemap 宣告 |

---

## 6. 建議的下一階段（選做，非必要）

1. **等 4–6 週看 GSC 成效**，再決定是否需要更多動作。
2. 若某語言收錄明顯偏低 → 檢查是否被繁中首頁的語言自動跳轉腳本影響 Googlebot（`src/pages/blog/index.astro` 內的 `navigator.languages` 跳轉）。此為目前唯一未動的風險點，改動會影響一般使用者 UX，建議有數據佐證再處理。
3. 真重複文章（如 le-cliff 系列多 slug）可用 `_redirects` 合併，回收連結權重。
