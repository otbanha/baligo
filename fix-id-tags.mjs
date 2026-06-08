#!/usr/bin/env node
/**
 * 補翻 src/content/id/ 裡已存在文章的 tags
 * 用法：node fix-id-tags.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const DEEPINFRA_API_KEY = process.env.DEEPINFRA_API_KEY;
const MODEL = 'deepseek-ai/DeepSeek-V3';
const ID_DIR = './src/content/id';
const DELAY_MS = 2000;

if (!DEEPINFRA_API_KEY) {
  console.error('❌ 請先設定 DEEPINFRA_API_KEY');
  process.exit(1);
}

async function callDeepinfra(prompt) {
  const res = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      temperature: 0.2,
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

function isChinese(str) {
  return /[\u4e00-\u9fff]/.test(str);
}

async function fixTags(filename) {
  const filePath = join(ID_DIR, filename);
  const raw = readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);

  const tags = frontmatter.tags || [];
  if (!tags.length || !tags.some(isChinese)) {
    console.log(`⏭️  跳過（tags 已是印尼文）: ${filename}`);
    return;
  }

  const prompt = `Terjemahkan tag-tag berikut ke bahasa Indonesia untuk blog travel Bali. Gunakan kata yang SEO-friendly dan natural. Kembalikan HANYA tag yang sudah diterjemahkan, dipisahkan koma, tanpa penjelasan apapun.

Tags: ${tags.join(', ')}`;

  let result;
  try {
    result = await callDeepinfra(prompt);
  } catch (e) {
    console.error(`❌ API 失敗: ${filename} — ${e.message}`);
    return;
  }

  const newTags = result.split(',').map(t => t.trim()).filter(Boolean);
  const newFrontmatter = { ...frontmatter, tags: newTags };
  const output = matter.stringify(content, newFrontmatter);
  writeFileSync(filePath, output, 'utf-8');
  console.log(`✅ ${filename}`);
  console.log(`   ${tags.join(', ')} → ${newTags.join(', ')}`);
}

async function main() {
  const files = readdirSync(ID_DIR).filter(f => f.match(/\.mdx?$/));
  console.log(`📂 找到 ${files.length} 篇已翻譯文章\n`);

  for (const f of files) {
    await fixTags(f);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log('\n🎉 完成！');
}

main().catch(console.error);
