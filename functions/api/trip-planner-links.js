// Trip Planner accommodation links — stored in RATE_LIMIT KV under key "config:trip-planner-links"
// GET  /api/trip-planner-links   → { accom: { seminyak: [...], ... }, kidsAccom: [...] }
// POST /api/trip-planner-links   → save data (requires X-Admin-Token)

const KV_KEY = 'config:trip-planner-links';

const DEFAULT_LINKS = {
  accom: {
    kuta: [],
    seminyak: [
      { title: '水明漾 22 間令人驚艷的峇里島 Villa 泳池別墅推薦', url: '/blog/2025-08-11-660e6e92fd89780001e6047e/', tag: 'Villa' },
      { title: '【水明漾住宿】Hotel Indigo Bali Seminyak 台幣5千入住五星濱海渡假村', url: '/blog/2025-07-24-68818eddfd897800017a2dfb/', tag: '五星' },
      { title: '【水明漾】100美元以內的平價峇里島 Villa 推薦', url: '/blog/2024-09-21-66ee9770fd89780001306753/', tag: '平價' },
      { title: '【水明漾住宿推薦】iSuite by Ekosistem 設計感精品住宿', url: '/blog/2026-04-07-044334/', tag: '精品' },
      { title: '峇里島住宿推薦：水明漾的濱海精緻主題住宿指南', url: '/blog/2023-11-06-65472977fd89780001cf3ce6/', tag: '主題住宿' },
    ],
    canggu: [
      { title: '長谷 16 間私人泳池別墅 Canggu Villa 你不能錯過的推薦', url: '/blog/2024-08-07-66b20b15fd89780001ceef6b/', tag: 'Villa' },
      { title: '【Canggu飯店推薦】新開幕 TUI BLUE Berawa Hotel and Villas', url: '/blog/2025-01-20-678dada2fd897800015779fb/', tag: '新開幕' },
      { title: 'Holiday Inn Resort Bali Canggu 峇里島長谷假日酒店', url: '/blog/2025-10-07-68e51c8efd897800014e36a6/', tag: '親子' },
    ],
    ubud: [
      { title: '【烏布住宿推薦】30 間森林系渡假村：阿漾河谷懸崖到隱世梯田 Villa', url: '/blog/2024-02-20-65d21157fd897800013be576/', tag: '森林Villa' },
      { title: '【烏布住宿推薦】烏布 Villa 泳池別墅私密天堂 20 間推薦', url: '/blog/2024-04-24-6628f08cfd8978000190a575/', tag: 'Villa' },
      { title: 'Bidadari Private Villas & Retreat — 峇里島烏布的隱世天堂', url: '/blog/2025-01-17-6789be68fd89780001c3ec93/', tag: '隱世' },
      { title: '烏布新地標開幕：Hiliwatu 萬豪精選酒店打造峇里島奢華新體驗', url: '/blog/2026-01-19-696d9b87fd89780001ca2885/', tag: '新開幕' },
    ],
    uluwatu: [
      { title: '【Alila Villas Uluwatu】世界十大無邊際泳池奢華別墅', url: '/blog/2025-04-06-67f1f8fbfd89780001607840/', tag: '奢華' },
      { title: '【烏魯瓦圖五星飯店推薦】Radisson Blu Bali Uluwatu', url: '/blog/2025-01-20-678e30cbfd89780001f72fc6/', tag: '五星' },
      { title: '峇里島烏魯瓦圖住宿推薦：La Cabane Bali 夢幻小天堂', url: '/blog/2025-09-04-68b8d2e3fd897800017acaee/', tag: '精品' },
    ],
    nusadua: [
      { title: '凱賓斯基 Apurva Kempinski Bali：峇里島頂級奢華渡假住宿', url: '/blog/2024-04-22-660ff581fd89780001f31315/', tag: '奢華' },
    ],
    jimbaran: [
      { title: '【金巴蘭住宿】10 間無敵海景飯店：世界級日落、懸崖無邊際泳池與頂級 Villa', url: '/blog/2025-07-22-654c6271fd8978000174ff5e/', tag: '海景住宿' },
      { title: '峇里島金巴蘭 Raffles Bali：全球最佳奢華度假村之一', url: '/blog/2024-10-11-67094049fd8978000167f9f9/', tag: '奢華' },
    ],
    penida: [
      { title: '佩尼達島住宿推薦：14 間從奢華到平價的 Nusa Penida 好評住宿', url: '/blog/2024-02-12-65c8e2dffd89780001346aa9/', tag: '全攻略' },
    ],
    sanur: [],
    lembongan: [],
    komodo: [],
    east: [],
  },
  kidsAccom: [
    { title: 'Holiday Inn Resort Bali Canggu 峇里島長谷假日酒店', url: '/blog/2025-10-07-68e51c8efd897800014e36a6/', tag: '親子' },
    { title: '巴里島親子遊：峇里島動物園 Bali Safari 夜宿攻略', url: '/blog/2023-07-25-64db6b8cfd897800013a9ab1/', tag: '動物園' },
    { title: '【2026 峇里島親子遊】100+ 親子友善景點與活動大全', url: '/blog/2023-03-05-64db6b81fd897800013a98b4/', tag: '全攻略' },
  ],
};

export async function onRequestGet(context) {
  const { env } = context;
  if (!env.RATE_LIMIT) return Response.json(DEFAULT_LINKS, { headers: { 'Cache-Control': 'public, max-age=300' } });
  const raw = await env.RATE_LIMIT.get(KV_KEY);
  const data = raw ? JSON.parse(raw) : DEFAULT_LINKS;
  return Response.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const token = request.headers.get('X-Admin-Token') || '';
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!env.RATE_LIMIT) return Response.json({ error: 'KV not configured' }, { status: 500 });

  let data;
  try {
    data = await request.json();
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: 400 });
  }

  await env.RATE_LIMIT.put(KV_KEY, JSON.stringify(data));
  return Response.json({ ok: true });
}
