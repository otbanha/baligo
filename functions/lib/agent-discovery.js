/**
 * Agent 探索用的 well-known 文件
 *
 * 只放「靜態檔給不了正確 Content-Type」的那幾份：
 *   /.well-known/api-catalog → RFC 9727 要求 application/linkset+json，
 *   但這個路徑沒有副檔名，放 public/ 會被當成 octet-stream。
 *
 * 其餘（openapi.json、agent-skills/index.json、SKILL.md）都是 public/ 底下的
 * 靜態檔，副檔名本來就對，不必經過這裡。
 *
 * ⚠️ 只列真正公開、唯讀、不花錢的端點。/api/chat 會打付費模型且有額度限制，
 * 刻意不放進目錄；寫入類端點（click / like / pageview）也不列。
 */

const CATALOG_APIS = [
  {
    anchor: '/article-index.json',
    title: '全站文章索引（839 篇，含標題、描述、分類、標籤、摘要）',
  },
  {
    anchor: '/api/exchange-rate',
    title: '峇里島換匯參考匯率（IDR 對 USD/AUD/SGD/HKD/MYR/CNY/TWD）',
  },
  {
    anchor: '/api/top-viewed',
    title: '近 7 天熱門文章排行',
  },
  {
    anchor: '/api/hot-articles',
    title: '編輯精選熱門文章',
  },
];

function buildCatalog(origin) {
  const abs = (path) => `${origin}${path}`;

  return {
    linkset: CATALOG_APIS.map((api) => ({
      anchor: abs(api.anchor),
      'service-desc': [
        { href: abs('/openapi.json'), type: 'application/json' },
      ],
      'service-doc': [
        { href: abs('/docs/api/'), type: 'text/html', title: api.title },
      ],
      status: [
        { href: abs('/api/health'), type: 'application/json' },
      ],
      author: [
        { href: abs('/about/'), type: 'text/html', title: 'Go Bali Go 峇里島旅遊攻略' },
      ],
    })),
  };
}

/**
 * @param {string} pathname
 * @param {string} origin
 * @returns {Response|null} 不是我們處理的路徑就回 null，交給後面的流程
 */
export function serveWellKnown(pathname, origin) {
  if (pathname !== '/.well-known/api-catalog' && pathname !== '/.well-known/api-catalog/') {
    return null;
  }

  return new Response(JSON.stringify(buildCatalog(origin), null, 2), {
    headers: {
      'content-type': 'application/linkset+json',
      'cache-control': 'public, max-age=3600',
      'access-control-allow-origin': '*',
    },
  });
}
