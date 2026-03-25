# 網站架構規格 (SITE_SPEC.md)
> 所有開發決策必須以此文件為準。修改前先對照，修改後自我驗證。

## 語言與路由結構

| 語言     | 路徑前綴         | locale 代碼 | 內部 lang code |
|----------|------------------|-------------|----------------|
| 繁體中文 | `/blog/`         | zh-TW       | `'blog'`       |
| 粵語     | `/zh-hk/blog/`   | zh-HK       | `'zh-hk'`      |
| 簡體中文 | `/zh-cn/blog/`   | zh-CN       | `'zh-cn'`      |
| 英文     | `/en/blog/`      | en          | `'en'`         |

> ⚠️ 注意：繁體中文的路徑前綴是 `/blog/`，**不是** `/zh-tw/blog/`。
> 內部 lang code 也是 `'blog'`，不是 `'zh-tw'`。

預設語言：zh-TW（根路徑 `/` 透過 `public/_redirects` 302 跳轉至 `/blog/`）

## 路由結構

```
/                          → 302 redirect → /blog/   (public/_redirects)
/blog/                     → 繁體中文首頁 index
/blog/[slug]/              → 繁體中文文章
/zh-hk/blog/               → 粵語首頁 index
/zh-hk/blog/[slug]/        → 粵語文章
/zh-cn/blog/               → 簡體中文首頁 index
/zh-cn/blog/[slug]/        → 簡體中文文章
/en/blog/                  → 英文首頁 index
/en/blog/[slug]/           → 英文文章
```

Article slug 語言中立（所有語言版本共用同一 slug）。

## 語言自動偵測邏輯（/blog/ 進入點）

- 只在同一 session 的**第一次**訪問 `/blog/` 時執行
- 用 `sessionStorage('gobaligo_lang_checked')` 記錄是否已偵測過
- 偵測後使用 `window.location.replace(dest)` 跳轉（不寫入 history）
- `?lang=tw` query param：使用者主動選擇繁體中文，不跳轉（LanguageSwitcher 附加）

偵測對應表：

| navigator.language | 跳轉目標       |
|--------------------|----------------|
| `en*`              | `/en/blog/`    |
| `zh-CN / zh-Hans / zh-SG / zh-MY` | `/zh-cn/blog/` |
| `zh-HK / zh-MO`   | `/zh-hk/blog/` |
| 其他（含 zh-TW）   | 留在 `/blog/`  |

## 導航邏輯

### 語言切換
- 使用 `LanguageSwitcher.astro` 元件，靜態 `<a href>` 連結
- **不使用** `router.push()` 或 `history.pushState()`
- 切換語言時停留在相同 slug 的對應語言版本
- 若對應版本不存在，回到該語言首頁
- 切換後寫入 cookie `gobaligo_lang` 記憶選擇（1年有效期）

### 分類篩選 / 分頁（/blog/ index 頁面）
- 分類點選、換頁：使用 `history.pushState` 更新 URL（`?cat=xxx&page=n`）
- 瀏覽器前進/後退：透過 `popstate` 事件還原篩選狀態
- 頁面初始化：讀取 URL params，用 `history.replaceState` 寫入初始狀態

### BACK 按鈕
- **完全不干涉**，交給瀏覽器原生處理
- 從文章頁按 BACK → 回到來源頁（index 的對應分類/頁次狀態）
- 從 index 按 BACK → 回到進入 index 之前的頁面

## 已知禁止行為（每次修改前確認）

- [ ] 不得在語言切換時使用 `pushState` 或 `router.push()`（會破壞 BACK）
- [ ] 不得在**每次**頁面載入時無條件執行語言偵測跳轉（會破壞 BACK）
  - 正確做法：用 `sessionStorage` 確保只偵測一次
- [ ] 不得用 JavaScript 攔截瀏覽器 BACK 事件
- [ ] 不得在 URL 中重複語言前綴（如 `/zh-hk/zh-hk/...`）
- [ ] 不得修改繁體中文的路徑前綴（維持 `/blog/`，不改為 `/zh-tw/blog/`）
- [ ] 不得使用 `history.pushState` 於語言自動偵測跳轉（必須用 `replace`）

## 檔案位置對照表

| 功能                  | 檔案路徑                                     |
|-----------------------|----------------------------------------------|
| 語言切換元件          | `src/components/LanguageSwitcher.astro`      |
| Header（含 ScrollReveal） | `src/components/Header.astro`           |
| 根路徑重定向          | `public/_redirects`                          |
| 繁體中文 index        | `src/pages/blog/index.astro`                 |
| 粵語 index            | `src/pages/zh-hk/blog/index.astro`           |
| 簡體中文 index        | `src/pages/zh-cn/blog/index.astro`           |
| 英文 index            | `src/pages/en/blog/index.astro`              |
| 繁體中文文章          | `src/pages/blog/[...slug].astro`             |
| 全域樣式              | `src/styles/global.css`                      |
