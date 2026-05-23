const MAX_PER_HOUR = 30;

/**
 * @param {KVNamespace} kv
 * @param {string} ip
 * @returns {Promise<boolean>}  true if allowed, false if rate limited
 */
export async function checkRateLimit(kv, ip) {
  const now = new Date();
  const slot = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  const key = `rl:${ip}:${slot}`;

  try {
    const current = await kv.get(key, 'text');
    const count = current ? parseInt(current, 10) : 0;
    if (count >= MAX_PER_HOUR) return false;
    // Increment counter, TTL 7200s (2h buffer so key doesn't expire mid-hour)
    await kv.put(key, String(count + 1), { expirationTtl: 7200 });
    return true;
  } catch {
    // If KV fails, allow the request (fail open)
    return true;
  }
}
