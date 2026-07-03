// Server-side fetch of phpBB's Atom feed (avoids browser CORS, since
// community.gobaligo.id is a different subdomain than gobaligo.id).
//
// Uses /app.php/feed (all posts, not just new topics) instead of
// search.php?search_id=active_topics — the "Reply to see content"
// extension hooks core.search_modify_* and breaks that page's
// last-post ordering (it falls back to topic-id order). The feed
// controller is a separate code path and is unaffected, and its
// entries are already sorted by true last-activity time.
//
// Returns the latest 6 distinct topics (deduped across original
// post + replies) as JSON.

const FORUM_BASE = 'https://community.gobaligo.id/';
const ENTRY_RE = /<link href="([^"]+)"\/>\s*<title type="html"><!\[CDATA\[([\s\S]*?)\]\]><\/title>/g;

function toTopicTitle(rawTitle) {
  // rawTitle looks like "ForumName • Re: Topic Title" or "ForumName • Topic Title"
  const parts = rawTitle.split(' • ');
  const title = parts.length > 1 ? parts.slice(1).join(' • ') : rawTitle;
  return title.replace(/^Re:\s*/, '').trim();
}

export async function onRequestGet() {
  try {
    const res = await fetch(`${FORUM_BASE}app.php/feed`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GobaligoForumWidget/1.0)' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const xml = await res.text();

    const topics = [];
    const seenTitles = new Set();
    // Use matchAll (not ENTRY_RE.exec in a loop): matchAll clones the regex
    // internally, so the module-level ENTRY_RE.lastIndex is never mutated.
    // Sharing a stateful /g regex across Worker requests (same reused isolate)
    // would leave lastIndex mid-feed after the early break and make the next
    // request parse only the tail — returning fewer than 6 topics.
    for (const match of xml.matchAll(ENTRY_RE)) {
      if (topics.length >= 6) break;
      const url = match[1];
      const title = toTopicTitle(match[2]);
      if (seenTitles.has(title)) continue;
      seenTitles.add(title);
      topics.push({ title, url });
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
