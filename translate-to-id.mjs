#!/usr/bin/env node
/**
 * 批次翻譯「住宿推薦」文章 → 印尼文
 * 用法：node translate-to-id.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const MODEL = 'deepseek-ai/DeepSeek-V3';
const BLOG_DIR = './src/content/blog';
const OUT_DIR = './src/content/id';
const CONCURRENCY = 3;       // 同時跑幾篇（避免 rate limit）
const DELAY_MS = 1500;        // 每篇之間的間隔

if (!DEEPINFRA_API_KEY) {
  console.error('❌ 請先設定 DEEPINFRA_API_KEY');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

// ── 1. 找出所有「住宿推薦」文章 ────────────────────────────────
function getBlogFiles() {
  const files = readdirSync(BLOG_DIR);
  return files.filter(f => f.match(/\.mdx?$/)).filter(f => {
    const raw = readFileSync(join(BLOG_DIR, f), 'utf-8');
    const { data } = matter(raw);
    const cats = data.category || [];
    return cats.includes('住宿推薦');
  });
}

// ── 2. 呼叫 Deepinfra API ───────────────────────────────────────
async function callDeepinfra(prompt) {
  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

// ── 3. 翻譯單篇文章 ────────────────────────────────────────────
async function translateFile(filename) {
  const outPath = join(OUT_DIR, filename.replace(/\.mdx$/, '.md'));

  // 已翻過就跳過
  if (existsSync(outPath)) {
    console.log(`⏭️  跳過（已存在）: ${filename}`);
    return;
  }

  const raw = readFileSync(join(BLOG_DIR, filename), 'utf-8');
  const { data: frontmatter, content } = matter(raw);

  const prompt = `Kamu adalah penerjemah konten travel Bali yang berpengalaman. Tugas kamu menerjemahkan artikel blog travel dari bahasa Mandarin Tradisional ke bahasa Indonesia.

GAYA BAHASA:
- Gunakan bahasa Indonesia santai dan natural seperti blog travel lokal
- Boleh pakai kata-kata gaul travel: banget, sih, dong, yuk, wajib coba, worth it, recommended, hidden gem
- Jangan terlalu formal, hindari "Anda" — pakai "kamu" atau kalimat tanpa subjek
- Judul harus menarik dan SEO-friendly dalam bahasa Indonesia

INSTRUKSI:
1. Terjemahkan TITLE dan DESCRIPTION ke bahasa Indonesia (SEO-friendly)
2. Terjemahkan TAGS ke bahasa Indonesia (pisahkan dengan koma, tanpa tanda kurung)
3. Terjemahkan seluruh CONTENT ke bahasa Indonesia
4. Pertahankan semua format Markdown (heading ##, bold **, link [], gambar ![], dst)
5. Jangan terjemahkan: URL, nama hotel/tempat, angka harga, kode HTML/MDX
6. Kembalikan dalam format berikut PERSIS (tanpa tambahan apapun):

TRANSLATED_TITLE: [judul dalam bahasa Indonesia]
TRANSLATED_DESCRIPTION: [deskripsi dalam bahasa Indonesia]
TRANSLATED_TAGS: [tag1, tag2, tag3]
TRANSLATED_CONTENT:
[isi artikel dalam bahasa Indonesia]

---
TITLE: ${frontmatter.title}
DESCRIPTION: ${frontmatter.description || ''}
TAGS: ${(frontmatter.tags || []).join(', ')}
CONTENT:
${content}`;

  let result;
  try {
    result = await callDeepinfra(prompt);
  } catch (e) {
    console.error(`❌ API 失敗: ${filename} — ${e.message}`);
    return;
  }

  // 解析回傳結果
  const titleMatch = result.match(/^TRANSLATED_TITLE:\s*(.+)$/m);
  const descMatch = result.match(/^TRANSLATED_DESCRIPTION:\s*(.+)$/m);
  const tagsMatch = result.match(/^TRANSLATED_TAGS:\s*(.+)$/m);
  const contentMatch = result.match(/TRANSLATED_CONTENT:\n([\s\S]+)$/);

  if (!titleMatch || !contentMatch) {
    console.error(`❌ 解析失敗: ${filename}`);
    writeFileSync(outPath + '.error', result);
    return;
  }

  const translatedTags = tagsMatch
    ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean)
    : frontmatter.tags;

  const newFrontmatter = {
    ...frontmatter,
    title: titleMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : frontmatter.description,
    tags: translatedTags,
    lang: 'id',
  };

  const output = matter.stringify(contentMatch[1].trim(), newFrontmatter);
  writeFileSync(outPath, output, 'utf-8');
  console.log(`✅ 完成: ${filename}`);
}

// ── 4. 控制並發 ────────────────────────────────────────────────
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let i = 0;
  async function runNext() {
    if (i >= tasks.length) return;
    const task = tasks[i++];
    await task();
    await new Promise(r => setTimeout(r, DELAY_MS));
    await runNext();
  }
  const workers = Array(Math.min(limit, tasks.length)).fill(null).map(runNext);
  await Promise.all(workers);
}

// ── 5. 主程式 ──────────────────────────────────────────────────
async function main() {
  const files = getBlogFiles();
  console.log(`📂 找到 ${files.length} 篇住宿推薦文章`);

  const alreadyDone = files.filter(f => existsSync(join(OUT_DIR, f.replace(/\.mdx$/, '.md')))).length;
  console.log(`⏭️  已翻譯: ${alreadyDone} 篇 / 待翻譯: ${files.length - alreadyDone} 篇\n`);

  const tasks = files.map(f => () => translateFile(f));
  await runWithConcurrency(tasks, CONCURRENCY);

  console.log('\n🎉 全部完成！');
}

main().catch(console.error);
