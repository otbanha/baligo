const COOKIE_NAME = 'gobaligo_admin';

/**
 * Timing-safe string comparison using HMAC.
 */
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  // Use a throwaway zero key — we only need both sides to go through the same HMAC operation
  const key = await crypto.subtle.importKey(
    'raw',
    new Uint8Array(32),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(a)),
    crypto.subtle.sign('HMAC', key, enc.encode(b)),
  ]);
  const a8 = new Uint8Array(sigA);
  const b8 = new Uint8Array(sigB);
  if (a8.length !== b8.length) return false;
  let diff = 0;
  for (let i = 0; i < a8.length; i++) diff |= a8[i] ^ b8[i];
  return diff === 0;
}

/**
 * Import HMAC signing key from secret string.
 * @param {string} secret
 */
async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Generate a signed admin token.
 * @param {string} secret
 * @returns {Promise<string>}
 */
export async function generateToken(secret) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 30 * 24 * 3600; // 30 days
  const payload = JSON.stringify({ iat, exp });
  const payloadB64 = btoa(payload);
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toHex(sig)}`;
}

/**
 * Verify a signed admin token.
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function verifyToken(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadB64, sigHex] = parts;

  try {
    const payload = JSON.parse(atob(payloadB64));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    const key = await importKey(secret);
    const sig = fromHex(sigHex);
    return await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(payloadB64));
  } catch {
    return false;
  }
}

/**
 * Parse a cookie string for a specific name.
 * @param {string} cookieHeader
 * @param {string} name
 * @returns {string|null}
 */
function parseCookie(cookieHeader, name) {
  const re = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
  const m = re.exec(cookieHeader);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Check if the incoming request is from an authenticated admin.
 * @param {Request} request
 * @param {string} secret
 * @returns {Promise<boolean>}
 */
export async function isAdmin(request, secret) {
  if (!secret) return false;
  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = parseCookie(cookieHeader, COOKIE_NAME);
  if (!token) return false;
  return verifyToken(token, secret);
}

/**
 * Check if the provided key matches ADMIN_SECRET (timing-safe).
 * @param {string} provided
 * @param {string} secret
 */
export async function checkSecret(provided, secret) {
  return timingSafeEqual(provided, secret);
}

export { COOKIE_NAME };
