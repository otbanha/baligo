/**
 * GET /api/health
 * 給 API catalog 的 `status` 關係用的健康檢查端點。
 * 只回報邊緣函式活著、以及各個綁定有沒有掛上，不碰任何使用者資料。
 */
export async function onRequestGet(context) {
  const { env } = context;

  return Response.json(
    {
      status: 'ok',
      time: new Date().toISOString(),
      bindings: {
        kv: Boolean(env.RATE_LIMIT),
        pageviews: Boolean(env.UNFURL_RECENT),
        d1: Boolean(env.DB),
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
