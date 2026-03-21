const ALLOWED_ORIGIN = 'https://gobaligo.id';

const AGODA_URL = 'https://www.agoda.com/bali-island/bali.html?cid=1961347';
const KLOOK_URL = 'https://www.klook.com/zh-TW/city/27-bali-things-to-do/?aid=116349';

const AGODA_KEYWORDS = ['住宿', '飯店', 'villa', 'Villa', '民宿', '旅館', 'hotel', '訂房', '哪裡住', 'resort', '度假村', '推薦住', 'accommodation', '套房', '房間'];
const KLOOK_KEYWORDS = ['行程', '活動', '體驗', '門票', '套裝', 'tour', 'activity', 'experience', 'ticket', '景點', '一日遊', '半日遊', '玩什麼', '去哪玩', '推薦玩', '推薦景'];

function detectLanguage(text) {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  if (!hasChinese) return 'en';
  return 'zh-TW';
}

function detectAffiliate(text) {
  const lower = text.toLowerCase();
  if (AGODA_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'agoda';
  if (KLOOK_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'klook';
  return null;
}

function findRelatedArticles(query, articles) {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/[\s,，。？！、\n]+/).filter(w => w.length >= 2);

  const scored = articles.map(article => {
    let score = 0;
    const titleLower = (article.title || '').toLowerCase();
    const descLower = (article.description || '').toLowerCase();
    const categoriesStr = (article.category || []).join(' ').toLowerCase();
    const tagsStr = (article.tags || []).join(' ').toLowerCase();

    for (const word of queryWords) {
      if (titleLower.includes(word)) score += 3;
      if (categoriesStr.includes(word)) score += 2;
      if (tagsStr.includes(word)) score += 2;
      if (descLower.includes(word)) score += 1;
    }
    return { ...article, score };
  });

  return scored
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function buildSystemPrompt(lang, relatedArticles) {
  const articleContext = relatedArticles.length > 0
    ? '\n\n網站相關文章：\n' + relatedArticles.map(a => `- ${a.title}：${a.url}`).join('\n')
    : '';

  if (lang === 'en') {
    return `You are "Baligo AI", a Bali travel expert from gobaligo.id. Answer in English, concisely (under 120 words).
Only answer Bali-related travel questions. If you reference a site article, mention its title naturally in your reply.
Do not make up information.${articleContext}`;
  }

  return `你是「峇里島知識庫AI」，代表旅遊網站 gobaligo.id，專門回答峇里島旅遊相關問題。
請用繁體中文回答，語氣親切自然，簡潔（120字以內）。
如果有相關文章，請在回答中自然地提及文章標題，引導讀者點擊閱讀更多。
不確定的資訊請如實說明，不要捏造資訊。只回答峇里島旅遊相關問題。${articleContext}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('Origin') || '';
  const isAllowed = origin === ALLOWED_ORIGIN || origin.endsWith('.gobaligo.id') || origin.includes('localhost');
  const corsHeaders = {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (!env.AI) {
    return Response.json({ error: '尚未設定 AI 綁定，請在 Cloudflare Pages 後台新增 Workers AI binding（名稱：AI）' }, { status: 503, headers: corsHeaders });
  }

  let message;
  try {
    const body = await request.json();
    message = (body.message || '').trim().slice(0, 300);
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!message) {
    return Response.json({ error: '訊息不能為空' }, { status: 400, headers: corsHeaders });
  }

  // Load article index from static assets
  let articles = [];
  try {
    const indexUrl = new URL('/article-index.json', request.url);
    const indexRes = await fetch(indexUrl.toString(), { cf: { cacheEverything: true, cacheTtl: 3600 } });
    if (indexRes.ok) {
      articles = await indexRes.json();
    }
  } catch { /* silently fail - AI will respond without article context */ }

  const lang = detectLanguage(message);
  const affiliate = detectAffiliate(message);
  const relatedArticles = findRelatedArticles(message, articles);
  const systemPrompt = buildSystemPrompt(lang, relatedArticles);

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    max_tokens: 400,
  });

  const affiliateLink = affiliate === 'agoda' ? AGODA_URL : affiliate === 'klook' ? KLOOK_URL : null;

  return Response.json({
    reply: response.response,
    articles: relatedArticles.map(a => ({ title: a.title, url: a.url })),
    affiliate,
    affiliateLink,
  }, { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
