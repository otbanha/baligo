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
          title: data.title || '',
        };
      }
    } catch (e) {
      return;
    }

    function mdToHtml(content) {
      return content
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;height:auto;" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/^#{1,6}\s+(.+)$/mg, (m, t) => {
          const level = m.match(/^(#+)/)[1].length;
          return '<h' + level + '>' + t + '</h' + level + '>';
        })
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/^(?!<[h|p|i|s|u|a])(.+)$/mg, '<p>$1</p>');
    }

    function processBlock(slug) {
      const block = blocks[slug.trim()];
      if (!block) return '[區塊不存在: ' + slug + ']';

      if (block.type === 'normal') {
        return mdToHtml(block.content);
      }

      if (block.type === 'random-cards' || block.type === 'random-list') {
        const items = block.content
          .split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.trim().slice(1).trim());

        const count = Math.min(block.randomCount, items.length);
        const shuffled = items.sort(() => Math.random() - 0.5).slice(0, count);

        if (block.type === 'random-list') {
          const nonListLines = block.content
            .split('\n')
            .filter(line => !line.trim().startsWith('-'))
            .join('\n').trim();
          const listHtml = '<ul>' + shuffled.map(i => {
            const match = i.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match) {
              return '<li><a href="' + match[2] + '">' + match[1] + '</a></li>';
            }
            return '<li>' + i + '</li>';
          }).join('') + '</ul>';
          const headingHtml = nonListLines.replace(/^#{1,6}\s+(.+)$/mg, function(m, t) {
  const level = m.match(/^(#+)/)[1].length;
  return '<h' + level + '>' + t + '</h' + level + '>';
});
return (headingHtml ? headingHtml : '') + listHtml;
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

    function buildVideoEmbed(url) {
      const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (ytMatch) {
        return '<div class="video-embed"><iframe src="https://www.youtube.com/embed/' + ytMatch[1] + '" frameborder="0" allowfullscreen loading="lazy"></iframe></div>';
      }
      const igMatch = url.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/);
      if (igMatch) {
        const s = '<' + 'script'; const e = '</' + 'script>';
        return '<div class="video-embed video-embed--ig"><blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/' + igMatch[1] + '/" data-instgrm-version="14" style="width:100%;margin:0;"></blockquote>' + s + ' async src="//www.instagram.com/embed.js">' + e + '</div>';
      }
      const ttMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
      if (ttMatch) {
        const s = '<' + 'script'; const e = '</' + 'script>';
        return '<div class="video-embed video-embed--tt"><blockquote class="tiktok-embed" cite="' + url + '" data-video-id="' + ttMatch[1] + '" style="width:100%;margin:0;"><section></section></blockquote>' + s + ' async src="https://www.tiktok.com/embed.js">' + e + '</div>';
      }
      return null;
    }

    function visit(node) {
      if (node.type === 'paragraph' && node.children) {
        // Auto-embed: paragraph containing only a bare video URL (paste URL → instant embed)
        if (node.children.length === 1) {
          const only = node.children[0];
          let candidateUrl = null;
          if (only.type === 'link' && only.children?.length === 1 && only.children[0].value === only.url) {
            candidateUrl = only.url; // GFM auto-linked bare URL
          } else if (only.type === 'text') {
            const t = only.value.trim();
            if (/^https?:\/\/\S+$/.test(t)) candidateUrl = t; // plain-text URL
          }
          if (candidateUrl) {
            const embed = buildVideoEmbed(candidateUrl);
            if (embed) {
              node.type = 'html';
              node.value = embed;
              delete node.children;
              return;
            }
          }
        }

        // Block references produce block-level HTML (h5, img, div…).
        // Replacing just the text child leaves <p><h5>…</h5></p> — invalid HTML.
        // Instead, convert the whole paragraph node to an html node.
        const hasBlockRef = node.children.some(
          c => c.type === 'text' && /\{\{block:|{{(video\d+)}}/.test(c.value)
        );
        if (hasBlockRef) {
          const html = node.children.map(child => {
            if (child.type !== 'text') return '';
            return child.value
              .replace(/\{\{block:([^}]+)\}\}/g, (_, slug) => processBlock(slug))
              .replace(/\{\{(video\d+)\}\}/g, (_, pos) =>
                '<span class="video-placeholder" data-position="' + pos + '"></span>'
              );
          }).join('');
          node.type = 'html';
          node.value = html;
          delete node.children;
          return;
        }

        node.children = node.children.map(child => {
          if (child.type === 'link' && child.children && child.children[0] && child.children[0].value === 'video') {
            const embed = buildVideoEmbed(child.url);
            if (embed) return { type: 'html', value: embed };
          }
          return child;
        });
      }
      if (node.children) node.children.forEach(visit);
    }
    visit(tree);
  };
}
