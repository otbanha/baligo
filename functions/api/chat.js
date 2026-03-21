const ALLOWED_ORIGIN = 'https://gobaligo.id';

const AGODA_URL = 'https://www.agoda.com/bali-island/bali.html?cid=1961347';
const KLOOK_URL = 'https://www.klook.com/zh-TW/city/27-bali-things-to-do/?aid=116349';

const AGODA_KEYWORDS = ['住宿', '飯店', 'villa', 'Villa', '民宿', '旅館', 'hotel', '訂房', '哪裡住', 'resort', '度假村', '推薦住', 'accommodation', '套房', '房間'];
const KLOOK_KEYWORDS = ['行程', '活動', '體驗', '門票', '套裝', 'tour', 'activity', 'experience', 'ticket', '景點', '一日遊', '半日遊', '玩什麼', '去哪玩', '推薦玩', '推薦景'];

// 關鍵字 → 優先顯示文章（無論文章索引匹配結果如何，這些永遠置頂）
const PINNED_ARTICLES = [
  {
    keywords: ['包車', '司機', '包車推薦', '中文'],
    title: '峇里島包車推薦，中文司機一日遊',
    url: '/blog/2024-07-07-668aaea7fd89780001981840/',
  },
  {
    keywords: ['第一次', '新手', '初次', '請教', '首次'],
    title: '峇里島新手必讀完整攻略',
    url: '/blog/2026-03-08-657598bdfd8978000120fe20/',
  },
  {
    keywords: ['換匯', '換錢', '匯率', '美金', '印尼盾', '台幣', '印尼幣', '划算'],
    title: '峇里島換匯攻略，哪裡換最划算？',
    url: '/blog/2024-01-28-65b5c7e2fd89780001e96fac/',
  },
  {
    keywords: ['SIM卡', 'SIM', 'sim卡', 'sim', '網路', '電話', '最穩'],
    title: '峇里島 SIM 卡推薦，最穩上網方案',
    url: '/blog/2024-03-21-65f916bbfd89780001b916e0/',
  },
  {
    keywords: ['簽證', 'visa', 'VISA', '海關', '申請', '通關', '入境', '電子簽', '落地簽'],
    title: '峇里島簽證申請攻略',
    url: '/blog/2025-08-14-689dcce7fd8978000125fc52/',
  },
  {
    keywords: ['ATV', 'atv'],
    title: '峇里島 ATV 越野車體驗推薦',
    url: '/blog/2024-01-30-65b6ef65fd89780001f5d032/',
  },
  {
    keywords: ['泛舟'],
    title: '峇里島泛舟體驗推薦',
    url: '/blog/2025-03-28-67e62aa8fd89780001888620/',
  },
  {
    keywords: ['水上活動', '浮潛', '潛水', '香蕉船', '拖曳傘'],
    title: '峇里島水上活動推薦：浮潛、潛水、香蕉船',
    url: '/blog/2026-01-20-694122b8fd89780001f514c9/',
  },
];

function findPinnedArticles(query) {
  const lower = query.toLowerCase();
  const matched = [];
  for (const pin of PINNED_ARTICLES) {
    if (pin.keywords.some(k => lower.includes(k.toLowerCase()))) {
      matched.push({ title: pin.title, url: pin.url });
    }
  }
  return matched;
}

const RATE_LIMIT_MAX = 20;      // 每個 IP 每小時最多幾次
const RATE_LIMIT_TTL = 3600;    // 1 小時（秒）
const INPUT_MAX_CHARS = 200;
const OUTPUT_MAX_TOKENS = 350;

function detectLanguage(text) {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh-TW' : 'en';
}

function detectAffiliate(text) {
  const lower = text.toLowerCase();
  if (AGODA_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'agoda';
  if (KLOOK_KEYWORDS.some(k => lower.includes(k.toLowerCase()))) return 'klook';
  return null;
}

function findRelatedArticles(query, articles) {
  const queryWords = query.toLowerCase().split(/[\s,，。？！、\n]+/).filter(w => w.length >= 2);
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
  return scored.filter(a => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
}

function buildSystemPrompt(lang, relatedArticles) {
  if (relatedArticles.length > 0) {
    const links = relatedArticles.map(a => `[${a.title}](${a.url})`).join('、');
    if (lang === 'en') {
      return `You are "Baligo AI" from gobaligo.id. A relevant article exists for this question.
DO NOT answer the question yourself. Instead, briefly say the answer can be found in the article, and embed the link using Markdown format.
Keep it under 2 sentences. Relevant articles: ${links}`;
    }
    return `你是「峇里島知識庫AI」，代表旅遊網站 gobaligo.id。
這個問題有對應的專業文章，請勿自行回答細節，以免給出錯誤資訊。
請用一到兩句話引導讀者點擊閱讀，並以 Markdown 格式 [文章標題](URL) 嵌入連結。語氣親切自然。
相關文章：${links}`;
  }

  if (lang === 'en') {
    return `You are "Baligo AI", a Bali travel expert from gobaligo.id. Answer in English, concisely (under 80 words).
Only answer Bali-related travel questions. Do not make up specific details; if unsure, say so.`;
  }

  return `你是「峇里島知識庫AI」，代表旅遊網站 gobaligo.id，專門回答峇里島旅遊相關問題。
請用繁體中文回答，語氣親切自然，簡潔（80字以內）。
不確定的資訊請如實說明，不要捏造細節。只回答峇里島旅遊相關問題。`;
}

async function checkRateLimit(kv, ip) {
  const key = `rl:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return false;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
  return true;
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

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: '尚未設定 ANTHROPIC_API_KEY' }, { status: 503, headers: corsHeaders });
  }

  // Rate limiting
  if (env.RATE_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const allowed = await checkRateLimit(env.RATE_LIMIT, ip);
    if (!allowed) {
      return Response.json({ error: '您的提問次數已達上限，請一小時後再試。' }, { status: 429, headers: corsHeaders });
    }
  }

  let message;
  try {
    const body = await request.json();
    message = (body.message || '').trim().slice(0, INPUT_MAX_CHARS);
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!message) {
    return Response.json({ error: '訊息不能為空' }, { status: 400, headers: corsHeaders });
  }

  // Load article index
  let articles = [];
  try {
    const indexUrl = new URL('/article-index.json', request.url);
    const indexRes = await fetch(indexUrl.toString(), { cf: { cacheEverything: true, cacheTtl: 3600 } });
    if (indexRes.ok) articles = await indexRes.json();
  } catch { /* silently fail */ }

  const lang = detectLanguage(message);
  const affiliate = detectAffiliate(message);
  const pinned = findPinnedArticles(message);
  const fromIndex = findRelatedArticles(message, articles);
  // 合併：pinned 優先，再補充索引結果（去重），最多 3 筆
  const pinnedUrls = new Set(pinned.map(a => a.url));
  const merged = [...pinned, ...fromIndex.filter(a => !pinnedUrls.has(a.url))].slice(0, 3);
  const relatedArticles = merged;
  const systemPrompt = buildSystemPrompt(lang, relatedArticles);

  // Call Claude Haiku 4.5
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: OUTPUT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    console.error('Anthropic API error:', err);
    return Response.json({ error: '抱歉，AI 暫時無法回應，請稍後再試。' }, { status: 502, headers: corsHeaders });
  }

  const aiData = await aiRes.json();
  const reply = aiData.content?.[0]?.text || '抱歉，無法取得回覆。';

  return Response.json({
    reply,
    articles: relatedArticles.map(a => ({ title: a.title, url: a.url })),
    affiliate,
    affiliateLink: affiliate === 'agoda' ? AGODA_URL : affiliate === 'klook' ? KLOOK_URL : null,
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
