# DNS-AID（DNS for AI Discovery）

讓 agent 透過 DNS 找到本站的探索入口。規格：
[draft-mozleywilliams-dnsop-dnsaid](https://datatracker.ietf.org/doc/draft-mozleywilliams-dnsop-dnsaid/)、
[RFC 9460](https://www.rfc-editor.org/rfc/rfc9460)。

## 要發的記錄

```dns
_index._agents.gobaligo.id. 3600 IN SVCB 1 gobaligo.id. alpn="h2,http/1.1" port=443 mandatory="alpn,port" key65001="cap=https://gobaligo.id/.well-known/api-catalog"
```

意思是：這個網域的 agent 探索入口在 `gobaligo.id` 的 HTTPS（443），索引文件是
`/.well-known/api-catalog`。`key65001` 是實驗性的 SvcParamKey——DNS-AID 的自訂
參數還沒在 IANA 註冊，規格要求先用 `keyNNNNN` 數字形式。

**只發 `_index`。** `_a2a._agents` 和 `_mcp._agents` 需要真的有 A2A / MCP 服務在跑，
本站沒有，發了等於對 agent 宣告不存在的端點。

## 怎麼發

### 方法 A：腳本（建議，參數不用手打）

到 https://dash.cloudflare.com/profile/api-tokens 建一個 token，權限選
**Zone → DNS → Edit**，範圍限定 gobaligo.id。用完可以直接撤銷。

```bash
CLOUDFLARE_API_TOKEN=xxx node scripts/publish-dns-aid.mjs --dry-run   # 先看要送什麼
CLOUDFLARE_API_TOKEN=xxx node scripts/publish-dns-aid.mjs             # 實際發佈
```

腳本是冪等的（已存在就改不會重複新增），Cloudflare 若不吃實驗性的 `key65001`
會自動退到較精簡的參數組，最後用 DoH 複查記錄有沒有真的出去。

### 方法 B：Cloudflare 後台手動加

DNS → Records → Add record：

| 欄位 | 值 |
|---|---|
| Type | `SVCB` |
| Name | `_index._agents` |
| Priority | `1` |
| Target | `gobaligo.id` |
| Value | `alpn="h2,http/1.1" port=443 mandatory="alpn,port" key65001="cap=https://gobaligo.id/.well-known/api-catalog"` |
| TTL | `1 hour` |

如果 Value 被擋，先拿掉 `key65001=...`，再不行拿掉 `mandatory=...`。

## DNSSEC（另一件事，風險比較高）

DNS-AID 建議探索區域要簽 DNSSEC。**gobaligo.id 目前沒有簽**
（`dig gobaligo.id A` 的 AD flag 是 false，父區 `.id` 也查不到 DS 記錄）。

要開的話兩步：

1. Cloudflare → DNS → Settings → **Enable DNSSEC**，會給你一組 DS 記錄。
2. 把那組 DS 貼到 **.id 網域註冊商**的後台。

⚠️ 第 2 步貼錯或漏貼會讓整個網域解析不到（不是網站掛掉，是 DNS 層直接消失），
而且 TTL 過期前很難救。

建議順序：先只發 SVCB 記錄，重掃一次看 `dnsAid` 過不過。掃描器的失敗訊息是
「entrypoint records not found」，看起來是查記錄；但 SKILL 也把 DNSSEC 列為
requirement，是否一併檢查沒有實測過，發完就知道。

## 驗證

```bash
curl -s -H "accept: application/dns-json" \
  "https://cloudflare-dns.com/dns-query?name=_index._agents.gobaligo.id&type=SVCB" | jq
```

`Answer` 有內容就成功；`AD` 是 DNSSEC 驗證狀態。
