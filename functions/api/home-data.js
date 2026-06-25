// Combined homepage data — merges videos + hot-articles + featured into one
// request so each blog-index pageview costs 1 Worker invocation instead of 3.
// GET /api/home-data → { videos, hotArticles, featured }

const DEFAULT_VIDEOS = [
  '0fqEvAzAy9A',
  'GivvqCXp11A',
  'H5N5_UuK7TI',
  'EotdDxXHFwE',
  '7JIqxDIyDF0',
  'ePutHL_Ob1Q',
];

const DEFAULT_FEATURED = {
  "叫車包車": [
    "2024-12-24-676a2ccefd89780001962994",
    "2024-07-07-668aaea7fd89780001981840",
    "2024-06-05-665d6a8efd897800013337a9"
  ],
  "住宿推薦": [
    "2026-03-06-69aa4faefd897800016bbeda",
    "2025-10-19-68f45c39fd8978000150fff0",
    "2025-09-04-68b8d2e3fd897800017acaee"
  ],
  "簽證通關": [
    "2026-02-27-69a10819fd897800019c4849",
    "2025-08-14-689dcce7fd8978000125fc52",
    "2025-08-14-689db40ffd89780001eb2f3e"
  ]
};

export async function onRequestGet({ env }) {
  if (!env.RATE_LIMIT) {
    return Response.json({ videos: DEFAULT_VIDEOS, hotArticles: [], featured: DEFAULT_FEATURED });
  }

  const [videosRaw, hotRaw, featuredRaw] = await Promise.all([
    env.RATE_LIMIT.get('config:videos'),
    env.RATE_LIMIT.get('config:hot-articles'),
    env.RATE_LIMIT.get('config:featured'),
  ]);

  return Response.json(
    {
      videos: videosRaw ? JSON.parse(videosRaw) : DEFAULT_VIDEOS,
      hotArticles: hotRaw ? JSON.parse(hotRaw) : [],
      featured: featuredRaw ? JSON.parse(featuredRaw) : DEFAULT_FEATURED,
    },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
