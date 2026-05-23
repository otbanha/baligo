/**
 * POST /api/track
 * body: { id: string }
 * Increments view count for a recent item. Always responds 204.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Only accept requests from our own origin (sendBeacon sends the page origin)
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

  item.views = (item.views ?? 0) + 1;

  // Preserve original expiration — don't reset TTL so hot items don't live forever
  const putOpts = item.expiresAt
    ? { expiration: item.expiresAt }
    : { expirationTtl: 7 * 86400 };

  await env.UNFURL_RECENT.put(key, JSON.stringify(item), putOpts).catch(() => {});

  return new Response(null, { status: 204 });
}
