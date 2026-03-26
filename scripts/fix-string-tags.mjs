#!/usr/bin/env node
/**
 * fix-string-tags.mjs
 * 掃描 src/content/blog/ 所有 .md 檔案，
 * 把 YAML 中各種字串格式的 tags 轉成正確的 YAML 陣列格式。
 *
 * 支援格式（全部轉成 YAML 陣列）：
 *   tags: |-          ← block literal strip   (Sveltia CMS text widget 常見輸出)
 *     tag1
 *     tag2
 *
 *   tags: |           ← block literal keep
 *     tag1
 *     tag2
 *
 *   tags: >-          ← block folded
 *     tag1
 *     tag2
 *
 *   tags: "tag1"      ← single-line string (quoted or unquoted)
 *   tags: tag1
 *
 *   tags: "tag1,tag2" ← comma-separated string
 *
 * 在 astro build 之前執行，確保 Cloudflare 部署不因格式問題失敗。
 */

import { readFileSync, writeFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = 'src/content/blog';

const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

let fixed = 0;
for (const filename of files) {
  const filepath = join(BLOG_DIR, filename);
  const content = readFileSync(filepath, 'utf-8');

  // ── Pattern 1: block scalar (|, |-,|+, >, >-, >+) ─────────────────────────
  // tags: |-        tags: |        tags: >-
  //   tag1      →     tag1    →      tag1
  //   tag2            tag2           tag2
  let newContent = content.replace(
    /^(tags:) [|>][-+]?\r?\n((?:[ \t]+.+\r?\n)+)/m,
    (_, key, block) => {
      const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      return key + '\n' + lines.map(l => `  - ${l}`).join('\n') + '\n';
    }
  );

  // ── Pattern 2: empty string  tags: '' or tags: "" or tags: ~  ───────────────
  // Replace with empty array so Astro JSON Schema validation passes
  newContent = newContent.replace(
    /^tags: (?:''|""|~|null)[ \t]*$/m,
    'tags: []'
  );

  // ── Pattern 3: single-line string (quoted or bare) ──────────────────────────
  // tags: "tag1,tag2"  /  tags: 'tag1'  /  tags: tag1 tag2
  // Does NOT touch lines where value starts with [ (inline JSON array) or \n (block)
  newContent = newContent.replace(
    /^tags: (?![\[\n])(["'])(.+?)\1[ \t]*$/m,
    (_, _q, val) => {
      const raw = val.trim();
      if (!raw) return `tags: []`;
      const lines = raw.includes(',')
        ? raw.split(',').map(l => l.trim()).filter(Boolean)
        : [raw];
      if (lines.length === 0) return `tags: []`;
      return `tags:\n` + lines.map(l => `  - ${l}`).join('\n');
    }
  );

  if (newContent !== content) {
    writeFileSync(filepath, newContent, 'utf-8');
    console.log(`  fixed: ${filename}`);
    fixed++;
  }
}

if (fixed > 0) {
  console.log(`✓ fix-string-tags: ${fixed} 個檔案已修正`);
} else {
  console.log('✓ fix-string-tags: 無需修正');
}
