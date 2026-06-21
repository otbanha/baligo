const DEFAULT_MAX_PER_HOUR = 5;
const ADMIN_MAX_PER_HOUR  = 20;

/**
 * @param {KVNamespace} kv
 * @param {string} ip
 * @param {boolean} [isAdmin]
 * @param {{ action?: string, max?: number }} [opts]  action namespaces the bucket so different endpoints don't share quota; max overrides the default per-hour cap.
 * @returns {Promise<boolean>}  true if allowed
 */
export async function checkRateLimit(kv, ip, isAdmin = false, { action = 'unfurl', max } = {}) {
  const limit = max ?? (isAdmin ? ADMIN_MAX_PER_HOUR : DEFAULT_MAX_PER_HOUR);
  const now = new Date();
  const slot = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  const key = `rl:${action}:${ip}:${slot}`;

  try {
    const current = await kv.get(key, 'text');
    const count = current ? parseInt(current, 10) : 0;
    if (count >= limit) return false;
    await kv.put(key, String(count + 1), { expirationTtl: 7200 });
    return true;
  } catch {
    return true; // fail open
  }
}
