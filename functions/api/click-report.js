// Outbound affiliate click report
// GET /api/click-report?key=REPORT_SECRET&days=14[&format=text]
//
// Days are bucketed in UTC so the numbers line up with the Travelpayouts
// dashboard. Pair the daily click counts here with TP's bookings to tell
// "traffic dropped" apart from "conversion broke" — the aggregate TP chart
// alone cannot separate those.

const DAY = `strftime('%Y-%m-%d', created_at/1000, 'unixepoch')`;
const EXPECTED_MARKER = '654252';
const RETENTION_DAYS = 90;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);

  const key = url.searchParams.get('key');
  if (!env.REPORT_SECRET || key !== env.REPORT_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  if (!env.DB) return new Response('DB not configured', { status: 500 });

  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '14', 10) || 14, 1), 90);
  const since = Date.now() - days * 86400_000;

  let daily, byProgram, byClient, badMarker, notRewritten, topPaths;
  try {
    [daily, byProgram, byClient, badMarker, notRewritten, topPaths] = await Promise.all([
      env.DB.prepare(
        `SELECT ${DAY} AS day, COUNT(*) AS clicks
           FROM affiliate_clicks WHERE created_at > ?
          GROUP BY day ORDER BY day`
      ).bind(since).all(),
      env.DB.prepare(
        `SELECT ${DAY} AS day, program, COUNT(*) AS clicks
           FROM affiliate_clicks WHERE created_at > ?
          GROUP BY day, program ORDER BY day, program`
      ).bind(since).all(),
      env.DB.prepare(
        `SELECT client, COUNT(*) AS clicks
           FROM affiliate_clicks WHERE created_at > ?
          GROUP BY client ORDER BY clicks DESC`
      ).bind(since).all(),
      // Drive rewrote the link but stamped a marker that is not ours.
      env.DB.prepare(
        `SELECT marker, COUNT(*) AS clicks
           FROM affiliate_clicks
          WHERE created_at > ? AND rewritten = 1 AND marker != '' AND marker != ?
          GROUP BY marker ORDER BY clicks DESC`
      ).bind(since, EXPECTED_MARKER).all(),
      // rewritten = 0 means Link Switcher never touched the link and it was not
      // a tpm.li short link either, so the click earned nothing through TP.
      // Drive misses one intermittently, so watch this as a rate, not a binary.
      env.DB.prepare(
        `SELECT program, COUNT(*) AS clicks
           FROM affiliate_clicks WHERE created_at > ? AND rewritten = 0
          GROUP BY program ORDER BY clicks DESC`
      ).bind(since).all(),
      env.DB.prepare(
        `SELECT path, COUNT(*) AS clicks
           FROM affiliate_clicks WHERE created_at > ?
          GROUP BY path ORDER BY clicks DESC LIMIT 20`
      ).bind(since).all(),
    ]);
  } catch (err) {
    return json({ error: 'query failed', detail: String(err) }, 500);
  }

  // Opportunistic retention trim; failure here must not fail the report.
  context.waitUntil(
    env.DB.prepare(`DELETE FROM affiliate_clicks WHERE created_at < ?`)
      .bind(Date.now() - RETENTION_DAYS * 86400_000)
      .run()
      .catch(() => {})
  );

  const report = {
    range_days: days,
    timezone: 'UTC (matches Travelpayouts)',
    expected_marker: EXPECTED_MARKER,
    total_clicks: (daily.results ?? []).reduce((n, r) => n + r.clicks, 0),
    daily: daily.results ?? [],
    by_program: byProgram.results ?? [],
    by_client: byClient.results ?? [],
    wrong_marker: badMarker.results ?? [],
    not_rewritten: notRewritten.results ?? [],
    top_paths: topPaths.results ?? [],
  };

  if (url.searchParams.get('format') !== 'text') return json(report);

  const programs = [...new Set(report.by_program.map((r) => r.program))].sort();
  const perDay = new Map();
  for (const r of report.by_program) {
    if (!perDay.has(r.day)) perDay.set(r.day, {});
    perDay.get(r.day)[r.program] = r.clicks;
  }

  const pad = (s, n) => String(s).padStart(n);
  const lines = [
    `Outbound affiliate clicks — last ${days} days (UTC)`,
    '',
    ['day       ', ...programs.map((p) => pad(p, 9)), pad('total', 8)].join(' '),
  ];
  for (const [day, row] of perDay) {
    const total = programs.reduce((n, p) => n + (row[p] ?? 0), 0);
    lines.push([day, ...programs.map((p) => pad(row[p] ?? 0, 9)), pad(total, 8)].join(' '));
  }
  lines.push('', `total: ${report.total_clicks}`);
  lines.push('', 'by client: ' + report.by_client.map((r) => `${r.client}=${r.clicks}`).join('  '));
  lines.push(
    'not rewritten by Drive: ' +
      (report.not_rewritten.length
        ? report.not_rewritten.map((r) => `${r.program}=${r.clicks}`).join('  ')
        : 'none')
  );
  lines.push(
    'wrong marker: ' +
      (report.wrong_marker.length
        ? report.wrong_marker.map((r) => `${r.marker}=${r.clicks}`).join('  ')
        : `none (all ${EXPECTED_MARKER})`)
  );

  return new Response(lines.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
