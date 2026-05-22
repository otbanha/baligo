# /blog 聯盟連結插入更新報告

**執行時間**：2026-05-21

## 摘要

| 項目 | 數量 |
|---|---|
| 修改檔案數 | **75** |
| 連結插入點 | **224** |
| 新增 [Trip] 連結 | 222 |
| 新增 [Booking] 連結 | 220 |
| 處理的飯店數 | **69** |

## 連結格式

在每個 Agoda 連結後方加上：

```
[Agoda](原連結) [Trip](聯盟連結) [Booking](聯盟連結)
```

- 同一飯店在多個檔案出現時都會插入
- 已有 [Trip] / [Booking] 的位置自動跳過（不重複）
- Six Senses Uluwatu (hid=5643355)、Fox Hotel (hid=3121957) 只填了 Trip 沒填 Booking → 只插入 Trip
- Belajar Bali Boutique Hotel & Retreat (hid=49488356) 只填了 Booking 沒填 Trip → 只插入 Booking

## 驗證結果

- ✅ Markdown 語法檢查：0 個問題
- ✅ article-index.json 重新產生成功（704 篇文章解析無錯）
- ⚠️ Astro build 失敗，但**不是因為 markdown 變動** — 是 sandbox 是 Linux 而 node_modules 是 macOS 安裝的，缺 `@rollup/rollup-linux-arm64-gnu`。在你 Mac 上 `npm run build` 不會碰到這個問題

## Git 提交

⚠️ 我嘗試 commit 時碰到 `.git/index.lock` 存在無法移除（sandbox 權限限制）。請在 Mac terminal 執行：

```bash
cd /Users/macchiu/baligo
rm -f .git/index.lock
git add public/article-index.json src/content/blog/*.md
git commit -m "feat: 加入 Trip + Booking 聯盟連結（69 間飯店 / 75 個檔案 / 224 個連結點）"
git push origin main
```

備份位置（如要回滾）：所有原始檔案備份在 sandbox 內 `outputs/affiliate-tracker/backups/blog/`

