const ALLOWED_ORIGIN = 'https://gobaligo.id';

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
    return Response.json({ error: '尚未設定 AI 綁定' }, { status: 503, headers: corsHeaders });
  }

  let title, body;
  try {
    const data = await request.json();
    title = (data.title || '').trim().slice(0, 200);
    body = (data.body || '').trim().slice(0, 3000);
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!body) {
    return Response.json({ error: '缺少文章內容' }, { status: 400, headers: corsHeaders });
  }

  const prompt = `以下是一篇關於峇里島旅遊的文章：

標題：${title}

內容：
${body}

請根據這篇文章內容，用繁體中文生成3個讀者最可能想問的實用問答（Q&A）。
每個問答要直接根據文章內容回答，不要加入文章沒有提到的資訊。
請嚴格以以下 JSON 格式回答，不要加任何其他文字：
[{"q":"問題1","a":"回答1"},{"q":"問題2","a":"回答2"},{"q":"問題3","a":"回答3"}]`;

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'user', content: prompt },
    ],
    max_tokens: 800,
  });

  let qaList;
  try {
    const text = response.response.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    qaList = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return Response.json({ error: '無法解析 AI 回應，請重試' }, { status: 500, headers: corsHeaders });
  }

  return Response.json({ qa: qaList }, { headers: corsHeaders });
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
