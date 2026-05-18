# 階段 1：現況盤點（原始資料）

> 審計日期：2026-05-18  
> 審計對象：`src/content/blog/`（zh-TW 母本）

---

## 1-A. 文章總量

| 指標 | 數值 |
|------|------|
| 總文章數 | **693** 篇（含 .md 691 + .mdx 2） |
| 有 `updated` frontmatter 欄位 | **0** 篇（全站無一篇設定） |
| 有 `updatedDate` frontmatter 欄位 | **0** 篇 |
| 多語平行版本（en/zh-hk/zh-cn 各） | **708** 篇（比 zh-TW 母本多，推測含額外頁面） |
| 印尼文（id） | **50** 篇 |

---

## 1-B. Category 分佈

> 分析方式：解析每篇 frontmatter 的 `category:` 清單首項。部分文章的 category 欄位混入 tag 性質的值（已保留原始）。

| Category | 文章數 |
|----------|--------|
| 旅行技巧 | **202** |
| 美食景點活動 | **188** |
| 遊記分享 | **93** |
| 住宿推薦 | **93** |
| 峇里島分區攻略 | **58** |
| 簽證通關 | **52** |
| 家庭親子 | **42** |
| 新聞存檔 | **40** |
| 新手指南 | **24** |
| 叫車包車 | **24** |
| 無 category 欄位 | **7** |
| **合計** | **823**（部分文章有複數 category） |

**備註**：部分文章 category 欄位誤填 tag 值（如「峇里島旅遊」「烏布」「獨旅」等），資料品質待清理。

---

## 1-C. 前 50 大 Tag

> 共 753 個唯一 tag，存在大量近義詞冗餘（如「峇里島」183 篇 + 「巴里島」65 篇）。

| Tag | 文章數 |
|-----|--------|
| 峇里島 | 183 |
| 巴里島 | 65 |
| 峇里島旅遊 | 47 |
| 峇里島自由行 | 25 |
| 印尼 | 20 |
| 峇里島攻略 | 18 |
| 峇里島旅遊攻略 | 17 |
| 峇里島新聞 | 14 |
| 峇里島遊記 | 11 |
| 烏布 | 10 |
| nuanu | 8 |
| 簽證 | 7 |
| 自由行 | 7 |
| 峇里島親子 | 6 |
| 電子簽證 | 6 |
| 峇里島自由行攻略 | 6 |
| 美食 | 6 |
| 峇里島簽證 | 6 |
| 旅遊 | 6 |
| 落地簽 | 5 |
| 峇里島交通 | 5 |
| 印尼簽證 | 5 |
| 沙努爾 | 5 |
| 旅遊目的地 | 5 |
| 2026北藝嚴選 | 5 |
| 水明漾 | 5 |
| 長谷 | 5 |
| 烏魯瓦圖 | 5 |
| 入境 | 4 |
| 佩尼達島 | 4 |
| 峇里島免簽 | 4 |
| evoa | 4 |
| 庫塔 | 4 |
| 景點 | 4 |
| 印尼旅遊 | 4 |
| 賭場 | 4 |
| 入境峇里島 | 4 |
| 釀電影 | 4 |
| 烏布景點 | 4 |
| 峇里島包車 | 4 |
| 峇里島旅遊稅 | 4 |
| sanur | 3 |
| 科摩多島 | 3 |
| 印尼免簽 | 3 |
| 推薦 | 3 |
| 峇里島美食推薦 | 3 |
| 寧靜日 | 3 |
| 峇里島換匯 | 3 |
| 峇里島行程 | 3 |
| 旅遊人數 | 3 |

**Tag 問題發現**：
- 「峇里島」vs「巴里島」重複計 248 篇，未統一
- 部分 tag 含 hashtag 符號（`#峇里島`）、英文大小寫混用（`Bali news` vs `bali news`）
- 753 個唯一 tag 嚴重過度分散，缺乏 taxonomy 管控

---

## 1-D. 文章新鮮度分析

### 時間分佈（依 pubDate）

| 年份 | 篇數 |
|------|------|
| 2019 | 5 |
| 2020 | 8 |
| 2021 | 2 |
| 2022 | 5 |
| 2023 | 43 |
| 2024 | 258 |
| 2025 | 217 |
| 2026（至今） | 150 |
| 無日期 | 5 |

### 更新狀態

| 狀態 | 篇數 | 說明 |
|------|------|------|
| 新鮮（pubDate ≥ 2025-05-18） | **270** | 近 12 個月發布 |
| 陳舊（2023 ≤ pubDate < 2025-05-18，無 updated） | **398** | **最大問題群** |
| 極舊（pubDate < 2023，無 updated） | **20** | |
| 有 `updated` 欄位 | **0** | 全站皆無 |

**關鍵發現**：全站 693 篇文章**沒有任何一篇**設定 `updated` / `updatedDate` frontmatter 欄位，也就是說 Schema.org 的 `dateModified` 等同 `datePublished`。即使文章內容有更新，Google 也看不到 freshness 訊號。

---

## 1-E. 地圖頁盤點

### 地圖檔案結構
路徑：`src/pages/map/`
- `index.astro`（地圖目錄首頁）
- `[area].astro`（動態路由，讀取 `src/data/maps.ts`）
- `favorites.astro`
- `gojek-fare.astro`（Gojek 車費計算）
- `itinerary.astro`

### 區域地圖（Area Maps，13 個）

| Slug | 中文名 | 英文名 |
|------|--------|--------|
| kuta | 庫塔 | Kuta |
| seminyak | 水明漾 | Seminyak |
| canggu | 長谷 | Canggu |
| nuanu | Nuanu Creative City | Nuanu Creative City |
| ubud | 烏布 | Ubud |
| jimbaran | 金巴蘭 | Jimbaran |
| uluwatu | 烏魯瓦圖 | Uluwatu |
| nusa-dua | 努沙杜瓦 | Nusa Dua |
| sanur | 沙努爾 | Sanur |
| amed | Amed / Tulamben | Amed / Tulamben |
| nusa-penida | 佩尼達島 | Nusa Penida |
| lembongan | 藍夢島 & 金銀島 | Nusa Lembongan & Ceningan |
| denpasar | 登巴薩 | Denpasar |

### 主題地圖（Thematic Maps，8 個）

| Slug | 主題 |
|------|------|
| money-changer | 峇里島合法換匯所 |
| atm | ATM 提款機 |
| hospital | 醫院 / 診所 |
| canggu-hotel | 長谷住宿推薦 |
| seminyak-hotel | 水明漾住宿推薦 |
| seminyak-eat-street | 水明漾 Eat Street 指南 |
| ubud-villa | 烏布 Villa 推薦 |
| vegetarian | 峇里島素食餐廳 Top 26 |

**缺口發現**：目前共 8 個主題地圖，但根據文章 tag 分析，以下主題有大量文章但無專屬主題地圖：
- 烏布餐廳 / 美食
- 庫塔 / 烏魯瓦圖住宿推薦
- 佩尼達島景點
- 簽證辦理點 / 機場服務

---

## 1-F. 10 篇抽樣文章技術審查

### 樣本清單

| 檔案 | 標題（節錄） | Category |
|------|------------|----------|
| `2024-09-12-66e27989fd89780001685c6f.md` | 峇里島不繳旅遊税？小心被監禁！ | 旅行技巧 |
| `2024-08-22-66b779d9fd89780001baf625.md` | Komodo科莫多國家公園跳島一日遊 | 遊記分享 |
| `2024-11-11-670688f2fd8978000138a466.md` | 六天五夜峇里島親子旅行 | 家庭親子, 遊記分享 |
| `2025-06-15-684e466efd8978000159a13b.md` | Sanur沙灘上的6大熱門海景咖啡廳推薦 | 美食景點活動 |
| `2026-02-07-6986c5c0fd897800017582f6.md` | 烏布的頌缽療癒/音療 | 美食景點活動 |
| `2024-03-19-65f8dca4fd89780001b57754.md` | 印尼/峇里島旅遊禁忌 | 旅行技巧 |
| `2024-05-29-6655eceefd897800015c1b6a.md` | 峇里島到帕尼達/佩尼達島搭船 | 美食景點活動, 遊記分享 |
| `2024-04-23-66155131fd89780001e64a99.md` | 女子獨旅體驗分享 | 遊記分享 |
| `2024-02-08-65c44c29fd89780001141a3e.md` | 想去峇里島英文不好怎麼辦？ | 旅行技巧 |
| `2025-01-07-672e2c1afd897800014c3fbc.md` | 99%遊客都在偷偷搜尋的41個問題 | 旅行技巧, 新手指南 |

### 技術指標結果

| 指標 | 10 篇結果 | 說明 |
|------|-----------|------|
| Schema.org @type 在文章內文 | 0/10 | 皆無（Schema 由 SEO.astro 元件生成，不在 .md 原始碼中） |
| 連到 `/map/` 的 internal link | **0/10** | 無任何文章連到地圖頁 |
| `updated` / `dateModified` 欄位 | **0/10** | 全部缺失 |
| hreflang 在文章內文 | 0/10（正常，由 BlogPost.astro layout 處理） | |
| 內文 internal link 數（平均） | 11 個（0–45，高度不均） | |

### Schema.org 實作現況（SEO.astro 元件層級）

根據 `src/components/SEO.astro` 程式碼審查：

| Schema Type | 使用條件 | 覆蓋範圍 |
|-------------|----------|---------|
| `Article` | 所有文章 | ✅ 全站 |
| `BreadcrumbList` | 所有文章 | ✅ 全站 |
| `datePublished` + `dateModified` | 全站（但 dateModified 等同 datePublished，因無 updated 欄位） | ⚠️ 部分 |
| `Hotel` + `AggregateRating` + `ItemList` | 住宿推薦類文章（需 hotelIds） | 📋 條件式 |
| `TouristDestination` | 分區攻略類文章 | 📋 條件式 |
| `FAQPage` | 新手指南 / 旅行技巧（從 H2 標題生成） | 📋 條件式 |
| `HowTo` | 簽證通關類文章 | 📋 條件式 |
| `LocalBusiness` | 部分類別 | 📋 條件式 |
| `TouristAttraction` | **缺失** — 景點類無專屬 type | ❌ |
| `Restaurant` | **缺失** | ❌ |
| `Map` + `ItemList`（地圖頁） | **缺失** | ❌ |

### hreflang 實作狀況

`src/layouts/BlogPost.astro` 已靜態插入 5 組 hreflang：
```html
<link rel="alternate" hreflang="x-default" href="https://gobaligo.id/blog/{slug}/" />
<link rel="alternate" hreflang="zh-TW"     href="https://gobaligo.id/blog/{slug}/" />
<link rel="alternate" hreflang="zh-HK"     href="https://gobaligo.id/zh-hk/blog/{slug}/" />
<link rel="alternate" hreflang="zh-CN"     href="https://gobaligo.id/zh-cn/blog/{slug}/" />
<link rel="alternate" hreflang="en"        href="https://gobaligo.id/en/blog/{slug}/" />
```

**問題**：這是靜態插入，不驗證平行語言版本是否真的存在。en/zh-hk/zh-cn 各有 708 篇但 id 只有 50 篇，若 id 文章未被 hreflang 指向反而是合理的，但若有文章在 zh-TW 存在而 en 不存在，則 hreflang 指向 404，可能引起 Google 混淆。

---

## 1-G. 資料品質問題摘要

| 問題 | 嚴重度 | 受影響範圍 |
|------|--------|-----------|
| 全站 `updated` 欄位為零 | 🔴 高 | 693 篇 |
| Category 欄位混入 tag 值 | 🟡 中 | ~50 篇 |
| Tag 近義詞未統一（峇里島/巴里島等） | 🟡 中 | ~300 篇 |
| 文章連到 `/map/` 的 internal link 為零 | 🔴 高 | 693 篇 |
| 398 篇文章超過 12 個月未更新 | 🟡 中 | 398 篇 |
| `TouristAttraction`/`Restaurant` schema 缺失 | 🟡 中 | ~200 篇 |
| 地圖頁無 `Map`/`ItemList` schema | 🟡 中 | 21 個地圖頁 |

---

*下一步：請確認以上資料後，說「繼續階段 2」以進入 Topic Cluster 缺口分析。*
