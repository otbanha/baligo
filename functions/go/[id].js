// Dynamic short link redirect handler
// Looks up sl:<id> in KV, falls back to static shortlinks.json
import staticLinks from '../../src/data/shortlinks.json';

const staticMap = Object.fromEntries(staticLinks.map(l => [l.id, l.url]));

export async function onRequest({ params, env }) {
  const id = params.id;

  // KV lookup first (dynamic links take priority)
  if (env.RATE_LIMIT) {
    const url = await env.RATE_LIMIT.get(`sl:${id}`);
    if (url) return Response.redirect(url, 302);
  }

  // Fall back to static JSON
  const url = staticMap[id];
  if (url) return Response.redirect(url, 302);

  return new Response('Short link not found', { status: 404 });
}
