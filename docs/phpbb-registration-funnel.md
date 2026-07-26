# phpBB 註冊漏斗修復清單

> 2026-07-26 診斷。這份文件的所有操作都在 **repo 外部**（phpBB ACP、Cloudflare DNS），
> 因為論壇跑在 Hostinger SG 的 `community.gobaligo.id`，PHP 與資料庫都不在本 repo。
> repo 內的 `forum-theme/` 只有 CSS，且**沒有部署腳本，是手動 FTP 上傳的**。

## 診斷結論

論壇 2026-07-26 實測：線上訪客 236 位、尖峰紀錄 1188 人，但**總會員只有 10 位**，
49 個主題全部由 Admin 發。人流不缺，卡在註冊轉換。

以訪客身分實走註冊流程後找到四個卡點，按影響排序：

| # | 問題 | 現況 |
|---|---|---|
| 1 | **驗證信幾乎寄不到** | 必須收信啟用帳號，但寄件網域完全沒有 email 認證 |
| 2 | 條款頁是原廠罐頭文 | 整篇在講 phpBB Group / GPL，與峇里島社群無關 |
| 3 | 圖形驗證碼 | phpBB 內建 GD captcha（`type=1`），手機上極難辨識 |
| 4 | 時區欄位 | 三個下拉選單，`tz_copy` 有 420 個選項 |

### 為什麼驗證信寄不到

| 記錄 | gobaligo.id | community.gobaligo.id |
|---|---|---|
| SPF | 無 | 無 |
| DKIM | 只有 `resend._domainkey`（Resend 專用） | 無 |
| DMARC | 無 | 無 |

論壇在 Hostinger 共享主機（195.35.62.141）。若用 PHP `mail()` 直寄，對 Gmail 而言就是
SPF 沒過、DKIM 沒過、DMARC 不存在 —— 2024 年後 Gmail/Yahoo 對這類信直接丟垃圾桶或退回。
**使用者註冊 → 信沒到 → 帳號永遠停在未啟用**，這解釋了 236 訪客 vs 10 會員。

好消息：Resend 已驗證 `gobaligo.id`，`functions/api/weekly-report.js:45` 正用
`bot@gobaligo.id` 寄週報，`RESEND_API_KEY` 也已存在。phpBB 直接沿用即可。

---

## 要做的事

### ① phpBB 改走 Resend SMTP（最重要）

ACP → 一般 → 客戶端通訊 → **電子郵件設定**

| 欄位 | 值 |
|---|---|
| 啟用寄送電子郵件 | 是 |
| 使用 SMTP 伺服器寄信 | **是** |
| SMTP 伺服器位址 | `smtp.resend.com` |
| SMTP 連接埠 | `587` |
| 認證方式 | PLAIN（或 LOGIN） |
| SMTP 使用者名稱 | `resend` ← 字面上就是這五個字，不是你的帳號 |
| SMTP 密碼 | **新建一把** Resend API key（見下方） |
| 寄件者信箱位址 | `noreply@gobaligo.id` |
| 寄件者名稱 | 峇里島討論區 |

⚠️ 寄件位址**必須是 `@gobaligo.id`**。用 `@community.gobaligo.id` 會失去 DKIM 對齊，
因為 Resend 驗證的是 `gobaligo.id`。

#### 要另外建一把新的 API key

Resend 的 API key **建立後就再也看不到值**（官方設計，不是遺失），所以現有那把取不回來。
**但絕對不要撤銷或重設它** —— Cloudflare Pages 正式環境的 `RESEND_API_KEY` 還在用它寄週報
（`functions/api/weekly-report.js`），撤掉週報就停了。

正確做法是**新增一把專給 phpBB 用的**：

Resend 後台 → API Keys → Create API Key

| 欄位 | 建議值 |
|---|---|
| Name | `phpbb-smtp` |
| Permission | **Sending access**（只給寄信權限，不要 Full access） |
| Domain | `gobaligo.id`（限定網域，之後外洩也只能寄這個網域） |

建好後畫面會顯示一次完整的 `re_...` 字串，**當下就複製**，直接貼進上表的 SMTP 密碼欄。
兩把 key 可以並存互不影響，Cloudflare 那邊完全不用動。

日後若要輪替，順序是：先建新的 → 換掉使用端 → 確認正常 → 才撤銷舊的。

改完在 ACP 用「寄送測試信」或直接跑一次忘記密碼流程，確認信有進收件匣（不是垃圾桶）。

### ② 帳號啟用改為「不需啟用」

ACP → 一般 → 使用者註冊 → **註冊設定** → 帳號啟用 = `不需啟用`

以 10 位會員的階段而言，email 啟用擋掉的真人遠多於擋掉的垃圾帳號。
①做完之後 email 仍然會通，密碼重設與回覆通知照常運作，只是不再擋在註冊當下。

> 之後會員數起來、開始有垃圾註冊時，再改回「使用者啟用」即可 —— 那時信也寄得出去了。

### ③ 換掉圖形驗證碼

ACP → 一般 → 反垃圾訊息措施 → 選擇「**問答式驗證**」，然後新增一題峇里島常識題，例如：

- 問：峇里島屬於哪一個國家？　答：印尼 / Indonesia / indonesia
- 問：峇里島最大的機場代碼是？　答：DPS / dps

問答式驗證對這種主題型社群特別有效：**能答出來的幾乎都是真的要去峇里島的人**，
而且比 GD 圖形碼好用非常多。零安裝，不需要外掛。

（你主站已有 Turnstile 金鑰，也可以裝 phpBB 的 Turnstile 外掛，但問答式已經夠用。）

### ④ 加 DMARC 記錄（需要你自己加）

Cloudflare DNS → gobaligo.id → 新增記錄：

```
類型: TXT
名稱: _dmarc
內容: v=DMARC1; p=none; sp=none; adkim=r; aspf=r
TTL: Auto
```

`p=none` 是純監測，**不會擋掉任何信**，不可能弄壞現有寄件。它的作用是建立政策、
為日後收緊到 `p=quarantine` 鋪路。

> 沒有填 `rua=` 回報位址是刻意的：一是會把你的信箱公開在 DNS 上被爬蟲收集，
> 二是跨網域回報（例如寄到 gmail.com）需要收件端發布授權記錄，實際上收不到。
> 若要收報告，正解是開 Cloudflare Email Routing 建一個 `dmarc@gobaligo.id` 轉發到你信箱。

### ⑤ 換掉條款頁文字

檔案：`language/zh_cmn_hant/ucp.php`，找 `TERMS_OF_USE_CONTENT`（約在第 40 行附近）。

注意事項：
- `%1$s` = 論壇名稱，`%2$s` = 論壇網址，兩個佔位符都要保留
- 存檔請用 **UTF-8 without BOM**
- 這是核心語言檔，**phpBB 升級時會被覆蓋**，升級後要重新套用（建議把這份文件留著）

替換文字：

```
歡迎加入「%1$s」（%2$s）。註冊前請花一分鐘看完以下幾點。

【這裡在討論什麼】
峇里島與印尼旅遊的問答社群。簽證、包車、住宿、換錢、踩雷經驗，都歡迎發問與分享。

【請這樣做】
・發問時盡量寫清楚時間、地點與情況，別人才幫得上忙
・分享親身經驗，好的壞的都有價值
・看到剛好知道答案的問題，順手回一句

【請不要這樣做】
・張貼辱罵、騷擾、色情、仇恨或違法內容
・未經同意張貼他人的個人資料、證件照片或訂房資料
・純廣告、洗版、重複張貼推薦連結

違反上述規定我們會刪除內容，情節嚴重者停權。

【關於你的資料】
・註冊填的電子郵件只用於密碼重設與你自己開啟的通知，不會外流或販售
・所有貼文會記錄 IP 位址，僅用於處理濫用行為
・你張貼的內容會公開顯示，也可能被搜尋引擎收錄，發文前請自行斟酌
・你可以隨時要求刪除自己的帳號與貼文，請透過「聯絡管理員」提出

我們可能會調整這些規定，重大變更會在討論區公告。

本站使用 phpBB 論壇軟體。phpBB 僅提供軟體本身，不對本站的內容或管理行為負責。
```

---

## 做完之後怎麼驗證

1. **開無痕視窗**走一次完整註冊，確認：條款頁是新文字、驗證碼是問答題、送出後**直接可以發文**
2. 跑一次「忘記密碼」，確認信在**收件匣**而非垃圾桶，寄件者顯示 `noreply@gobaligo.id`
3. 用 [mail-tester.com](https://www.mail-tester.com/) 之類的工具寄一封測試信，確認 SPF/DKIM/DMARC 三項都綠燈
4. 一到兩週後看 `/api/click-report?key=<REPORT_SECRET>&days=14&format=text` 的
   `forum clicks` 那行，對照論壇會員數成長 —— 這是判斷是否見效的唯一客觀數據

## 這次沒動到的

時區欄位（420 個選項那個）留著沒處理。要移除需要改 phpBB 的 template 檔，
而目前 `forum-theme/` 是純 CSS 的 child style、也沒有部署流程。
建議先做完上面五項看成效，時區只是小摩擦，不值得為它建立 template 覆蓋機制。
