# 聯盟行銷變更記錄

記錄會影響分潤歸屬的變更，以及當時的觀察。目的是讓「點擊數 / 訂房數」的變化
能對得上是哪一次改動造成的——沒有時間點就只能猜。

新的變更請加在最上面。時間一律標時區，並附上 UTC 與 epoch ms，方便直接丟進
D1 查詢（`affiliate_clicks.created_at` 存的是 `Date.now()`，單位毫秒）。

---

## 2026-07-25 09:00 GMT+7 — 停用 Drive 對 Agoda / Trip.com 的 link switching

- UTC：`2026-07-25T02:00:00Z`
- epoch ms：`1784944800000`
- 執行者：站主（Travelpayouts 後台設定）

**背景**：Travelpayouts 後台的點擊數從 7/1 的約 550/日 一路漲到 7/25 的約
1,400/日，但訂房數是 0。25 天累積約 25,000 次點擊、0 筆成交，這個量級不是
轉換率低，是歸屬管線斷掉。

排查時已排除的原因（實測全站 19,000+ 個聯盟連結）：

| 嫌疑 | 實測結果 |
|---|---|
| 連到搜尋頁而非商品頁 | 指定商品頁 77%，搜尋頁僅 4.3% — 不是問題 |
| 寫死過期的入住日期 | 帶日期參數僅 10 個，過期 0 個 — 不是問題 |
| 語系／幣別錯亂 | 僅約 40 個連結帶這些參數 — 可忽略 |
| `tpm.li` 缺 marker | marker 編在短碼裡，非 query 參數 — 正常 |

**站上的聯盟結構**：Travelpayouts 靜態連結只有 2,840 個（其中 booking 2,800），
其餘都是自己的直接帳號——Klook `aid=116349`（8,352 個）、Agoda `cid=1961347`
（4,620 個）、Trip.com `Allianceid=6817581`（3,247 個）。

**假設**：Drive 在前端把已經帶有自家 cid / Allianceid 的 Agoda 與 Trip.com
連結改寫成 TP 連結，導致 TP 點擊數上升、自家直接分潤下降，而 TP 端若該方案
未開通或歸屬失敗就是 0 筆——症狀完全吻合。

**動作**：停用 Drive 對 Agoda 與 Trip.com 的 link switching，讓這兩個方案回到
自家直接帳號。Klook 與 Booking.com 維持原狀。

**待觀察**（建議停用後滿 7 天與 14 天各看一次）：

1. TP 後台點擊數應明顯下降（若沒下降，代表那些點擊另有來源，例如爬蟲）。
2. Agoda / Trip.com 自家後台的點擊與訂房應上升。
3. 自建追蹤的 `rewritten` 分布：`program IN ('agoda','trip')` 的 `rewritten=1`
   （Drive 改寫）應該歸零。

驗證用查詢：

```sql
-- 停用前後對照（1784944800000 = 停用時點）
SELECT program,
       CASE WHEN created_at < 1784944800000 THEN '停用前' ELSE '停用後' END AS phase,
       SUM(rewritten = 0) AS raw,
       SUM(rewritten = 1) AS drive_rewritten,
       SUM(rewritten = 2) AS tp_shortlink,
       COUNT(*)            AS total
FROM affiliate_clicks
GROUP BY program, phase
ORDER BY program, phase;
```

```sql
-- 每日點擊，拿去和 TP 後台曲線對齊。
-- 兩邊數字差很多 → 多出來的是爬蟲/預抓（自建追蹤是 JS 觸發，只記真人瀏覽器）。
SELECT date(created_at / 1000, 'unixepoch') AS d, program, COUNT(*) AS c
FROM affiliate_clicks
GROUP BY d, program
ORDER BY d DESC, c DESC;
```

執行方式：

```bash
npx wrangler d1 execute bali-chat-logs --remote --command "<上面的 SQL>"
```

---

## 2026-07-25 — Agoda cid 統一為 1961347

站上有 4 個 Agoda 連結掛在別的帳號下，其中 `cid=196147` 是 `1961347` 少打一位
數，那些點擊完全歸不到任何帳號。Kempinski 訂房表單頁的 `cid=1833304` 一併統一。
現在編譯產出的 4,170 個 Agoda 連結 cid 全部一致。

## 2026-07-25 — 補上 Klook 裸連結的追蹤碼

115 個 `klook.com` 連結沒有 `aid` / `aff_adid`，點擊不產生分潤（實際只有 9 個
不同網址）。30 次沿用站內既有的同目標聯盟連結以保留原本的成效歸屬，85 次以
`aid=116349` 新包裝。

## 2026-07-25 — 還原 s.id / bit.ly 短網址

221 個短網址還原為真實網址：18 個指向站內文章的改為站內相對連結，2 個實為
Klook 聯盟的換成聯盟連結。短網址多一跳、不傳遞權重，而且短網址服務一旦停用
連結就全斷。

## 2026-07-25 — 聯盟連結補 rel="sponsored"

正文的聯盟連結幾乎都是 markdown `[文字](網址)` 語法，寫不進 rel 屬性，導致近
兩萬個聯盟連結對 Google 而言都是一般 follow 連結，違反連結垃圾政策。改由
`src/rehype-affiliate-links.mjs` 在 build 時統一補上。
