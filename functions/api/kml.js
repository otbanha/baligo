const VALID_SLUGS = new Set([
  'kuta', 'seminyak', 'canggu', 'nuanu', 'ubud',
  'jimbaran', 'uluwatu', 'nusa-dua', 'sanur', 'amed',
  'nusa-penida', 'lembongan', 'denpasar',
  'canggu-hotel', 'seminyak-hotel', 'seminyak-eat-street',
  'ubud-villa', 'vegetarian',
]);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const slug = url.searchParams.get('slug');

  if (!slug || !VALID_SLUGS.has(slug)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const kmlUrl = `${url.origin}/maps/${slug}.kml`;
    const res = await fetch(kmlUrl, {
      cf: { cacheEverything: true, cacheTtl: 86400 },
    });

    if (!res.ok) {
      return new Response('KML not found', { status: 404 });
    }

    const body = await res.text();
    return new Response(body, {
      headers: {
        'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
        'Access-Control-Allow-Origin': '*',
        'Vary': 'Accept-Encoding',
      },
    });
  } catch {
    return new Response('Error fetching KML', { status: 502 });
  }
}
