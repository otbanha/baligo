// Server-side fetch of phpBB "Active topics" page (avoids browser CORS,
// since community.gobaligo.id is a different subdomain than gobaligo.id).
// Returns the latest 6 board-wide active topics as JSON.

const FORUM_BASE = 'https://community.gobaligo.id/';
const TOPIC_RE = /<a href="\.\/viewtopic\.php\?t=(\d+)[^"]*"\s+class="topictitle">([^<]*)<\/a>/g;

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function onRequestGet() {
  try {
    const res = await fetch(`${FORUM_BASE}search.php?search_id=active_topics&_=${Date.now()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GobaligoForumWidget/1.0)' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const html = await res.text();

    const topics = [];
    let match;
    while ((match = TOPIC_RE.exec(html)) && topics.length < 6) {
      topics.push({
        title: decodeEntities(match[2]),
        url: `${FORUM_BASE}viewtopic.php?t=${match[1]}`,
      });
    }

    return new Response(JSON.stringify({ topics }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch {
    return new Response(JSON.stringify({ topics: [] }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
}
