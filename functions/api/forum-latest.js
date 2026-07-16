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
//
// Dedup is by post-id pairing, not just title text: a reply's subject is
// fixed at post time and phpBB never updates it if the topic is renamed
// later, so a renamed topic's reply can carry a stale title that no longer
// string-matches the current one. Since a reply's post id is always its
// original post's id + 1, we pair them up and prefer the original post's
// (always current) title.

const FORUM_BASE = 'https://community.gobaligo.id/';
const ENTRY_RE = /<link href="([^"]+)"\/>\s*<title type="html"><!\[CDATA\[([\s\S]*?)\]\]><\/title>/g;
const POST_ID_RE = /[?&]p=(\d+)/;

function parseEntry(url, rawTitle) {
  // rawTitle looks like "ForumName • Re: Topic Title" or "ForumName • Topic Title"
  const parts = rawTitle.split(' • ');
  const subject = parts.length > 1 ? parts.slice(1).join(' • ') : rawTitle;
  const isReply = /^Re:\s*/.test(subject);
  const title = subject.replace(/^Re:\s*/, '').trim();
  const postIdMatch = url.match(POST_ID_RE);
  const postId = postIdMatch ? Number(postIdMatch[1]) : null;
  return { url, title, isReply, postId };
}

export async function onRequestGet({ request }) {
  try {
    // ?f=<forum_id> scopes the feed to a single board (e.g. per blog-category
    // discussion board) instead of the site-wide "all posts" feed.
    const forumId = new URL(request.url).searchParams.get('f');
    const feedPath = forumId ? `app.php/feed/forum/${encodeURIComponent(forumId)}` : 'app.php/feed';
    const limit = forumId ? 5 : 6;

    const res = await fetch(`${FORUM_BASE}${feedPath}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GobaligoForumWidget/1.0)' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    if (!res.ok) throw new Error(`upstream ${res.status}`);
    const xml = await res.text();

    // Use matchAll (not ENTRY_RE.exec in a loop): matchAll clones the regex
    // internally, so the module-level ENTRY_RE.lastIndex is never mutated.
    // Sharing a stateful /g regex across Worker requests (same reused isolate)
    // would leave lastIndex mid-feed after the early break and make the next
    // request parse only the tail — returning fewer than 6 topics. (POST_ID_RE
    // has no /g flag, so url.match() below has no equivalent lastIndex risk.)
    const entries = Array.from(xml.matchAll(ENTRY_RE), (m) => parseEntry(m[1], m[2]));
    const byPostId = new Map(entries.map((e) => [e.postId, e]));

    const topics = [];
    const seenTitles = new Set();
    const usedPostIds = new Set();
    for (const entry of entries) {
      if (topics.length >= limit) break;
      if (entry.postId !== null && usedPostIds.has(entry.postId)) continue;

      const op = entry.isReply && entry.postId !== null ? byPostId.get(entry.postId - 1) : null;
      const canonical = op ?? entry;

      if (entry.postId !== null) usedPostIds.add(entry.postId);
      if (op) usedPostIds.add(op.postId);

      if (seenTitles.has(canonical.title)) continue;
      seenTitles.add(canonical.title);
      topics.push({ title: canonical.title, url: canonical.url });
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
