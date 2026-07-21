#!/usr/bin/env node
/**
 * submit-to-indexnow.mjs
 *
 * 向 IndexNow API（Bing／其他支援引擎共用）提交網址，請求盡快重新檢索。
 * 零外部依賴，global fetch 直接呼叫。與 submit-to-google.mjs 共用同一份
 * urls.txt（見 .github/workflows/submit-to-google.yml），介面刻意保持一致：
 *
 *   node scripts/submit-to-indexnow.mjs <url1> <url2> ...
 *   echo "url1\nurl2" | node scripts/submit-to-indexnow.mjs   # 從 stdin 讀
 *
 * Key 驗證檔：public/23bfa3c19df2dbe9a4ec02f81952c8e4.txt（內容=key，隨 build 部署到站上）。
 */

const HOST = 'gobaligo.id';
const KEY = '23bfa3c19df2dbe9a4ec02f81952c8e4';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function collectUrls() {
  const fromArgs = process.argv.slice(2);
  const fromStdin = (await readStdin()).split(/[\s,]+/);
  const seen = new Set();
  const urls = [];
  for (const raw of [...fromArgs, ...fromStdin]) {
    const u = raw.trim();
    if (!u || !/^https?:\/\//.test(u)) continue;
    if (seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  return urls;
}

async function main() {
  const urls = await collectUrls();
  if (urls.length === 0) {
    console.log('ℹ️  沒有要提交的 URL。');
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  });

  if (res.ok) {
    console.log(`✅ IndexNow 提交成功（${res.status}）：共 ${urls.length} 筆`);
    urls.forEach((u) => console.log(`   ${u}`));
  } else {
    console.log(`❌ IndexNow 提交失敗：${res.status} ${await res.text()}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('❌ 執行錯誤：', err.message);
  process.exitCode = 1;
});
