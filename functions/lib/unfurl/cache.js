const KEY_PREFIX = 'unfurl:v1:';
const TTL_SUCCESS = 86400;   // 24h
const TTL_FAILURE = 3600;    // 1h

/**
 * @param {string} normalizedUrl
 * @returns {Promise<string>}
 */
export async function hashUrl(normalizedUrl) {
  const data = new TextEncoder().encode(normalizedUrl);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * @param {KVNamespace} kv
 * @param {string} hash
 * @returns {Promise<object|null>}
 */
export async function cacheGet(kv, hash) {
  try {
    return await kv.get(KEY_PREFIX + hash, 'json');
  } catch {
    return null;
  }
}

/**
 * @param {KVNamespace} kv
 * @param {string} hash
 * @param {object} value
 * @param {boolean} isSuccess
 */
export async function cachePut(kv, hash, value, isSuccess) {
  try {
    await kv.put(KEY_PREFIX + hash, JSON.stringify(value), {
      expirationTtl: isSuccess ? TTL_SUCCESS : TTL_FAILURE,
    });
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * @param {KVNamespace} kv
 * @param {string} hash
 */
export async function cacheDelete(kv, hash) {
  try {
    await kv.delete(KEY_PREFIX + hash);
  } catch {}
}
