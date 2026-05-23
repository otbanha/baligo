/**
 * POST /api/like
 * body: { id: string }
 * Increments like count for a recent item. Always responds 204.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  const origin = request.headers.get('origin') ?? '';
  if (origin !== 'https://gobaligo.id') {
    return new Response(null, { status: 204 });
  }

  if (!env.UNFURL_RECENT) return new Response(null, { status: 204 });

  let id;
  try {
    const body = await request.json();
    id = typeof body?.id === 'string' ? body.id.trim() : '';
  } catch {
    return new Response(null, { status: 204 });
  }

  if (!id) return new Response(null, { status: 204 });

  const key = `recent:${id}`;
  const item = await env.UNFURL_RECENT.get(key, 'json').catch(() => null);
  if (!item) return new Response(null, { status: 204 });

  item.likes = (item.likes ?? 0) + 1;

  // 永久保留，不設 TTL
  await env.UNFURL_RECENT.put(key, JSON.stringify(item)).catch(() => {});

  return new Response(null, { status: 204 });
}
