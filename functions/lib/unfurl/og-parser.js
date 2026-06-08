const MAX_BYTES = 256 * 1024;

/**
 * Parse OG and Twitter meta tags from HTML string using HTMLRewriter.
 * @param {string} html
 * @returns {Promise<{ title: string|null, description: string|null, image: string|null, video: string|null, siteName: string|null, type: string|null }>}
 */
export async function parseOG(html) {
  const og = {};

  const rewriter = new HTMLRewriter().on('meta', {
    element(el) {
      const property = el.getAttribute('property') ?? '';
      const name = el.getAttribute('name') ?? '';
      const content = el.getAttribute('content') ?? '';

      if (property.startsWith('og:')) {
        const key = property.slice(3);
        if (!og[key]) og[key] = content;
      } else if (name.startsWith('twitter:')) {
        const key = name.slice(8);
        // Only use twitter:* as fallback when og:* is missing
        if (!og[key]) og[key] = content;
      }
    },
  });

  await rewriter.transform(new Response(html)).text();

  return {
    title: og['title'] ?? null,
    description: og['description'] ?? null,
    image: og['image'] ?? og['image:secure_url'] ?? null,
    video: og['video:url'] ?? og['video'] ?? null,
    siteName: og['site_name'] ?? null,
    type: og['type'] ?? null,
  };
}

/**
 * Parse OG tags from a streaming Response, capped at maxBytes.
 * @param {Response} response
 * @returns {Promise<ReturnType<typeof parseOG>>}
 */
export async function parseOGFromResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  let consumed = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      consumed += value.length;
      html += decoder.decode(value, { stream: true });
      // Stop after maxBytes or after </head> (all meta tags are in head)
      if (consumed >= MAX_BYTES || html.includes('</head>')) {
        await reader.cancel().catch(() => {});
        break;
      }
    }
  } catch {
    // Partial read is fine
  }

  return parseOG(html);
}
