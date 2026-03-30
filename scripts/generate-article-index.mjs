/**
 * 建置時產生 public/article-index.json
 * 包含所有文章的標題、URL、分類、Tags、描述
 */
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const blogDir = join(root, 'src/content/blog');
const outputPath = join(root, 'public/article-index.json');

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
  // Handle multi-line YAML lists like:
  // category:
  //   - 住宿推薦
  const regex = new RegExp(`^${key}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, 'm');
  const m = content.match(regex);
  if (!m) return null;
  return m[1].match(/^\s+-\s+(.+)$/mg)?.map(l => l.replace(/^\s+-\s+/, '').trim()) || [];
}

const files = readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));

const articles = [];
for (const file of files) {
  const id = file.replace(/\.mdx?$/, '');
  const raw = readFileSync(join(blogDir, file), 'utf-8');
  const fm = parseFrontmatter(raw);

  // Handle multi-line list fields
  const category = parseYamlList(raw.split('---').slice(0, 2).join('---'), 'category')
    || (fm.category ? [fm.category] : []);
  const tags = parseYamlList(raw.split('---').slice(0, 2).join('---'), 'tags')
    || (fm.tags ? [fm.tags] : []);

  if (!fm.title) continue;
  if (fm.private === 'true' || fm.private === true) continue;

  // 新文章優先（用 pubDate 排序）
  const pubDate = fm.pubDate || '2000-01-01';

  articles.push({
    id,
    title: fm.title,
    url: `/blog/${id}/`,
    description: fm.description || '',
    category: Array.isArray(category) ? category : [category].filter(Boolean),
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    pubDate,
  });
}

// 新文章優先
articles.sort((a, b) => b.pubDate.localeCompare(a.pubDate));

writeFileSync(outputPath, JSON.stringify(articles, null, 2), 'utf-8');
console.log(`✅ article-index.json 產生完成：${articles.length} 篇文章`);
