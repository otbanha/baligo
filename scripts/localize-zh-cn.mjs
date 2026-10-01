#!/usr/bin/env node
/**
 * localize-zh-cn.mjs
 *
 * astro build 之後、pagefind 之前執行：把 dist/zh-cn/ 底下所有 HTML 的「可見文字」
 * 做一次繁→簡轉換，並把台灣用語「峇里」換成大陸用語「巴厘」。
 *
 * 為什麼需要：簡中文章是 AI 從繁中翻的，但連結文字、圖片 alt、站內共用元件
 * 常殘留繁體（例如「峇里島攜帶中藥粉…」），seo-keywords.ts 的簡中標題後綴也寫成
 * 「峇里岛」。大陸使用者在百度／360／搜狗搜的是「巴厘岛」，這些頁面等於沒吃到主關鍵字。
 *
 * 只動這些地方：
 *   - 文字節點（<script>/<style>/註解內不動）
 *   - alt / title / aria-label / placeholder / content 屬性（看起來像網址的 content 跳過）
 *   - JSON-LD 內的字串值（看起來像網址的跳過）
 * href / src / data-* 一律不動，所以 /zh-cn/blog/category/峇里島分區攻略/ 之類的網址不受影響。
 *
 * 轉換設定與 Header.astro 站內搜尋相同（opencc tw→cn + 兩岸用語對照）。
 */

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import * as OpenCC from 'opencc-js';

const ROOT = join(process.cwd(), 'dist', 'zh-cn');

const t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });
const terms = OpenCC.CustomConverter([['峇里', '巴厘']]);

// 刻意保留繁體的字串（語言切換選單上的語言名稱）
const PRESERVE = new Set(['繁中', '繁體中文（台灣）', '廣東話（香港）', '粵語']);

const CJK_RE = /[㐀-鿿]/;
const URL_LIKE_RE = /^\s*(?:https?:|\/|#|mailto:|tel:)/i;

function convert(text) {
  if (!CJK_RE.test(text) || PRESERVE.has(text.trim())) return text;
  return terms(t2s(text));
}

const ATTR_RE = /(\s(?:alt|title|aria-label|placeholder|content)\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi;

function convertTag(tag) {
  if (!CJK_RE.test(tag)) return tag;
  return tag.replace(ATTR_RE, (m, pre, dq, sq) => {
    const val = dq ?? sq;
    if (URL_LIKE_RE.test(val)) return m;
    const q = dq !== undefined ? '"' : "'";
    return `${pre}${q}${convert(val)}${q}`;
  });
}

const JSON_STRING_RE = /"((?:[^"\\]|\\.)*)"/g;

function convertJsonLd(json) {
  return json.replace(JSON_STRING_RE, (m, inner) =>
    URL_LIKE_RE.test(inner) ? m : `"${convert(inner)}"`,
  );
}

// 依序切出：<script>…</script>、<style>…</style>、註解、其他標籤、文字
const TOKEN_RE =
  /(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)|<style\b[^>]*>[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<[^>]+>|[^<]+/gi;

function localizeHtml(html) {
  return html.replace(TOKEN_RE, (tok, open, body, close) => {
    if (open !== undefined) {
      if (/type\s*=\s*["']?application\/ld\+json/i.test(open)) {
        return `${convertTag(open)}${convertJsonLd(body)}${close}`;
      }
      return tok;
    }
    if (tok.startsWith('<!--') || /^<style\b/i.test(tok)) return tok;
    if (tok.startsWith('<')) return convertTag(tok);
    return convert(tok);
  });
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (name.endsWith('.html')) yield p;
  }
}

function main() {
  if (!existsSync(ROOT)) {
    console.log('ℹ️  找不到 dist/zh-cn，略過簡中在地化。');
    return;
  }
  let files = 0;
  let changed = 0;
  for (const file of walk(ROOT)) {
    files++;
    const html = readFileSync(file, 'utf-8');
    const out = localizeHtml(html);
    if (out !== html) {
      writeFileSync(file, out);
      changed++;
    }
  }
  console.log(`✅ 簡中在地化：掃描 ${files} 個 HTML，修改 ${changed} 個（繁→簡、峇里→巴厘）`);
}

main();
