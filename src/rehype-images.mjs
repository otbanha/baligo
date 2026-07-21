// 文章內圖片載入優化：
// - LCP 候選圖（heroImage 本尊、或無 heroImage 時的第一張圖）維持 eager + fetchpriority=high，
//   與 BlogPost.astro 對 ogImage 的 <link rel="preload"> 一致。
// - 其餘圖片一律 loading="lazy"，全部加 decoding="async"。
// 同時處理 hast element 節點與 raw HTML 節點（remark-blocks 會輸出字串 <img>）。
export function rehypeImages() {
  return (tree, file) => {
    const fm = file?.data?.astro?.frontmatter ?? {};
    const hero = typeof fm.heroImage === 'string' ? fm.heroImage : '';
    let firstSeen = false;
    let heroDone = false;

    const isLcpImage = (src) => {
      if (hero) {
        if (!heroDone && src === hero) { heroDone = true; return true; }
        return false;
      }
      if (!firstSeen) return true;
      return false;
    };

    const visit = (node) => {
      if (node.type === 'element' && node.tagName === 'img') {
        node.properties ||= {};
        const src = String(node.properties.src || '');
        const lcp = isLcpImage(src);
        firstSeen = true;
        if (!node.properties.loading) {
          if (lcp) {
            node.properties.loading = 'eager';
            if (!node.properties.fetchpriority) node.properties.fetchpriority = 'high';
          } else {
            node.properties.loading = 'lazy';
          }
        }
        if (!node.properties.decoding) node.properties.decoding = 'async';
      } else if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<img')) {
        node.value = node.value.replace(/<img\b[^>]*?\/?>/g, (tag) => {
          const src = (tag.match(/\bsrc=["']([^"']+)["']/) || [])[1] || '';
          const lcp = isLcpImage(src);
          firstSeen = true;
          if (/\bloading=/.test(tag)) return tag;
          const attrs = lcp
            ? ' loading="eager" fetchpriority="high" decoding="async"'
            : ' loading="lazy" decoding="async"';
          return tag.replace('<img', '<img' + attrs);
        });
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };
    visit(tree);
  };
}
