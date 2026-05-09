const VALID_SLUGS = new Set([
  'kuta', 'seminyak', 'canggu', 'nuanu', 'ubud',
  'jimbaran', 'uluwatu', 'nusa-dua', 'sanur', 'amed',
  'nusa-penida', 'lembongan', 'denpasar',
  'canggu-hotel', 'seminyak-hotel', 'seminyak-eat-street',
  'ubud-villa', 'vegetarian',
]);

function isValidMid(mid) {
  return typeof mid === 'string' && /^[A-Za-z0-9_\-]{10,80}$/.test(mid);
}

const KML_HEADERS = {
  'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Vary': 'Accept-Encoding',
};

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const mid = url.searchParams.get('mid');
  const slug = url.searchParams.get('slug');

  // MyMaps proxy: fetch live KML from Google My Maps
  if (mid) {
    if (!isValidMid(mid)) {
      return new Response('Invalid map ID', { status: 400 });
    }
    try {
      const googleUrl = `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;
      const res = await fetch(googleUrl, {
        cf: { cacheEverything: true, cacheTtl: 3600 },
      });
      if (!res.ok) {
        return new Response('MyMaps fetch failed', { status: 502 });
      }
      const body = await res.text();
      return new Response(body, {
        headers: {
          ...KML_HEADERS,
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
        },
      });
    } catch {
      return new Response('Error fetching MyMaps', { status: 502 });
    }
  }

  // Local KML fallback: serve static file from /maps/
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
        ...KML_HEADERS,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response('Error fetching KML', { status: 502 });
  }
}
