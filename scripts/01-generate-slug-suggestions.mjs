#!/usr/bin/env node
/**
 * 01-generate-slug-suggestions.mjs
 * 掃描舊格式檔名，用 AI 批次產生 SEO-friendly slug 建議
 *
 * Usage:
 *   node scripts/01-generate-slug-suggestions.mjs            # 全部
 *   node scripts/01-generate-slug-suggestions.mjs --limit 5  # 只跑前 5 篇測試
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const CSV_OUT = join(__dirname, 'slug-suggestions.csv');

const RE_VOCUS   = /^\d{4}-\d{2}-\d{2}-[a-f0-9]{24}$/;
const RE_SVELTIA = /^\d{4}-\d{2}-\d{2}-\d{6}$/;
const isOldFormat = s => RE_VOCUS.test(s) || RE_SVELTIA.test(s);

const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.DEEPINFRA_API_KEY;
const BATCH_SIZE  = 20;
const CONCURRENCY = 5;
const MAX_RETRIES = 3;

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

if (!API_KEY) {
  console.error('❌  請設定 DEEPSEEK_API_KEY（或 DEEPINFRA_API_KEY）環境變數');
  process.exit(1);
}

// ─── CSV helper ───────────────────────────────────────────────────────────────

function csvField(val) {
  const s = String(val ?? '');
  if (/[,"\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// ─── API ─────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an SEO expert generating URL slugs for a Bali travel blog written in Traditional Chinese.

For each article object in the JSON array, generate one concise, descriptive, SEO-friendly English URL slug.

Rules:
- ONLY lowercase letters (a-z), numbers (0-9), and hyphens (-)
- 3–6 words (hyphen-separated), ideally 4–5 words
- Include specific, identifying keywords: location names, hotel/villa/restaurant names, activity types
- AVOID overly generic terms like "bali-guide", "travel-tips", "complete-guide", "things-to-do"
- Every slug in your response MUST be unique
- Return ONLY a JSON object: {"slugs": ["slug1", "slug2", ...]}
  The array length MUST exactly equal the input array length.

Good examples of slug generation:
- "峇里島烏布三大瀑布" → "ubud-tegenungan-kanto-lampo-waterfalls"
- "Manarai Beach House 開箱" → "manarai-beach-house-nusa-dua-review"
- "水明漾平價住宿推薦" → "seminyak-budget-hotels-guide"
- "峇里島金巴蘭海鮮餐廳" → "jimbaran-seafood-restaurants-bali"
- "努沙杜瓦五星飯店整理" → "nusa-dua-luxury-hotels-list"`;

async function callAPI(articles) {
  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(articles) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed.slugs)) return parsed.slugs;
  const arr = Object.values(parsed).find(v => Array.isArray(v));
  if (arr) return arr;
  throw new Error(`回傳格式不符: ${raw.slice(0, 200)}`);
}

async function callAPIWithRetry(articles) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callAPI(articles);
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastErr;
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────

async function runPool(tasks, concurrency) {
  let idx = 0;
  const results = new Array(tasks.length);
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ─── Progress ─────────────────────────────────────────────────────────────────

function progress(done, total, ok, err) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const filled = Math.round((done / total) * 25);
  const bar = '█'.repeat(filled) + '░'.repeat(25 - filled);
  process.stdout.write(`\r  [${bar}] ${done}/${total} (${pct}%) | ✓ ${ok} | ✗ ${err}  `);
}

// ─── Slug sanitize ────────────────────────────────────────────────────────────

function sanitizeSlug(raw) {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📂 掃描 src/content/blog/ ...');

  const allFiles = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

  // 收集已存在 slug 避免衝突
  const existingSlugs = new Set();
  let skippedHasSlug = 0;
  const pending = [];

  for (const f of allFiles) {
    const ext = extname(f);
    const stem = basename(f, ext);
    const { data } = matter(readFileSync(join(BLOG_DIR, f), 'utf8'));

    if (data.slug && data.slug.trim()) {
      existingSlugs.add(data.slug.trim());
      if (isOldFormat(stem)) skippedHasSlug++;
      continue;
    }

    if (!isOldFormat(stem)) continue;

    pending.push({
      filename: stem,
      title: String(data.title ?? '').slice(0, 100),
      category: Array.isArray(data.category) ? data.category[0] : String(data.category ?? ''),
      description: String(data.description ?? '').slice(0, 120),
    });
  }

  const articles = Number.isFinite(LIMIT) ? pending.slice(0, LIMIT) : pending;

  console.log(`  舊格式總計：${pending.length + skippedHasSlug} 篇`);
  console.log(`  跳過（已有 slug）：${skippedHasSlug} 篇`);
  console.log(`  待產生 slug：${articles.length} 篇${Number.isFinite(LIMIT) ? ` (--limit ${LIMIT})` : ''}`);

  if (articles.length === 0) {
    console.log('\n✅ 無待處理文章');
    return;
  }

  // 分批
  const batches = [];
  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    batches.push(articles.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📡 API 呼叫（${batches.length} 批 × ${BATCH_SIZE}，並發 ${CONCURRENCY}）\n`);
  progress(0, articles.length, 0, 0);

  const resultMap = new Map();   // filename → raw slug from API
  const errorFiles = [];
  let done = 0, okCount = 0;

  await runPool(batches.map(batch => async () => {
    const input = batch.map(a => ({
      title: a.title,
      category: a.category,
      description: a.description,
    }));

    try {
      const slugs = await callAPIWithRetry(input);
      for (let i = 0; i < batch.length; i++) {
        const slug = sanitizeSlug(slugs[i]);
        resultMap.set(batch[i].filename, slug);
        if (slug) okCount++; else errorFiles.push(batch[i].filename);
      }
    } catch {
      for (const a of batch) {
        resultMap.set(a.filename, '');
        errorFiles.push(a.filename);
      }
    }

    done += batch.length;
    progress(done, articles.length, okCount, errorFiles.length);
  }), CONCURRENCY);

  process.stdout.write('\n\n');

  // 去重：批次間可能衝突，加數字後綴
  const usedSlugs = new Set(existingSlugs);
  const finalSlugs = new Map();

  for (const { filename } of articles) {
    let slug = resultMap.get(filename) ?? '';
    if (!slug) { finalSlugs.set(filename, ''); continue; }

    if (usedSlugs.has(slug)) {
      let n = 2;
      while (usedSlugs.has(`${slug}-${n}`)) n++;
      slug = `${slug}-${n}`;
    }
    usedSlugs.add(slug);
    finalSlugs.set(filename, slug);
  }

  // 寫 CSV（UTF-8 BOM，Excel 才能正確顯示中文）
  const header = ['filename', 'title', 'category', 'ai_slug', 'final_slug', 'status']
    .map(csvField).join(',');

  const rows = articles.map(a => {
    const aiSlug = finalSlugs.get(a.filename) ?? '';
    return [
      a.filename,
      a.title,
      a.category,
      aiSlug,
      aiSlug,            // final_slug 預設同 ai_slug，讓人工修改
      aiSlug ? 'pending' : 'api_error',
    ].map(csvField).join(',');
  });

  writeFileSync(CSV_OUT, '﻿' + [header, ...rows].join('\n') + '\n', 'utf8');

  // 統計
  const apiErrorCount = [...finalSlugs.values()].filter(s => !s).length;
  console.log('── 完成 ──────────────────────────────────────────────────────────');
  console.log(`✅  成功：${articles.length - apiErrorCount} 篇`);
  if (apiErrorCount > 0) {
    console.log(`❌  API 失敗：${apiErrorCount} 篇（final_slug 留空，status=api_error）`);
  }
  console.log(`📄  輸出：scripts/slug-suggestions.csv\n`);
  console.log('== 步驟 2：人工確認 CSV ==');
  console.log('  1. 用 Excel 或文字編輯器開啟 scripts/slug-suggestions.csv');
  console.log('  2. 確認 final_slug 欄位，需要修改就直接改');
  console.log('  3. 確認 OK 的列把 status 改成 ready，不想改的改成 skip');
  console.log('  4. 存檔後跑：node scripts/03-apply-slugs.mjs （預覽）\n');
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
