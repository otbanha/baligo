export async function onRequestGet(context) {
  const { env, request } = context;

  // Simple secret key protection
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key || key !== env.REPORT_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!env.DB) {
    return new Response('DB not configured', { status: 500 });
  }

  // Query past 7 days
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const { results } = await env.DB.prepare(
    'SELECT question, answer, lang, created_at FROM chats WHERE created_at > ? ORDER BY created_at DESC LIMIT 500'
  ).bind(since).all();

  if (!results || results.length === 0) {
    return new Response('No chats this week', { status: 200 });
  }

  // Format email body
  const rows = results.map((r, i) => {
    const date = new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 16);
    return `---\n#${i + 1} [${date} UTC] (${r.lang})\nQ: ${r.question}\nA: ${r.answer}\n`;
  }).join('\n');

  const emailBody = `Chatbot Weekly Report — ${new Date().toISOString().slice(0, 10)}\nTotal questions: ${results.length}\n\n${rows}`;

  // Send via Resend
  if (!env.RESEND_API_KEY || !env.REPORT_EMAIL) {
    return new Response('Email not configured\n\n' + emailBody, { status: 200 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Baligo Bot <bot@gobaligo.id>',
      to: [env.REPORT_EMAIL],
      subject: `Chatbot Weekly Report (${results.length} Qs) — ${new Date().toISOString().slice(0, 10)}`,
      text: emailBody,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(`Resend error: ${err}`, { status: 502 });
  }

  return new Response(`Report sent. ${results.length} chats.`, { status: 200 });
}
