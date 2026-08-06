// 外部連結自動標註：build 時幫所有指向站外網域的 <a> 補上
// rel="nofollow sponsored noopener"（保留既有 rel 值、不重複加）。
//
// 同時處理 hast element 節點與 raw HTML 節點（remark-blocks 會輸出字串 <a>），
// 作法與 rehype-affiliate-links.mjs 一致。

const OWN_HOST_RE = /(^|\.)gobaligo\.id$/i;
const REL_TOKENS = ['nofollow', 'sponsored', 'noopener'];

export function isExternalUrl(href) {
  if (typeof href !== 'string') return false;
  let url;
  try {
    url = new URL(href, 'https://gobaligo.id');
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  return !OWN_HOST_RE.test(url.hostname);
}

/** 合併既有 rel（字串或陣列）與需要補上的 token，不重複、不覆蓋既有值 */
function mergeRel(existing) {
  const current = Array.isArray(existing)
    ? existing
    : String(existing ?? '').split(/\s+/);
  const out = current.filter(Boolean);
  const lower = new Set(out.map((t) => t.toLowerCase()));
  for (const token of REL_TOKENS) {
    if (!lower.has(token)) {
      out.push(token);
      lower.add(token);
    }
  }
  return out;
}

export function rehypeExternalLinks() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        node.properties ||= {};
        if (isExternalUrl(node.properties.href)) {
          node.properties.rel = mergeRel(node.properties.rel);
        }
      } else if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<a ')) {
        node.value = node.value.replace(/<a\b[^>]*>/gi, (tag) => {
          const href = (tag.match(/\bhref=["']([^"']*)["']/i) || [])[1] || '';
          if (!isExternalUrl(href)) return tag;

          const relMatch = tag.match(/\brel=["']([^"']*)["']/i);
          const rel = mergeRel(relMatch ? relMatch[1] : '').join(' ');

          return relMatch
            ? tag.replace(relMatch[0], `rel="${rel}"`)
            : tag.replace(/^<a\b/i, `<a rel="${rel}"`);
        });
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
