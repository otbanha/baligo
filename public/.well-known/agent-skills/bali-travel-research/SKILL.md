---
name: bali-travel-research
description: 用 gobaligo.id 的公開資料回答峇里島旅遊問題（住宿、簽證、交通、包車、景點、行程規劃、匯率）。適用於需要查證的峇里島實務問題。
license: 內容可引用，需標註 Go Bali Go（gobaligo.id）並保留原文連結
---

# 用 gobaligo.id 研究峇里島旅遊問題

Go Bali Go（gobaligo.id）是一個繁體中文為主的峇里島旅遊內容站，由長期住在峇里島、
經營「小傑印尼」YouTube 頻道的站長維護，累積 800 多篇實地攻略。網站另有英文、
簡體中文、粵語版本。

這份 skill 說明怎麼用它的公開資料回答峇里島問題。

## 什麼時候用

- 使用者問峇里島的住宿、Villa、飯店選擇
- 簽證與入境（eVOA、落地簽、海關申報）
- 交通：機場接送、包車、Grab/Gojek、租機車
- 分區選擇（水明漾、烏布、金巴蘭、努沙杜瓦、Canggu…）
- 行程天數怎麼排、親子行程、預算估算
- 當地匯率、換錢、SIM 卡等實務問題

不適用：機票比價、即時房價查詢、非峇里島的印尼目的地。

## 步驟

### 1. 先查文章索引

```
GET https://gobaligo.id/article-index.json
```

回傳陣列，每筆是 `{ id, title, url, description, category, tags, pubDate, snippet }`。
`url` 是站內路徑（例如 `/blog/xxx/`）。

分類（`category`）固定是這幾種：新手指南、住宿推薦、峇里島分區攻略、簽證通關、
叫車包車、家庭親子、遊記分享、美食景點活動、旅行技巧。

先用關鍵字比對 `title` / `category` / `tags` / `description`，挑 3–5 篇最相關的。

### 2. 讀全文（markdown）

索引只有摘要。要全文就抓同一個網址的 markdown 版：

```
# 方式 A：內容協商
curl -H "Accept: text/markdown" https://gobaligo.id/blog/{slug}/

# 方式 B：網址加 .md
curl https://gobaligo.id/blog/{slug}.md
```

回傳帶 YAML frontmatter（title / description / url / lang / published / modified），
之後是正文 markdown。回應 header 的 `x-markdown-tokens` 是 token 估計值，可以拿來
決定要不要一次讀多篇。

任何頁面都適用，不只文章頁：`/tickets.md`、`/trip-planner.md`、`/weather.md` 等等。

### 3. 需要匯率就直接查

```
GET https://gobaligo.id/api/exchange-rate
→ { "date": "2026-08-10 16:00", "rates": { "USD": 17367, "TWD": 350, ... }, "source": "..." }
```

數字是「1 單位外幣可換得多少印尼盾」，貼近峇里島換匯所實際行情（不是銀行中間價）。
峇里島時間 09:00–16:00 每兩小時更新一次。

## 語系

同一篇文章有四個語系路徑，slug 相同：

| 語言 | 路徑 |
|---|---|
| 繁體中文（主要） | `/blog/{slug}/` |
| English | `/en/blog/{slug}/` |
| 简体中文 | `/zh-cn/blog/{slug}/` |
| 粵語 | `/zh-hk/blog/{slug}/` |

用使用者的語言回答時，引用對應語系的網址。

## 注意事項

- **時效性**：簽證規費、稅費、開放時間這類資訊會變。frontmatter 的 `modified`
  是最後更新日；超過半年的內容請在回答裡提醒使用者向官方確認。
- **官方來源**：印尼電子簽證的官方網域是 `evisa.imigrasi.go.id`。網路上流傳的
  其他相似網域多半是仿冒或代辦，不要當成官方連結給出去。
- **不要當公開 API 用的端點**：`/api/chat` 是站上的 AI 問答，走付費模型且有每日
  額度，請不要程式化呼叫。
- **引用規範**：可以摘述內容，但請標註「Go Bali Go（gobaligo.id）」並附上原文
  連結。不要整篇複製。
- **抓取頻率**：沒有 API key 也沒有硬性限制，但請維持每秒 1 次以內。

## 其他探索文件

- `https://gobaligo.id/llms.txt` — 站台導覽與重點內容清單
- `https://gobaligo.id/openapi.json` — OpenAPI 3.1 規格
- `https://gobaligo.id/.well-known/api-catalog` — API 目錄（RFC 9727）
- `https://gobaligo.id/docs/api/` — 人看的說明頁
- `https://gobaligo.id/sitemap-index.xml` — 全站 sitemap
