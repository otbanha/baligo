# 階段 6：內部連結密度與 Anchor Text 健康度

> 審計日期：2026-05-18

---

## 6-A. 全站內部連結密度

| 指標 | 數值 |
|------|------|
| 每篇文章平均 outbound 內部連結 | **3.6 個** |
| 零 outbound 連結的文章 | **271 篇**（39%） |
| 只有 1–2 個 outbound 連結的文章 | **186 篇**（27%） |
| 20 個以上 outbound 連結的文章 | **20 篇**（3%，集中在少數攻略） |
| 最高單篇 outbound 連結數 | **46 個** |
| 零 inbound 連結（孤兒頁面） | **692 篇**（99.9%） |
| 10 個以上 inbound 連結 | **1 篇** |

**核心問題**：全站 693 篇文章中，只有 1 篇有 10 個以上入站連結。這意味著 PageRank 幾乎無法在站內流動，每篇文章必須靠 Google 獨立索引、獨立競爭，等同於 693 個獨立小網站拼在一起。

對標 kimiyo.tw：每個分區攻略頁平均有 15–20 個來自 cluster 文章的入站連結，每個 cluster 文章再互相交叉連結 5–8 個。

---

## 6-B. Anchor Text 健康度

### 內部連結 Anchor Text（前 30）

| 次數 | Anchor Text | 評估 |
|------|------------|------|
| 105 | 「**這裡**」 | 🔴 極度籠統，Google 看不出連結目的 |
| 61 | 「**請點擊這裡**」 | 🔴 籠統 |
| 53 | 「點這裡閱讀『2026峇里島自由行終極指南』」 | 🟡 可接受但 53 次同一錨點過多 |
| 44 | 「如何寫一篇精彩的峇里島遊記」 | ✅ 描述性 |
| 22 | 「【峇里島 - Nusa Penida 佩尼達島全攻略】…」 | ✅ 完整標題錨點 |
| 20 | 「**請看這裡**」 | 🔴 籠統 |
| 17 | 「烏魯瓦圖攻略」 | ✅ 可接受 |
| 16 | 「金巴蘭攻略」 | ✅ 可接受 |
| 15 | 「峇里島包車自由行全攻略 - 費用、預訂方式…」 | ✅ 描述性 |

**問題一覽**：
- 「這裡」105 次 + 「請點擊這裡」61 次 + 「請看這裡」20 次 = **186 次籠統 anchor**
- 這 186 個 anchor 指向不同頁面，Google 無法從 anchor text 判斷目標頁面的主題

### 外部連結 Anchor Text（Agoda / Klook / Booking 等）

| 次數 | Anchor Text | 評估 |
|------|------------|------|
| 62 | 「**Klook優惠**」 | 🔴 籠統，所有活動都用同一錨點 |
| 45 | 「**Agoda優惠價**」 | 🔴 籠統 |
| 35 | 「找峇里島住宿請看這裡」 | 🟡 半籠統 |
| 34 | 「**Agoda訂房**」 | 🔴 籠統 |
| 31 | 「**空房 & 房價查詢**」 | 🔴 籠統 |
| 22 | 「**Agoda**」 | 🔴 品牌名當 anchor |
| 16 | 「**這裡**」 | 🔴 籠統 |
| 14 | 「Agoda空房查詢&預訂」 | 🟡 半籠統 |

**外部連結問題**：雖然外部 anchor text 對自身 SEO 影響有限，但對使用者體驗和 CTR（聯盟行銷點擊率）有影響。「Klook優惠」62 次沒有告訴使用者買什麼活動，轉換率必然偏低。

---

## 6-C. 孤兒頁面問題拆解

總計 672 篇孤兒頁面，依類型分析：

| 類型 | 孤兒數量 | 特性 | 建議 |
|------|---------|------|------|
| 每日新聞（`新聞存檔`） | ~150 篇 | 時效性強、無須 hub 連結 | 建立「新聞彙整」月報 Pillar |
| 單一住宿評測 | ~80 篇 | 散落、應由各區住宿攻略 hub 連入 | 加到對應區域住宿 Pillar |
| 旅行技巧（長尾） | ~100 篇 | 各主題孤立、應互連 | 每篇加「相關閱讀」3 個連結 |
| 遊記分享 | ~90 篇 | 本質孤立，但可從 cluster 文章連入 | 在分區攻略底部加「讀者遊記」 |
| 景點 / 活動評測 | ~80 篇 | 應連到分區攻略 Pillar | 建立從 Pillar 到評測的連結 |
| 2025–2026 新文章 | ~150 篇 | 新文章未被舊文章連到（最可惜） | 在終極指南等 hub 加連結 |

---

## 6-D. 最應優先修復的同 Cluster 未互連文章對

### 同 cluster 高價值未互連對（前 15）

以下文章在同一主題群組，且互相沒有連結，修復成本極低（在其中一篇加一個連結即可）：

| # | 文章 A | 文章 B | 建議方向 |
|---|--------|--------|---------|
| 1 | `bali-travel-tips-guide`<br>（峇里島旅遊攻略：換匯/交通/購物） | `bali-travel-health-tips`<br>（腹瀉/飲水健康指南） | A → B：在「旅行注意事項」段落加連結 |
| 2 | `bali-travel-tips-guide` | `bali-budget-tips-k-explained`<br>（預算/印尼盾K的說明） | A → B：在「費用」段落加連結 |
| 3 | `bali-travel-tips-guide` | `bali-travel-essentials`<br>（旅行要帶什麼21項） | A → B：在「出發準備」段落加連結 |
| 4 | `bali-best-time-to-visit`<br>（最佳旅遊時間/乾季雨季） | `2024-bali-festival-calendar`<br>（節慶完整指南） | 雙向互連：季節攻略 ↔ 節慶指南 |
| 5 | `bali-voltage-adapter-tips`<br>（電壓插頭攻略） | `bali-travel-health-tips`<br>（健康/飲水/腸胃） | 同屬「出發必知」cluster，雙向互連 |
| 6 | `bali-drone-travel-guide`<br>（能帶無人機嗎？） | `bali-drone-regulations-guide`<br>（無人機飛行規定） | 完全互補：A → B 加「詳細規定請看這裡」|
| 7 | `bali-travel-money-saving-tips`<br>（19個省錢秘訣） | `bali-budget-tips-k-explained`<br>（預算/印尼盾K） | 雙向互連：預算攻略 ↔ 省錢技巧 |
| 8 | `2026-bali-trip-planning-guide`<br>（7步驟規劃旅程） | `bali-best-time-to-visit`<br>（最佳旅遊時間） | 規劃旅程文章必然需要引用最佳時間 |
| 9 | `2025-bali-nyepi-day-guide`<br>（寧靜日攻略） | `2024-bali-festival-calendar`<br>（節慶完整指南） | 寧靜日是節慶指南的子項目 |
| 10 | `bali-travel-insurance-guide`<br>（旅遊保險指南） | `bali-travel-health-tips`<br>（腸胃/健康指南） | 「生病時需要保險」是自然連結點 |
| 11 | `seminyak-eat-street-hotels-villas`<br>（Eat Street 走路到住宿） | `seminyak-eat-street-guide`<br>（50+ Eat Street 美食攻略） | 完全互補、應雙向連結 |
| 12 | `bali-official-visa-guide`<br>（2026 入境指南） | `2026-bali-trip-planning-guide`<br>（7步驟規劃旅程） | 行程規劃必含簽證資訊 |
| 13 | `bali-family-travel-guide-2`<br>（親子全攻略） | `bali-travel-insurance-guide`<br>（旅遊保險） | 帶小孩出發必需保險 |
| 14 | `Jas-Green-Villas-and-Spa`<br>（水明漾 Villa 評測） | `seminyak-eat-street-hotels-villas`<br>（Eat Street 住宿推薦） | 同區域住宿、互相引流 |
| 15 | `2026-kuta-upgrade`<br>（庫塔交通升級） | `bali-travel-tips-guide`<br>（峇里島交通整體攻略） | 最新交通資訊與整體攻略互補 |

---

## 6-E. 籠統 Anchor Text 修復清單（最高優先 20 個）

搜尋「這裡」「請點擊這裡」「請看這裡」後替換為描述性錨點：

### 「這裡」（105 次）替換建議

| 原本 Anchor | 指向什麼 | 建議 Anchor |
|------------|---------|------------|
| `[這裡](/blog/bali-ultimate-guide-2026/)` | 終極指南 | `[2026峇里島自由行終極指南](/blog/bali-ultimate-guide-2026/)` |
| `[這裡](/map/money-changer/)` | 換匯所地圖 | `[峇里島合法換匯所地圖](/map/money-changer/)` |
| `[這裡](/map/atm/)` | ATM 地圖 | `[峇里島 ATM 地圖](/map/atm/)` |
| `[請看這裡](/blog/...)` | 住宿攻略 | `[峇里島住宿推薦指南](/blog/...)` |
| `[點這裡](/blog/...)` | 各類文章 | 改為文章標題或關鍵描述 |

### 外部連結 Anchor 改善範例

| 原本 | 改為 |
|------|------|
| `[Klook優惠](klook.com/...)` | `[峇里島水上活動 Klook 預約](/klook.com/...)` |
| `[Agoda優惠價](agoda.com/...)` | `[AYANA Resort 最低房價](/agoda.com/...)` |
| `[空房 & 房價查詢](agoda.com/...)` | `[查看 Padma Ubud 空房](agoda.com/...)` |

---

## 6-F. 建議優先修復動作

### 立即可做（每個 < 30 分鐘）

1. **終極指南加 20 個 outbound 連結**  
   `src/content/blog/2026-05-17-050259.md`  
   按 topic cluster 各加 2–3 個 outbound 連結（換匯/ATM/簽證/包車/住宿各一），同時修改所有「這裡」anchor 為描述性文字。

2. **無人機兩篇互連**  
   `bali-drone-travel-guide` ↔ `bali-drone-regulations-guide`  
   互加一個連結，10 分鐘搞定，這是最乾淨的 cluster pair。

3. **季節 ↔ 節慶雙向連結**  
   `bali-best-time-to-visit` ↔ `2024-bali-festival-calendar`  
   自然的相互補充，各加一段「另請參閱」。

4. **Eat Street 住宿 ↔ Eat Street 美食攻略互連**  
   `seminyak-eat-street-hotels-villas` ↔ `seminyak-eat-street-guide`  
   同一地點的兩個維度，互連對使用者最有幫助。

5. **批次替換 186 個籠統 anchor**  
   用全站 find-and-replace 策略，把「\[這裡\]」「\[請點擊這裡\]」「\[請看這裡\]」改為描述性文字。  
   可寫一個腳本批次掃出所有實例，人工確認後替換。

---

## 6-G. 建議：每篇文章加入「延伸閱讀」區塊

參考 kimiyo.tw 的做法，在每篇文章底部加入 3–5 個同 cluster 延伸閱讀連結。  
在 `src/layouts/BlogPost.astro` 中加入自動化的「相關文章」元件（依 category 和 tag 匹配），  
可一次解決全站內部連結密度問題，不需要手動修改 693 篇文章。

**建議修改檔案**：`src/layouts/BlogPost.astro`（在 `</article>` 後加入 RelatedPosts 元件）

---

*下一步：請確認後說「繼續階段 7」以進入競爭對手覆蓋對比分析（最後一個階段）。*
