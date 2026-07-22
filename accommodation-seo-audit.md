# 峇里島「住宿推薦」Cluster 對標稽核報告

稽核日期：2026-07-22　｜　範圍：僅讀檔分析，**未修改任何文章檔案**
稽核對象：`src/content/blog/` 中 `category` 含「住宿推薦」的全部文章
競品基準：andyventure.com（冒險安迪）單篇住宿文的 5 項致勝要素

---

## 0. 稽核範圍與方法說明

- 集群定義：以 frontmatter `category: 住宿推薦` 為準，共 **103 篇**（全站 807 篇文章中的 13%）。
- 分類頁 `/blog/category/住宿推薦/`（`src/pages/blog/category/[cat].astro`）內手動編排了 15 個主題分組、共 71 個 slug（去重後 69 個）；**103 篇中有 34 篇（33%）沒有被排進任何主題分組**，只能落入頁尾「更多住宿推薦文章」的雜項清單——這批文章在分類頁上幾乎沒有曝光位置，細節見第 3、4 節。
- 另外發現 2 個**分組設定與 frontmatter 不同步**的技術問題：分類頁設定檔中的 `nusa-dua-guide`、`sanur-family-beach-guide` 兩個 slug，實際檔案的 `category` 欄位並未標記「住宿推薦」，代表分類頁引用了「理論上不存在於本分類」的文章──這是設定檔與內容脫鉤的訊號，建議之後盤點。
- 評分方式：針對 5 項基準各給 0–2 分（滿分 10，但因多數文章目前完全沒有比較表/FAQ，實際觀測到的最高分是 8）。評分主要依據程式化擷取的訊號（第一人稱敘事關鍵詞、實際房價數字、真實缺點描述、電壓/插頭/生活機能等資訊增益關鍵詞、H2/H3 結構、站內連結、meta 長度、slug 乾淨度、FAQ/表格語法、標題年份與 `git log` 最後修改時間）。
- **重要限制**：第一人稱偵測是關鍵詞比對，並非語意理解，已針對「引用第三方住客評論」（如 Tripadvisor 引言）做排除處理，但仍可能有少數誤判；本報告在 Top 15 與 9 篇 Money Page 均已人工覆核內文，總覽表其餘 88 篇分數請視為「高信度初篩結果」，作為排序與抓漏用途，實際改寫前建議再人工看一次全文。
- 內部連結統計分兩種：「集群內連結」只計對其他住宿推薦文章的 `/blog/slug/` 連結；「全站連結」則涵蓋全部 807 篇文章的引用，用來判斷是否為真正的連結孤島。

### 整體體檢數字

| 指標 | 數值 |
|---|---|
| 集群文章數 | 103 篇 |
| 平均總分（滿分約 8-9） | 4.17 |
| 第一人稱實住體驗 = 0 分（純第三人稱彙整） | 72 篇（70%） |
| 有 FAQ 區塊 | 5 篇（5%） |
| 有比較表格 | 2 篇（2%） |
| 標題掛年份 | 42 篇（41%） |
| 全站零內部連入（連結孤島） | 33 篇（32%） |
| 零內部連出 | 41 篇（40%） |
| 未被排進分類頁任何主題分組 | 34 篇（33%） |
| 平均字數 | 2,330 字（中位數 1,465 字） |

**一句話總結**：本站住宿 cluster 的短板高度集中在對手的第 1、3、5 項——幾乎所有文章都是「第三人稱酒店介紹彙整」而非「第一人稱實住開箱」，FAQ/比較表格幾乎缺席（僅 2-5%），而且三分之一的文章遊離在內部連結網之外。相對地，資訊新鮮度（`updatedDate`/`git log` 顯示近期都更新過）與 meta 完整度大致及格。

---

## 1. 總覽表（依總分由低到高排序）

評分欄位：第一人稱實住體驗 / 資訊增益（電壓插頭水質生活機能等）/ 內部連結強度 / 內容新鮮度 / 技術面（slug／meta／FAQ／表格），各 0-2 分。

| # | 文章標題 / slug | 分組地區 | 字數 | 第一人稱 | 資訊增益 | 內連強度 | 新鮮度 | 技術面 | 總分 | 連入/連出(集群) | 最後修改 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 去峇里島千萬別急著訂 Airbnb！2026 年三月底這件事可能讓你… `bali-airbnb-warning-2026` | 訂房教學與避雷 | 1059 | 0 | 0 | 0 | 2 | 0 | **2** | 0/0 | 2026-07-12 |
| 2 | 巴里島一晚居然不到$2,000!? 住這裡是什麼感覺? 體驗峇里島隱… `bali-bamboo-villa-experience` | 平價高 CP 值住宿 | 547 | 0 | 0 | 1 | 1 | 0 | **2** | 0/1 | 2026-07-21 |
| 3 | 開箱峇里島最大動物園！動物園飯店住宿體驗 Bali Safari 在… `bali-safari-marine-park-hotel` | 親子家庭度假村 | 602 | 0 | 0 | 0 | 1 | 1 | **2** | 0/0 | 2026-07-21 |
| 4 | 烏布新地標開幕：Hiliwatu 萬豪精選酒店打造峇里島奢華新體驗 `hiliwatu-marriott-ubud` | 烏布 Ubud 住宿 | 1807 | 0 | 0 | 0 | 1 | 1 | **2** | 0/0 | 2026-07-21 |
| 5 | 去峇里島住這裡最方便，卻最不推薦！峇里島庫塔區有什麼優缺點？ `kuta-bali-accommodation-pros-cons` | 庫塔 Kuta 住宿 | 672 | 1 | 0 | 0 | 1 | 0 | **2** | 0/0 | 2026-07-12 |
| 6 | 【Canggu住宿推薦】Nuanu Creative City 的精… `oshom-bali-nuanu-creative-city` | (未分組/僅在更多文章) | 1236 | 0 | 0 | 0 | 1 | 1 | **2** | 0/0 | 2026-07-21 |
| 7 | 【水明漾住宿推薦】設計感與永續兼具的精品住宿 — iSuite by… `seminyak-isuite-ekosistem-hotel` | (未分組/僅在更多文章) | 1247 | 1 | 0 | 0 | 1 | 0 | **2** | 0/0 | 2026-07-21 |
| 8 | 【2026 峇里島旅遊警訊】您訂的 Airbnb 民宿可能 8 月消… `airbnb-alert-2026` | 訂房教學與避雷 | 920 | 0 | 0 | 0 | 2 | 1 | **3** | 0/0 | 2026-07-12 |
| 9 | 【烏布villa推薦】Alam Wayang Ubud `alam-wayang-ubud-villa` | (未分組/僅在更多文章) | 1465 | 0 | 0 | 1 | 1 | 1 | **3** | 0/1 | 2026-07-21 |
| 10 | ⭐⭐峇里島凱賓斯基 Apurva Kempinski 限時促銷！⭐⭐… `apurva-kempinski-bali-deal` | 五星奢華度假村 | 1167 | 0 | 0 | 1 | 1 | 1 | **3** | 0/2 | 2026-07-12 |
| 11 | ⭐⭐ 【本站獨家】AYANA Resort Bali 優惠｜峇里島阿… `Ayana-promo-2026` | (未分組/僅在更多文章) | 603 | 0 | 0 | 1 | 1 | 1 | **3** | 0/1 | 2026-07-21 |
| 12 | 峇里島Ayana阿雅娜度假村住宿體驗 - 世外桃源般的渡假天堂 `ayana-resort-bali-experience` | (未分組/僅在更多文章) | 1056 | 0 | 0 | 1 | 1 | 1 | **3** | 1/1 | 2026-07-21 |
| 13 | CP值超高, 不到美金$30入住11間巴里島精品酒店, 網美照拍不停… `bali-boutique-hotels-under-30` | 平價高 CP 值住宿 | 2649 | 0 | 0 | 1 | 1 | 1 | **3** | 2/0 | 2026-07-12 |
| 14 | 【實拍視頻】峇里島從長谷、水明漾、金巴蘭、烏布、佩尼達島的12間住宿… `bali-canggu-seminyak-jimbaran-ubud-nusa-penida-hotels` | (未分組/僅在更多文章) | 928 | 0 | 0 | 1 | 1 | 1 | **3** | 0/1 | 2026-07-12 |
| 15 | 峇里島親子樂園：十五家擁有滑水道溜滑梯的親子渡假村 TOP 15 `bali-family-resorts-water-slides` | 親子家庭度假村 | 2045 | 0 | 0 | 1 | 1 | 1 | **3** | 3/1 | 2026-07-21 |
| 16 | 浪漫蜜月勝地大公開！峇里島擊敗馬爾地夫奪得全世界冠軍！ `bali-honeymoon-destination` | 蜜月浪漫住宿 | 987 | 0 | 0 | 1 | 1 | 1 | **3** | 0/11 | 2026-07-12 |
| 17 | 峇里島的七個訂房省錢小技巧 `bali-hotel-booking-tips` | 訂房教學與避雷 | 1556 | 1 | 0 | 1 | 1 | 0 | **3** | 0/4 | 2026-07-12 |
| 18 | 「全球最佳酒店」榜首在峇里島：叢林中的隱藏奢華—嘉佩樂烏布 Cape… `capella-ubud-luxury-resort` | 烏布 Ubud 住宿 | 1105 | 0 | 0 | 1 | 1 | 1 | **3** | 3/0 | 2026-07-21 |
| 19 | 峇里島烏魯瓦圖住宿推薦：La Cabane Bali 的夢幻小天堂 `la-cabane-bali-uluwatu` | (未分組/僅在更多文章) | 1273 | 0 | 0 | 1 | 1 | 1 | **3** | 1/0 | 2026-07-21 |
| 20 | Le Cliff Bali 開箱評測｜烏魯瓦圖懸崖 Villa 私人… `le-cliff-bali-uluwatu-review` | (未分組/僅在更多文章) | 2148 | 0 | 0 | 0 | 2 | 1 | **3** | 0/0 | 2026-07-12 |
| 21 | 峇里島長谷 MAJA Canggu 住宿體驗：彷彿置身地中海的純白夢… `maja-canggu-mediterranean-stay` | 長谷／倉古 Canggu 住宿 | 738 | 0 | 0 | 1 | 1 | 1 | **3** | 0/2 | 2026-07-12 |
| 22 | 【藍夢島住宿指南】藍夢島與金銀島六大區域的住宿推薦指南 `nusa-lembongan-ceningan-accommodation-guide` | 離島 藍夢島／佩尼達島 | 9408 | 0 | 1 | 0 | 1 | 1 | **3** | 0/0 | 2026-07-21 |
| 23 | 【2026 努沙杜瓦新飯店】Paradisus by Meliá B… `Paradisus-by-Melia-Bali` | 努沙杜瓦 Nusa Dua 住宿 | 1236 | 0 | 0 | 1 | 2 | 0 | **3** | 1/0 | 2026-07-21 |
| 24 | [金巴蘭CP值最高] USD$70起入住2024新開幕 Platin… `platinum-hotel-jimbaran-beach` | 金巴蘭 Jimbaran 住宿 | 1478 | 0 | 0 | 0 | 2 | 1 | **3** | 0/0 | 2026-07-21 |
| 25 | 峇里島金巴蘭酒店 Raffles Bali 榮獲全球最佳奢華度假村之… `raffles-bali-luxury-resort` | 金巴蘭 Jimbaran 住宿 | 1206 | 0 | 0 | 1 | 1 | 1 | **3** | 1/4 | 2026-07-21 |
| 26 | 麗晶峇里島長谷 Regent Bali Canggu 開箱體驗，IH… `regent-bali-canggu` | 長谷／倉古 Canggu 住宿 | 1606 | 1 | 0 | 0 | 1 | 1 | **3** | 0/0 | 2026-07-21 |
| 27 | 【烏魯瓦圖奢華天堂】烏魯瓦圖萬麗度假村 Renaissance Ba… `renaissance-bali-uluwatu-resort` | 烏魯瓦圖 Uluwatu 住宿 | 1040 | 0 | 0 | 1 | 1 | 1 | **3** | 1/0 | 2026-07-21 |
| 28 | 【峇里島五星奢華推薦】St. Regis Bali Resort 瑞… `st-regis-bali-resort` | 努沙杜瓦 Nusa Dua 住宿 | 1777 | 0 | 0 | 1 | 1 | 1 | **3** | 0/1 | 2026-07-21 |
| 29 | 【水明漾villa推薦】峇里島的奢華度假體驗 Suites Infi… `suites-infinity-beyond-seminyak` | (未分組/僅在更多文章) | 1324 | 0 | 0 | 1 | 1 | 1 | **3** | 0/3 | 2026-07-12 |
| 30 | 【亞洲排名前25名酒店】印尼五家，其中峇里島三家 `top-bali-hotels-asia-rankings` | 五星奢華度假村 | 473 | 0 | 0 | 1 | 1 | 1 | **3** | 1/0 | 2026-07-21 |
| 31 | 峇里島烏布瑜伽住宿推薦：10間結合瑜珈課程與心靈放鬆的夢幻選擇 `ubud-yoga-retreats-bali` | 烏布 Ubud 住宿 | 1962 | 0 | 0 | 1 | 1 | 1 | **3** | 1/0 | 2026-07-21 |
| 32 | 【2026 峇里島住宿】剛開幕就拿獎！直擊印尼最佳新飯店：絕美海灘景… `2026-top-hotels-bali` | 五星奢華度假村 | 1568 | 0 | 0 | 1 | 2 | 1 | **4** | 0/8 | 2026-07-21 |
| 33 | 【2026 烏布新飯店】Alaya Suites Ubud 開箱：隱… `alaya-suites-ubud` | 烏布 Ubud 住宿 | 1143 | 0 | 1 | 0 | 2 | 1 | **4** | 0/0 | 2026-07-21 |
| 34 | Alila Villas Uluwatu｜烏魯瓦圖懸崖無邊際泳池頂奢… `alila-villas-uluwatu-bali` | 烏魯瓦圖 Uluwatu 住宿 | 1313 | 0 | 0 | 1 | 2 | 1 | **4** | 3/0 | 2026-07-21 |
| 35 | Apurva Kempinski Bali｜凱賓斯基 努沙杜瓦奢華度… `apurva-kempinski-bali-nusa-dua` | 努沙杜瓦 Nusa Dua 住宿 | 960 | 0 | 0 | 1 | 2 | 1 | **4** | 2/0 | 2026-07-21 |
| 36 | 峇里島凱賓斯基 The Apurva Kempinski Bali … `apurva-kempinski-sustainability-award` | (未分組/僅在更多文章) | 1328 | 0 | 0 | 1 | 2 | 1 | **4** | 1/0 | 2026-07-21 |
| 37 | 【峇里島】阿雅娜度假村體驗之旅：Ayana Villa 奢華別墅與金… `ayana-resort-villa-experience` | (未分組/僅在更多文章) | 1172 | 1 | 0 | 1 | 1 | 1 | **4** | 1/1 | 2026-07-12 |
| 38 | 【2026 峇里島住宿指南】五大熱門區域比較：庫塔、水明漾、倉古/長… `bali-accommodation-area-guide` | 訂房教學與避雷 | 1535 | 0 | 0 | 1 | 2 | 1 | **4** | 0/9 | 2026-07-21 |
| 39 | 峇里島再次獲獎：榮獲2025年亞洲最佳旅遊目的地殊榮 / 八大頂級渡… `bali-best-resorts-2025` | 五星奢華度假村 | 1454 | 0 | 0 | 0 | 2 | 2 | **4** | 0/0 | 2026-07-21 |
| 40 | 峇里島高 CP 值 Villa 推薦（下集）2026｜20 間精選別… `bali-best-villas-top20-part2` | 平價高 CP 值住宿 | 2494 | 0 | 0 | 1 | 2 | 1 | **4** | 2/0 | 2026-07-12 |
| 41 | 峇里島18家 kids club 親子度假村｜庫塔、水明漾、長谷、金… `bali-family-resorts-kids-club` | 親子家庭度假村 | 5128 | 0 | 1 | 1 | 1 | 1 | **4** | 2/2 | 2026-07-21 |
| 42 | 【峇里島住宿推薦】全家出遊不擠房！擁有四人房的 13 間超強親子度假… `bali-family-room-resorts` | 親子家庭度假村 | 3389 | 0 | 1 | 1 | 1 | 1 | **4** | 0/1 | 2026-07-21 |
| 43 | 峇里島蜜月住宿推薦 2026｜20 間浪漫 Villa 與度假村懶人… `bali-honeymoon-resorts-guide` | 蜜月浪漫住宿 | 1885 | 0 | 0 | 1 | 2 | 1 | **4** | 3/0 | 2026-07-21 |
| 44 | 超越想像的度假體驗：峇里島飛機別墅（Private Jet Vill… `bali-private-jet-villa-guide` | 蜜月浪漫住宿 | 1150 | 0 | 0 | 1 | 1 | 2 | **4** | 1/0 | 2026-07-21 |
| 45 | 峇里島住宿新選擇：私人別墅 Villa 推薦大全，感受比飯店更自由的… `bali-private-villa-recommendations` | 私人泳池 Villa 推薦 | 1275 | 1 | 0 | 1 | 1 | 1 | **4** | 1/4 | 2026-07-12 |
| 46 | 長谷波西米亞精品住宿推薦 Belajar Bali Boutique… `belajar-bali-boutique-hotel` | 長谷／倉古 Canggu 住宿 | 1101 | 0 | 1 | 1 | 1 | 1 | **4** | 0/1 | 2026-07-12 |
| 47 | Bvlgari Resort Bali｜寶格麗度假村 烏魯瓦圖懸崖頂… `bvlgari-resort-bali-uluwatu` | 烏魯瓦圖 Uluwatu 住宿 | 1638 | 0 | 0 | 1 | 2 | 1 | **4** | 1/0 | 2026-07-21 |
| 48 | Dune Seseh 長谷旁最新秘境美學公寓 極簡野奢 `dune-seseh` | (未分組/僅在更多文章) | 1314 | 1 | 1 | 0 | 1 | 1 | **4** | 0/0 | 2026-07-21 |
| 49 | Four Seasons Resort Bali at Jimbar… `four-seasons-bali-jimbaran-bay` | 金巴蘭 Jimbaran 住宿 | 1145 | 0 | 0 | 1 | 2 | 1 | **4** | 1/0 | 2026-07-12 |
| 50 | Holiday Inn Resort Bali Canggu 峇里島… `holiday-inn-bali-canggu` | 長谷／倉古 Canggu 住宿 | 1361 | 0 | 2 | 0 | 1 | 1 | **4** | 0/0 | 2026-07-21 |
| 51 | 「Double bed room」竟然不是「雙床房」！訂房千萬別鬧笑… `hotel-room-type-guide` | 訂房教學與避雷 | 1960 | 1 | 0 | 1 | 1 | 1 | **4** | 0/10 | 2026-07-12 |
| 52 | 【水明漾villa推薦】Jas Green Villas and S… `Jas-Green-Villas-and-Spa` | (未分組/僅在更多文章) | 1099 | 0 | 1 | 1 | 1 | 1 | **4** | 1/0 | 2026-07-21 |
| 53 | 【峇里島住宿】金巴蘭 10+ 無敵海景飯店：世界級日落、懸崖無邊際泳… `jimbaran-beachfront-hotels-guide` | 金巴蘭 Jimbaran 住宿 | 3433 | 0 | 1 | 1 | 1 | 1 | **4** | 2/0 | 2026-07-21 |
| 54 | 【凱悅JdV插旗峇里島】2025/07新飯店 Kleo Seminy… `kleo-seminyak-hyatt-opening` | (未分組/僅在更多文章) | 872 | 0 | 1 | 0 | 2 | 1 | **4** | 0/0 | 2026-07-21 |
| 55 | 【2026 長谷住宿】La Mewali Resort 開箱：首創「… `La-Mewali` | (未分組/僅在更多文章) | 1983 | 0 | 1 | 0 | 2 | 1 | **4** | 0/0 | 2026-07-21 |
| 56 | 【烏布木屋泳池villa】Moonlit Jungle 開箱：隱密叢… `Moonlit-Jungle` | (未分組/僅在更多文章) | 1306 | 0 | 2 | 0 | 1 | 1 | **4** | 0/0 | 2026-07-21 |
| 57 | 【峇里島五星奢華推薦】豪華度假村推薦 Mulia Resort `mulia-resort-bali-luxury` | 努沙杜瓦 Nusa Dua 住宿 | 3793 | 0 | 1 | 1 | 1 | 1 | **4** | 1/1 | 2026-07-21 |
| 58 | 【Nusa Penida攻略五】佩尼達島的住宿推薦: 14間從奢華到… `nusa-penida-hotels-guide` | 離島 藍夢島／佩尼達島 | 4992 | 1 | 1 | 1 | 1 | 0 | **4** | 1/0 | 2026-07-21 |
| 59 | 【水明漾飯店推薦】Potato Head Suites & Stud… `potato-head-suites-seminyak-review` | 水明漾 Seminyak 住宿 | 893 | 1 | 0 | 1 | 1 | 1 | **4** | 2/0 | 2026-07-21 |
| 60 | Radisson Blu Bali Uluwatu｜烏魯瓦圖麗笙布魯… `radisson-blu-bali-uluwatu` | 烏魯瓦圖 Uluwatu 住宿 | 2063 | 0 | 0 | 1 | 2 | 1 | **4** | 0/4 | 2026-07-21 |
| 61 | 【水明漾住宿推薦】精選 10+ 濱海一線精品飯店：開窗即印度洋日落、… `seminyak-beach-resorts-guide` | 水明漾 Seminyak 住宿 | 2969 | 0 | 1 | 1 | 1 | 1 | **4** | 7/0 | 2026-07-21 |
| 62 | 【 水明漾Villa 推薦】20+ 極致私密泳池別墅：鬧中取靜、避雷… `seminyak-private-villas-guide` | 水明漾 Seminyak 住宿 | 9111 | 0 | 1 | 1 | 1 | 1 | **4** | 2/1 | 2026-07-21 |
| 63 | 版主開箱：峇里島的六善 Six Senses Uluwatu 懸崖上… `six-senses-uluwatu-review` | 烏魯瓦圖 Uluwatu 住宿 | 1737 | 2 | 0 | 0 | 1 | 1 | **4** | 0/0 | 2026-07-21 |
| 64 | The Meru Sanur｜沙努爾五星療癒度假村 全套房海景＆頂級… `the-meru-sanur` | 沙努爾 Sanur 住宿 | 1428 | 0 | 0 | 1 | 2 | 1 | **4** | 2/0 | 2026-07-21 |
| 65 | 探索烏布10家令人嘆為觀止的樹屋/竹屋別墅 tree house/b… `ubud-treehouse-bamboo-villa-stays` | 烏布 Ubud 住宿 | 3943 | 0 | 1 | 1 | 1 | 1 | **4** | 4/1 | 2026-07-21 |
| 66 | 【2025水明漾新飯店】voco Bali Seminyak `voco-bali-seminyak-2025` | (未分組/僅在更多文章) | 877 | 0 | 0 | 1 | 2 | 1 | **4** | 0/2 | 2026-07-21 |
| 67 | 低調奢華的家族Villa首選！Arpana Private Pool… `arpana-private-pool-villas-review` | (未分組/僅在更多文章) | 1132 | 0 | 2 | 1 | 1 | 1 | **5** | 0/1 | 2026-07-12 |
| 68 | AYANA Resort Bali｜阿雅娜完整攻略：4 個區域比較、… `ayana-resort-bali-guide` | 五星奢華度假村 | 5129 | 0 | 1 | 1 | 2 | 1 | **5** | 9/2 | 2026-07-21 |
| 69 | 【水明漾villa推薦】Bajra Bali Villa 隱私、奢華… `bajra-bali-villa-seminyak` | (未分組/僅在更多文章) | 1110 | 0 | 2 | 1 | 1 | 1 | **5** | 0/3 | 2026-07-21 |
| 70 | 峇里島再度登上全球焦點！2024 年最佳酒店揭曉！ `bali-best-hotels-2024` | (未分組/僅在更多文章) | 1566 | 0 | 0 | 1 | 2 | 2 | **5** | 1/1 | 2026-07-21 |
| 71 | 峇里島團體自由行旅遊：包棟villa 三房/四房/五房/六房以上的家… `bali-group-villa-stay` | 親子家庭度假村 | 7261 | 1 | 1 | 1 | 1 | 1 | **5** | 4/0 | 2026-07-21 |
| 72 | 【庫塔住宿推薦】12 間精選飯店懶人包：市區購物、機場過境、高 CP… `best-kuta-hotels-list` | 庫塔 Kuta 住宿 | 4351 | 1 | 1 | 1 | 1 | 1 | **5** | 0/1 | 2026-07-21 |
| 73 | Bidadari Private Villas & Retreat … `bidadari-private-villas-ubud` | (未分組/僅在更多文章) | 1259 | 1 | 1 | 1 | 1 | 1 | **5** | 0/1 | 2026-07-21 |
| 74 | 峇里島住宿推薦：Canggu Top 19 你不能錯過的住宿推薦 `canggu-top-hotels-guide` | 長谷／倉古 Canggu 住宿 | 4019 | 1 | 1 | 1 | 1 | 1 | **5** | 6/0 | 2026-07-21 |
| 75 | 【水明漾住宿推薦】Seminyak 市中心最高評分的浪漫私人 Vil… `equilibria-seminyak` | (未分組/僅在更多文章) | 1567 | 1 | 1 | 1 | 1 | 1 | **5** | 1/0 | 2026-07-21 |
| 76 | IZE Seminyak｜水明漾高 CP 值精品飯店深度評測 202… `ize-seminyak-hotel-review` | 水明漾 Seminyak 住宿 | 1605 | 1 | 1 | 0 | 2 | 1 | **5** | 0/0 | 2026-07-21 |
| 77 | 【2026 峇里島奢華飯店】Jumeirah Bali 烏魯瓦圖朱美… `Jumeirah-Bali` | (未分組/僅在更多文章) | 1376 | 1 | 0 | 1 | 2 | 1 | **5** | 2/0 | 2026-07-21 |
| 78 | 【庫塔海灘住宿全攻略】18 間精選飯店：從高 CP 值到海景五星度假… `kuta-beach-hotels` | 庫塔 Kuta 住宿 | 4885 | 1 | 1 | 1 | 1 | 1 | **5** | 1/0 | 2026-07-21 |
| 79 | Le Cliff Bali｜烏魯瓦圖懸崖海景第一排 浪漫蜜月 Vil… `le-cliff-bali-uluwatu` | 烏魯瓦圖 Uluwatu 住宿 | 1290 | 0 | 2 | 0 | 2 | 1 | **5** | 0/0 | 2026-07-21 |
| 80 | 【水明漾住宿推薦】RC Villas & Spa Seminyak … `RC-Villas-Spa-Seminyak` | (未分組/僅在更多文章) | 1398 | 1 | 1 | 1 | 1 | 1 | **5** | 1/0 | 2026-07-21 |
| 81 | 水明漾平價住宿推薦 2026｜10 間 Seminyak 精華區高 … `seminyak-budget-hotels-guide` | 水明漾 Seminyak 住宿 | 1246 | 0 | 1 | 1 | 2 | 1 | **5** | 3/0 | 2026-07-21 |
| 82 | 【水明漾】不超過100美元的平價峇里島villa推薦 `seminyak-budget-villas-guide` | 水明漾 Seminyak 住宿 | 2638 | 0 | 2 | 1 | 1 | 1 | **5** | 4/0 | 2026-07-21 |
| 83 | Seminyak Square Hotel and Villas｜水… `seminyak-square-hotel-villas` | (未分組/僅在更多文章) | 1515 | 1 | 1 | 0 | 2 | 1 | **5** | 0/0 | 2026-07-21 |
| 84 | 【水明漾villa推薦】The Club Villas Seminy… `the-club-villas-seminyak` | (未分組/僅在更多文章) | 1287 | 1 | 1 | 1 | 1 | 1 | **5** | 1/0 | 2026-07-21 |
| 85 | The Maya Seminyak Villas｜水明漾鬧中取靜私人… `the-maya-seminyak-villas` | (未分組/僅在更多文章) | 1391 | 1 | 1 | 0 | 2 | 1 | **5** | 0/0 | 2026-07-21 |
| 86 | 【Canggu飯店推薦】新開幕TUI BLUE Berawa Hot… `tui-blue-berawa-hotel-canggu` | (未分組/僅在更多文章) | 1434 | 1 | 1 | 1 | 1 | 1 | **5** | 0/2 | 2026-07-21 |
| 87 | 【烏布住宿推薦】20+ 夢幻烏布 Villa 泳池別墅：從森林秘境到… `ubud-villa-pool-guide` | 烏布 Ubud 住宿 | 8252 | 0 | 2 | 1 | 1 | 1 | **5** | 5/1 | 2026-07-21 |
| 88 | 烏魯瓦圖住宿推薦 2026｜15 間無敵海景 Villa 與渡假村完… `uluwatu-bali-villas-resorts-guide` | 烏魯瓦圖 Uluwatu 住宿 | 3762 | 0 | 0 | 2 | 2 | 1 | **5** | 3/3 | 2026-07-21 |
| 89 | 全球最佳度假村2026｜Travel + Leisure評選：峇里島… `world-best-resorts-bali` | (未分組/僅在更多文章) | 1308 | 0 | 0 | 1 | 2 | 2 | **5** | 0/5 | 2026-07-21 |
| 90 | 峇里島高 CP 值 Villa 推薦（上集）2026｜20 間精選別… `bali-best-villas-top20-part1` | 平價高 CP 值住宿 | 2608 | 0 | 2 | 1 | 2 | 1 | **6** | 2/0 | 2026-07-12 |
| 91 | 【2026 峇里島親子遊】100+ 親子友善景點與活動大全：帶小孩玩… `bali-family-travel-guide` | (未分組/僅在更多文章) | 7334 | 0 | 2 | 1 | 2 | 1 | **6** | 1/0 | 2026-07-21 |
| 92 | 【2026 長谷住宿推薦】10+ Canggu Villa 私人泳池… `canggu-villas-guide` | 長谷／倉古 Canggu 住宿 | 5418 | 0 | 1 | 2 | 2 | 1 | **6** | 4/3 | 2026-07-21 |
| 93 | Cross Paasha Bali Seminyak｜水明漾藝術精品… `cross-paasha-bali-seminyak` | (未分組/僅在更多文章) | 1330 | 1 | 1 | 1 | 2 | 1 | **6** | 1/0 | 2026-07-21 |
| 94 | 努沙杜瓦住宿推薦 2026｜16 間 Nusa Dua 五星渡假村完… `nusa-dua-resorts-guide` | 努沙杜瓦 Nusa Dua 住宿 | 4656 | 0 | 2 | 1 | 2 | 1 | **6** | 3/1 | 2026-07-21 |
| 95 | 【2026 烏布新飯店】Sanggraloka Ubud 開箱：六月… `Sanggraloka-Ubud` | 烏布 Ubud 住宿 | 1051 | 0 | 2 | 1 | 2 | 1 | **6** | 1/0 | 2026-07-21 |
| 96 | 【2026 水明漾住宿推薦】美食控必收！精選 8 間 Eat Str… `seminyak-eat-street-hotels-villas` | 水明漾 Seminyak 住宿 | 2542 | 0 | 1 | 1 | 2 | 2 | **6** | 0/5 | 2026-07-21 |
| 97 | 【2026 烏布新住宿】Adiwana Alas Harum 開箱：… `Adiwana-Alas-Harum` | (未分組/僅在更多文章) | 1517 | 1 | 2 | 1 | 2 | 1 | **7** | 1/0 | 2026-07-20 |
| 98 | 台幣4000元住無敵海景第一排！Bali Beach Hotel 地… `bali-beach-hotel-sunur-review` | 沙努爾 Sanur 住宿 | 1659 | 2 | 2 | 1 | 1 | 1 | **7** | 0/1 | 2026-07-21 |
| 99 | 【水明漾住宿推薦】台幣5,000入住濱海五星級英迪格渡假村 Hote… `hotel-indigo-seminyak-review` | 水明漾 Seminyak 住宿 | 2010 | 2 | 2 | 1 | 1 | 1 | **7** | 1/0 | 2026-07-21 |
| 100 | 【2026 峇里島親子旅遊】沙努爾 Sanur 全攻略：寒暑假帶小孩… `sanur-family-travel-guide-2` | (未分組/僅在更多文章) | 5566 | 0 | 2 | 1 | 2 | 2 | **7** | 0/1 | 2026-07-21 |
| 101 | 【沙努爾住宿推薦】20+ Sanur 度假村與 Villa 全攻略：… `sanur-luxury-budget-resorts` | 沙努爾 Sanur 住宿 | 7850 | 2 | 2 | 1 | 1 | 1 | **7** | 3/1 | 2026-07-21 |
| 102 | 烏布住宿推薦 2026｜30+ 烏布渡假村完整攻略 `ubud-resorts-guide` | 烏布 Ubud 住宿 | 11123 | 1 | 2 | 1 | 2 | 1 | **7** | 0/3 | 2026-07-21 |
| 103 | E Sanctuary Resort Ubud 2024 年全新開幕… `e-sanctuary-resort-ubud` | (未分組/僅在更多文章) | 2424 | 2 | 2 | 1 | 2 | 1 | **8** | 1/1 | 2026-07-21 |

---

## 2. 優先改善 Top 15（總分最低，依序處理）

> 排名依總分（越低越優先）；括號內為五項分數 [第一人稱/資訊增益/內連/新鮮度/技術面]。

1. **`bali-airbnb-warning-2026`**（2分｜0/0/0/2/0）— 去峇里島千萬別急著訂 Airbnb！2026 年三月底這件事可能讓你的旅程瞬間崩盤
   診斷：純新聞快訊，零第一人稱、零資訊增益，集群內連出/連入皆 0，meta description 只有 40 字（遠低於建議的 120-155 字，Google 會自動改寫摘要）。
   建議：文末補上「合法飯店/Villa 替代方案」段落並連到對應分區攻略（如 `nusa-dua-resorts-guide`、`sanur-luxury-budget-resorts`），meta description 擴寫到 120+ 字並帶入年份與地區詞。

2. **`bali-bamboo-villa-experience`**（2分｜0/0/1/1/0）— 巴里島一晚居然不到$2,000!? 體驗峇里島隱世竹子民宿
   診斷：標題有真實價格但內文缺乏第一人稱細節與資訊增益，meta description 僅 29 字，且與同主題的 `ubud-treehouse-bamboo-villa-stays` 只有單向連結、集群內零連入。
   建議：補齊入住當天的具體細節（房型、缺點、如何預訂），與 `ubud-treehouse-bamboo-villa-stays` 建立雙向連結，並讓 `ubud-resorts-guide` 收錄此文。

3. **`bali-safari-marine-park-hotel`**（2分｜0/0/0/1/1）— 開箱峇里島最大動物園！動物園飯店住宿體驗
   診斷：僅 602 字、1 個 H2，內容像是影片轉錄的短摘要，非原創第一人稱開箱，集群內外連結皆 0。
   建議：擴充成完整開箱文（房型、餵食體驗細節、親子設施、房價），並雙向連結 `bali-family-resorts-kids-club`、`nusa-dua-resorts-guide`。

4. **`hiliwatu-marriott-ubud`**（2分｜0/0/0/1/1）— 烏布新地標開幕：Hiliwatu 萬豪精選酒店
   診斷：新聞稿式介紹，零第一人稱、零資訊增益，全站也是零連入的孤島文章，儘管內容剛更新過但缺乏站內曝光入口。
   建議：加入實際房價／烏布區域生活機能資訊，與 `ubud-resorts-guide`、`capella-ubud-luxury-resort` 等同區文章互連。

5. **`kuta-bali-accommodation-pros-cons`**（2分｜1/0/0/1/0）— 去峇里島住這裡最方便，卻最不推薦！庫塔優缺點
   診斷：語氣上有第一人稱但缺資訊增益與技術面（meta 僅 35 字），集群內零連出零連入——與同區 `best-kuta-hotels-list`、`kuta-beach-hotels` 完全沒有互連，等於庫塔三篇各自為政。
   建議：與另兩篇庫塔文互相連結，meta 擴寫，並加入「庫塔到底適合誰住」FAQ 段落。

6. **`oshom-bali-nuanu-creative-city`**（2分｜0/0/0/1/1）— 【Canggu住宿推薦】Nuanu Creative City 精品旅館 Oshom Bali
   診斷：實際位於 Tabanan 的 Nuanu 創意城市（非傳統 Canggu 市區），集群內零連結、無第一人稱、無資訊增益，且未被排進任何分類頁分組（只在「更多住宿推薦文章」）。
   建議：加入前往交通方式／與 Canggu 市區距離等資訊增益，並讓 `canggu-top-hotels-guide` 收錄連結。

7. **`seminyak-isuite-ekosistem-hotel`**（2分｜1/0/0/1/0）— 水明漾 iSuite by Ekosistem
   診斷：meta description 長達 289 字（遠超 155 字上限，SERP 會被截斷或被 Google 重寫），集群內連出連入皆 0，未進入任何分組。
   建議：meta 縮到 150 字內，與 `seminyak-beach-resorts-guide` 建立雙向連結。

8. **`airbnb-alert-2026`**（3分｜0/0/0/2/1）— 【2026 峇里島旅遊警訊】Airbnb 民宿可能 8 月消失
   診斷：與第 1 名主題重複（同樣的 Airbnb 拆遷警訊，兩篇互不連結），內容仍是新聞轉述、零資訊增益、集群內零連結。
   建議：與 `bali-airbnb-warning-2026` 互相連結並做內容差異化（例如一篇聚焦法規時間軸、一篇聚焦「怎麼挑合法住宿」），避免左右互打。

9. **`alam-wayang-ubud-villa`**（3分｜0/0/1/1/1）— 【烏布villa推薦】Alam Wayang Ubud
   診斷：零第一人稱、零資訊增益，僅單向連到 `ubud-villa-pool-guide`，未被任何烏布主力文回連。
   建議：補實住細節與缺點，讓 `ubud-resorts-guide`、`ubud-villa-pool-guide` 回連此文。

10. **`apurva-kempinski-bali-deal`**（3分｜0/0/1/1/1）— 峇里島凱賓斯基限時促銷
    診斷：促銷快訊型文章，時效性強但缺乏資訊增益與第一人稱；目前單向連到 `apurva-kempinski-bali-nusa-dua` 與 `apurva-kempinski-sustainability-award`，但這兩篇都沒有回連促銷文，且與促銷相關的 `Ayana-promo-2026` 屬同類型孤立內容，容易過期後變成廢頁。
    建議：加入「促銷結束後怎麼查最新房價」的常設段落避免過期失效；讓 `apurva-kempinski-bali-nusa-dua`／`apurva-kempinski-sustainability-award` 補上回連此文的連結，形成雙向。

11. **`Ayana-promo-2026`**（3分｜0/0/1/1/1）— AYANA Resort Bali 優惠
    診斷：同上，促銷快訊缺乏長青內容價值，零資訊增益、零第一人稱；Ayana 系列文章（`ayana-resort-bali-guide`／`-experience`／`-villa-experience`）彼此已互連得不錯，但這篇促銷文是唯一沒被 `ayana-resort-bali-guide` 回連的一篇，是系列中的單向連結缺口。
    建議：加入常設化的資訊增益內容避免過期失效；讓 `ayana-resort-bali-guide` 補上回連此文的連結，補齊 Ayana 系列的完整互連。

12. **`ayana-resort-bali-experience`**（3分｜0/0/1/1/1）— 峇里島 Ayana 阿雅娜度假村住宿體驗（YouTuber 影片轉述）
    診斷：內文明確標註「YouTuber 設計師不累 designer play 發佈的視頻」——是轉述他人影片而非本站第一人稱體驗，這類「借title」文章在 Google 眼中價值有限。
    建議：改寫為本站觀點的整理／評論角度，或明確定位為「影片精華整理」並加上原創的資訊增益（房價區間、如何比較 Ayana 各房型）。

13. **`bali-boutique-hotels-under-30`**（3分｜0/0/1/1/1）— CP值超高，不到美金$30入住11間精品酒店（2020 年舊文）
    診斷：這篇是 2020-01-30 發布、近期才被機器更新過 `updatedDate`（但內容本身未實質更新），標題無年份、零第一人稱、零連出，是典型「彙整清單型」文章，且 US$30 的房價在 2026 年通膨後很可能已失真。
    建議：優先核實文中房價是否還準確，過時就整篇改版並補上年份（如「2026 平價精品飯店」），加入資訊增益段落。

14. **`bali-canggu-seminyak-jimbaran-ubud-nusa-penida-hotels`**（3分｜0/0/1/1/1）— 【實拍視頻】12 間住宿推薦（跨 5 個區域）
    診斷：標題橫跨長谷／水明漾／金巴蘭／烏布／佩尼達島 5 個區域，但只有 928 字，等於每區平均不到 200 字，是典型「大雜燴、資訊密度低」文章，SEO 上也難鎖定單一長尾詞。
    建議：考慮拆成 5 篇區域短文分別深化，或整篇下修為「影片導覽」類型並在文中密集連結對應區域主力文。

15. **`bali-family-resorts-water-slides`**（3分｜0/0/1/1/1）— 峇里島親子樂園：15 家有滑水道的親子渡假村
    診斷：親子度假村分組中相對優質（inbound 9 篇，是集群內少數有一定連結量的文章），但完全沒有第一人稱實際帶小孩入住的心得、也沒有資訊增益（如兒童泳池深度、退房時間彈性等實用細節）。
    建議：這篇有連結權重基礎，值得優先補強成 money page：加入至少 1-2 個親身帶小孩入住的段落與缺點提醒，投資報酬率最高。

---

## 3. Money Page（分區主力文）專項診斷

分類頁 `areaTable` 直接把站內權重導向以下 9 篇區域主力文，理論上應該是全站住宿內容的「核心資產」，但實測結果：**9 篇全數在「第一人稱實住體驗」拿 0 或 1 分，全數沒有 FAQ／比較表格**，且多篇是彼此連結孤島。

| 主力文 | 總分 | 第一人稱 | 資訊增益 | 集群內連入/連出 | 主要問題 |
|---|---|---|---|---|---|
| `bali-accommodation-area-guide`（選區總入口） | 4 | 0 | 0 | **0** / 9 | 全站最重要的「怎麼選區」文章，卻沒有任何一篇住宿文連回它，只能靠分類頁硬導流 |
| `best-kuta-hotels-list` | 4 | 0 | 1 | **0** / 1 | 庫塔區 3 篇文章互不連結（見上方 Top 15 第 5 名） |
| `jimbaran-beachfront-hotels-guide` | 4 | 0 | 1 | 2 / **0** | 對外零連出，沒有把站內金巴蘭深度評測文（Four Seasons、Raffles 等）串起來 |
| `seminyak-beach-resorts-guide` | 4 | 0 | 1 | 7 / **0** | 集群內連入最多（7篇），代表是水明漾實質樞紐，但自己完全不回連任何個別飯店深度評測 |
| `canggu-top-hotels-guide` | 5 | 0 | 1 | 6 / **0** | 同上模式：被動接收連結，但不主動連出 |
| `nusa-dua-resorts-guide` | 5 | 0 | 1 | 3 / 1 | 表現相對均衡，可作為其他分區主力文改版的參考範本 |
| `sanur-luxury-budget-resorts` | 5 | 2 | 2 | 3 / 1 | 分數最高的主力文，含真實房價與資訊增益關鍵詞，可作為改版模板 |
| `uluwatu-bali-villas-resorts-guide` | 5 | 0 | 0 | 3 / 3 | 唯一資訊增益=0 的主力文，完全沒有電壓/交通/生活機能類實用資訊 |
| `ubud-resorts-guide` | 6 | 1 | 2 | **0** / 3 | 11,123 字全站最長，內容量足夠但零集群內連入，且完全沒有 Ubud 個別飯店評測文（Capella、Alaya Suites、Hiliwatu 等 7 篇）回連它 |

**共同模式**：主力文普遍扮演「單向被連結的終點」，卻不主動連到自家區域的深度評測子文章——這條路徑斷在主力文這一端，是最值得優先修的內部連結問題（見第 4 節）。另外 9 篇沒有一篇有 FAQ 或比較表格，這正是對手基準第 5 項「FAQ schema」在本站主力文上的全面缺口，且是流量最大的頁面，優先權應高於長尾子文章。

---

## 4. 內部連結補強建議

以區域分組計算「主力文 ↔ 同區衛星文章」的雙向連結覆蓋率，`✗` 代表該文與主力文之間**完全沒有任何一方連向對方**：

| 分區 | 主力文 | 同區文章數 | 完全未與主力文互連 | 缺口比例 |
|---|---|---|---|---|
| 水明漾 Seminyak | `seminyak-beach-resorts-guide` | 22 | 18 篇：`seminyak-eat-street-hotels-villas`、`seminyak-private-villas-guide`、`seminyak-budget-hotels-guide`、`seminyak-budget-villas-guide`、`hotel-indigo-seminyak-review`、`potato-head-suites-seminyak-review`、`ize-seminyak-hotel-review`、`equilibria-seminyak`、`cross-paasha-bali-seminyak`、`the-club-villas-seminyak`、`the-maya-seminyak-villas`、`seminyak-square-hotel-villas`、`RC-Villas-Spa-Seminyak`、`Jas-Green-Villas-and-Spa`、`kleo-seminyak-hyatt-opening`、`seminyak-isuite-ekosistem-hotel` 等 | 82% |
| 烏布 Ubud | `ubud-resorts-guide` | 15 | 13 篇：`capella-ubud-luxury-resort`、`alaya-suites-ubud`、`hiliwatu-marriott-ubud`、`ubud-treehouse-bamboo-villa-stays`、`ubud-villa-pool-guide`、`ubud-yoga-retreats-bali`、`bidadari-private-villas-ubud`、`alam-wayang-ubud-villa`、`e-sanctuary-resort-ubud` 等 | 87% |
| 長谷 Canggu | `canggu-top-hotels-guide` | 12 | 7 篇：`regent-bali-canggu`、`holiday-inn-bali-canggu`、`oshom-bali-nuanu-creative-city`、`dune-seseh`、`La-Mewali` 等 | 58% |
| 烏魯瓦圖 Uluwatu | `uluwatu-bali-villas-resorts-guide` | 10 | 7 篇：`le-cliff-bali-uluwatu`（及重複的 `-review` 版）、`renaissance-bali-uluwatu-resort`、`alila-villas-uluwatu-bali`、`bvlgari-resort-bali-uluwatu`、`six-senses-uluwatu-review` | 70% |
| 金巴蘭 Jimbaran | `jimbaran-beachfront-hotels-guide` | 6 | 5 篇：`platinum-hotel-jimbaran-beach`、`ayana-resort-villa-experience`、`four-seasons-bali-jimbaran-bay` 等 | 83% |
| 庫塔 Kuta | `best-kuta-hotels-list` | 4 | 3 篇：`kuta-bali-accommodation-pros-cons`、`kuta-beach-hotels`（已互連但主力文本身零連出，實為單向） | 75% |
| 努沙杜瓦 / 沙努爾 | `nusa-dua-resorts-guide` / `sanur-luxury-budget-resorts` | 2 / 2 | 各 1 篇 | 相對健康 |

**具體可執行的配對建議（本週可直接動手）**：

1. **每篇區域主力文（seminyak-beach-resorts-guide、canggu-top-hotels-guide、ubud-resorts-guide、jimbaran-beachfront-hotels-guide、best-kuta-hotels-list）文中，替每一家已有獨立深度評測的飯店，把該段落文字連到對應的評測文**（例如 `seminyak-beach-resorts-guide` 裡的「Hotel Indigo」段落應連到 `hotel-indigo-seminyak-review`；「Potato Head」段落連到 `potato-head-suites-seminyak-review`）。這是最低成本、最高回報的動作——不用新增內容，只是把既有的段落文字變成連結。
2. **反向操作**：每篇個別飯店評測文開頭或結尾，加一句「查看更多 [水明漾住宿推薦]」連回區域主力文，目前 `hotel-indigo-seminyak-review`、`ize-seminyak-hotel-review`、`potato-head-suites-seminyak-review` 等都缺這個回連。
3. `bali-accommodation-area-guide`（選區總入口，全站最重要的住宿導流頁）目前集群內連入是 0——建議在 8 篇區域主力文結尾都補一句「不確定選哪一區？先看 [峇里島五大住宿區域比較]」。
4. Ayana 系列（`ayana-resort-bali-guide`／`ayana-resort-bali-experience`／`ayana-resort-villa-experience`／`Ayana-promo-2026`）與 Apurva Kempinski 系列（`apurva-kempinski-bali-nusa-dua`／`apurva-kempinski-bali-deal`／`apurva-kempinski-sustainability-award`）都是「一家飯店拆成 3-4 篇獨立文章」。Ayana 系列已有不錯的互連基礎（僅 `Ayana-promo-2026` 缺一條回連），但 Apurva Kempinski 系列目前是促銷文單向連出、兩篇主文完全沒有回連——建議兩組都補齊「星狀全互連」（每篇都連向其他同飯店文章），這類拆分成多篇的同飯店內容若不互連，也容易讓 Google 判定站內同飯店關鍵字互相蠶食（keyword cannibalization）。
5. Uluwatu 的 `le-cliff-bali-uluwatu` 與 `le-cliff-bali-uluwatu-review` 是同一飯店的兩篇獨立文章（疑似重複收錄未合併），建議先確認是否為內容重複／該合併，若保留兩篇則務必互連並做內容差異化，否則等同自我競爭同一組關鍵字。

---

## 5. 關鍵字缺口（對手可能涵蓋、我方 cluster 目前沒有對應文章）

比對全站 807 篇文章（含遊記／新聞類），確認以下地區與主題**在「住宿推薦」cluster 中完全沒有專屬文章**，即使本站遊記/景點類文章已多次提到這些地點：

**地區缺口**（本站已有景點/遊記文章提到這些地方，但沒有對應的「住宿推薦」文章）：
- **艾眉 Amed／土蘭奔 Tulamben**（潛水勝地）：已有潛水攻略但無住宿推薦，是「峇里島潛水住宿」「Amed 住宿推薦」的現成缺口。
- **羅威納 Lovina**（北岸看海豚）：已有 2 篇遊記提到，卻無「Lovina 住宿推薦」文章。
- **文登／布度古 Munduk／Bedugul**（高山湖區、瀑布、涼爽氣候）：多篇文章提及但無住宿主題文，這是「峇里島避暑」「峇里島瀑布住宿」長尾詞的空白。
- **金塔馬尼 Kintamani**（火山景觀）：同樣只有景點文，無住宿文。
- **詹地達沙 Candidasa**：完全沒有相關住宿內容。

**主題缺口**：
- **長住／數位游牧 Coliving**：Canggu 分組的介紹文案裡明確寫著「適合...數位游牧」的目標客群，但集群內**沒有任何一篇**介紹 coliving space、月租公寓、長租 Villa 折扣的文章——這是文案承諾與內容庫存不一致的落差，也是長谷（Canggu）目前最大的市場定位缺口。
- **青年旅館／背包客預算住宿**：全站無「峇里島青旅」「hostel」「背包客住宿」相關標題，目前「平價高 CP 值住宿」分組最低價位仍是精品飯店等級（US$25-50），沒有涵蓋真正的極限預算旅客。
- **Villa 訂房糾紛／押金／退租實務**：`bali-airbnb-warning-2026`、`bali-hotel-booking-tips` 觸及訂房安全，但沒有針對「私人 Villa 押金怎麼談」「退租驗屋注意事項」等更深入的避雷長尾詞（這正是「資訊增益」基準最容易加分、也最貼近對手強項的主題）。
- **寵物友善住宿**：全站無相關文章。
- **各分區 FAQ 頁**：對手常見的「XX 區住宿常見問題」在本站集群中僅 5 篇文章有 FAQ 區塊，且都不是分區主力文本身。

---

## 6. 本週先做哪 3 件事

1. **把 9 篇分區主力文（money page）的「彙整清單」段落，逐一連到已存在的個別飯店深度評測文，並讓評測文回連主力文**（第 4 節配對清單）。這是唯一不需要新寫任何一個字、純靠加超連結就能同時改善「內部連結網」與「主題聚落交叉連結」兩項基準的動作，且直接影響全站權重最集中的 9 個頁面。
2. **修復本輪 Top 7（總分 2 分）的技術面問題**：`bali-airbnb-warning-2026`／`bali-bamboo-villa-experience`／`kuta-bali-accommodation-pros-cons` 的過短 meta description，以及 `seminyak-isuite-ekosistem-hotel` 的過長 meta description——這批是半小時內可完成的低成本修正，同時處理 `bali-airbnb-warning-2026` 與 `airbnb-alert-2026` 兩篇主題重複、互不連結的問題。
3. **挑 1-2 篇分區主力文（建議從 `sanur-luxury-budget-resorts` 或 `nusa-dua-resorts-guide` 開始，因為兩篇分數已經相對最高、改動成本最低）試做「FAQ 區塊＋簡易比較表格」的完整改版**，驗證流程與效果後，再複製到其餘 7 篇主力文——目前全集群僅 2%文章有比較表格、5%有 FAQ，這是對手基準第 5 項最大的量化差距，也是最容易被 AI 摘要／SERP FAQ 精選摘要收錄的內容形式。
