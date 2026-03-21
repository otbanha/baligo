const SYSTEM_PROMPT = `你是「峇里島小助手」，專門回答峇里島旅遊相關問題。
請用繁體中文回答，語氣親切自然。
回答請簡潔（200字以內），如果問題超出峇里島旅遊範疇，請禮貌說明你只負責峇里島旅遊問答。
不確定的資訊請如實說明，並建議用戶參考最新官方資訊。`;

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
    return Response.json({ error: '尚未設定 AI 綁定，請在 Cloudflare Pages 後台新增 Workers AI binding（名稱：AI）' }, { status: 503, headers: corsHeaders });
  }

  let message;
  try {
    const body = await request.json();
    message = (body.message || '').trim().slice(0, 500);
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!message) {
    return Response.json({ error: '訊息不能為空' }, { status: 400, headers: corsHeaders });
  }

  const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ],
    max_tokens: 512,
  });

  return Response.json({ reply: response.response }, { headers: corsHeaders });
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
