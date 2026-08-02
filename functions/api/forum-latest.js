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
// Returns the latest N distinct topics (deduped across original
// post + replies) as JSON. N defaults to 6 site-wide / 5 per-board
// and can be raised with ?limit= (the homepage widget asks for 12).
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
const MAX_LIMIT = 20;

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

// Use matchAll (not ENTRY_RE.exec in a loop): matchAll clones the regex
// internally, so the module-level ENTRY_RE.lastIndex is never mutated.
// Sharing a stateful /g regex across Worker requests (same reused isolate)
// would leave lastIndex mid-feed after the early break and make the next
// request parse only the tail — returning fewer topics than asked for.
// (POST_ID_RE has no /g flag, so url.match() has no equivalent risk.)
async function fetchEntries(feedPath) {
  const res = await fetch(`${FORUM_BASE}${feedPath}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GobaligoForumWidget/1.0)' },
    cf: { cacheTtl: 0, cacheEverything: false },
  });
  if (!res.ok) throw new Error(`upstream ${res.status}`);
  const xml = await res.text();
  return Array.from(xml.matchAll(ENTRY_RE), (m) => parseEntry(m[1], m[2]));
}

function collectTopics(entries, limit) {
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
  return topics;
}

export async function onRequestGet({ request }) {
  try {
    // ?f=<forum_id> scopes the feed to a single board (e.g. per blog-category
    // discussion board) instead of the site-wide "all posts" feed.
    const params = new URL(request.url).searchParams;
    const forumId = params.get('f');
    const requested = Number(params.get('limit'));
    const limit = Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), MAX_LIMIT)
      : (forumId ? 5 : 6);

    const feedPath = forumId ? `app.php/feed/forum/${encodeURIComponent(forumId)}` : 'app.php/feed';
    const entries = await fetchEntries(feedPath);
    let topics = collectTopics(entries, limit);

    // The all-posts feed only carries ~15 entries and replies collapse into
    // their original topic, so a bigger limit can come up short. phpBB's
    // "new topics" feed is a separate list — top up from it before giving up.
    // (No per-board equivalent exists, so this is site-wide only.)
    if (!forumId && topics.length < limit) {
      try {
        const newTopics = await fetchEntries('app.php/feed/topics');
        topics = collectTopics(entries.concat(newTopics), limit);
      } catch {
        // keep whatever the primary feed gave us
      }
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
