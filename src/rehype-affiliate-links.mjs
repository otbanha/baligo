// 聯盟連結標註：build 時自動幫文章內所有聯盟網域的 <a> 補上
// rel="sponsored nofollow noopener" 與 target="_blank"。
//
// 為什麼需要：文章正文的聯盟連結幾乎全是 markdown 的 [文字](網址) 語法，
// 這個語法寫不進 rel 屬性，導致全站近兩萬個聯盟連結對 Google 來說
// 都是一般的 follow 連結 —— 違反 Google 連結垃圾政策（聯盟連結必須以
// rel="sponsored" 或 rel="nofollow" 標註）。在這裡統一處理，一行 md 都不用改。
//
// 同時處理 hast element 節點與 raw HTML 節點（remark-blocks 會輸出字串 <a>），
// 作法與 rehype-images.mjs 一致。

// 聯盟網域。只列真正會產生分潤的網域；s.id / bit.ly 這類第三方短網址
// 目的地不明，不在這裡標註，避免誤標到政府或官方資訊連結。
const AFFILIATE_HOSTS = [
  /(^|\.)klook\.com$/i,
  /(^|\.)kkday\.com$/i,
  /(^|\.)agoda\.com$/i,
  /(^|\.)trip\.com$/i,
  /(^|\.)booking\.com$/i,
  /(^|\.)tpm\.li$/i,      // Travelpayouts 短連結（booking.tpm.li / trip.tpm.li…）
  /(^|\.)tp\.media$/i,    // Travelpayouts
  /(^|\.)airalo\.com$/i,
  /(^|\.)saily\.com$/i,
];

const REL_TOKENS = ['sponsored', 'nofollow', 'noopener'];

export function isAffiliateUrl(href) {
  if (typeof href !== 'string') return false;
  let url;
  try {
    url = new URL(href, 'https://gobaligo.id');
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  if (url.hostname === 'gobaligo.id' || url.hostname === 'www.gobaligo.id') return false;
  return AFFILIATE_HOSTS.some((re) => re.test(url.hostname));
}

/** 合併既有 rel（字串或陣列）與需要補上的 token，不重複 */
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

export function rehypeAffiliateLinks() {
  return (tree) => {
    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'a') {
        node.properties ||= {};
        if (isAffiliateUrl(node.properties.href)) {
          node.properties.rel = mergeRel(node.properties.rel);
          if (!node.properties.target) node.properties.target = '_blank';
        }
      } else if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<a ')) {
        node.value = node.value.replace(/<a\b[^>]*>/gi, (tag) => {
          const href = (tag.match(/\bhref=["']([^"']*)["']/i) || [])[1] || '';
          if (!isAffiliateUrl(href)) return tag;

          const relMatch = tag.match(/\brel=["']([^"']*)["']/i);
          const rel = mergeRel(relMatch ? relMatch[1] : '').join(' ');

          let out = relMatch
            ? tag.replace(relMatch[0], `rel="${rel}"`)
            : tag.replace(/^<a\b/i, `<a rel="${rel}"`);
          if (!/\btarget=/i.test(out)) out = out.replace(/^<a\b/i, '<a target="_blank"');
          return out;
        });
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
