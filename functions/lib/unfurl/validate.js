const TRACKING_PARAMS = new Set([
  'fbclid', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign',
  'utm_content', 'utm_term', 'si', 'feature', 'ref', 'igsh',
]);

/**
 * @param {string} urlStr
 * @returns {{ platform: string } | { error: string }}
 */
export function detectPlatform(urlStr) {
  let url;
  try {
    url = new URL(urlStr.trim());
  } catch {
    return { error: 'INVALID_URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: 'INVALID_URL' };
  }

  const host = url.hostname.toLowerCase().replace(/^m\./, '').replace(/^www\./, '');
  const path = url.pathname;

  if (host === 'youtube.com') {
    if (path.startsWith('/watch') && url.searchParams.get('v')) return { platform: 'youtube' };
    if (path.startsWith('/shorts/') && path.length > 8) return { platform: 'youtube' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0];
    if (id && id.length >= 10) return { platform: 'youtube' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'threads.net' || host === 'threads.com') {
    if (/^\/@[\w.]+\/post\/[\w]+/.test(path)) return { platform: 'threads' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'instagram.com') {
    if (/^\/(p|reel|tv)\/[\w-]+/.test(path)) return { platform: 'instagram' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'facebook.com') {
    if (/^\/[\w.]+\/(posts|videos)\//.test(path)) return { platform: 'facebook' };
    if (path.startsWith('/share/p/')) return { platform: 'facebook' };
    if (path.startsWith('/photo/')) return { platform: 'facebook' };
    if (path.startsWith('/watch')) return { platform: 'facebook' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'fb.watch') {
    return { platform: 'facebook' };
  }
  if (host === 'tiktok.com') {
    if (/^\/@[\w.]+\/video\/\d+/.test(path)) return { platform: 'tiktok' };
    return { error: 'UNSUPPORTED_PLATFORM' };
  }
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com') {
    return { platform: 'tiktok' };
  }

  return { error: 'UNSUPPORTED_PLATFORM' };
}

/**
 * @param {string} urlStr
 * @returns {string | null}
 */
export function normalizeUrl(urlStr) {
  let url;
  try {
    url = new URL(urlStr.trim());
  } catch {
    return null;
  }

  // youtu.be → youtube.com
  if (url.hostname.replace(/^www\./, '') === 'youtu.be') {
    const videoId = url.pathname.slice(1).split('/')[0];
    const params = new URLSearchParams();
    params.set('v', videoId);
    for (const [k, v] of url.searchParams) {
      if (!TRACKING_PARAMS.has(k.toLowerCase())) params.set(k, v);
    }
    return `https://www.youtube.com/watch?${params.toString()}`;
  }

  let host = url.hostname.toLowerCase();
  host = host.replace(/^m\./, '');
  if (host === 'threads.com') host = 'threads.net';

  const cleanParams = new URLSearchParams();
  for (const [k, v] of url.searchParams) {
    if (!TRACKING_PARAMS.has(k.toLowerCase())) cleanParams.set(k, v);
  }

  const path = url.pathname.replace(/\/$/, '') || '/';
  const qs = cleanParams.toString();
  return `https://${host}${path}${qs ? '?' + qs : ''}`;
}

/**
 * @param {string} url
 * @returns {string}
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
}
