const ALLOWED_ORIGIN = 'https://gobaligo.id';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_TTL = 60; // 每 IP 每分鐘 5 次
const INPUT_MAX_CHARS = 200;
const MAX_TOKENS = 800;
const CACHE_TTL = 86400; // 24h response cache（只快取無對話歷史的單輪問答）
const CACHE_VERSION = 'rag-v1'; // RAG 架構重寫，版本號變更會讓舊快取全部失效
const DAILY_GLOBAL_MAX = 500; // 每日（UTC）AI 回答呼叫上限（不含 embedding）

const EMBED_MODEL = '@cf/baai/bge-m3';
const VECTORIZE_TOP_K = 5;
const SIMILARITY_THRESHOLD = 0.55; // 見 Phase 5 驗收：真正相關 ≥0.62，離題查詢 ≤0.55
const NEWS_CATEGORY = '新聞存檔';
const TIME_SENSITIVE_RE = /(今天|今日|現在|目前|即時|實時|today|right now|currently|real-?time)/i;
const CHUNK_CHAR_CAP = 900; // 防呆：單一 chunk 最多帶入的字元數
const MAX_HISTORY_TURNS = 3; // 保留最近 3 輪對話（= 最多 6 則訊息）

// Spam / abuse keyword blacklist (case-insensitive)
const SPAM_PATTERNS = [
  /\b(fuck|shit|ass|bitch|porn|sex|nude|naked|xxx|viagra|casino|lottery|crypto|bitcoin|invest)\b/i,
  /https?:\/\//i,  // no URLs in input
  /\b(hack|inject|prompt|ignore previous|disregard|jailbreak|DAN|do anything now)\b/i,
  /(.)\1{6,}/, // 7+ repeated chars (aaaaaaa...)
];

function isSpam(text) {
  return SPAM_PATTERNS.some(re => re.test(text));
}

async function checkDailyGlobal(kv) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `daily:${today}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= DAILY_GLOBAL_MAX) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}

async function msgCacheKey(msg, lang) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${CACHE_VERSION}:${lang}:${msg.toLowerCase().trim()}`));
  return 'qc:' + Array.from(new Uint8Array(buf)).slice(0, 10).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 廣東話特有字符（不出現在普通話書寫）
const CANTONESE_RE = /[咁喺唔嗰咩嘅囉喎冇啩㗎]/;
// 簡體中文特有字符（不出現在繁體/廣東話書寫）
const SIMPLIFIED_RE = /[们来这说学从还国车吗岛凯宾问时东为动实际门话联发观边过进样设华总应线费]/;

export function detectLanguage(text, pageLang) {
  // 1. 沒有 CJK 字符 → 英文
  if (!/[一-鿿]/.test(text)) return 'en';

  // 2. 廣東話特有字 → zh-HK
  if (CANTONESE_RE.test(text)) return 'zh-HK';

  // 3. 簡體特有字 → zh-CN
  if (SIMPLIFIED_RE.test(text)) return 'zh-CN';

  // 4. 以 pageLang 判斷繁中變體
  if (pageLang) {
    const l = pageLang.toLowerCase();
    if (l === 'zh-hk') return 'zh-HK';
    if (l === 'zh-cn') return 'zh-CN';
  }

  return 'zh-TW';
}

/** 依語系取得文章 URL prefix */
function getLangUrlPrefix(lang) {
  if (lang === 'zh-CN') return '/zh-cn';
  if (lang === 'zh-HK') return '/zh-hk';
  if (lang === 'en') return '/en';
  return ''; // zh-TW 預設路徑
}

/** 將 /blog/xxx/ 轉換為語系版本 URL（Vectorize 裡的 metadata.url 一律是 zh-TW 路徑） */
function localizeUrl(url, lang) {
  const prefix = getLangUrlPrefix(lang);
  if (!prefix) return url;
  if (url.startsWith('/blog/') || url === '/weather/') return prefix + url;
  return url;
}

// ── RAG retrieval ────────────────────────────────────────────────────────────
export async function embedQuery(env, text) {
  const res = await env.AI.run(EMBED_MODEL, { text: [text] });
  return res.data[0];
}

/** 向量檢索 + 相似度門檻過濾 + 時效性防呆（新聞存檔不能拿來回答「今天/現在」類問題） */
export async function retrieveChunks(env, vector, message) {
  const result = await env.VECTORIZE.query(vector, { topK: VECTORIZE_TOP_K, returnMetadata: 'all' });
  let matches = (result.matches || []).filter(m => m.score >= SIMILARITY_THRESHOLD);
  if (TIME_SENSITIVE_RE.test(message)) {
    matches = matches.filter(m => !(m.metadata?.category || '').split(',').includes(NEWS_CATEGORY));
  }
  return matches;
}

export function buildRagContext(matches, lang) {
  return matches.map((m, i) => {
    const url = localizeUrl(m.metadata.url, lang);
    const text = String(m.metadata.text || '').slice(0, CHUNK_CHAR_CAP);
    return `[來源${i + 1}] ${m.metadata.title}(${url})\n${text}`;
  }).join('\n\n');
}

// 沒有任何 chunk 過門檻時的固定回覆——涵蓋兩種情況（不呼叫 LLM，故用固定文案）：
// 1) 離題問題（例如寫程式、跟峇里島無關）2) 峇里島相關但本站剛好沒有對應文章
const NOT_FOUND_REPLY = {
  'en': "I'm the Bali travel assistant here, so I can only help with Bali-related questions — and for this one specifically, I don't have an article to back up an answer, so I'd rather not guess. Try our [Facebook group](https://www.facebook.com/groups/baligo) — fellow travelers there often know the answer.",
  'zh-CN': '我是专门聊巴厘岛旅游的助理，如果这题跟巴厘岛旅游无关，就不在我能回答的范围内；如果是巴厘岛相关但本站刚好没有对应文章，我也不想乱猜答案。建议去 [Go Bali Go 峇里岛旅游](https://www.facebook.com/groups/baligo) 脸书社团问问，有经验的旅人应该能帮上忙。',
  'zh-HK': '我係專門聊峇里島旅遊嘅助理，如果呢題同峇里島旅遊無關，就唔喺我幫到手嘅範圍；如果係峇里島相關但本站啱啱好冇對應文章，我都唔想亂噏答案。建議去 [Go Bali Go 峇里島旅遊](https://www.facebook.com/groups/baligo) 臉書社團問吓，有經驗嘅旅人應該幫到手。',
  'zh-TW': '我是專門聊峇里島旅遊的助理，如果這題跟峇里島旅遊無關，就不在我能回答的範圍；如果是峇里島相關但本站剛好沒有對應文章，我也不想亂猜答案。建議你到 [Go Bali Go 峇里島旅遊](https://www.facebook.com/groups/baligo) 臉書社團問問看，或到[討論區](/forum/immigration/)發文，會有更多有經驗的旅人幫你解答！',
};

// ── System prompt（角色：小傑印尼的網站助理）────────────────────────────────
// 這些「特定知識」是先前被 AI 答錯後人工修正、驗證過的事實，RAG 上線後依然保留：
// 它們是比對過官方資料的硬規則，不依賴檢索結果是否命中，用來避免模型用訓練資料覆蓋掉已知正確答案。
export function buildSystemPrompt(lang, ragContext, hasContext) {
  const groundingRules = {
    'en': `You are the site assistant for "Jay in Indonesia" (小傑印尼) at gobaligo.id — talk like a knowledgeable local friend: practical, direct, a bit opinionated, not corporate.
Ground your answer ONLY in the article excerpts provided below. If you're not sure, say so plainly — never invent prices, opening hours, or visa rules.
After answering, list up to 3 sources you actually used, each on its own line: "📖 More info: {title} → {url}". Skip sources you didn't use.
If the question is unrelated to Bali travel, politely decline and steer the conversation back to Bali.
Keep the answer under 200 words in total, and use no more than 5 bullet points.
Do NOT mention "customer service" or "contact us" — this site has no support team; if someone can't find an answer, point them to our Facebook group instead.
[Key fact] Drinking water brands in Bali: Amidis, Cleo, and Aqua — all safe, sold everywhere. Never drink tap water.
[Key fact] ALL performances in Bali (Kecak fire dance, Legong, Barong, etc.) are ticketed indoor/enclosed events — none are free open-air shows.

Article excerpts:
${ragContext}`,
    'zh-CN': `你是「小杰印尼」网站 gobaligo.id 的助理，语气像懂行的在地朋友——实用、直接、带点个人观点，不要官腔。
只根据下面提供的文章片段回答，不确定就如实说不确定，绝对不能编造价格、营业时间或签证规定等事实。
回答完毕后，把你实际用到的来源列出来（最多 3 个），每个独立一行：「📖 延伸阅读：{标题} → {网址}」，没用到的来源不要列。
如果问题跟巴厘岛旅游无关，礼貌拒绝并把话题拉回巴厘岛。
整体回答控制在 200 字以内，条列不超过 5 点。
禁止提到「客服」「联系我们」——本站没有客服团队，找不到答案时引导去脸书社团。

【重要知识】台币换汇：台币不是主要流通货币，在巴厘岛汇率极差，1元台币约只能换350印尼盾。建议带美金去巴厘岛换，汇率远比台币好。
【重要知识】槟榔入境：槟榔可以携带入境印尼/巴厘岛，不是禁止物品，但数量以个人自用为限。
【重要知识】饮用水品牌：巴厘岛常见瓶装水品牌有 Amidis、Cleo、Aqua，均安全可靠，请勿饮用自来水。
【重要知识】巴厘岛表演：所有表演（Kecak火舞、Legong、Barong等）均为售票的封闭场馆演出，没有免费开放式表演。

文章片段：
${ragContext}`,
    'zh-HK': `你係「小傑印尼」網站 gobaligo.id 嘅助理，語氣好似識行嘅在地朋友——實用、直接、帶啲個人觀點，唔好官腔。
淨係根據下面嘅文章片段回答，唔確定就老實講唔確定，絕對唔可以捏造價格、營業時間或簽證規定等事實。
回答完之後，將你實際用到嘅來源列出嚟（最多 3 個），每個獨立一行：「📖 延伸閱讀：{標題} → {網址}」，冇用到嘅來源唔好列。
如果問題同峇里島旅遊無關，禮貌拒絕並將話題拉返去峇里島。
成個回答控制喺 200 字以內，條列唔超過 5 點。
禁止提到「客服」「聯絡我們」——本站冇客服團隊，搵唔到答案就引導去臉書社團。

【重要知識】台幣換匯：台幣唔係主要流通貨幣，喺峇里島匯率極差，1蚊台幣大約只能換350印尼盾。建議帶美金去峇里島換，匯率遠比台幣好。
【重要知識】檳榔入境：檳榔可以攜帶入境印尼/峇里島，唔係禁止物品，但數量要以個人自用為限。
【重要知識】飲用水品牌：峇里島常見瓶裝水品牌有 Amidis、Cleo、Aqua，均安全可靠，唔好飲自來水。
【重要知識】峇里島表演：所有表演（Kecak火舞、Legong、Barong等）均為售票嘅封閉場館演出，冇免費開放式表演。

文章片段：
${ragContext}`,
    'zh-TW': `你是「小傑印尼」網站 gobaligo.id 的助理，語氣像在地朋友——實用、直接、略帶個人觀點，不要官腔，用台灣用語回答。
只根據下面提供的文章片段回答，不確定就老實說不確定，絕對不能編造價格、營業時間、簽證規定等事實資訊；文章裡沒有就建議使用者查詢官方來源。
回答完畢後，把你實際有用到的來源列出來（最多 3 個），每個獨立一行，格式：「📖 延伸閱讀：{標題} → {網址}」，沒用到的來源不要列。
如果問題跟峇里島旅遊無關，禮貌拒絕並把話題拉回峇里島。
整體回答控制在 200 字以內，條列不超過 5 點。

【嚴格禁止】不可說「聯繫客服」「客服團隊」或暗示本站有任何客服人員——本站沒有客服，找不到答案時引導使用者到臉書社團「Go Bali Go 峇里島旅遊」留言，或到討論區發文。若問到包車報價，只能說「直接洽詢司機報價」。

【重要知識，優先於你自己的訓練資料】：
- 台幣換匯：台幣不是主要流通貨幣，在峇里島匯率極差，通常1元台幣只能換到約350印尼盾。建議帶美金去峇里島換，匯率遠比台幣好得多。
- 檳榔入境：**可以攜帶入境**，根據印尼海關規定檳榔不是禁止入境物品，峇里島每日的宗教供品中也有檳榔。但數量以個人自用為限，且含紅灰/白灰的台灣檳榔可能會被海關詢問，保持冷靜、配合即可。
- 飲用水品牌：峇里島常見的飲用水品牌有 **Amidis、Cleo、Aqua**，在超商、便利商店及一般小店均可購買，三者皆安全可靠。請勿飲用自來水。
- 峇里島任何「表演」「火舞」「克差舞」「雷貢舞」「巴龍舞」「Kecak」「Legong」「Barong」：**均非開放式劇場，皆需購票入場**，不可說「免費觀看」或「路邊就能看到」。
- AIAC（All Indonesia Arrival Card / 印尼入境卡）：為**免費服務**，入境前可在官方平台填寫。
- SATUSEHAT（健康通行證/健康申報）：**現在已整合至 AIAC 入境卡，無需單獨填寫**，只需完成 AIAC 申請即可。
- La Brisa（峇里島 Canggu 著名海灘餐廳/景點）：**設有更衣室，並可使用淋浴設施**，適合衝浪或玩水後梳洗整理。
- 佩尼達島/Nusa Penida 一日遊還是住宿：一日遊方便快速走訪熱門景點，但若能留宿一晚可錯開人潮、欣賞日出日落。行程允許的話建議住一晚。

【海關／入境規定原則】：凡涉及「可不可以帶XXX入境」「XXX是不是違禁品」等海關問題，優先以下方文章片段為準；若片段沒提到，就說「本站目前沒有這方面的專門文章，建議查詢印尼海關官方規定或詢問航空公司」，不可用自己的訓練資料給出確定性答案。

文章片段：
${ragContext}`,
  };

  const prompt = groundingRules[lang] || groundingRules['zh-TW'];
  if (hasContext) return prompt;

  // 理論上不會走到這裡（無命中 chunk 時走 NOT_FOUND_REPLY 快速路徑，不呼叫 LLM），保留作為防呆。
  return prompt.replace(/文章片段：\n[\s\S]*$|Article excerpts:\n[\s\S]*$/, '（本次沒有檢索到相關文章片段，若使用者問的內容你不確定，請直接說不確定並建議查詢官方來源。）');
}

async function checkRateLimit(kv, ip) {
  const key = `rl:${ip}`;
  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  if (count >= RATE_LIMIT_MAX) return false;
  await kv.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_TTL });
  return true;
}

async function logChat(env, question, answer, lang, hitChunks, topScore) {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      'INSERT INTO chats (question, answer, lang, created_at, hit_chunks, top_score) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(question, answer, lang || 'zh-TW', Date.now(), hitChunks || 0, topScore ?? null).run();
  } catch { /* non-critical, silently ignore */ }
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

  if (!env.DEEPINFRA_API_KEY) {
    return Response.json({ error: '尚未設定 DEEPINFRA_API_KEY' }, { status: 503, headers: corsHeaders });
  }
  if (!env.AI || !env.VECTORIZE) {
    return Response.json({ error: '尚未設定 AI / VECTORIZE 綁定' }, { status: 503, headers: corsHeaders });
  }

  let message, pageLang, history;
  try {
    const body = await request.json();
    message = (body.message || '').trim().slice(0, INPUT_MAX_CHARS);
    pageLang = body.lang || '';
    // 只保留最近 3 輪（= 最多 6 則），並過濾格式錯誤的項目
    history = Array.isArray(body.history)
      ? body.history
          .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-MAX_HISTORY_TURNS * 2)
          .map(m => ({ role: m.role, content: m.content.slice(0, 800) }))
      : [];
  } catch {
    return Response.json({ error: '請求格式錯誤' }, { status: 400, headers: corsHeaders });
  }

  if (!message) {
    return Response.json({ error: '訊息不能為空' }, { status: 400, headers: corsHeaders });
  }

  // ── Spam / abuse filter ───────────────────────────────────────────────────────
  if (isSpam(message)) {
    return Response.json({ error: '您的訊息包含不允許的內容。' }, { status: 400, headers: corsHeaders });
  }

  const lang = detectLanguage(message, pageLang);

  // ── Response cache（只快取沒有對話歷史的單輪問答，checked before rate limit）──
  const hasHistory = history.length > 0;
  const cacheKey = hasHistory ? null : await msgCacheKey(message, lang);
  if (cacheKey && env.RATE_LIMIT) {
    const cached = await env.RATE_LIMIT.get(cacheKey);
    if (cached) return Response.json({ reply: cached }, { headers: corsHeaders });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────────
  if (env.RATE_LIMIT) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const allowed = await checkRateLimit(env.RATE_LIMIT, ip);
    if (!allowed) {
      return Response.json({ error: '您的提問次數已達上限，請稍後再試。' }, { status: 429, headers: corsHeaders });
    }
  }

  // ── RAG 檢索：embed 問題 → Vectorize top 5 → 相似度門檻 + 時效性防呆 ──────────
  let matches = [];
  try {
    const vector = await embedQuery(env, message);
    matches = await retrieveChunks(env, vector, message);
  } catch (err) {
    console.error('Vectorize retrieval error:', err);
    // 檢索失敗不擋住整個對話，但沒有 context 時一律走「找不到」路徑，避免模型瞎編
  }

  // ── 沒有任何 chunk 過門檻 → 不呼叫 LLM，直接走「找不到」回覆路徑 ──────────────
  if (matches.length === 0) {
    const reply = NOT_FOUND_REPLY[lang] || NOT_FOUND_REPLY['zh-TW'];
    context.waitUntil(logChat(env, message, reply, pageLang, 0, null));
    return Response.json({ reply }, { headers: corsHeaders });
  }

  if (env.RATE_LIMIT) {
    const dailyOk = await checkDailyGlobal(env.RATE_LIMIT);
    if (!dailyOk) {
      return Response.json({ error: '今日問答次數已達上限，請明天再試。' }, { status: 429, headers: corsHeaders });
    }
  }

  const ragContext = buildRagContext(matches, lang);
  const systemPrompt = buildSystemPrompt(lang, ragContext, true);
  const topScore = matches[0].score;

  // ── DeepInfra / DeepSeek API — streaming ────────────────────────────────────
  const aiRes = await fetch('https://api.deepinfra.com/v1/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.DEEPINFRA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-ai/DeepSeek-V4-Flash',
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: message },
      ],
    }),
  });

  if (!aiRes.ok) {
    console.error('DeepInfra API error:', await aiRes.text());
    return Response.json({ error: '抱歉，AI 暫時無法回應，請稍後再試。' }, { status: 502, headers: corsHeaders });
  }

  // Pipe SSE stream to client while accumulating full reply for cache/log
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  context.waitUntil((async () => {
    const reader = aiRes.body.getReader();
    let fullReply = '';
    let buf = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        buf += chunk;
        // Forward raw SSE bytes to client
        await writer.write(enc.encode(chunk));
        // Accumulate tokens for cache
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete line
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const token = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content || '';
            fullReply += token;
          } catch {}
        }
      }
    } finally {
      await writer.close();
    }
    if (cacheKey && env.RATE_LIMIT && fullReply) {
      await env.RATE_LIMIT.put(cacheKey, fullReply, { expirationTtl: CACHE_TTL });
    }
    await logChat(env, message, fullReply, pageLang, matches.length, topScore);
  })());

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  });
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
