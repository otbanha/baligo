# 階段 4：Schema.org 升級清單

> 審計日期：2026-05-18  
> 對標：Klook OTA 結構化資料層級

---

## 4-A. 現況快照

| Schema Type | 現有覆蓋 | 問題 |
|-------------|---------|------|
| `Article` | ✅ 全站 693 篇 | 正常 |
| `BreadcrumbList` | ✅ 全站 693 篇 | 正常 |
| `datePublished` | ✅ 全站 | 正常 |
| `dateModified` | ⚠️ 全站（但等於 datePublished） | **updated 欄位全部為零，無更新訊號** |
| `Hotel` + `ItemList` + `AggregateRating` | ❌ **實際 0 篇** | hotel-cache.json 為空（0 entries），schema 永遠不觸發 |
| `TouristDestination` | ✅ 58 篇（峇里島分區攻略） | 有但 geo 只到 Bali 層級，缺具體座標 |
| `TouristAttraction`（獨立） | ❌ 0 篇 | 只作為 TouristDestination 的 nested，無獨立頁面 |
| `Restaurant` | ❌ 0 篇 | 188 篇美食文章全用 LocalBusiness |
| `FAQPage` | ✅ 旅行技巧（202篇）+ 新手指南（24篇） | 有但 Answer.text 只放 description，品質低 |
| `HowTo` | ✅ 簽證通關（52篇） | 有，相對完整 |
| `LocalBusiness` | ⚠️ 188 篇（美食景點活動） | 太籠統：餐廳/景點/活動混用同一 type |
| `TouristTrip` / `ItemList`（行程） | ❌ 0 篇 | 32 篇行程類文章無 TouristTrip |
| `Map` + `ItemList`（地圖頁） | ❌ 0 篇 | 21 個地圖頁均無 Schema |
| `VideoObject` | ❌ | 未調查（優先級低） |

---

## 4-B. 核彈級 Bug：Hotel Schema 永遠不觸發

**`src/data/hotel-cache.json` 當前內容：`{"hotels":{}}` — 0 筆資料。**

```
-rw-r--r-- 1 root root 37 May 18 04:59 src/data/hotel-cache.json
```

SEO.astro 的 Hotel schema 邏輯：
```js
const hotels = hotelIds.map(hid => hotelMap[hid]).filter(Boolean)
if (hotels.length > 0) {  // ← 永遠是 0，schema 永遠不寫出
  extraSchemas.push({ "@type": "ItemList", ... })
}
```

**受影響**：93 篇住宿推薦文章，其中 79 篇有 Agoda ID，本應輸出 `Hotel` rich result，但實際全部只輸出基礎 `Article`。

**修復方法**：執行 `scripts/fetch-hotel-data.mjs` 重新生成 hotel-cache.json，並加入 CI/CD 定期更新。

---

## 4-C. Gap 1：`Restaurant` schema 缺失（188 篇）

### 現況
188 篇「美食景點活動」類文章統一輸出 `LocalBusiness`，但其中：
- 明確餐廳 / 咖啡廳：**26 篇**
- 明確景點 / 瀑布 / 寺廟：**40 篇**
- 明確活動 / 體驗：**32 篇**
- 混合型：**19 篇**
- 無法從標題判斷：**71 篇**

`LocalBusiness` 是所有類型的祖先 type，但 Google 的 rich result 要求使用更具體的子類型。

### 預估 SERP 影響
使用 `Restaurant` type 且包含 `servesCuisine`、`priceRange`、`aggregateRating` 可觸發 **餐廳 rich snippet（含評分星星、價位）**，這是 Klook 和 Google 餐廳搜尋結果的標準配備。

### 修復方案

在 `src/components/SEO.astro` 的 `美食景點活動` 分支，依文章標題關鍵字細分 type：

```typescript
// 在 SEO.astro 中替換現有 LocalBusiness 邏輯
if (cats.includes('美食景點活動')) {
  const isRestaurant = /餐廳|咖啡廳|咖啡館|美食|料理|海鮮|燒烤|夜市|小吃|素食/.test(title);
  const isAttraction = /景點|寺廟|瀑布|海灘|梯田|天空|森林|猴子|公園/.test(title);

  if (isRestaurant) {
    extraSchemas.push({
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "name": seoTitle,
      "description": seoDesc,
      "image": ogImage,
      "url": articleUrl,
      "servesCuisine": "Indonesian",
      "priceRange": "$$",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Bali",
        "addressCountry": "ID"
      },
      "areaServed": "Bali"
    });
  } else if (isAttraction) {
    extraSchemas.push({
      "@context": "https://schema.org",
      "@type": "TouristAttraction",
      "name": seoTitle,
      "description": seoDesc,
      "image": ogImage,
      "url": articleUrl,
      "geo": {
        "@type": "GeoCoordinates",
        "addressCountry": "ID",
        "addressRegion": "Bali"
      },
      "isAccessibleForFree": true,
      "touristType": {
        "@type": "Audience",
        "audienceType": "旅遊者"
      }
    });
  } else {
    // 保留現有 LocalBusiness 作為 fallback
    extraSchemas.push({ /* 現有 LocalBusiness */ });
  }
}
```

**修改檔案**：`src/components/SEO.astro`（第 275–295 行）  
**預估影響**：26 篇餐廳文章可觸發餐廳 rich snippet，40 篇景點文章可觸發 TouristAttraction 結構。

---

## 4-D. Gap 2：`TouristAttraction` 獨立 Schema 缺失（57 篇）

### 現況
目前只有 `峇里島分區攻略`（58 篇）類文章的 `TouristDestination` 內有 nested `TouristAttraction`，但單一景點文章（天空之門、瀑布等）無獨立 `TouristAttraction` schema。

**受影響文章範例**：
- `2021-01-14-64db6b72fd897800013a9475.md` — 「天空之門 Lempuyang Temple Gate of Heaven」
- `2020-11-06-64db6b71fd897800013a9435.md` — 「Kanto Lampo Waterfall」
- `2020-10-21-64db6b71fd897800013a942c.md` — 「烏布瀑布攻略」
- `2024-12-04-…` — 「La Brisa Bali 攻略」（海灘俱樂部）

### 修復方案（已包含在 4-C 方案中）

完整 JSON-LD 範例（天空之門類型）：
```json
{
  "@context": "https://schema.org",
  "@type": "TouristAttraction",
  "name": "峇里島天空之門 Lempuyang Temple 攻略",
  "description": "...",
  "image": "https://images.gobaligo.id/...",
  "url": "https://gobaligo.id/blog/.../",
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -8.3847,
    "longitude": 115.6312
  },
  "isAccessibleForFree": false,
  "touristType": { "@type": "Audience", "audienceType": "旅遊者" },
  "publicAccess": true
}
```

---

## 4-E. Gap 3：行程類文章缺少 `TouristTrip` / `ItemList`（32 篇）

### 現況
32 篇行程規劃文章（如「峇里島 5 天 4 夜行程」）僅有 `Article` schema，無 `TouristTrip` 或 `ItemList`。

Klook 的行程頁使用 `ItemList` 包裹每日行程，可觸發 Google 的行程 rich snippet。

### 修復方案

在 SEO.astro 新增行程偵測邏輯：

```typescript
// 在 SEO.astro 新增邏輯（約 295 行後）
const isItinerary = /(\d+天|\d+日|行程規劃|行程分享|行程安排|自由行攻略)/.test(title);
if (isItinerary && h2s.length >= 3) {
  extraSchemas.push({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": seoTitle,
    "description": seoDesc,
    "url": articleUrl,
    "numberOfItems": h2s.length,
    "itemListElement": h2s.slice(0, 10).map((h, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": h.text,
      "url": `${articleUrl}#${h.slug}`
    }))
  });
}
```

**修改檔案**：`src/components/SEO.astro`（295 行後新增）  
**受影響**：32 篇行程類文章

---

## 4-F. Gap 4：地圖頁完全無 Schema（21 個地圖）

### 現況
`src/pages/map/[area].astro` 和所有主題地圖頁均無任何 Schema.org 結構化資料。

### 修復方案

在 `src/pages/map/[area].astro` 的 `<head>` 區塊加入：

```html
<!-- 在 <head> 內新增，位置約在 BaseHead 之後 -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Map",
  "name": "{area.name} 互動地圖｜Go Bali Go",
  "description": "{area.description}",
  "url": "https://gobaligo.id/map/{area.slug}/",
  "mapType": "https://schema.org/VenueMap",
  "contentLocation": {
    "@type": "Place",
    "name": "{area.name}",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": {area.center[0]},
      "longitude": {area.center[1]}
    },
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "Bali",
      "addressCountry": "ID"
    }
  }
}
</script>
```

**修改檔案**：`src/pages/map/[area].astro`  
**受影響**：13 個區域地圖 + 8 個主題地圖 = 21 頁  
**SERP 影響**：地圖類 rich result 潛力，強化 entity 關聯

---

## 4-G. Gap 5：Hotel Schema 有架構但 cache 為空

### 問題根源
`src/data/hotel-cache.json` 為空，導致 79 篇有 Agoda ID 的住宿推薦文章無法輸出 Hotel schema。

### 修復方案
```bash
# 執行 fetch script 重新生成 cache
node scripts/fetch-hotel-data.mjs

# 確認生成結果
cat src/data/hotel-cache.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('hotels',{})), 'entries')"
```

加入定期更新機制（建議每月執行一次）。

**受影響**：79 篇住宿推薦文章  
**SERP 影響**：`Hotel` rich result 含星評、評分、最低房價 — 這是 Klook/Agoda 的核心競爭力

---

## 4-H. Gap 6：`FAQPage` Answer.text 品質低

### 現況
現有 FAQPage（新手指南 + 旅行技巧）的 Answer.text 使用文章 description，而非實際答案。

```js
// 現有（src/components/SEO.astro line 267）
"text": description || `詳見：${articleUrl}#${h.slug}`,
```

Google 的 FAQPage rich result 需要 `acceptedAnswer.text` 包含實質內容（至少 50 字）。

### 修復方案
從文章 body 中擷取每個 H2 後的第一段文字作為 Answer.text：

```typescript
// 改善 FAQPage 答案品質
const faqItems = h2s.filter(h => h.text?.trim()).slice(0, 10).map(h => {
  // 找到這個 H2 後的第一段文字
  const h2Pattern = new RegExp(`##\\s*${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^#]*?\\n\\n([^#\\n]+)`, 's');
  const answerMatch = body.match(h2Pattern);
  const answerText = answerMatch ? answerMatch[1].replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').trim().slice(0, 300) : (description || '');
  return {
    "@type": "Question",
    "name": h.text.trim(),
    "acceptedAnswer": { "@type": "Answer", "text": answerText }
  };
});
```

**修改檔案**：`src/components/SEO.astro`（第 260–272 行）  
**受影響**：226 篇（旅行技巧 202 + 新手指南 24）

---

## 4-I. 所有 Gap 彙整

| Gap | 受影響文章數 | 修改檔案 | 工時估計 | SERP 影響 |
|-----|------------|---------|---------|-----------|
| Hotel cache 為空 | **79 篇** | 執行 `fetch-hotel-data.mjs` | 1 小時 | 🔴 Hotel rich result（最高優先） |
| Restaurant schema | **26 篇** | `src/components/SEO.astro` L275–295 | 2 小時 | 🟠 餐廳評分星星 |
| TouristAttraction schema | **40 篇** | `src/components/SEO.astro` L275–295 | 2 小時（同上） | 🟡 景點 rich result |
| 行程 ItemList | **32 篇** | `src/components/SEO.astro` 新增 | 1 小時 | 🟡 行程列表 rich result |
| 地圖頁 Map schema | **21 頁** | `src/pages/map/[area].astro` | 1 小時 | 🟡 強化地圖 entity |
| FAQPage Answer 品質 | **226 篇** | `src/components/SEO.astro` L260–272 | 2 小時 | 🟡 FAQ rich snippet 改善 |
| `dateModified` 無更新訊號 | **693 篇** | frontmatter + layout | 持續工作 | 🟡 Freshness 訊號 |

---

*下一步：請確認後說「繼續階段 5」以進入 Freshness 更新訊號分析。*
