import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export function remarkBlocks() {
  return (tree) => {
    const blocksDir = join(process.cwd(), 'src/content/blocks');
    let blocks = {};

    try {
      const files = readdirSync(blocksDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const raw = readFileSync(join(blocksDir, file), 'utf-8');
        const { data, content } = matter(raw);
        const slug = file.replace('.md', '');
        blocks[slug] = {
          type: data.type || 'normal',
          randomCount: data.randomCount || 5,
          content: content.trim(),
        };
      }
    } catch (e) {
      return;
    }

    function processBlock(slug) {
      const block = blocks[slug.trim()];
      if (!block) return `[區塊不存在: ${slug}]`;

      if (block.type === 'normal') {
        return block.content;
      }

      if (block.type === 'random-cards' || block.type === 'random-list') {
        const items = block.content
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().slice(1).trim());

        const count = Math.min(block.randomCount, items.length);
        const shuffled = items.sort(() => Math.random() - 0.5).slice(0, count);

        if (block.type === 'random-list') {
          return shuffled.map(i => `- ${i}`).join('\n');
        }

        if (block.type === 'random-cards') {
          return `<div class="block-cards">${shuffled.map(i => {
            const match = i.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              return `<a href="${match[2]}" class="block-card">${match[1]}</a>`;
            }
            return `<div class="block-card">${i}</div>`;
          }).join('')}</div>`;
        }
      }

      return block.content;
    }

    function processYoutube(id) {
      return `<div class="yt-embed"><iframe src="https://www.youtube.com/embed/${id.trim()}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
    }

    function visit(node) {
      if (node.type === 'paragraph' && node.children) {
        node.children = node.children.map(child => {
          if (child.type === 'text') {
            let newValue = child.value;

            // 處理 {{block:slug}}
            newValue = newValue.replace(
              /\{\{block:([^}]+)\}\}/g,
              (match, slug) => processBlock(slug)
            );

            // 處理 ::youtube:ID::
            newValue = newValue.replace(
              /::youtube:([^:]+)::/g,
              (match, id) => processYoutube(id)
            );

            return { ...child, value: newValue };
          }
          return child;
        });
      }
      if (node.children) node.children.forEach(visit);
    }
    visit(tree);
  };
}