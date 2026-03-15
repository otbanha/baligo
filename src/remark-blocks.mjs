import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export function remarkBlocks() {
  return (tree) => {
    const blocksDir = join(process.cwd(), 'src/content/blocks');
    let blocks = {};
    
    try {
      const files = readdirSync(blocksDir);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const content = readFileSync(join(blocksDir, file), 'utf-8');
        const parts = content.split('---', 3);
        if (parts.length < 3) continue;
        const slug = file.replace('.md', '');
        blocks[slug] = parts[2].trim();
      }
    } catch (e) {
      return;
    }

    function visit(node) {
      if (node.type === 'paragraph' && node.children) {
        node.children = node.children.map(child => {
          if (child.type === 'text' && child.value.includes('{{block:')) {
            const newValue = child.value.replace(
              /\{\{block:([^}]+)\}\}/g,
              (match, slug) => blocks[slug.trim()] || match
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
