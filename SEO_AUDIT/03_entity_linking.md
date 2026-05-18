# 階段 3：地圖 ↔ 文章 Entity Linking 審計

> 審計日期：2026-05-18  
> 掃描範圍：src/content/blog/ 全部 693 篇

---

## 3-A. 總體漏連統計

| 地圖 | 漏連文章數 | 地圖 URL |
|------|-----------|---------|
| 峇里島合法換匯所 | **202** | `/map/money-changer/` |
| 醫院 / 診所 | **63** | `/map/hospital/` |
| 素食餐廳 | **39** | `/map/vegetarian/` |
| ATM 提款機 | **22** | `/map/atm/` |
| 水明漾 Eat Street | **14** | `/map/seminyak-eat-street/` |
| 烏布 Villa | **11** | `/map/ubud-villa/` |
| 水明漾住宿 | **9** | `/map/seminyak-hotel/` |
| 長谷住宿 | **3** | `/map/canggu-hotel/` |
| 水明漾區域地圖 | **1** | `/map/seminyak/` |
| **合計** | **364** | |

**關鍵發現**：全站 364 個「應連未連」的 entity link 機會，其中換錢地圖漏連 202 次，是最大的單一缺口。

---

## 3-B. 地圖頁反向連結現況

**所有地圖頁（`src/pages/map/`）均未連回任何部落格文章。**

- `index.astro`：0 blog links
- `[area].astro`：0 blog links
- `favorites.astro`：0 blog links
- `gojek-fare.astro`：0 blog links
- `itinerary.astro`：0 blog links
- `src/data/maps.ts`：0 blog references

地圖頁是孤立的終端頁面，進入後無法導回相關文章，削弱了 entity graph 的雙向關聯。

---

## 3-C. 前 60 個漏連三元組（優先修復清單）

> 格式：`(檔案路徑, 應插入連結, 建議 anchor text)`

### 換錢換匯 → `/map/money-changer/`（優先前 20）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 1 | `src/content/blog/2024-01-28-65b5c7e2fd89780001e96fac.md` | 換錢 | 換錢懶人包文章的「去哪裡換錢」段落後 → `[峇里島合法換匯所地圖](/map/money-changer/)` |
| 2 | `src/content/blog/2024-02-01-65b60902fd89780001ec8bb1.md` | 換匯 | 32項新手攻略第12項換匯段落 → `[查看換匯所地圖](/map/money-changer/)` |
| 3 | `src/content/blog/2025-01-07-672e2c1afd897800014c3fbc.md` | 換匯 | 41個問題中換錢相關問答後 → `[峇里島合法換匯所地圖](/map/money-changer/)` |
| 4 | `src/content/blog/2023-02-12-64db6b7efd897800013a9821.md` | 換錢 | 21項必備物品文章換錢建議後 → `[換匯所位置地圖](/map/money-changer/)` |
| 5 | `src/content/blog/2023-08-25-64e1eb78fd897800017d0ec7.md` | 換匯 | 19個省錢秘訣「聰明換匯」段落 → `[峇里島合法換匯所地圖](/map/money-changer/)` |
| 6 | `src/content/blog/2025-05-10-681ec22ffd8978000141bf8f.md` | 換錢詐騙 | 換錢詐騙指南全文 → `[查看合法換匯所地圖，避免踩雷](/map/money-changer/)` |
| 7 | `src/content/blog/2024-01-12-65a0a163fd8978000115f37a.md` | 換匯 | 包車攻略「安心換匯辦SIM卡」段落 → `[換匯所地圖](/map/money-changer/)` |
| 8 | `src/content/blog/2024-01-04-6596cae5fd89780001f43bff.md` | 印尼盾 | 自動通關文章底部 → `[換匯所地圖](/map/money-changer/)` |
| 9 | `src/content/blog/2024-03-19-65f8dca4fd89780001b57754.md` | 換錢 | 旅遊禁忌文章換錢段落 → `[合法換匯所地圖](/map/money-changer/)` |
| 10 | `src/content/blog/2024-05-01-663261fdfd89780001f490fc.md` | 換匯 | 匯率/大鈔小鈔攻略文章 → `[換匯所位置地圖](/map/money-changer/)` |
| 11 | `src/content/blog/2025-08-13-689c380bfd8978000178bb5e.md` | 換匯 | 換匯方式比較文章 → `[峇里島合法換匯所地圖](/map/money-changer/)` |
| 12 | `src/content/blog/2023-11-17-655054b1fd897800011d4d2c.md` | 印尼盾 | 烏布完整攻略（全站最多入站連結文章之一）→ `[換匯所地圖](/map/money-changer/)` |
| 13 | `src/content/blog/2023-02-11-64db6b7efd897800013a9815.md` | 換匯 | 長谷攻略 100 選（高流量）→ `[換匯所地圖](/map/money-changer/)` |
| 14 | `src/content/blog/2024-02-11-65bf2f75fd89780001dbf162.md` | 印尼盾 | 沙努爾50項攻略（高流量）→ `[換匯所地圖](/map/money-changer/)` |
| 15 | `src/content/blog/2024-01-28-65b51f59fd89780001e498d4.md` | 換匯 | 六日自由行攻略「換匯」段落 → `[換匯所地圖](/map/money-changer/)` |
| 16 | `src/content/blog/2026-05-17-050259.md` | 換錢 | **終極指南**（全站最多引用）→ `[峇里島合法換匯所地圖](/map/money-changer/)` |
| 17 | `src/content/blog/2024-01-22-65adf238fd89780001a798ea.md` | 印尼盾 | 租摩托車攻略費用段落 → `[換匯所地圖](/map/money-changer/)` |
| 18 | `src/content/blog/2024-10-20-6714c06cfd8978000116322a.md` | 換錢 | 18個不踩雷攻略換錢段落 → `[換匯所地圖](/map/money-changer/)` |
| 19 | `src/content/blog/2024-08-21-66c3e440fd897800014425a8.md` | 換匯 | 沙努爾住宿推薦文章 → `[換匯所地圖](/map/money-changer/)` |
| 20 | `src/content/blog/2022-12-05-64db6b7dfd897800013a9767.md` | 換匯 | 舊版峇里島旅遊攻略（被引用多次）→ `[換匯所地圖](/map/money-changer/)` |

### ATM 提款機 → `/map/atm/`（優先前 10）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 21 | `src/content/blog/2025-05-09-681e03f8fd89780001228bf8.md` | ATM | 信用卡盜刷指南 ATM 安全段落 → `[峇里島安全 ATM 地圖](/map/atm/)` |
| 22 | `src/content/blog/2025-05-10-681ec22ffd8978000141bf8f.md` | ATM | 換錢詐騙文章 ATM 提領段落 → `[ATM 位置地圖](/map/atm/)` |
| 23 | `src/content/blog/2024-09-13-66ac90cbfd89780001db4d0e.md` | 提款機 | Finns Beach Club 文章「場內有提款機」→ `[附近 ATM 地圖](/map/atm/)` |
| 24 | `src/content/blog/2024-10-13-670b5191fd8978000185cf37.md` | ATM | Gojek/GoPay 教學 ATM 儲值段落 → `[ATM 地圖](/map/atm/)` |
| 25 | `src/content/blog/2025-06-23-68578b01fd89780001dd5208.md` | ATM | Amed/Tulamben 攻略「ATM 稀少」提示 → `[峇里島 ATM 地圖（事前確認位置）](/map/atm/)` |
| 26 | `src/content/blog/2024-10-23-66adfb9afd89780001f62df1.md` | ATM | 藍夢島攻略「攜帶現金」段落 → `[ATM 地圖](/map/atm/)` |
| 27 | `src/content/blog/2024-01-27-65b32e1ffd8978000170519b.md` | ATM | 旅遊健康/腸胃炎文章費用段落 → `[ATM 地圖](/map/atm/)` |
| 28 | `src/content/blog/2024-08-07-66b20b15fd89780001ceef6b.md` | 提款機 | 長谷住宿攻略設施描述 → `[長谷 ATM 位置](/map/atm/)` |
| 29 | `src/content/blog/2024-07-20-669b1d59fd89780001def381.md` | ATM | 水明漾一日遊攻略 → `[ATM 地圖](/map/atm/)` |
| 30 | `src/content/blog/2023-08-16-64dcae12fd897800015a06a3.md` | ATM | 旅遊購物指南 GoPay 儲值段落 → `[ATM 地圖](/map/atm/)` |

### 醫院 / 診所 → `/map/hospital/`（優先前 10）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 31 | `src/content/blog/2024-01-27-65b32e1ffd8978000170519b.md` | 藥局 | 腸胃炎文章「藥局購買Entrostop」→ `[峇里島醫院診所地圖](/map/hospital/)` |
| 32 | `src/content/blog/2024-03-22-65fcd4a5fd89780001513c9a.md` | 醫療 | 必備藥品文章就醫段落 → `[醫院診所地圖](/map/hospital/)` |
| 33 | `src/content/blog/2024-07-06-66889dfafd897800017af05e.md` | 醫院 | 旅遊保險重要性文章急診段落 → `[峇里島醫院地圖](/map/hospital/)` |
| 34 | `src/content/blog/2023-11-29-655a0f5bfd89780001a49e07.md` | 醫療機構 | 帶長輩旅行應急準備段落 → `[醫院診所地圖](/map/hospital/)` |
| 35 | `src/content/blog/2025-07-29-68872b9efd89780001398120.md` | 醫療 | 安全旅遊指南 → `[峇里島醫院診所地圖](/map/hospital/)` |
| 36 | `src/content/blog/2024-08-21-66c5f07efd8978000106373e.md` | 就醫 | Mpox 入境新規「出現症狀應就醫」→ `[最近的醫院診所](/map/hospital/)` |
| 37 | `src/content/blog/2024-08-25-66c9649bfd89780001519292.md` | 醫院 | 猴痘注意事項文章 → `[峇里島醫院地圖](/map/hospital/)` |
| 38 | `src/content/blog/2024-02-01-65b60902fd89780001ec8bb1.md` | 醫療 | 32項新手攻略「健康和醫療保」段落 → `[醫院診所地圖](/map/hospital/)` |
| 39 | `src/content/blog/2024-01-30-65b6ef65fd89780001f5d032.md` | 醫療保障 | ATV 越野車文章安全段落 → `[醫院地圖](/map/hospital/)` |
| 40 | `src/content/blog/2024-08-21-66c3e440fd897800014425a8.md` | 醫療 | 沙努爾住宿推薦「醫療特區」提及 → `[醫院診所地圖](/map/hospital/)` |

### 素食 → `/map/vegetarian/`（優先前 8）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 41 | `src/content/blog/2023-11-17-655054b1fd897800011d4d2c.md` | 素食 | 烏布完整攻略（高流量）→ `[峇里島素食餐廳 Top 26 地圖](/map/vegetarian/)` |
| 42 | `src/content/blog/2024-02-11-65bf2f75fd89780001dbf162.md` | 素食 | 沙努爾攻略（高流量）→ `[素食餐廳地圖](/map/vegetarian/)` |
| 43 | `src/content/blog/2023-02-11-64db6b7efd897800013a9815.md` | vegan | 長谷攻略 100 選 → `[素食餐廳地圖](/map/vegetarian/)` |
| 44 | `src/content/blog/2025-05-10-681ed810fd89780001472eb1.md` | 素食 | 10大印尼美食指南 → `[素食友善餐廳地圖](/map/vegetarian/)` |
| 45 | `src/content/blog/2024-09-07-66db8b20fd89780001a4e7f6.md` | 素食地圖 | 素食地圖文章本身 → 已有但應加強 `[素食餐廳互動地圖](/map/vegetarian/)` |
| 46 | `src/content/blog/2026-02-07-6986c5c0fd897800017582f6.md` | 素食 | 烏布頌缽療癒文章 → `[烏布附近素食餐廳地圖](/map/vegetarian/)` |
| 47 | `src/content/blog/2024-12-17-674bb924fd8978000120ac11.md` | 素食 | 烏布親子六天遊記 → `[素食餐廳地圖](/map/vegetarian/)` |
| 48 | `src/content/blog/2023-07-19-64db6b82fd897800013a995f.md` | 素食 | 烏布瀑布攻略文章 → `[峇里島素食地圖](/map/vegetarian/)` |

### 水明漾 Eat Street → `/map/seminyak-eat-street/`（優先前 6）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 49 | `src/content/blog/2023-08-15-64db7fc2fd897800013d367c.md` | Eat Street | 水明漾攻略 100 選（高流量）→ `[Eat Street 餐廳完整地圖](/map/seminyak-eat-street/)` |
| 50 | `src/content/blog/2024-07-20-669b1d59fd89780001def381.md` | Eat Street | 水明漾一日遊攻略 → `[Eat Street 地圖](/map/seminyak-eat-street/)` |
| 51 | `src/content/blog/2025-06-05-68426fb0fd89780001fdf78d.md` | Eat Street | 水明漾相關文章 → `[Eat Street 餐廳地圖](/map/seminyak-eat-street/)` |
| 52 | `src/content/blog/2025-09-30-66f01b39fd8978000101fdda.md` | Kayu Aya | 水明漾美食文章 → `[Jalan Kayu Aya 完整餐廳地圖](/map/seminyak-eat-street/)` |
| 53 | `src/content/blog/2026-02-24-65839fbafd89780001e876b5.md` | Eat Street | 住宿指南文章提及水明漾 → `[Eat Street 地圖](/map/seminyak-eat-street/)` |
| 54 | `src/content/blog/2024-09-01-66d3cdf7fd89780001bc1bcd.md` | Eat Street | 水明漾美食相關文章 → `[Eat Street 餐廳地圖](/map/seminyak-eat-street/)` |

### 烏布 Villa → `/map/ubud-villa/`（優先前 6）

| # | 檔案路徑 | 觸發詞 | 建議插入位置 / anchor |
|---|---------|--------|----------------------|
| 55 | `src/content/blog/2024-02-20-65d21157fd897800013be576.md` | 烏布 Villa | 烏布住宿推薦 30 間攻略 → `[烏布 Villa 互動地圖](/map/ubud-villa/)` |
| 56 | `src/content/blog/2023-11-17-655054b1fd897800011d4d2c.md` | 烏布 Villa | 烏布完整攻略（高流量）→ `[烏布 Villa 地圖](/map/ubud-villa/)` |
| 57 | `src/content/blog/2024-08-09-66b41018fd89780001f96fc3.md` | Ubud Villa | 私人別墅推薦大全 → `[烏布 Villa 地圖](/map/ubud-villa/)` |
| 58 | `src/content/blog/2025-03-26-67e42ae0fd89780001d2a5e8.md` | 烏布 Villa | 烏布住宿相關文章 → `[烏布 Villa 地圖](/map/ubud-villa/)` |
| 59 | `src/content/blog/2026-02-07-6986c5c0fd897800017582f6.md` | 烏布精品 | 頌缽療癒文章 → `[烏布 Villa 地圖](/map/ubud-villa/)` |
| 60 | `src/content/blog/2024-12-17-674bb924fd8978000120ac11.md` | 烏布 Villa | 親子六天遊記 → `[烏布 Villa 地圖](/map/ubud-villa/)` |

---

## 3-D. 地圖頁 → 部落格文章（反向連結）缺口

目前所有地圖頁均無連回部落格文章。建議在每個主題地圖頁加入「相關攻略」區塊：

| 地圖 | 應連回的文章 |
|------|------------|
| `/map/money-changer/` | `2024-01-28-65b5c7e2fd89780001e96fac.md`（換匯懶人包）、`2025-05-10-681ec22ffd8978000141bf8f.md`（換錢詐騙指南） |
| `/map/atm/` | `2025-05-09-681e03f8fd89780001228bf8.md`（信用卡安全）、換匯懶人包 |
| `/map/hospital/` | `2024-01-27-65b32e1ffd8978000170519b.md`（腸胃炎指南）、`2024-03-22-65fcd4a5fd89780001513c9a.md`（必備藥品） |
| `/map/vegetarian/` | `2024-09-07-66db8b20fd89780001a4e7f6.md`（素食地圖文章）、烏布攻略 |
| `/map/seminyak-eat-street/` | `2026-05-06-135742.md`（Eat Street 攻略）、水明漾一日遊 |
| `/map/ubud-villa/` | `2024-02-20-65d21157fd897800013be576.md`（烏布住宿30間）、烏布完整攻略 |
| `/map/canggu-hotel/` | `2024-08-07-66b20b15fd89780001ceef6b.md`（長谷住宿16間）、長谷攻略 |
| `/map/seminyak-hotel/` | `2023-08-19-64e063fafd8978000123ea12.md`（水明漾平價住宿）、水明漾攻略 |

---

## 3-E. 修復優先順序建議

### 最高優先（5 分鐘可完成，影響大）

1. **`src/content/blog/2026-05-17-050259.md`（終極指南）**  
   全站入站最多（66篇引用），但內文無任何地圖連結。  
   應插入：換匯所、ATM、醫院、素食餐廳等 4 個地圖連結。

2. **`src/content/blog/2024-01-28-65b5c7e2fd89780001e96fac.md`（換匯懶人包）**  
   換錢主題文章竟然沒連到換匯所地圖，這是最明顯的 entity 漏洞。  
   應插入：`[查看峇里島合法換匯所地圖](/map/money-changer/)`

3. **`src/content/blog/2023-11-17-655054b1fd897800011d4d2c.md`（烏布完整攻略）**  
   全站被引用第一的文章（93次），觸發素食、換匯、ATM、烏布Villa 4個漏連。  
   每加一個地圖連結 = 為地圖頁注入高 PageRank。

4. **`src/content/blog/2023-02-11-64db6b7efd897800013a9815.md`（長谷攻略100選）**  
   高流量文章，觸發 ATM、換匯、素食 3 個漏連。

5. **`src/content/blog/2024-02-11-65bf2f75fd89780001dbf162.md`（沙努爾攻略50項）**  
   高流量文章，觸發換匯、ATM、素食、醫療 4 個漏連。

---

*下一步：請確認後說「繼續階段 4」以進入 Schema.org 升級清單分析。*
