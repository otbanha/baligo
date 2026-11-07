# vocus 舊文導引 SOP

## 為什麼要做

站上 **584 篇**文章是從 vocus.cc 搬過來的（frontmatter 的 `originalUrl` 記著原文網址）。
vocus 上那 584 篇舊文還活著，而且多半比新站先被 Google 收錄，等於新舊兩份內容
互相搶同一組關鍵字 —— 搜尋結果裡出現的是 vocus，流量、廣告收益與站內轉換全部留在舊平台。

跨站的 canonical 我們無法自己設（canonical 只能由 vocus 那一頁自己宣告），
所以能做的是在 vocus 每一篇最上方放一條指向對應新網址的導引，讓讀者與爬蟲都走過來。

## 對照檔

兩份檔案由 `scripts/generate-vocus-redirect-map.mjs` 產生，slug 有變動時重跑即可：

```bash
npm run vocus-map       # 等同 node scripts/generate-vocus-redirect-map.mjs
```

| 檔案 | 用途 |
|---|---|
| `docs/vocus-redirect-map.csv` | 丟進 Google 試算表逐篇作業，含可直接複製的導引文字 |
| `docs/vocus-redirect-map.json` | 機器可讀，若 vocus 之後開放 API 可直接餵 |

CSV 欄位：

- `vocus_url` / `vocus_id` — 要去編輯的那篇 vocus 文章
- `pub_date` / `title` / `category` — 用來核對是不是同一篇
- `new_url` — 對應的 gobaligo.id 繁中新網址
- `notice_to_paste` — 要貼到 vocus 文章最上方的那一行
- `en_url` / `id_url` / `zh_cn_url` / `zh_hk_url` — 其他語言版本（584 篇都齊全）

腳本會在有 `dist/` 時順便檢查每個 `new_url` 都有對應頁面，確認沒有指向 404 的導引。
目前 584 篇全部通過。

## 作業方式

CSV 已依 `pub_date` 由新到舊排序 —— 愈新的文章在 vocus 上的排名通常愈活躍，
先處理前面幾十篇效益最高，不必一次做完 584 篇。

每一篇在 vocus 後台：

1. 編輯文章，在**正文最上方**貼上 `notice_to_paste` 那一欄的內容，並把新網址設成超連結。
2. 若 vocus 的編輯器支援，把導引做成粗體或引言區塊（讀者更容易看到，點擊率差很多）。
3. 存檔。**不要刪除 vocus 原文** —— 直接刪掉會讓既有排名與外部連結一起消失，
   留著並導引過來，權重才會慢慢轉移。

導引文字長這樣：

```
📌 本文已搬家並持續更新，最新版本請看：<文章標題> → https://gobaligo.id/blog/<slug>/
```

## 做完之後

1. 在 Google Search Console 看 `gobaligo.id/blog/<slug>/` 的曝光是否開始上升。
2. 如果某幾篇在 vocus 的排名特別強、遲遲不轉移，可以考慮把 vocus 那篇的內容
   縮短成摘要 + 導引（保留連結與排名訊號，但把完整內容只留在新站）。
3. 全部處理完後，`originalUrl` 這個欄位仍然留著 —— 它沒有被渲染到頁面上，
   只是搬家來源的記錄，也是這份對照表的資料來源。
