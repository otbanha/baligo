# gobaligo.id — Claude Code 工作指南

## 專案概覽
- 框架：Astro + Sveltia CMS
- 部署：Cloudflare Pages
- 圖片：Cloudflare R2
- 文章數：610篇（已完成搬移）
- 語言：繁體中文內容，英文程式碼

## 技術架構
- Node.js 20
- 圖片路徑格式：https://[R2網址]/images/xxx.jpg
- 內部連結格式：/[slug]/

## 待完成需求清單（按優先順序）

### P1 - 修正舊連結
- 掃描所有 .md/.mdx 檔案中的舊網域連結
- 舊格式：https://舊網域/xxx → 新格式：/xxx/
- 執行後輸出修改報告

### P2 - 促銷活動區域存檔問題
- Sveltia CMS 的促銷區塊無法儲存
- 檢查 /public/admin/config.yml 的 collections 設定
- 可能原因：缺少 required fields 或 widget 設定錯誤

### P3 - 手機版首頁
- 目前首頁在手機版 RWD 有問題
- 主要元件：src/pages/index.astro
- 目標：符合 Google Mobile-Friendly 標準

### P4 - AI 問答機器人
- 使用 Cloudflare Workers AI 或串接 Claude API
- 針對峇里島旅遊問答
- 元件放置於：src/components/ChatBot.astro

### P5 - Astro 短網址
- 實作 /go/[slug] 格式的重新導向
- 設定檔位置：src/pages/go/[slug].ts

## 工作規則
- 每次修改前先 git status 確認乾淨
- 大改動前先建立 git branch
- 修改後執行 npm run build 確認沒有錯誤
- 每個 P 級任務完成後 commit 一次