#!/usr/bin/env node
/**
 * 發佈 DNS-AID（DNS for AI Discovery）記錄
 * draft-mozleywilliams-dnsop-dnsaid / RFC 9460
 *
 * 在 _index._agents.gobaligo.id 放一筆 ServiceMode SVCB，告訴 agent
 * 「這個網域的探索入口在 gobaligo.id 的 HTTPS，索引文件是 /.well-known/api-catalog」。
 *
 * 只發 _index。_a2a / _mcp 沒有對應服務，不發（發了等於對 agent 說謊）。
 *
 * 用法：
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/publish-dns-aid.mjs --dry-run
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/publish-dns-aid.mjs
 *
 * token 需要的權限：Zone → DNS → Edit（只給 gobaligo.id 這個 zone 即可）。
 * 到 https://dash.cloudflare.com/profile/api-tokens 建立，用完可以直接撤銷。
 */

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE_NAME = process.env.CLOUDFLARE_ZONE_NAME ?? 'gobaligo.id';
const RECORD_NAME = `_index._agents.${ZONE_NAME}`;
const DRY_RUN = process.argv.includes('--dry-run');

// SVCB 的 SvcParams，由完整到最精簡。Cloudflare 對實驗性的 keyNNNNN 支援情況
// 不明，所以由上往下試，哪一組被接受就用哪一組。
const PARAM_SETS = [
  {
    label: '完整（alpn + port + mandatory + key65001 探索文件位置）',
    value: 'alpn="h2,http/1.1" port=443 mandatory="alpn,port" '
      + `key65001="cap=https://${ZONE_NAME}/.well-known/api-catalog"`,
  },
  {
    label: '去掉實驗性 key65001',
    value: 'alpn="h2,http/1.1" port=443 mandatory="alpn,port"',
  },
  {
    label: '最精簡（alpn + port）',
    value: 'alpn="h2,http/1.1" port=443',
  },
];

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok && json.success, status: res.status, json };
}

/** 用 DoH 確認記錄真的出去了（別只信 API 回 200）*/
async function verifyViaDoh() {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${RECORD_NAME}&type=SVCB`,
    { headers: { accept: 'application/dns-json' } },
  );
  const json = await res.json();
  return { status: json.Status, answers: json.Answer ?? [], authenticated: json.AD };
}

async function main() {
  if (!TOKEN) {
    console.error('缺少 CLOUDFLARE_API_TOKEN。需要 Zone → DNS → Edit 權限的 token。');
    process.exit(1);
  }

  const zones = await cf(`/zones?name=${encodeURIComponent(ZONE_NAME)}`);
  const zoneId = zones.json?.result?.[0]?.id;
  if (!zoneId) {
    console.error(`找不到 zone ${ZONE_NAME}`, zones.json?.errors ?? zones.status);
    process.exit(1);
  }

  const existing = await cf(
    `/zones/${zoneId}/dns_records?type=SVCB&name=${encodeURIComponent(RECORD_NAME)}`,
  );
  const current = existing.json?.result?.[0];
  if (current) {
    console.log(`已存在：${current.name} → ${current.content}`);
  }

  if (DRY_RUN) {
    console.log('\n--dry-run，只印不寫。預計送出：');
    console.log(`  ${RECORD_NAME}. 3600 IN SVCB 1 ${ZONE_NAME}. ${PARAM_SETS[0].value}`);
    console.log(`  動作：${current ? 'PATCH 更新既有記錄' : 'POST 新增'}`);
    return;
  }

  for (const set of PARAM_SETS) {
    const body = {
      type: 'SVCB',
      name: RECORD_NAME,
      ttl: 3600,
      comment: 'DNS-AID agent discovery entry point',
      data: { priority: 1, target: ZONE_NAME, value: set.value },
    };

    const res = current
      ? await cf(`/zones/${zoneId}/dns_records/${current.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await cf(`/zones/${zoneId}/dns_records`, { method: 'POST', body: JSON.stringify(body) });

    if (res.ok) {
      console.log(`\n✅ 已發佈（${set.label}）`);
      console.log(`   ${res.json.result.name} → ${res.json.result.content}`);

      const doh = await verifyViaDoh();
      console.log(`\nDoH 驗證：Status=${doh.status} AD=${doh.authenticated} 筆數=${doh.answers.length}`);
      if (doh.answers.length) console.log(`   ${doh.answers[0].data}`);
      else console.log('   （DNS 快取可能還沒更新，1–2 分鐘後再查一次）');

      if (doh.authenticated === false) {
        console.log('\n⚠️  AD=false → 這個 zone 沒有簽 DNSSEC。DNS-AID 建議簽章，');
        console.log('   要開的話：Cloudflare DNS → Settings → Enable DNSSEC，再把 DS 記錄');
        console.log('   貼到 .id 網域註冊商後台。DS 貼錯會讓整個網域解析不到，請小心。');
      }
      return;
    }

    const err = res.json?.errors?.[0];
    console.log(`✗ ${set.label} 被拒（${err?.code ?? res.status}: ${err?.message ?? '未知'}），試下一組`);
  }

  console.error('\n三組參數都失敗，請檢查 token 權限是否為 Zone → DNS → Edit。');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
