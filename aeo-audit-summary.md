# AEO 全站稽核報告

> 產生時間：2026-07-04　掃描 768 篇　跳過 9 篇
> 詳細逐篇資料見 aeo-audit-report.csv

## 總覽

- **全站平均分數：60.4 / 100**
- 分項平均：A 直接回答 16/30　B 結構化資料 15.2/25　C 可擷取性 10.6/20　D 實體一致性 12.2/15　E 新鮮度 6.4/10
- 分數分布：0-40 分 **17 篇**　41-60 分 **332 篇**　61-80 分 **403 篇**　81-100 分 **16 篇**

## 各分類平均分數

| 分類 | 篇數 | 總分 | A/30 | B/25 | C/20 | D/15 | E/10 |
|---|---|---|---|---|---|---|---|
| 旅行技巧 | 185 | 63.9 | 16.4 | 19.9 | 10.3 | 11.1 | 6.1 |
| 美食景點活動 | 162 | 60.5 | 15.9 | 14.6 | 11.2 | 12.6 | 6.2 |
| 住宿推薦 | 94 | 63.1 | 17 | 14.2 | 11.3 | 13.5 | 7.2 |
| 新聞存檔 | 87 | 46.8 | 11.1 | 10.9 | 6.7 | 12.7 | 5.4 |
| 遊記分享 | 71 | 58.1 | 14.9 | 12.2 | 11.4 | 12.4 | 7.2 |
| 峇里島分區攻略 | 60 | 65.1 | 18.5 | 15.6 | 11.6 | 12.6 | 6.8 |
| 簽證通關 | 44 | 60.9 | 18.1 | 14.4 | 11.2 | 10.8 | 6.3 |
| 家庭親子 | 37 | 62.2 | 16.7 | 13.9 | 12.3 | 12.4 | 6.9 |
| 叫車包車 | 19 | 57.5 | 16.9 | 13.3 | 10.2 | 10.6 | 6.5 |
| 新手指南 | 7 | 79.3 | 21.4 | 21.9 | 15.4 | 13 | 7.6 |
| 無分類 | 2 | 53.7 | 20.2 | 8 | 9.5 | 9.5 | 6.5 |

## 全站系統性問題 Top 5

1. **缺列點式 TL;DR 摘要（layout callout 只有單句）** — 728/768 篇（95%）
   - 修法：逐篇補 3-5 點摘要；或在 layout 擴充 quickAnswer 支援多點式（需 frontmatter 新欄位，半自動可行）
   - 層級：逐篇（可半自動）
2. **沒有 FAQ schema 也沒有文內常見問題區塊** — 488/768 篇（64%）
   - 修法：兩段修：(1) SEO.astro 把 FAQPage 擴充到更多分類（layout 一次解決）(2) 逐篇補「常見問題」H2 區塊
   - 層級：部分layout/部分逐篇
3. **開頭 150 字沒有直接回答** — 423/768 篇（55%）
   - 修法：逐篇改開頭；description 已有答案的可半自動搬進內文首段
   - 層級：逐篇（可半自動）
4. **住宿文 Hotel schema 未輸出（hotel-cache.json 有 253 筆資料）** — 12/94 篇（13%）
   - 修法：一次性修復：跑 scripts/fetch-hotel-data.mjs 填快取 → layout 自動輸出全部住宿文的 Hotel/ItemList schema
   - 層級：layout/一次性
5. **更新日期超過 30 個月或含過時訊號** — 58/768 篇（8%）
   - 修法：逐篇查核後補 updatedDate；優先處理實用類（價格/簽證/交通）
   - 層級：逐篇
6. **長段落敘事牆（>150字段落比例高）** — 52/768 篇（7%）
   - 修法：逐篇拆段；新文章寫作規範限制段落長度
   - 層級：逐篇

## 建議優先處理清單（高搜尋潛力 × 低分，Top 30）

| # | 主題 | 標題 | 分數 | 首要修改 |
|---|---|---|---|---|
| 1 | 簽證入境 | [[影片教學] 印尼/峇里島電子簽證詳細步驟申請教學](/blog/bali-evisa-application-tutorial/) | 37 | 文章開頭加TL;DR重點摘要（3-5個列點的快速結論），並補frontmatter description |
| 2 | 簽證入境 | [2025最新版印尼/峇里島入境簽證&電子簽證eVoA 填寫相關 FAQ](/blog/indonesia-bali-visa-evoa-faq/) | 40 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 3 | 簽證入境 | [峇里島簽證申請必讀：30天 vs. 60天，一次搞懂！](/blog/bali-visa-30-60-days/) | 43.5 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 4 | 換錢 | [峇里島美金匯率：大鈔還是小鈔？換匯攻略大公開！](/blog/bali-usd-exchange-rate/) | 51.4 | 文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema |
| 5 | 簽證入境 | [2024入境台灣必知規定，帶錯東西小心被罰！](/blog/taiwan-customs-regulations-2024/) | 51.4 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 6 | 簽證入境 | [快速便捷！2025峇里島自動通關流程&過關攻略](/blog/2025-bali-automatic-customs/) | 52.4 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 7 | 簽證入境 | [峇里島2024年啟用人臉辨識的自動通關系統：持電子簽證者可加速通關](/blog/2024-bali-automated-immigration/) | 54 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 8 | 換錢 | [峇里島旅遊攻略：怎麼辦網路？如何換匯？雨季可以去嗎？交通如何安排？如何購物殺價？](/blog/bali-travel-tips-guide/) | 60.2 | 把價格/時間/優缺點等可比較資訊改用表格或列點呈現，不要埋在敘述裡 |
| 9 | 換錢 | [峇里島安全嗎？ 揭露最新 6 大觀光詐騙！換錢、假簽證、熱點陷阱...看到這種人](/blog/bali-tourist-scams-2026/) | 65.5 | 把價格/時間/優缺點等可比較資訊改用表格或列點呈現，不要埋在敘述裡 |
| 10 | 換錢 | [印尼/峇里島換匯：直接換 vs 先換美金再換印尼盾，哪個划算？](/blog/bali-currency-exchange-tips/) | 67.5 | 補具體實體資訊：店家/飯店英文原名、所在區域名、Google Maps可搜尋的地點名稱 |
| 11 | 換錢 | [峇里島換錢血淚史：團友親身經歷揭密，千萬別貪小便宜！](/blog/bali-money-exchange-scams-2/) | 73.9 | 已有快速解答callout，再加列點式TL;DR區塊（3-5點快速結論）更利AI擷取 |
| 12 | 機場 | [實測25分鐘出峇里島機場！我們的團友是如何辦到的？](/blog/bali-airport-fast-track/) | 41 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 13 | 交通 | [峇里島自由行租摩托車好/包車好？峇里島交通｜峇里島庫塔區怎麼玩？怎麼逛？庫塔美食](/blog/bali-motorbike-vs-private-car/) | 45 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 14 | 交通 | [峇里島包車：Klook峇里島司機vs社團推薦司機，哪個更優？](/blog/bali-private-driver-comparison/) | 45.5 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 15 | 交通 | [峇里島過度旅遊？九月開始的交通示警](/blog/bali-overtourism-traffic-alert/) | 48 | 文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema |
| 16 | 交通 | [雨季開始，峇里島交通必將惡化的旅遊警示](/blog/bali-rainy-season-traffic/) | 48 | 文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema |
| 17 | 交通 | [峇里島包車司機推薦（第二頁）](/blog/2026-03-21-bali-driver-recommend-p2/) | 48 | 文章開頭加TL;DR重點摘要（3-5個列點的快速結論），並補frontmatter description |
| 18 | 交通 | [在印尼/峇里島旅行，一定要下載的APP：Gojek全攻略](/blog/gojek-bali-guide/) | 48.5 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 19 | 機場 | [峇里島機場加速安檢流程 – 效率提升2.5倍！](/blog/bali-airport-security-upgrade/) | 59.8 | 補具體實體資訊：店家/飯店英文原名、所在區域名、Google Maps可搜尋的地點名稱 |
| 20 | 機場 | [峇里島國際機場買Bali Banana當伴手禮怎麼去？如何從國際線步行到國內線？](/blog/bali-airport-bali-banana-guide/) | 60.6 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 21 | 機場 | [峇里島北部機場計劃有譜！？能否有效分散南部的觀光壓力？](/blog/north-bali-airport-plan/) | 61.3 | 把價格/時間/優缺點等可比較資訊改用表格或列點呈現，不要埋在敘述裡 |
| 22 | 機場 | [【機場附近餐廳】峇里島美食：Wanaku Seafood & Chinese R](/blog/wanaku-seafood-airport-bali/) | 61.5 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 23 | 機場 | [峇里島 Wanna Jungle 旅遊指南：入園門票、低消限制、交通接送與烏布一](/blog/wanna-jungle-pool-club-ubud/) | 63.3 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 24 | 熱門區住宿 | [峇里島庫塔衝浪推薦｜Bali Kuta Surfing for Beginner](/blog/kuta-beginner-surfing-experience/) | 42 | 文章開頭加TL;DR重點摘要（3-5個列點的快速結論），並補frontmatter description |
| 25 | 熱門區住宿 | [Nusa Dua最棒的海灘俱樂部│Nusa Dua攻略│南灣區必玩│Manara](/blog/nusa-dua-manarai-beach-house-guide/) | 47.7 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 26 | 熱門區住宿 | [【出發前往峇里島離島】沙努爾行李寄放攻略](/blog/sanur-luggage-storage-guide/) | 50 | 文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema |
| 27 | 稅務 | [峇里島最新消息：3/26開始旅遊稅抽查！](/blog/bali-tourism-tax-update/) | 51 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 28 | 熱門區住宿 | [峇里島烏布附近的三大知名瀑布攻略：Tegenungan瀑布、Kanto Lamp](/blog/ubud-waterfalls-guide/) | 53 | 文末加「常見問題」區塊（3-5題）；FAQPage schema需在SEO.astro擴充此分類才會輸出 |
| 29 | 稅務 | [峇里島不繳旅遊税？小心被監禁！](/blog/bali-tourism-tax-penalties/) | 54.3 | 文末加「常見問題」H2區塊（3-5題問答），此分類會自動產FAQPage schema |
| 30 | 熱門區住宿 | [峇里島自由行金巴蘭攻略：推薦30個玩樂景點全攻略｜2026旅遊指南](/blog/jimbaran-guide/) | 55 | 文章開頭加TL;DR重點摘要（3-5個列點的快速結論），並補frontmatter description |

## 跳過清單

- 2019-08-19-64db6b5afd897800013a8f86.md：內文過短（79字）
- 2020-10-09-64db6b70fd897800013a93fe.md：內文過短（96字）
- 2023-08-15-64db6b56fd897800013a8e04.md：內文過短（92字）
- 2023-08-15-64db6b57fd897800013a8e30.md：內文過短（76字）
- first-post.md：Astro theme 範例檔
- markdown-style-guide.md：Astro theme 範例檔
- second-post.md：Astro theme 範例檔
- third-post.md：Astro theme 範例檔
- using-mdx.mdx：Astro theme 範例檔
