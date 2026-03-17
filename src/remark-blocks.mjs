import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export function remarkBlocks(embedMap = {}) {
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
      if (!block) return '[區塊不存在: ' + slug + ']';

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
          return shuffled.map(i => '- ' + i).join('\n');
        }

        if (block.type === 'random-cards') {
          return '<div class="block-cards">' + shuffled.map(i => {
            const match = i.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              return '<a href="' + match[2] + '" class="block-card">' + match[1] + '</a>';
            }
            return '<div class="block-card">' + i + '</div>';
          }).join('') + '</div>';
        }
      }

      return block.content;
    }

    function renderEmbed(platform, url) {
      const scriptTag = '<' + 'script';
      const closeScript = '</' + 'script>';
      if (platform === 'youtube') {
        const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        const id = match ? match[1] : url;
        return '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' + id + '" frameborder="0" allowfullscreen loading="lazy"></iframe></div>';
      }
      if (platform === 'instagram') {
        const match = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
        const id = match ? match[1] : '';
        return '<div class="video-embed video-embed--ig"><blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/' + id + '/" data-instgrm-version="14" style="width:100%;margin:0;"></blockquote>' + scriptTag + ' async src="//www.instagram.com/embed.js">' + closeScript + '</div>';
      }
      if (platform === 'tiktok') {
        const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
        const id = match ? match[1] : '';
        return '<div class="video-embed video-embed--tt"><blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + id + '" style="width:100%;margin:0;"><section></section></blockquote>' + scriptTag + ' async src="https://www.tiktok.com/embed.js">' + closeScript + '</div>';
      }
      return '<a href="' + url + '" target="_blank">' + url + '</a>';
    }

    function visit(node) {
      if (node.type === 'paragraph' && node.children) {
        node.children = node.children.map(child => {
          if (child.type === 'link' && child.children && child.children[0] && child.children[0].value === 'video') {
            const url = child.url;
            const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            if (ytMatch) {
              return { type: 'html', value: '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allowfullscreen loading="lazy"></iframe></div>' };
            }
            const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
            if (igMatch) {
              const s = '<' + 'script';
              const e = '</' + 'script>';
              return { type: 'html', value: '<div class="video-embed video-embed--ig"><blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/' + igMatch[1] + '/" data-instgrm-version="14" style="width:100%;margin:0;"></blockquote>' + s + ' async src="//www.instagram.com/embed.js">' + e + '</div>' };
            }
            const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
            if (ttMatch) {
              const s = '<' + 'script';
              const e = '</' + 'script>';
              return { type: 'html', value: '<div class="video-embed video-embed--tt"><blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + ttMatch[1] + '" style="width:100%;margin:0;"><section></section></blockquote>' + s + ' async src="https://www.tiktok.com/embed.js">' + e + '</div>' };
            }
          }
          if (child.type === 'text') {
            let newValue = child.value;
            newValue = newValue.replace(/\{\{block:([^}]+)\}\}/g, function(match, slug) {
              return processBlock(slug);
            });
            newValue = newValue.replace(/<<([^>]+)>>/g, function(match, position) {
              const embed = embedMap[position];
              if (embed) return renderEmbed(embed.platform, embed.url);
              return match;
            });
            return Object.assign({}, child, { value: newValue });
          }
          return child;
        });
      }
      if (node.children) node.children.forEach(visit);
    }
    visit(tree);
  };
}
