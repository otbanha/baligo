/**
 * Build RAG index for the gobaligo.id chatbot.
 *
 * Reads zh-TW articles from src/content/blog/, splits each into H2/H3
 * heading sections, chunks those sections to ~300-500 tokens (50 token
 * overlap), embeds each chunk with Workers AI (@cf/baai/bge-m3), and
 * upserts the vectors into the Cloudflare Vectorize index "gobaligo-chatbot".
 *
 * Incremental: content hash per article is cached in
 * .chatbot-index-cache.json so unchanged articles are skipped on rerun
 * (same approach as scripts/translate.mjs).
 *
 * Requires env vars:
 *   WORKERS_AI_API_TOKEN   - API token with "Workers AI: Edit" permission
 *   WORKERS_AI_ACCOUNT_ID  - optional, defaults to the account already used by this project
 *
 * Usage:
 *   node scripts/build-chatbot-index.mjs --pilot   # 20 articles (5 each: 住宿推薦/峇里島分區攻略/叫車包車/簽證通關)
 *   node scripts/build-chatbot-index.mjs           # all zh-TW articles
 *   node scripts/build-chatbot-index.mjs --force   # ignore cache, re-embed everything
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const blogDir = join(root, 'src/content/blog');
const cacheFile = join(root, '.chatbot-index-cache.json');

// 沒有安裝 dotenv，手動讀取 .env（只補齊尚未設定的變數，不覆蓋現有 shell 環境變數）
function loadDotEnv() {
  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = (m[2] || '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}
loadDotEnv();

const INDEX_NAME = 'gobaligo-chatbot';
const EMBED_MODEL = '@cf/baai/bge-m3';
const CHUNK_TARGET_TOKENS = 450;
const CHUNK_MAX_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;
const UPSERT_BATCH_SIZE = 500; // stay under wrangler's 1000/5000 limits comfortably

const args = process.argv.slice(2);
const isPilot = args.includes('--pilot');
const isForce = args.includes('--force');

const ACCOUNT_ID = process.env.WORKERS_AI_ACCOUNT_ID || '8539451c59b0447bc90fea01f29d10c8';
const API_TOKEN = process.env.WORKERS_AI_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ 缺少 WORKERS_AI_API_TOKEN 環境變數（需要 Workers AI: Edit 權限的 API Token）');
  process.exit(1);
}

const PILOT_CATEGORIES = ['住宿推薦', '峇里島分區攻略', '叫車包車', '簽證通關'];
const PILOT_PER_CATEGORY = 5;

// ── Frontmatter parsing (mirrors scripts/generate-article-index.mjs) ─────────
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  match[1].split('\n').forEach(line => {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) return;
    const [, key, val] = m;
    if (val.startsWith('[')) {
      try { fm[key] = JSON.parse(val.replace(/'/g, '"')); } catch { fm[key] = []; }
    } else if (val.startsWith('"') || val.startsWith("'")) {
      fm[key] = val.slice(1, -1);
    } else {
      fm[key] = val;
    }
  });
  return fm;
}

function parseYamlList(content, key) {
  const regex = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm');
  const m = content.match(regex);
  if (!m) return null;
  return m[1].match(/^\s+-\s+(.+)$/mg)?.map(l => l.replace(/^\s+-\s+/, '').trim()) || [];
}

function slugifyFilename(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Chunking ──────────────────────────────────────────────────────────────
// Rough token estimate: CJK chars ≈ 1 token each, ASCII words ≈ 1.3 tokens each.
// Good enough for sizing chunks; not used for billing (DeepInfra/Workers AI report exact usage).
function estimateTokens(text) {
  const cjk = (text.match(/[一-鿿]/g) || []).length;
  const rest = text.replace(/[一-鿿]/g, ' ');
  const words = rest.split(/\s+/).filter(Boolean).length;
  return cjk + Math.ceil(words * 1.3);
}

function cleanBody(bodyRaw) {
  return bodyRaw
    .replace(/\{\{block:[^}]+\}\}/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
}

/** 依 H2/H3 標題切段：[{ heading, text }] */
function splitByHeadings(body, articleTitle) {
  const lines = body.split('\n');
  const sections = [];
  let current = { heading: articleTitle, text: [] };
  for (const line of lines) {
    const m = line.match(/^(##|###)\s+(.+)$/);
    if (m) {
      if (current.text.some(l => l.trim())) sections.push(current);
      current = { heading: m[2].trim(), text: [] };
    } else {
      current.text.push(line);
    }
  }
  if (current.text.some(l => l.trim())) sections.push(current);
  return sections.map(s => ({ heading: s.heading, text: s.text.join('\n').trim() })).filter(s => s.text);
}

/** 把單一超長段落（無空行分隔）依句子邊界再切開，避免整段變成一個超大 chunk */
function splitOversizedParagraph(para) {
  if (estimateTokens(para) <= CHUNK_MAX_TOKENS) return [para];
  const sentences = para.split(/(?<=[。！？\n])/).filter(s => s.trim());
  const pieces = [];
  let buf = '';
  for (const s of sentences) {
    if (buf && estimateTokens(buf + s) > CHUNK_MAX_TOKENS) {
      pieces.push(buf.trim());
      buf = s;
    } else {
      buf += s;
    }
  }
  if (buf.trim()) pieces.push(buf.trim());
  return pieces.length ? pieces : [para];
}

/** 將單一 section 切成 300-500 token 的 chunk，相鄰 overlap ~50 token */
function chunkSection(text) {
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    .flatMap(splitOversizedParagraph);
  const chunks = [];
  let current = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length === 0) return;
    chunks.push(current.join('\n\n'));
  };

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    if (currentTokens > 0 && currentTokens + paraTokens > CHUNK_MAX_TOKENS) {
      flush();
      // overlap: carry trailing ~50 tokens (last paragraph) into next chunk
      const overlapPara = current[current.length - 1];
      const overlapTokens = overlapPara ? estimateTokens(overlapPara) : 0;
      current = overlapTokens <= CHUNK_OVERLAP_TOKENS * 2 && overlapPara ? [overlapPara] : [];
      currentTokens = current.length ? estimateTokens(current[0]) : 0;
    }
    current.push(para);
    currentTokens += paraTokens;
    if (currentTokens >= CHUNK_TARGET_TOKENS) {
      flush();
      current = [];
      currentTokens = 0;
    }
  }
  flush();
  return chunks.filter(c => estimateTokens(c) >= 20); // drop trivial fragments
}

// ── Load articles ─────────────────────────────────────────────────────────
function loadArticles() {
  const files = readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
  const articles = [];
  for (const file of files) {
    const id = file.replace(/\.mdx?$/, '');
    const raw = readFileSync(join(blogDir, file), 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm.title) continue;
    if (fm.private === 'true' || fm.private === true) continue;

    const fmBlock = raw.split('---').slice(0, 2).join('---');
    const category = parseYamlList(fmBlock, 'category')
      || (Array.isArray(fm.category) ? fm.category : (fm.category ? [fm.category] : []));

    const slugId = fm.slug || slugifyFilename(id);
    const bodyRaw = raw.split(/^---$/m).slice(2).join('---');

    articles.push({
      file,
      id: slugId,
      title: fm.title,
      url: `/blog/${slugId}/`,
      category: Array.isArray(category) ? category : [category].filter(Boolean),
      pubDate: fm.pubDate || '2000-01-01',
      body: cleanBody(bodyRaw),
      contentHash: createHash('md5').update(raw).digest('hex'),
    });
  }
  return articles;
}

function selectPilot(articles) {
  const picked = [];
  for (const cat of PILOT_CATEGORIES) {
    const matches = articles
      .filter(a => a.category.includes(cat))
      .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
      .slice(0, PILOT_PER_CATEGORY);
    picked.push(...matches);
  }
  return picked;
}

// ── Embedding ─────────────────────────────────────────────────────────────
async function embedBatch(texts) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${EMBED_MODEL}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ text: texts }),
    }
  );
  if (!res.ok) {
    throw new Error(`Workers AI embedding failed: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(`Workers AI error: ${JSON.stringify(json.errors)}`);
  return json.result.data; // number[][]
}

// ── Vectorize (via wrangler CLI — reuses existing OAuth login) ──────────────
// Strip WORKERS_AI_API_TOKEN/ACCOUNT_ID from the child env: that token only has
// Workers AI permission, and its presence makes wrangler switch away from the
// account's own OAuth login (which already has Vectorize access).
function wranglerEnv() {
  const env = { ...process.env };
  delete env.WORKERS_AI_API_TOKEN;
  delete env.WORKERS_AI_ACCOUNT_ID;
  return env;
}

function ensureIndex(dimensions) {
  try {
    execFileSync('npx', ['wrangler', 'vectorize', 'get', INDEX_NAME], { cwd: root, stdio: 'pipe', env: wranglerEnv() });
    console.log(`ℹ️  Vectorize index "${INDEX_NAME}" 已存在`);
  } catch {
    console.log(`🆕 建立 Vectorize index "${INDEX_NAME}"（dimensions=${dimensions}, metric=cosine）`);
    execFileSync('npx', [
      'wrangler', 'vectorize', 'create', INDEX_NAME,
      `--dimensions=${dimensions}`, '--metric=cosine',
    ], { cwd: root, stdio: 'inherit', env: wranglerEnv() });
  }
}

function upsertBatch(vectors) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'chatbot-index-'));
  const file = join(tmpDir, 'batch.ndjson');
  writeFileSync(file, vectors.map(v => JSON.stringify(v)).join('\n') + '\n', 'utf-8');
  execFileSync('npx', ['wrangler', 'vectorize', 'upsert', INDEX_NAME, `--file=${file}`], {
    cwd: root,
    stdio: 'inherit',
    env: wranglerEnv(),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  let cache = { files: {} };
  try {
    cache = JSON.parse(readFileSync(cacheFile, 'utf-8'));
    cache.files ??= {};
  } catch { /* first run, no cache yet */ }

  const allArticles = loadArticles();
  const targetArticles = isPilot ? selectPilot(allArticles) : allArticles;

  console.log(`📄 候選文章：${targetArticles.length} 篇${isPilot ? '（pilot 模式）' : ''}`);

  const toProcess = isForce
    ? targetArticles
    : targetArticles.filter(a => cache.files[a.id] !== a.contentHash);
  const skipped = targetArticles.length - toProcess.length;
  console.log(`🔄 需要處理：${toProcess.length} 篇（快取跳過：${skipped} 篇）`);

  if (toProcess.length === 0) {
    console.log('✅ 沒有變動，全部使用快取。');
    return;
  }

  // Build all chunks first (need this before creating the index to know real dimensions)
  const allChunks = [];
  for (const article of toProcess) {
    const sections = splitByHeadings(article.body, article.title);
    let chunkIndex = 0;
    for (const section of sections) {
      const pieces = chunkSection(section.text);
      for (const piece of pieces) {
        allChunks.push({
          id: `${article.id}#${chunkIndex++}`,
          articleId: article.id,
          text: piece,
          metadata: {
            title: article.title,
            url: article.url,
            category: article.category.join(','),
            lang: 'zh-TW',
            heading: section.heading,
          },
        });
      }
    }
  }

  const totalTokens = allChunks.reduce((sum, c) => sum + estimateTokens(c.text), 0);
  console.log(`✂️  切出 ${allChunks.length} 個 chunks，估計 ${totalTokens.toLocaleString()} tokens`);
  console.log(`💰 bge-m3 embedding 估計成本：$${(totalTokens / 1_000_000 * 0.012).toFixed(4)}（$0.012 / M tokens）`);

  if (allChunks.length === 0) {
    console.log('⚠️  沒有產生任何 chunk，請檢查文章內容格式。');
    return;
  }

  // Probe embedding dimensions with the first chunk, then ensure the index exists.
  console.log('🧪 產生第一批 embedding 以確認向量維度…');
  const probeEmbeddings = await embedBatch([allChunks[0].text]);
  const dimensions = probeEmbeddings[0].length;
  console.log(`📐 embedding 維度：${dimensions}`);
  ensureIndex(dimensions);

  // bge-m3's 60,000 token limit applies to the *whole* request, not per text —
  // a handful of long chunks can blow past it even with few items per call.
  // Batch by cumulative estimated tokens (with margin) instead of a fixed count.
  // Our estimateTokens() undercounts vs bge-m3's real tokenizer by ~3x for
  // CJK-heavy text (observed empirically), so keep a large safety margin
  // below the model's real 60,000-token request limit.
  const MAX_BATCH_TOKENS = 12000;
  const MAX_BATCH_ITEMS = 100;
  let pending = [];
  let processedChunks = 0;

  let idx = 0;
  while (idx < allChunks.length) {
    const batch = [];
    let batchTokens = 0;
    while (idx < allChunks.length && batch.length < MAX_BATCH_ITEMS) {
      const chunk = allChunks[idx];
      const t = estimateTokens(chunk.text);
      if (batch.length > 0 && batchTokens + t > MAX_BATCH_TOKENS) break;
      batch.push(chunk);
      batchTokens += t;
      idx++;
    }

    const vectors = await embedBatch(batch.map(c => c.text));
    for (let j = 0; j < batch.length; j++) {
      pending.push({
        id: batch[j].id,
        values: vectors[j],
        metadata: { ...batch[j].metadata, text: batch[j].text },
      });
    }
    processedChunks += batch.length;
    console.log(`  embedded ${processedChunks}/${allChunks.length}`);

    if (pending.length >= UPSERT_BATCH_SIZE) {
      upsertBatch(pending);
      pending = [];
    }
  }
  if (pending.length > 0) upsertBatch(pending);

  // Update cache only after successful upsert
  for (const article of toProcess) {
    cache.files[article.id] = article.contentHash;
  }
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');

  console.log(`✅ 完成：${toProcess.length} 篇文章、${allChunks.length} 個 chunks 已 upsert 到 Vectorize index "${INDEX_NAME}"`);
}

main().catch(err => {
  console.error('❌ 建置失敗：', err);
  process.exit(1);
});
