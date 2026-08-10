/**
 * HTML → Markdown（Cloudflare Workers 版，用內建 HTMLRewriter 串流解析）
 *
 * 給 `Accept: text/markdown` 內容協商與 `.md` 網址用。刻意不引入任何 npm
 * 相依套件：Pages Functions 的 bundle 越小，middleware 冷啟動越快。
 *
 * 取內容的順序是 <article> → <main> → <body>：文章頁的 <main> 內含麵包屑
 * 導覽，先抓 <article> 才不會把導覽混進正文。
 */

// 整棵子樹都不要的標籤（連文字一起丟）
const SKIP_TAGS = [
  'script', 'style', 'noscript', 'svg', 'iframe', 'form', 'button',
  'template', 'video', 'audio', 'canvas', 'select', 'textarea', 'input',
  'nav', 'footer', 'header', 'aside', 'dialog',
];

// 版面配件：對讀者有用、但對 agent 只是雜訊（分享列、目錄、留言、推薦文、CTA）。
// 新的區塊要一起排除的話，加 class 或直接在 HTML 上掛 data-agent-skip。
const SKIP_SELECTORS = [
  '[data-agent-skip]',
  '.toc',
  '.share-bar',
  '.edit-link',
  '.comments-section',
  '.flt-widget',
  '.related-posts',
  '.tp-banner',
  '.stage-bridge',
  '[class^="stage-bridge"]',
];

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

// <pre> 內容先抽走、用佔位符卡位，後面壓空白時才不會把程式碼排版壓爛。
// 用 NUL 當標記：正常網頁內容不會出現。
const SENTINEL = String.fromCharCode(0);
const NBSP = String.fromCharCode(160);

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', middot: '·', times: '×',
};

function decodeEntities(str) {
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X'
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] ?? m;
  });
}

/** 相對網址補成絕對網址；補不起來就原樣回傳 */
function absolutize(href, base) {
  if (!href) return '';
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

/**
 * 中文為主的內容用 chars/4 估 token 會嚴重低估。
 * 非 ASCII/拉丁區的字元（中日韓、全形標點）約 1 字 ≈ 0.7 token，其餘沿用 chars/4。
 */
export function estimateTokens(text) {
  let wide = 0;
  for (const ch of text) {
    if (ch.codePointAt(0) > 0x2e7f) wide++;
  }
  return Math.round(wide * 0.7 + (text.length - wide) / 4);
}

/** 收集 <head> 裡的中繼資料，組 YAML frontmatter 用 */
function collectMeta(rewriter, meta) {
  return rewriter
    .on('html', {
      element(el) { meta.lang = el.getAttribute('lang') || meta.lang; },
    })
    .on('head title', {
      text(t) { meta.title += t.text; },
    })
    .on('meta[name="description"]', {
      element(el) { meta.description = el.getAttribute('content') || meta.description; },
    })
    .on('link[rel="canonical"]', {
      element(el) { meta.canonical = el.getAttribute('href') || meta.canonical; },
    })
    .on('meta[property="article:published_time"]', {
      element(el) { meta.published = el.getAttribute('content') || meta.published; },
    })
    .on('meta[property="article:modified_time"]', {
      element(el) { meta.modified = el.getAttribute('content') || meta.modified; },
    });
}

/**
 * 把 root 選擇器底下的內容轉成 markdown。
 * 回傳空字串代表這個 root 在文件裡不存在（呼叫端再換下一個 root 重試）。
 */
async function convertRoot(html, root, baseUrl) {
  const parts = [];
  let skip = 0;          // >0 代表正在被跳過的子樹裡
  let pre = null;        // 收 <pre> 原文用的 buffer
  const codeBlocks = [];
  const listStack = [];
  let table = null;

  const push = (s) => { if (!skip) parts.push(s); };

  let rewriter = new HTMLRewriter().on(root, {
    // 文字節點：<pre> 內原樣保留，其餘先收著，最後再統一壓空白
    text(t) {
      if (pre) { pre.push(t.text); return; }
      if (skip) return;
      parts.push(t.text);
    },
  });

  // ── 整段跳過的標籤與版面配件 ──
  const skipSubtree = {
    element(el) {
      skip++;
      el.onEndTag(() => { skip--; });
    },
  };
  for (const selector of [...SKIP_TAGS, ...SKIP_SELECTORS]) {
    rewriter = rewriter.on(`${root} ${selector}`, skipSubtree);
  }

  // ── 標題 ──
  HEADINGS.forEach((tag, i) => {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) {
        if (skip) return;
        push(`\n\n${'#'.repeat(i + 1)} `);
        el.onEndTag(() => push('\n\n'));
      },
    });
  });

  // ── 區塊元素 ──
  const block = (tag, before = '\n\n', after = '\n\n') => {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) {
        if (skip) return;
        push(before);
        el.onEndTag(() => push(after));
      },
    });
  };
  block('p');
  block('div', '\n', '\n');
  block('blockquote', '\n\n> ', '\n\n');
  block('dt', '\n\n**', '** ');
  block('dd', '\n', '\n');

  rewriter = rewriter
    .on(`${root} br`, { element() { push('\n'); } })
    .on(`${root} hr`, { element() { push('\n\n---\n\n'); } });

  // ── 清單（用 stack 保留巢狀縮排）──
  for (const tag of ['ul', 'ol']) {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) {
        if (skip) return;
        listStack.push({ ordered: tag === 'ol', n: 0 });
        push('\n');
        el.onEndTag(() => { listStack.pop(); push('\n'); });
      },
    });
  }
  rewriter = rewriter.on(`${root} li`, {
    element() {
      const cur = listStack[listStack.length - 1];
      const indent = '  '.repeat(Math.max(0, listStack.length - 1));
      const marker = cur && cur.ordered ? `${++cur.n}. ` : '- ';
      push(`\n${indent}${marker}`);
    },
  });

  // ── 表格 ──
  rewriter = rewriter
    .on(`${root} table`, {
      element(el) {
        if (skip) return;
        table = { row: 0, cols: 0 };
        push('\n\n');
        el.onEndTag(() => { table = null; push('\n\n'); });
      },
    })
    .on(`${root} tr`, {
      element(el) {
        if (skip) return;
        if (table) table.cols = 0;
        push('\n|');
        el.onEndTag(() => {
          if (!table) return;
          if (table.row === 0 && table.cols > 0) {
            push(`\n|${' --- |'.repeat(table.cols)}`);
          }
          table.row++;
        });
      },
    });
  for (const tag of ['th', 'td']) {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) {
        if (skip) return;
        push(' ');
        el.onEndTag(() => {
          if (table) table.cols++;
          push(' |');
        });
      },
    });
  }

  // ── 行內元素 ──
  for (const tag of ['strong', 'b']) {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) { if (skip) return; push('**'); el.onEndTag(() => push('**')); },
    });
  }
  for (const tag of ['em', 'i']) {
    rewriter = rewriter.on(`${root} ${tag}`, {
      element(el) { if (skip) return; push('*'); el.onEndTag(() => push('*')); },
    });
  }
  rewriter = rewriter.on(`${root} code`, {
    element(el) {
      if (skip || pre) return;      // <pre><code> 交給 pre 處理
      push('`');
      el.onEndTag(() => push('`'));
    },
  });

  rewriter = rewriter.on(`${root} pre`, {
    element(el) {
      if (skip) return;
      pre = [];
      skip++;                       // 讓上面的 text handler 不要重複收
      el.onEndTag(() => {
        const code = decodeEntities(pre.join('')).replace(/\s+$/, '');
        pre = null;
        skip--;
        codeBlocks.push(code);
        push(`\n\n${SENTINEL}${codeBlocks.length - 1}${SENTINEL}\n\n`);
      });
    },
  });

  // ── 連結與圖片 ──
  rewriter = rewriter.on(`${root} a`, {
    element(el) {
      if (skip) return;
      const href = el.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      push('[');
      el.onEndTag(() => push(`](${absolutize(href, baseUrl)})`));
    },
  });
  rewriter = rewriter.on(`${root} img`, {
    element(el) {
      if (skip) return;
      const src = el.getAttribute('src') || el.getAttribute('data-src');
      if (!src) return;
      const alt = (el.getAttribute('alt') || '').replace(/[[\]]/g, '');
      push(`\n\n![${alt}](${absolutize(src, baseUrl)})\n\n`);
    },
  });

  await rewriter.transform(new Response(html)).text();

  let md = parts.join('');
  if (!md.trim()) return '';

  md = decodeEntities(md)
    .split(NBSP).join(' ')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    // 行尾空白去掉；行首只有一個空白的是標籤間的縫隙（巢狀清單縮排是 2 個以上，留著）
    .map((line) => line.replace(/[ \t]+$/, '').replace(/^ (?! )/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  md = mergeTableRows(md);

  // 還原 <pre> 區塊
  md = md.replace(new RegExp(`${SENTINEL}(\\d+)${SENTINEL}`, 'g'),
    (_, i) => `\`\`\`\n${codeBlocks[Number(i)]}\n\`\`\``);

  return md;
}

/**
 * 儲存格裡的 <br> 或 <p> 會產生換行，把表格拆成好幾列。
 * 開頭是 | 但結尾不是 | 的行，往下接到補完為止。
 */
function mergeTableRows(md) {
  const lines = md.split('\n');
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('|') && !line.endsWith('|')) {
      let joined = 0;
      while (i + 1 < lines.length && !line.endsWith('|') && joined < 30) {
        const next = lines[++i].trim();
        joined++;
        if (next) line += ` ${next}`;
      }
    }
    out.push(line);
  }

  return out.join('\n');
}

/**
 * 把整份 HTML 轉成帶 YAML frontmatter 的 markdown。
 *
 * @param {string} html
 * @param {string} baseUrl 用來把相對連結補成絕對網址
 * @returns {Promise<{ markdown: string, title: string }>}
 */
export async function htmlToMarkdown(html, baseUrl) {
  const meta = { lang: '', title: '', description: '', canonical: '', published: '', modified: '' };
  await collectMeta(new HTMLRewriter(), meta).transform(new Response(html)).text();

  // 相對連結一律補成正式網址（用 canonical，避免 preview 網域外流到 markdown 裡）
  const base = meta.canonical || baseUrl;

  let body = '';
  for (const root of ['article', 'main', 'body']) {
    body = await convertRoot(html, root, base);
    if (body) break;
  }

  const title = decodeEntities(meta.title).replace(/\s+/g, ' ').trim();
  const fm = [
    '---',
    `title: ${yaml(title)}`,
    meta.description ? `description: ${yaml(decodeEntities(meta.description))}` : null,
    `url: ${yaml(meta.canonical || baseUrl)}`,
    meta.lang ? `lang: ${yaml(meta.lang)}` : null,
    meta.published ? `published: ${yaml(meta.published)}` : null,
    meta.modified ? `modified: ${yaml(meta.modified)}` : null,
    'source: gobaligo.id',
    '---',
  ].filter(Boolean).join('\n');

  return { markdown: `${fm}\n\n${body}\n`, title };
}

function yaml(value) {
  const v = String(value ?? '').replace(/\s+/g, ' ').trim();
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
