// 文章內文裡的 H1 降級成 H2。
//
// 為什麼需要：BlogPost.astro 已經用 frontmatter 的 title 輸出頁面唯一的 <h1>，
// 但有 178 篇文章的 markdown 內文開頭又寫了一行「# 標題」（多半是從舊平台搬過來
// 時連標題一起複製進內文）。結果這些頁面有兩個 <h1>，而且第二個通常和第一個
// 講同一件事，標題層級因此從 h1 → h1 → h2 斷掉。
// 2026-11 量測 dist：繁中 178、英文 176、印尼文 175、簡中 175、港版 175 頁受影響。
//
// 為什麼在 build 時改而不改內容檔：.github/workflows/translate.yml 用
// title + description + 內文算 content_hash，動內文會讓 879 篇文章被判定成
// 「需要重新翻譯」而觸發整批 AI 翻譯。渲染層處理同樣能修好標題層級，且零副作用。
//
// 只降一級（h1 → h2），不連動往下推 h2 → h3：原本的 h2 是真正的章節標題，
// 推成 h3 會讓 SEO.astro 依 H2 產生的 FAQPage / HowTo / TouristDestination
// schema 整批失效，代價遠大於收益。
//
// 同時處理 hast element 節點與 raw HTML 字串節點（remark-blocks 會輸出字串
// HTML），作法與 rehype-internal-links.mjs / rehype-external-links.mjs 一致。

export function rehypeDemoteH1() {
  return (tree) => {
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'element' && node.tagName === 'h1') {
        node.tagName = 'h2';
        node.properties = { ...(node.properties ?? {}), 'data-demoted-h1': 'true' };
      }

      if ((node.type === 'raw' || node.type === 'html') && typeof node.value === 'string' && /<h1[\s>]/i.test(node.value)) {
        node.value = node.value
          .replace(/<h1(\s[^>]*)?>/gi, (_m, attrs) => `<h2${attrs ?? ''} data-demoted-h1="true">`)
          .replace(/<\/h1>/gi, '</h2>');
      }

      if (Array.isArray(node.children)) for (const c of node.children) visit(c);
    };
    visit(tree);
  };
}
