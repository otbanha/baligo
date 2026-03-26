#!/usr/bin/env node
/**
 * translate.mjs — 自動翻譯腳本
 * 來源：src/content/blog/*.md (zh-tw)
 * 輸出：src/content/zh-cn/ | src/content/zh-hk/ | src/content/en/
 *
 * 用法：
 *   node scripts/translate.mjs                   # 翻譯所有三種語言
 *   node scripts/translate.mjs --lang zh-cn      # 只翻譯簡體中文
 *   node scripts/translate.mjs --dry-run         # 預覽模式，不呼叫 API
 *   node scripts/translate.mjs --file 2024-07-18-xxx.md  # 只翻譯指定檔案
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// ── 設定 ──────────────────────────────────────────────────────────────────────

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// Video URL 保留（YouTube / Instagram / TikTok）
const VIDEO_RES = [
  /https?:\/\/(?:www\.)?youtube\.com\/watch\?[^\s\)"'`\]]+/g,
  /https?:\/\/youtu\.be\/[^\s\)"'`\]]+/g,
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel)\/[A-Za-z0-9_-]+\/?[^\s\)"'`\]]*/g,
  /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s\)"'`\]]+\/video\/\d+[^\s\)"'`\]]*/g,
];

function extractVideoUrls(text) {
  const saved = [];
  let out = text;
  for (const re of VIDEO_RES) {
    out = out.replace(re, (match) => {
      const idx = saved.length;
      saved.push(match);
      return `__VID${idx}__`;
    });
  }
  return { text: out, saved };
}

function restoreVideoUrls(text, saved) {
  if (!saved.length) return text;
  return text.replace(/__VID(\d+)__/g, (_, i) => saved[parseInt(i, 10)] ?? '');
}
const CACHE_FILE = '.translation-cache.json';
const BATCH_SIZE = 10; // 每次 API 呼叫最多幾個段落

const ALL_LANGS = ['zh-cn', 'zh-hk', 'en'];
const BLOCK_LANGS = ['zh-cn', 'en']; // blocks 不需要 zh-hk

const SYSTEM_PROMPTS = {
  'zh-cn': `你是專業翻譯，將繁體中文翻譯成簡體中文。
要求：
1. 使用中國大陸慣用詞彙和地名（如峇里島→巴厘岛、烏布→乌布、廟宇→寺庙、計程車→出租车）
2. 地名統一對照（不論原文寫法）：長谷/倉古/蒼古/坎古→坎古、水明漾→水明漾、庫塔→库塔、沙努爾→沙努尔、金巴蘭→金巴兰、努沙杜瓦→努沙杜瓦
3. 語氣自然，符合大陸讀者習慣
4. 金額換算：將台幣（NT$、新台幣、台幣）金額換算成美金（USD），匯率 31:1，四捨五入至整數，例如 NT$3,100 → USD$100
5. 文字中若出現 __VID0__、__VID1__ 等佔位符，必須原封不動保留，不可翻譯或修改
6. 以 JSON 物件回傳，格式：{"translations": ["翻譯1", "翻譯2", ...]}
   陣列長度必須與輸入相同`,

  'zh-hk': `你是專業翻譯，將繁體中文翻譯成香港粵語書寫體。
要求：
1. 使用香港慣用詞彙（如的士、巴士、超市、埋單、雪糕）
2. 地名統一對照（不論原文寫法）：長谷/倉古/蒼古/坎古→坎古、峇里島→峇里島、烏布→烏布、水明漾→水明漾、庫塔→庫塔、沙努爾→沙努爾、金巴蘭→金巴蘭、努沙杜瓦→努沙杜瓦
3. 語氣自然口語化，符合香港讀者習慣
4. 金額換算：將台幣（NT$、新台幣、台幣）金額換算成美金（USD），匯率 31:1，四捨五入至整數，例如 NT$3,100 → USD$100
5. 文字中若出現 __VID0__、__VID1__ 等佔位符，必須原封不動保留，不可翻譯或修改
6. 以 JSON 物件回傳，格式：{"translations": ["翻譯1", "翻譯2", ...]}
   陣列長度必須與輸入相同`,

  'en': `You are a professional translator. Translate Traditional Chinese travel content to natural English.
Requirements:
1. Use standard English place names. Important mappings (regardless of how they appear in source):
   峇里島→Bali, 烏布→Ubud, 庫塔→Kuta, 水明漾→Seminyak, 沙努爾→Sanur, 金巴蘭→Jimbaran, 努沙杜瓦→Nusa Dua
   長谷/倉古/蒼古/坎古→Canggu (these all refer to the same place)
2. Natural, engaging travel writing style
3. Currency conversion: Convert all NT$ / 新台幣 / 台幣 amounts to USD at a rate of 31:1, rounded to the nearest dollar. Example: NT$3,100 → USD$100
4. If the text contains placeholders like __VID0__, __VID1__, keep them exactly as-is — do not translate or modify them
5. Return JSON: {"translations": ["translation1", "translation2", ...]}
   Array length must match input`,
};

// ── CLI 引數解析 ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isBlocks = args.includes('--blocks');
const SOURCE_DIR = isBlocks ? 'src/content/blocks' : 'src/content/blog';
const langIdx = args.indexOf('--lang');
const targetLangs = langIdx !== -1 ? [args[langIdx + 1]] : (isBlocks ? BLOCK_LANGS : ALL_LANGS);
const fileIdx = args.indexOf('--file');
const targetFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

// ── 快取 ─────────────────────────────────────────────────────────────────────

let cache = { paragraphs: {}, files: {} };
if (existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
    cache.paragraphs ??= {};
    cache.files ??= {};
  } catch { /* ignore corrupt cache */ }
}

function saveCache() {
  if (!isDryRun) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ── 工具函式 ─────────────────────────────────────────────────────────────────

function md5(text) {
  return createHash('md5').update(text).digest('hex');
}

/**
 * 將 markdown body 分割成「可翻譯段落」和「保留段落」。
 * 返回 segment 陣列：{ type: 'text'|'code'|'image'|'block'|'empty', content: string }
 */
function segmentBody(body) {
  const segments = [];
  // 先把 code block 整個換成佔位符
  const preserved = new Map();
  let pidx = 0;

  let processed = body.replace(/```[\s\S]*?```/g, (match) => {
    const key = `\x00CODE${pidx++}\x00`;
    preserved.set(key, match);
    return key;
  });

  // 把 {{block:xxx}} 也換掉
  processed = processed.replace(/\{\{block:[^}]+\}\}/g, (match) => {
    const key = `\x00BLOCK${pidx++}\x00`;
    preserved.set(key, match);
    return key;
  });

  // 按雙換行分割段落
  const paras = processed.split(/\n\n/);

  for (const para of paras) {
    const trimmed = para.trim();

    if (!trimmed) {
      segments.push({ type: 'empty', content: para });
      continue;
    }

    // 佔位符（code block / block tag）
    if (/^\x00(CODE|BLOCK)\d+\x00$/.test(trimmed)) {
      const original = preserved.get(trimmed) ?? para;
      segments.push({ type: 'code', content: original });
      continue;
    }

    // 純圖片行
    if (/^!\[.*?\]\(.*?\)$/.test(trimmed)) {
      segments.push({ type: 'image', content: para });
      continue;
    }

    // 一般文字
    segments.push({ type: 'text', content: para });
  }

  return segments;
}

/**
 * 從 segment 陣列重建 body。
 * translatedMap: Map<index_of_text_segment, translated_string>
 */
function rebuildBody(segments, translatedMap) {
  let textIdx = 0;
  return segments.map(seg => {
    if (seg.type === 'text') {
      const translated = translatedMap.get(textIdx++);
      return translated ?? seg.content;
    }
    if (seg.type === 'empty') return '';
    textIdx += 0; // non-text doesn't consume index
    return seg.content;
  }).join('\n\n');
}

// ── DeepSeek API ──────────────────────────────────────────────────────────────

async function callDeepSeek(texts, lang) {
  if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY 未設定');

  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[lang] },
        { role: 'user', content: JSON.stringify(texts) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw);

  // 支援 {"translations":[...]} 或任何 array value
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.translations)) return parsed.translations;
  const arrVal = Object.values(parsed).find(v => Array.isArray(v));
  if (arrVal) return arrVal;

  throw new Error(`API 回傳格式不符：${raw.slice(0, 300)}`);
}

/**
 * 翻譯文字陣列，使用段落級快取 + BATCH_SIZE 批次。
 */
async function translateTexts(texts, lang) {
  const results = new Array(texts.length).fill(null);
  const needTranslate = []; // { origIdx, text, stripped, videosSaved }

  for (let i = 0; i < texts.length; i++) {
    const cacheKey = `${md5(texts[i])}:${lang}`;
    if (cache.paragraphs[cacheKey]) {
      results[i] = cache.paragraphs[cacheKey];
    } else {
      // 提取 video URL，換成佔位符後再送翻譯
      const { text: stripped, saved: videosSaved } = extractVideoUrls(texts[i]);
      needTranslate.push({ origIdx: i, text: texts[i], stripped, videosSaved });
    }
  }

  if (needTranslate.length === 0) return results;

  if (isDryRun) {
    const chars = needTranslate.reduce((s, t) => s + t.text.length, 0);
    console.log(`    [dry-run] ${needTranslate.length} 段落需翻譯（${chars} 字元）`);
    for (const { text } of needTranslate.slice(0, 3)) {
      console.log(`      "${text.slice(0, 60).replace(/\n/g, '↵')}..."`);
    }
    return results.map((r, i) => r ?? texts[i]);
  }

  // 批次呼叫
  for (let start = 0; start < needTranslate.length; start += BATCH_SIZE) {
    const batch = needTranslate.slice(start, start + BATCH_SIZE);
    const batchTexts = batch.map(b => b.stripped); // 送已去除 video URL 的版本

    let translated;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        translated = await callDeepSeek(batchTexts, lang);
        break;
      } catch (e) {
        if (attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }
    }

    for (let j = 0; j < batch.length; j++) {
      const { origIdx, text, videosSaved } = batch[j];
      // 翻譯結果還原 video URL
      const raw = translated[j] ?? text;
      const result = restoreVideoUrls(raw, videosSaved);
      cache.paragraphs[`${md5(text)}:${lang}`] = result;
      results[origIdx] = result;
    }
    saveCache();
  }

  return results;
}

// ── 主要翻譯邏輯 ─────────────────────────────────────────────────────────────

async function translateFile(filename, lang) {
  const srcPath = join(SOURCE_DIR, filename);
  const destPath = isBlocks
    ? join(`src/content/blocks/${lang}`, filename)
    : join(`src/content/${lang}`, filename);
  const srcContent = readFileSync(srcPath, 'utf-8');
  const srcHash = md5(srcContent);
  const fileCacheKey = `${isBlocks ? 'blocks:' : ''}${filename}:${lang}`;

  // 跳過未變動的已翻譯檔案
  if (!isDryRun && existsSync(destPath) && cache.files[fileCacheKey] === srcHash) {
    return 'cached';
  }

  const { data: fm, content: body } = matter(srcContent);

  // Frontmatter 可翻譯欄位
  const fmTranslatables = [];
  const fmKeys = [];
  if (fm.title) { fmTranslatables.push(fm.title); fmKeys.push('title'); }
  if (fm.description) { fmTranslatables.push(fm.description); fmKeys.push('description'); }

  // Body 分割
  const segments = segmentBody(body);
  const textSegments = []; // { segIdx, content }
  segments.forEach((seg, i) => {
    if (seg.type === 'text' && seg.content.trim()) textSegments.push({ segIdx: i, content: seg.content });
  });

  // 全部要翻譯的文字
  const allTexts = [...fmTranslatables, ...textSegments.map(s => s.content)];

  if (allTexts.length === 0) return 'empty';

  const translated = await translateTexts(allTexts, lang);

  // 更新 frontmatter
  const newFm = { ...fm, lang };
  fmKeys.forEach((key, i) => { newFm[key] = translated[i] ?? fm[key]; });

  // 重建 body
  const translatedMap = new Map();
  let textSegIdx = 0;
  let segTextCounter = 0;
  for (const seg of segments) {
    if (seg.type === 'text' && seg.content.trim()) {
      const transIdx = fmTranslatables.length + segTextCounter;
      translatedMap.set(textSegIdx, translated[transIdx] ?? seg.content);
      segTextCounter++;
    }
    textSegIdx++;
  }

  // rebuildBody 用 segment index
  let tIdx = 0;
  const newBody = segments.map(seg => {
    if (seg.type === 'text' && seg.content.trim()) {
      const transIdx = fmTranslatables.length + tIdx;
      tIdx++;
      return translated[transIdx] ?? seg.content;
    }
    if (seg.type === 'empty') return '';
    return seg.content;
  }).join('\n\n');

  const newContent = matter.stringify(newBody, newFm);

  if (!isDryRun) {
    writeFileSync(destPath, newContent, 'utf-8');
    cache.files[fileCacheKey] = srcHash;
    saveCache();
  }

  return 'translated';
}

// ── 費用估算 ─────────────────────────────────────────────────────────────────

function estimateCost(files) {
  let totalChars = 0;
  for (const f of files) {
    totalChars += readFileSync(join(SOURCE_DIR, f), 'utf-8').length;
  }
  // DeepSeek: CJK ~1.5 char/token, input $0.07/M, output $0.28/M
  // Assume 1:1 input:output ratio, output is roughly same length
  const inputTokens = totalChars / 1.5;
  const outputTokens = inputTokens;
  const costPerLang = (inputTokens * 0.07 + outputTokens * 0.28) / 1_000_000;
  return { totalChars, inputTokens: Math.round(inputTokens), costPerLang };
}

// ── 並發控制 ─────────────────────────────────────────────────────────────────

const CONCURRENCY = parseInt(process.env.TRANSLATE_CONCURRENCY ?? '40', 10);

async function runPool(tasks, concurrency) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

async function main() {
  const allFiles = readdirSync(SOURCE_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const files = targetFile ? allFiles.filter(f => f.includes(targetFile)) : allFiles;

  if (files.length === 0) {
    console.log('找不到符合條件的檔案');
    process.exit(1);
  }

  // 確保目標資料夾存在
  for (const lang of targetLangs) {
    const targetDir = isBlocks ? `src/content/blocks/${lang}` : `src/content/${lang}`;
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
  }

  const { totalChars, inputTokens, costPerLang } = estimateCost(files);

  console.log('\n📚 gobaligo 翻譯腳本');
  console.log('─'.repeat(50));
  console.log(`來源檔案：${files.length} 篇`);
  console.log(`目標語言：${targetLangs.join(', ')}`);
  console.log(`並發數：${CONCURRENCY}`);
  console.log(`估計字元：~${totalChars.toLocaleString()} 字元 / ~${inputTokens.toLocaleString()} tokens`);
  console.log(`估計費用：~$${(costPerLang * targetLangs.length).toFixed(3)} USD（全部未快取）`);
  if (isDryRun) console.log('\n🔍 DRY RUN — 不會呼叫 API\n');
  console.log('─'.repeat(50));

  // 展開所有 (file × lang) 任務
  const tasks = [];
  for (const lang of targetLangs) {
    for (const file of files) {
      tasks.push({ file, lang });
    }
  }

  let translated = 0, cached = 0, errors = 0;
  const total = tasks.length;
  let done = 0;

  await runPool(tasks.map(({ file, lang }) => async () => {
    try {
      const result = await translateFile(file, lang);
      done++;
      if (result === 'cached') {
        cached++;
      } else if (result === 'translated') {
        translated++;
        console.log(`  [${done}/${total}] ✓ ${lang} / ${file.slice(0, 40)}`);
      }
    } catch (e) {
      done++;
      errors++;
      console.log(`  [${done}/${total}] ✗ ${lang} / ${file.slice(0, 30)} — ${e.message.slice(0, 50)}`);
    }
  }), CONCURRENCY);

  console.log('\n─'.repeat(50));
  console.log(`✅ 完成｜翻譯：${translated}，快取跳過：${cached}，錯誤：${errors}\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
