// Outbound affiliate click tracker
// POST /api/click  { program, rewritten, marker, path }
//
// Sent via navigator.sendBeacon from BaseHead.astro on every outbound
// affiliate click. Always responds 204 — this must never interfere with the
// navigation the user just triggered.
//
// Writes one row per click to D1. At current volume (~1.3k clicks/day) this is
// well inside the free tier (100k writes/day). Deliberately does NOT touch KV:
// per-click KV writes are what blew the quota before.

// 'forum' is not an affiliate program — it tracks the article → phpBB funnel.
// Read it separately from the brands: its rewritten is always 0 by nature.
const PROGRAMS = ['klook', 'agoda', 'booking', 'trip', 'airalo', 'saily', 'forum', 'other'];

// CREATE TABLE runs once per isolate, not once per click.
let tableReady = false;

async function ensureTable(db) {
  if (tableReady) return;
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        program    TEXT    NOT NULL,
        rewritten  INTEGER NOT NULL DEFAULT 0,
        marker     TEXT,
        path       TEXT    NOT NULL,
        client     TEXT,
        country    TEXT
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ac_created ON affiliate_clicks(created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_ac_program ON affiliate_clicks(program, created_at)`),
  ]);
  tableReady = true;
}

// Which surface the click came from. In-app webviews handle multi-hop
// affiliate redirects worse than real browsers, so this split is the point.
function classifyClient(ua) {
  if (!ua) return 'unknown';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  if (/\bLine\//i.test(ua)) return 'line';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function isOwnOrigin(value) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname;
    return host === 'gobaligo.id' || host.endsWith('.gobaligo.id') || host.endsWith('.pages.dev');
  } catch {
    return false;
  }
}

// Per-isolate, per-minute IP cap. Bounds D1 write amplification from scripted
// abuse without spending a KV read/write on every click.
const hits = new Map();
let windowKey = 0;

function withinRateLimit(ip) {
  const w = Math.floor(Date.now() / 60000);
  if (w !== windowKey) {
    hits.clear();
    windowKey = w;
  }
  const n = (hits.get(ip) ?? 0) + 1;
  hits.set(ip, n);
  return n <= 120;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const noop = new Response(null, { status: 204 });

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  // Same-origin sendBeacon does not always carry Origin in in-app webviews,
  // so fall back to Referer rather than dropping those clicks.
  if (!isOwnOrigin(origin) && !isOwnOrigin(referer)) return noop;

  if (!env.DB) return noop;

  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  if (!withinRateLimit(ip)) return noop;

  let body;
  try {
    // Beacon sends text/plain to stay a simple request; parse it ourselves.
    body = JSON.parse(await request.text());
  } catch {
    return noop;
  }

  const program = PROGRAMS.includes(body?.program) ? body.program : null;
  if (!program) return noop;

  const path = typeof body?.path === 'string' ? body.path.slice(0, 300) : '';
  if (!path) return noop;

  const marker = typeof body?.marker === 'string' ? body.marker.slice(0, 20) : '';
  // 0 = raw brand link Drive never touched, 1 = rewritten by Drive,
  // 2 = already a Travelpayouts short link (tpm.li), which needs no rewrite.
  const rewritten = [0, 1, 2].includes(body?.rewritten) ? body.rewritten : 0;
  const client = classifyClient(request.headers.get('user-agent'));
  const country = request.cf?.country ?? null;

  try {
    await ensureTable(env.DB);
    await env.DB.prepare(
      `INSERT INTO affiliate_clicks
         (created_at, program, rewritten, marker, path, client, country)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(Date.now(), program, rewritten, marker, path, client, country).run();
  } catch {
    // Swallow — a lost click row is never worth a visible error.
  }

  return noop;
}
