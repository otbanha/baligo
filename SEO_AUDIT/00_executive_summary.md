# SEO 審計執行摘要

> 審計日期：2026-05-18  
> 範圍：gobaligo.id，693 篇文章，21 個地圖頁  
> 競爭對手：17luyo.com、kimiyo.tw、mimigo.tw、klook.com/zh-TW/blog、mafengwo.cn

---

## 核心診斷（一句話）

gobaligo.id 有台灣繁中峇里島旅遊圈**最多的內容量和最好的地圖資產**，但因為三個技術失誤（Hotel schema 永遠不觸發、Pillar 文章無出站連結、全站孤兒頁面佔 99.9%），導致這些優勢被鎖在伺服器裡、Google 看不到、使用者也觸達不到。

修復這三個失誤不需要寫新文章，只需要修 2 個程式檔案和更新 1 個 JSON cache，預估 1–2 個工作天。

---

## Top 5 Quick Wins（一週內可完成）

### QW-1：修復 Hotel Schema — 1 小時，影響 79 篇
**問題**：`src/data/hotel-cache.json` 只有 `{"hotels":{}}` 0 筆資料，導致 79 篇住宿推薦文章的 Hotel rich result 完全失效。  
**動作**：
```bash
node scripts/fetch-hotel-data.mjs
```
確認輸出後 commit。加入月度 cron job。  
**預期效果**：79 篇住宿文章在 SERPs 顯示 Hotel rich snippet（星評 + 最低房價 + 評分），與 Klook/Agoda 同等級，CTR 預估提升 15–30%。  
**檔案**：`src/data/hotel-cache.json`（執行 script 自動更新）

---

### QW-2：修復終極指南的 0 outbound 連結 — 2 小時，影響全站 PageRank
**問題**：`src/content/blog/2026-05-17-050259.md`（峇里島終極指南）有 66 個入站連結但 **0 個出站連結**，是全站 PageRank 的黑洞。  
**動作**：在終極指南的以下段落插入對應文章連結：

| 段落位置 | 建議連結 | 建議 Anchor |
|---------|---------|------------|
| 換匯段落 | `/map/money-changer/` | 峇里島合法換匯所地圖 |
| ATM 段落 | `/map/atm/` | 峇里島 ATM 地圖 |
| 簽證段落 | `/blog/bali-official-visa-guide/` | 2026 峇里島入境完整指南 |
| 包車段落 | `/blog/668aaea7.../` | 峇里島包車推薦網友評鑑 |
| 烏布段落 | `/blog/655054b1.../` | 烏布完整攻略 |
| 住宿段落 | `/map/canggu-hotel/` 等三個住宿地圖 | 峇里島各區住宿地圖 |
| SIM卡段落 | `/blog/bali-sim-card/` | 峇里島 SIM 卡選購指南 |

目標：加入至少 20–30 個 outbound 連結，並把所有「這裡」anchor 改為描述性文字。  
**預期效果**：釋放終極指南累積的 PageRank，cluster 文章排名在 2–4 週內開始上升。  
**檔案**：`src/content/blog/2026-05-17-050259.md`

---

### QW-3：Restaurant / TouristAttraction Schema 分支 — 2 小時，影響 66 篇
**問題**：188 篇「美食景點活動」文章全部輸出 `LocalBusiness`，26 篇明確餐廳、40 篇明確景點應使用更具體 type。  
**動作**：修改 `src/components/SEO.astro` 第 275–295 行，加入標題關鍵字偵測邏輯（詳見階段 4 第 4-C 節完整程式碼）：

```typescript
const isRestaurant = /餐廳|咖啡廳|咖啡館|美食|料理|海鮮|燒烤|夜市|小吃|素食/.test(title);
const isAttraction = /景點|寺廟|瀑布|海灘|梯田|天空|森林|猴子|公園/.test(title);
```

**預期效果**：26 篇餐廳文章出現評分星星 rich snippet；40 篇景點文章觸發 TouristAttraction entity，強化 Google Knowledge Panel 關聯。  
**檔案**：`src/components/SEO.astro`（L275–295）

---

### QW-4：換匯所地圖連結 — 1 小時，強化獨家資產
**問題**：`/map/money-changer` 是競爭對手完全沒有的獨家武器，但全站 **202 篇換匯相關文章沒有一個連結指向這個地圖**（inbound = 0）。  
**動作**（優先處理這 5 篇，影響最大）：

| 檔案 | 插入位置 | Anchor Text |
|------|---------|-------------|
| `2026-05-17-050259.md`（終極指南） | 換匯段落 | `[峇里島合法換匯所地圖](/map/money-changer/)` |
| `65b5c7e2...md`（換匯懶人包） | 文章底部 CTA | `[立即查看換匯所位置](/map/money-changer/)` |
| `bali-travel-tips-guide` | 換匯注意事項段落 | `[換匯所地圖](/map/money-changer/)` |
| `bali-budget-tips-k-explained` | 兌換方式段落 | `[合法換匯所地圖與評分](/map/money-changer/)` |
| `bali-official-visa-guide` | 入境後須知段落 | `[峇里島換匯所地圖](/map/money-changer/)` |

**預期效果**：換匯所地圖從零 inbound 變為有流量導入，Google 開始理解這是一個重要工具頁，entity 強度提升。  
**檔案**：上述 5 篇 `.md` 文章

---

### QW-5：修復最高優先 Cluster 互連對 — 2 小時，影響 30 篇
**問題**：同主題文章互無連結（孤兒問題），修復成本極低。  
**動作**（優先處理這 5 對，每對加 1–2 個連結）：

| Cluster 對 | 動作 |
|-----------|------|
| `bali-drone-travel-guide` ↔ `bali-drone-regulations-guide` | 互加連結（10 分鐘） |
| `bali-best-time-to-visit` ↔ `2024-bali-festival-calendar` | 雙向加「另請參閱」 |
| `seminyak-eat-street-hotels-villas` ↔ `seminyak-eat-street-guide` | 完全互補，雙向連結 |
| `bali-travel-tips-guide` ↔ `bali-travel-health-tips` | A → B 在「旅行注意事項」加連結 |
| `2026-bali-trip-planning-guide` ↔ `bali-best-time-to-visit` | 行程規劃文章必然引用最佳時間 |

**預期效果**：30 篇文章互相傳遞 PageRank，cluster 整體排名上升。

---

## Top 5 Strategic Moves（一個月內完成）

### SM-1：建立 RelatedPosts 自動化元件（一次解決 693 篇孤兒問題）
**問題**：依依手動加連結需要修改 693 篇文章，不現實。  
**方案**：在 `src/layouts/BlogPost.astro` 的 `</article>` 後加入 RelatedPosts 元件，依 `category` + `tags` 匹配，自動在每篇文章底部顯示 3–5 篇相關文章。  
**效果**：全站平均每篇文章獲得 3–5 個 inbound 連結，孤兒頁面從 99.9% 降至接近 0%。  
**工時**：3–5 天（元件開發 + 測試 + build 驗證）  
**檔案**：`src/layouts/BlogPost.astro`、新建 `src/components/RelatedPosts.astro`

---

### SM-2：SIM 卡 Cluster 深度擴充（最大內容缺口）
**問題**：峇里島 SIM 卡是購買決策型高意圖關鍵字，我方 4 篇平均 1,766 字，對手 8–10 篇含品牌實測。  
**方案**：新建一篇旗艦文章「2026 峇里島 SIM 卡完整指南」（目標 3,500+ 字），包含：
  - Telkomsel / XL / Indosat / eSIM 四大品牌比較表（速度/覆蓋/價格）
  - 機場購買流程圖文教學（Ngurah Rai 機場）
  - iOS / Android eSIM 設定步驟（含截圖描述）
  - 各區域訊號測試結果
  - 常見問題 FAQ（10 個問題）

把現有 4 篇 SIM 卡文章作為 cluster 文章，連到新旗艦。  
**工時**：3–5 天（研究 + 寫作 + 格式化）  
**預期效果**：1–2 個月內搶下「峇里島 SIM 卡」台灣搜尋前三名

---

### SM-3：天空之門文章重建（438 字 → 3,500+ 字）
**問題**：`2021-01-14-64db6b72fd897800013a9475.md` 是全站最弱的高價值頁面：438 字、5 年未更新、無開放時間、無票價、無拍照技巧。  
**方案**：完整重寫為 3,500+ 字攻略，加入：
  - 開放時間、門票費用（2026 最新）
  - 拍照最佳時間（黃金小時、光線方向）
  - GPS 座標 + 地圖 embed
  - 交通方式（從各區前往時間）
  - TouristAttraction schema + GeoCoordinates
  - 加 `updated: "2026-05-xx"` frontmatter

**工時**：2–3 天  
**預期效果**：重獲「天空之門攻略」搜尋流量，這是峇里島單一景點搜尋量最高的關鍵字之一

---

### SM-4：地圖頁 Schema + 雙向連結建立（21 個地圖）
**問題**：21 個地圖頁無任何 Schema.org 結構化資料；地圖頁沒有連到相關文章；相關文章也沒有連到地圖（364 個漏連）。  
**方案**（兩件事分開做）：
  1. **Schema**：在 `src/pages/map/[area].astro` 加入 `Map` + `ItemList` JSON-LD（詳見階段 4 第 4-F 節程式碼），影響全部 21 個地圖頁。工時：1 天。
  2. **連結**：依階段 3 的 60 個具體三元組（文章→地圖連結），優先修復前 20 個（換匯所 + ATM + 素食 + 住宿地圖）。工時：2–3 天。

**預期效果**：地圖頁開始出現在搜尋結果；地圖作為獨家資產開始獲得自然流量；entity 關聯強化

---

### SM-5：Freshness 訊號系統性啟動（30 篇高優先）
**問題**：全站 0 篇有 `updated` 欄位，dateModified 永遠等於 datePublished，Google 看不到更新訊號。mimigo.tw 操作「2026 最新版」標題直接搶 CTR。  
**方案**：依階段 5 的 30 篇快贏清單，按序完成：
  1. `src/content/config.ts` 確認 `updated` 欄位存在
  2. 30 篇文章各加 `updated: "2026-05-xx"` frontmatter
  3. 19 篇「2024 標題」evergreen 文章升版到 2026
  4. 25 篇「2025 標題」evergreen 文章升版到 2026
  5. 每篇加一段 200 字「2026 最新更新」段落

**工時**：每篇 15–20 分鐘，30 篇合計約 8–10 小時（可分批完成）  
**預期效果**：dateModified 開始傳送更新訊號；標題年份與 mimigo 競爭；高流量文章重新獲得排名機會

---

## 明確 NO：不該做的事（避免浪費資源）

| ❌ 不做 | 理由 |
|--------|------|
| **不要大規模重構 URL 結構** | 693 篇文章的舊 URL 已有 inbound links，重構會造成巨量 404，代價遠超收益 |
| **不要一次修改所有 693 篇文章** | 手動修改效益低，用 RelatedPosts 元件一次性解決（SM-1），不要逐篇操作 |
| **不要在英文/印尼文/簡中內容投資** | 主戰場是 zh-TW，其他語系流量可忽略，資源要集中 |
| **不要開發 UGC 評論系統** | 開發成本高、內容品質難控制，現有 Google Maps 評分整合已足夠 |
| **不要購買外部連結** | 現有問題是「內部連結失效」不是「外部連結不足」，買外鏈效益極低 |
| **不要針對 mafengwo.cn 競爭** | mafengwo 主攻簡中市場，目標受眾不同，不在我方主戰場 |
| **不要建立社群媒體策略** | 社群訊號對 Google 排名幾乎無直接影響，與其經營 IG，不如把時間用在內容深度 |
| **不要用程式自動生成文章** | AI 批量文章會稀釋 E-E-A-T 訊號，Google HCU 後懲罰風險高，寧可深度少量 |
| **不要同時修改太多 Schema 類型** | Schema 修改後需要 Google Search Console 重新爬取驗證，一次改太多難以追蹤效果 |
| **不要把地圖換成第三方嵌入** | 自建地圖（`src/data/maps.ts`）是核心技術護城河，不要換成 Klook 或 Google Maps 嵌入 |

---

## 優先順序決策樹

```
本週（立刻做，不需寫新文章）：
  QW-1 → node scripts/fetch-hotel-data.mjs（1 小時）
  QW-3 → SEO.astro Restaurant/TouristAttraction 分支（2 小時）
  QW-4 → 5 篇最重要文章加換匯所地圖連結（1 小時）
  QW-5 → 5 對 cluster 文章互連（2 小時）
  QW-2 → 終極指南加 20–30 個 outbound 連結（2 小時）

第二週（結構性修復）：
  SM-1 → RelatedPosts 元件（3–5 天，一次解決全站孤兒問題）
  SM-4 → 地圖頁加 Map Schema（1 天）

第三到四週（內容深度）：
  SM-2 → SIM 卡旗艦文章（3–5 天）
  SM-3 → 天空之門完整重寫（2–3 天）
  SM-5 → 30 篇 Freshness 更新（分批，每天 2–3 篇）
```

---

## 資源投入 vs 預期效果矩陣

| 動作 | 工時 | 技術難度 | 預期排名影響 | 預期流量影響 |
|------|------|---------|------------|------------|
| Hotel cache 修復（QW-1） | 1 小時 | 低 | ★★★★★ | ★★★★★ |
| 終極指南 outbound 連結（QW-2） | 2 小時 | 低 | ★★★★★ | ★★★★☆ |
| Restaurant Schema（QW-3） | 2 小時 | 中 | ★★★★☆ | ★★★☆☆ |
| 換匯所地圖連結（QW-4） | 1 小時 | 低 | ★★★☆☆ | ★★★★☆ |
| Cluster 互連（QW-5） | 2 小時 | 低 | ★★★★☆ | ★★★☆☆ |
| RelatedPosts 元件（SM-1） | 3–5 天 | 中高 | ★★★★★ | ★★★★★ |
| SIM 卡旗艦文（SM-2） | 3–5 天 | 低（寫作） | ★★★★★ | ★★★★★ |
| 天空之門重寫（SM-3） | 2–3 天 | 低（寫作） | ★★★★★ | ★★★★☆ |
| 地圖頁 Schema（SM-4） | 1 天 | 中 | ★★★☆☆ | ★★★☆☆ |
| Freshness 30 篇（SM-5） | 8–10 小時 | 低 | ★★★★☆ | ★★★★☆ |

---

## 審計報告檔案索引

| 階段 | 檔案 | 核心發現 |
|------|------|---------|
| 0 | `00_executive_summary.md` | 本文件 |
| 1 | `01_inventory.md` | 693 篇文章、753 個 tag、21 個地圖頁全盤清點 |
| 2 | `02_topic_clusters.md` | 672/693 孤兒頁面；終極指南 0 outbound links |
| 3 | `03_entity_linking.md` | 364 個地圖漏連；換匯所地圖 202 個漏連 |
| 4 | `04_schema_gaps.md` | Hotel cache 空檔 + 6 種 Schema gap + 完整修復程式碼 |
| 5 | `05_freshness_quickwins.md` | 0 篇有 updated 欄位；30 篇優先更新清單 |
| 6 | `06_internal_linking.md` | 186 個籠統 anchor；15 對未互連 cluster 文章 |
| 7 | `07_competitive_gaps.md` | 13 個主題對比矩陣；SIM 卡與天空之門最大缺口 |
