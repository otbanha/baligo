#!/usr/bin/env node
/**
 * 產生給 AI agent 用的探索檔案：
 *   public/llms.txt                                  站台導覽 + 重點文章清單
 *   public/.well-known/agent-skills/index.json       Agent Skills 探索索引（含 sha256）
 *
 * 必須排在 generate-article-index.mjs 之後跑（llms.txt 的內容來自文章索引）。
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const SITE = 'https://gobaligo.id';

// 每個分類在 llms.txt 裡最多列幾篇（索引本身已按 pubDate 由新到舊排序）
const PER_CATEGORY = 20;

// 出現順序＝對旅客的實用程度，不是文章數量
const CATEGORY_ORDER = [
  '新手指南',
  '簽證通關',
  '住宿推薦',
  '峇里島分區攻略',
  '叫車包車',
  '美食景點活動',
  '家庭親子',
  '旅行技巧',
  '套裝行程',
  '遊記分享',
];

const TOOL_PAGES = [
  ['/trip-planner/', '峇里島行程規劃工具：選天數與興趣，產生可調整的每日行程'],
  ['/bali-budget-calculator/', '峇里島預算試算：住宿、交通、餐飲、門票的花費估算'],
  ['/tickets/', '峇里島門票與一日遊比價表'],
  ['/bali-hotels/', '住宿主題整理：分區、房型、適合客群'],
  ['/map/', '峇里島實用地圖：ATM、換錢所、醫院、超市、租機車'],
  ['/weather/', '峇里島天氣與乾濕季'],
  ['/news/', '峇里島新聞存檔（簽證、稅費、交通政策變動）'],
  ['/ask/', 'AI 問答（站內內容檢索，供人使用，非公開 API）'],
  ['/about/', '關於站長與網站'],
];

const DATA_ENDPOINTS = [
  ['/article-index.json', '全站文章索引（JSON，含標題、網址、分類、標籤、摘要）'],
  ['/api/exchange-rate', '峇里島換匯參考匯率（JSON）'],
  ['/openapi.json', 'OpenAPI 3.1 規格'],
  ['/.well-known/api-catalog', 'API 目錄（RFC 9727，application/linkset+json）'],
  ['/.well-known/agent-skills/index.json', 'Agent Skills 探索索引'],
  ['/docs/api/', '開放資料與 agent 介面說明（人看的版本）'],
  ['/sitemap-index.xml', '全站 sitemap（含四個語系）'],
  ['/rss.xml', 'RSS'],
];

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function buildLlmsTxt(articles) {
  const lines = [];

  lines.push('# Go Bali Go 峇里島旅遊攻略');
  lines.push('');
  lines.push(
    '> 由長住峇里島的站長「小傑爸」（YouTube 頻道「小傑印尼」）維護的峇里島旅遊內容站，' +
    `${articles.length} 篇實地攻略，涵蓋住宿、簽證、交通、包車、分區選擇、景點美食、親子與行程規劃。` +
    '主語言繁體中文，另有英文 /en/、简体中文 /zh-cn/、粵語 /zh-hk/ 版本，slug 相同。'
  );
  lines.push('');
  lines.push('每一個頁面都有 markdown 版本：帶 `Accept: text/markdown` 請求，或在網址後面加 `.md`');
  lines.push('（例如 `https://gobaligo.id/blog/{slug}.md`）。回應會帶 `x-markdown-tokens` 供估算長度。');
  lines.push('');
  lines.push('引用內容請標註「Go Bali Go（gobaligo.id）」並保留原文連結。');
  lines.push('簽證規費、稅費這類資訊會變動，請以文章 frontmatter 的 `modified` 日期判斷時效。');
  lines.push('');

  const byCategory = new Map();
  for (const article of articles) {
    for (const cat of article.category || []) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(article);
    }
  }

  for (const cat of CATEGORY_ORDER) {
    const list = (byCategory.get(cat) || []).slice(0, PER_CATEGORY);
    if (!list.length) continue;
    lines.push(`## ${cat}`);
    lines.push('');
    for (const a of list) {
      const desc = clean(a.description) || clean(a.snippet).slice(0, 90);
      lines.push(`- [${clean(a.title)}](${SITE}${a.url})${desc ? `: ${desc}` : ''}`);
    }
    lines.push('');
  }

  lines.push('## 工具與主題頁');
  lines.push('');
  for (const [path, desc] of TOOL_PAGES) {
    lines.push(`- [${SITE}${path}](${SITE}${path}): ${desc}`);
  }
  lines.push('');

  lines.push('## Optional');
  lines.push('');
  lines.push('機器可讀的資料端點，需要結構化資料時再抓：');
  lines.push('');
  for (const [path, desc] of DATA_ENDPOINTS) {
    lines.push(`- [${SITE}${path}](${SITE}${path}): ${desc}`);
  }
  lines.push('');

  return lines.join('\n');
}

function buildSkillsIndex() {
  const skillsDir = join(PUBLIC, '.well-known', 'agent-skills');
  if (!existsSync(skillsDir)) return null;

  const skills = [];
  for (const name of readdirSync(skillsDir).sort()) {
    const dir = join(skillsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) continue;

    const raw = readFileSync(skillFile);
    const fm = raw.toString('utf8').split('---')[1] || '';
    const descMatch = fm.match(/^description:\s*(.+)$/m);

    skills.push({
      name,
      type: 'skill-md',
      description: descMatch ? clean(descMatch[1]) : '',
      url: `${SITE}/.well-known/agent-skills/${name}/SKILL.md`,
      digest: `sha256:${createHash('sha256').update(raw).digest('hex')}`,
    });
  }

  return {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    version: '0.2.0',
    updated: new Date().toISOString().slice(0, 10),
    publisher: {
      name: 'Go Bali Go 峇里島旅遊攻略',
      url: SITE,
    },
    skills,
  };
}

// ── 執行 ──────────────────────────────────────────────────────────
const indexPath = join(PUBLIC, 'article-index.json');
if (!existsSync(indexPath)) {
  console.error('[agent-files] 找不到 public/article-index.json，請先跑 generate-article-index.mjs');
  process.exit(1);
}

const articles = JSON.parse(readFileSync(indexPath, 'utf8'));
const llms = buildLlmsTxt(articles);
writeFileSync(join(PUBLIC, 'llms.txt'), llms + '\n');
console.log(`[agent-files] llms.txt  ${llms.split('\n').length} 行 / ${(llms.length / 1024).toFixed(1)} KB`);

const skillsIndex = buildSkillsIndex();
if (skillsIndex) {
  const out = join(PUBLIC, '.well-known', 'agent-skills', 'index.json');
  writeFileSync(out, JSON.stringify(skillsIndex, null, 2) + '\n');
  console.log(`[agent-files] agent-skills/index.json  ${skillsIndex.skills.length} 個 skill`);
}
