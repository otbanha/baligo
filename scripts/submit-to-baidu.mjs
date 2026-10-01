#!/usr/bin/env node
/**
 * submit-to-baidu.mjs
 *
 * 向百度搜索资源平台「普通收录 → API提交」推送網址，請百度盡快抓取。
 * 只推 /zh-cn/ 簡中頁（繁中／英文頁不是百度的目標讀者，推了也浪費每日配額）。
 * 介面與 submit-to-indexnow.mjs 相同，共用 submit-to-google.yml 的 urls.txt：
 *
 *   BAIDU_PUSH_TOKEN=xxx node scripts/submit-to-baidu.mjs <url1> <url2> ...
 *   echo "url1\nurl2" | BAIDU_PUSH_TOKEN=xxx node scripts/submit-to-baidu.mjs
 *
 * Token 取得：https://ziyuan.baidu.com → 普通收录 → 资源提交 → API提交 → 接口调用地址
 * 裡 token= 後面那串。存到 GitHub repo secret「BAIDU_PUSH_TOKEN」。
 * 沒設 token 時只印提示、不算失敗，不會擋住其他引擎的提交。
 */

const SITE = 'https://gobaligo.id';
const TOKEN = process.env.BAIDU_PUSH_TOKEN;

async function readStdin() {
  if (process.stdin.isTTY) return '';
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function collectUrls() {
  const fromArgs = process.argv.slice(2);
  const fromStdin = (await readStdin()).split(/[\s,]+/);
  return [...new Set([...fromArgs, ...fromStdin].map((u) => u.trim()))].filter((u) =>
    u.startsWith(`${SITE}/zh-cn/`),
  );
}

async function main() {
  if (!TOKEN) {
    console.log('ℹ️  未設定 BAIDU_PUSH_TOKEN，略過百度推送。');
    return;
  }
  const urls = await collectUrls();
  if (urls.length === 0) {
    console.log('ℹ️  沒有要推送給百度的簡中 URL。');
    return;
  }

  const endpoint = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE)}&token=${TOKEN}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: urls.join('\n'),
  });
  const text = await res.text();
  let data = {};
  try { data = JSON.parse(text); } catch {}

  if (res.ok && typeof data.success === 'number') {
    console.log(`✅ 百度推送成功：${data.success} 筆，今日剩餘配額 ${data.remain}`);
    urls.forEach((u) => console.log(`   ${u}`));
    if (data.not_same_site?.length) console.log('⚠️  非本站網址：', data.not_same_site);
    if (data.not_valid?.length) console.log('⚠️  無效網址：', data.not_valid);
  } else {
    // 400 + "over quota" 是當日配額用完，不是程式錯誤
    console.log(`❌ 百度推送失敗：${res.status} ${text}`);
    if (!/over quota/i.test(text)) process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('❌ 執行錯誤：', err.message);
  process.exitCode = 1;
});
