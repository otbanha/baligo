/**
 * Cloudflare KV list() 單次上限 1000 把 key，且以字典序回傳。
 * 超過上限時不會報錯，多出來的 key 直接消失——症狀只會是「某些資料就是 0 / 不見了」，
 * 很難從畫面看出是截斷。所有 list() 都要用 cursor 翻到底。
 *
 * maxPages 只是防呆上限（預設 20 頁 = 20000 把 key），不是預期會用到的分頁數。
 */
export async function listAllKeys(namespace, prefix, { maxPages = 20 } = {}) {
  const keys = [];
  let cursor;
  for (let page = 0; page < maxPages; page++) {
    const res = await namespace.list({ prefix, limit: 1000, cursor });
    keys.push(...res.keys);
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return keys;
}
