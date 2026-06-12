/**
 * Trip Planner — Day-by-Day 行程產生器（核心演算法）
 *
 * 輸入使用者的同行對象 / 天數 / 選的區域 / 選的景點，
 * 輸出逐日行程：每天一個住宿區（或相鄰聚落），含時段景點與「換區交通警示」。
 *
 * 設計重點（峇里島差異化）：
 * - 一天一區（相鄰聚落可混），絕不一天橫跨兩個不相鄰的區。
 * - 換住宿區當天顯示 from→to 車程與尖峰塞車警示、建議出發時間。
 * - 第一天 = 抵達日（只排住宿區附近輕鬆景點，下午/晚上）。
 * - 最後一天 = 離開日（只排離機場 ~1hr 內的區）。
 *
 * 純資料/演算法，無任何 UI framework 相依。
 */

import type { Audience, RegionId, Spot } from './tripPlannerSpots';
import { tripPlannerSpots, spotById } from './tripPlannerSpots';
import { getTravelTime } from './regionTravelMatrix';

export type DaysOption = '4' | '5' | '68' | '9';
export type SlotTime = 'sunrise' | 'morning' | 'afternoon' | 'sunset' | 'evening';

export interface ItineraryInput {
  companion: Audience;
  days: DaysOption;
  regions: RegionId[];
  spotIds: string[];
}

export interface ItineraryDay {
  dayNumber: number;
  region: RegionId;
  /** 該日實際排入景點所在的區域（同聚落收斂為一個住宿基地時，各天可能不同） */
  displayRegion?: RegionId;
  isArrivalDay?: boolean;
  isDepartureDay?: boolean;
  isTravelDay?: boolean;
  travelFrom?: RegionId;
  travelNote?: string;
  isFullDayTrip?: boolean;
  /** 換區當天下午即入住的下一個住宿區（若有），用於顯示「入住 XX」提示與住宿攻略連結 */
  checkInRegion?: RegionId;
  /** 換區當天下午入住前的景點數量（即上一個住宿區的景點數），用於插入入住提示的位置 */
  checkInAfterSlots?: number;
  slots: { time: SlotTime; spot: Spot }[];
}

export interface ItineraryResult {
  days: ItineraryDay[];
  tradeoffNote?: string;
  baseRegions: RegionId[];
}

// ── 常數 ────────────────────────────────────────────────────────────

/** 天數選項 → 代表性數字天數 */
const DAYS_MAP: Record<DaysOption, number> = { '4': 4, '5': 5, '68': 7, '9': 10 };

/** 各天數允許的「換住宿區次數」上限 */
const MAX_CHANGES: Record<DaysOption, number> = { '4': 0, '5': 1, '68': 2, '9': 3 };

/** 相鄰聚落分群：同群內可同日混搭、區間車程短 */
const CLUSTERS: RegionId[][] = [
  ['kuta', 'seminyak', 'canggu'],
  ['jimbaran', 'uluwatu', 'nusa-dua'],
];

/** 離機場 ~1hr 內、適合當離開日的區 */
const AIRPORT_NEAR: Set<RegionId> = new Set([
  'kuta', 'seminyak', 'canggu', 'jimbaran', 'uluwatu', 'nusa-dua', 'sanur',
]);

/** 跳島/離島：非同日道路可達，當作整天行程或專程 */
const OFFSHORE: Set<RegionId> = new Set(['nusa-penida', 'lembongan', 'komodo']);

/** 時段排序 */
const SLOT_ORDER: SlotTime[] = ['sunrise', 'morning', 'afternoon', 'sunset', 'evening'];

/** 每日交通預留（小時），用於 10hr 上限估算 */
const DAILY_TRANSIT_BUFFER = 2;
const DAILY_HOUR_CAP = 10;

/** 離開日固定行程：旅館放鬆、或機場附近採買伴手禮 */
function souvenirSpot(region: RegionId): Spot {
  return {
    id: 'departure_souvenir',
    name: '旅館放鬆、或機場附近採買伴手禮',
    region,
    durationHours: 2,
    bestTime: 'morning',
    audience: ['solo', 'couple', 'family', 'friends', 'elderly', 'group'],
    intensity: 1,
    blogUrl: '/blog/bali-souvenirs-gift-guide/',
  };
}

const REGION_LABEL: Record<RegionId, string> = {
  ubud: '烏布',
  kuta: '庫塔',
  seminyak: '水明漾',
  canggu: '長谷',
  jimbaran: '金巴蘭',
  uluwatu: '烏魯瓦圖',
  'nusa-dua': '努沙杜瓦',
  sanur: '沙努爾',
  'nusa-penida': '努沙佩尼達',
  lembongan: '藍夢島',
  'east-bali': '東部峇里',
  komodo: '科摩多島',
};

// ── 小工具 ──────────────────────────────────────────────────────────

/** 取得某區所屬聚落（含自己）；無群者回傳 [self] */
function clusterOf(region: RegionId): RegionId[] {
  const c = CLUSTERS.find((cl) => cl.includes(region));
  return c ? c : [region];
}

/** 兩區是否屬同一聚落（相鄰可同日） */
function sameCluster(a: RegionId, b: RegionId): boolean {
  if (a === b) return true;
  return CLUSTERS.some((cl) => cl.includes(a) && cl.includes(b));
}

function regionLabel(r: RegionId): string {
  return REGION_LABEL[r] || r;
}

/** 景點是否適合此同行對象 */
function matchAudience(spot: Spot, companion: Audience): boolean {
  return spot.audience.includes(companion);
}

/** 長輩排除高強度 */
function passesIntensity(spot: Spot, companion: Audience): boolean {
  if (companion === 'elderly' && spot.intensity === 3) return false;
  return true;
}

/** 依同行對象決定每日景點數上限（長輩較少、家庭中庸） */
function dailySlotCap(companion: Audience): number {
  if (companion === 'elderly') return 2;
  if (companion === 'family') return 3;
  return 4;
}

// ── 住宿區規劃 ──────────────────────────────────────────────────────

/**
 * 決定住宿區順序（baseRegions）與被捨棄的區域。
 * 回傳 { baseRegions, dropped }。
 */
function planBaseRegions(input: ItineraryInput): {
  baseRegions: RegionId[];
  dropped: RegionId[];
  advisory: RegionId[];
} {
  const numDays = DAYS_MAP[input.days];
  const maxChanges = MAX_CHANGES[input.days];
  const maxBases = maxChanges + 1; // 住宿區數量 = 換區次數 + 1

  // 使用者選的區（去重）＋ 由選的景點推導的區
  const selected = new Set<RegionId>(input.regions);
  for (const id of input.spotIds) {
    const sp = spotById[id];
    if (sp) selected.add(sp.region);
  }

  // 計算每區的「使用者選景點數」權重（用於取捨優先序）
  const spotWeight = new Map<RegionId, number>();
  for (const id of input.spotIds) {
    const sp = spotById[id];
    if (sp) spotWeight.set(sp.region, (spotWeight.get(sp.region) || 0) + 1);
  }

  let candidateRegions: RegionId[];
  if (selected.size === 0) {
    candidateRegions = defaultRegions(input.days);
  } else {
    candidateRegions = [...selected];
  }

  // 排序：依使用者選景點權重高→低，offshore 排後面
  const ordered = orderBases(candidateRegions, spotWeight);

  // 套用住宿區數量上限：本島區全部保留，超出建議數量者列為 advisory（僅提醒）
  const { kept, dropped, advisory } = applyBaseLimit(ordered, maxBases, input.days, spotWeight);

  const offshoreKept = kept.filter((r) => OFFSHORE.has(r));
  let mainlandKept = kept.filter((r) => !OFFSHORE.has(r));

  // 跳島需搭快艇，建議前一晚住在沙努爾或努沙杜瓦（快艇主要由 Sanur 出發）
  if (offshoreKept.length > 0 && !mainlandKept.some((r) => r === 'sanur' || r === 'nusa-dua')) {
    mainlandKept = [...mainlandKept, 'sanur'];
  }

  // 依機場友善的路線順序排列（離開日要落在離機場近的區，同聚落的區保持相鄰）
  let orderedMainland = routeOrder(mainlandKept);

  // 若沙努爾／努沙杜瓦被排在本島行程最後一位，且還有其他離機場近的區可以收尾，
  // 與該區對調，讓跳島能安排在沙努爾／努沙杜瓦的住宿期間（而非行程最後一天）
  if (offshoreKept.length > 0 && orderedMainland.length > 1) {
    const lastIdx = orderedMainland.length - 1;
    const last = orderedMainland[lastIdx];
    if (last === 'sanur' || last === 'nusa-dua') {
      for (let i = lastIdx - 1; i >= 0; i--) {
        if (AIRPORT_NEAR.has(orderedMainland[i])) {
          const tmp = orderedMainland[i];
          orderedMainland[i] = orderedMainland[lastIdx];
          orderedMainland[lastIdx] = tmp;
          break;
        }
      }
    }
  }

  const baseRegions = [...orderedMainland, ...offshoreKept];

  return { baseRegions, dropped, advisory };
}

/** 無選區時的預設住宿區 */
function defaultRegions(days: DaysOption): RegionId[] {
  switch (days) {
    case '4':
      return ['kuta']; // 1 區（南部西岸聚落）
    case '5':
      return ['kuta', 'ubud']; // 1 次換區
    case '68':
      // 南部 + 烏布 + 沙努爾（佩尼達當沙努爾期間的整天跳島，不算換區）
      return ['kuta', 'ubud', 'sanur', 'nusa-penida'];
    case '9':
      // 再加 uluwatu 作為第 3 次換住宿區
      return ['kuta', 'ubud', 'sanur', 'uluwatu', 'nusa-penida'];
  }
}

/**
 * 把區域依「同聚落」分組（kuta/seminyak/canggu、jimbaran/uluwatu/nusa-dua），
 * 同一聚落內的區域視為相鄰、共用交通動線，但各自仍是獨立的住宿日。
 */
function groupByCluster(regions: RegionId[]): RegionId[][] {
  const groups: RegionId[][] = [];
  const indexByKey = new Map<string, number>();
  for (const r of regions) {
    const key = clusterOf(r).join(',');
    const idx = indexByKey.get(key);
    if (idx !== undefined) {
      groups[idx].push(r);
    } else {
      indexByKey.set(key, groups.length);
      groups.push([r]);
    }
  }
  return groups;
}

/** 排序住宿基地：本島權重高者優先，offshore 殿後 */
function orderBases(regions: RegionId[], spotWeight: Map<RegionId, number>): RegionId[] {
  return [...regions].sort((a, b) => {
    const aOff = OFFSHORE.has(a) ? 1 : 0;
    const bOff = OFFSHORE.has(b) ? 1 : 0;
    if (aOff !== bOff) return aOff - bOff;
    return (spotWeight.get(b) || 0) - (spotWeight.get(a) || 0);
  });
}

/**
 * 套用住宿區上限。本島區一律保留（盡量不捨去使用者想去的區域），
 * 超出建議數量的區域改為「advisory」（行程仍會排入，但會提醒下次可專程安排）。
 * offshore 區（佩尼達/藍夢/科摩多）不佔住宿換區額度——
 * 它們會被當作「整天跳島」掛在某個本島住宿期間，但天數不足（<5天）時無法安排，只能捨去。
 */
function applyBaseLimit(
  ordered: RegionId[],
  maxBases: number,
  days: DaysOption,
  spotWeight: Map<RegionId, number>,
): { kept: RegionId[]; dropped: RegionId[]; advisory: RegionId[] } {
  const mainland = ordered.filter((r) => !OFFSHORE.has(r));
  const offshore = ordered.filter((r) => OFFSHORE.has(r));

  // offshore：只在天數足夠（6-8/9+）且該島有被選/預設時保留「一個」最優先
  const numDays = DAYS_MAP[days];
  const keptOffshore: RegionId[] = [];
  const droppedOffshore: RegionId[] = [];
  // 5 天以上若使用者有選離島，可排 1 天整天跳島；6-8 天以上才考慮預設保留佩尼達。
  if (numDays >= 5 && offshore.length > 0) {
    keptOffshore.push(offshore[0]);
    droppedOffshore.push(...offshore.slice(1));
  } else {
    droppedOffshore.push(...offshore);
  }

  // 跳島佔用的天數（9 天以上住一晚算 2 天，否則整天來回算 1 天）
  const offshoreNights = days === '9' ? 2 : 1;
  const offshoreDays = keptOffshore.length * offshoreNights;

  // 本島住宿區最多可保留的「區域數」= 總天數 - 跳島佔用天數（每區至少住一晚，
  // 否則總天數會超出使用者選擇的天數）。以聚落為單位捨去，避免拆散同聚落的區域。
  const maxMainlandRegions = Math.max(1, numDays - offshoreDays);
  const clusters = groupByCluster(mainland);
  const keptClusters: RegionId[][] = [];
  const droppedClusters: RegionId[][] = [];
  let regionCount = 0;
  for (const cluster of clusters) {
    if (keptClusters.length === 0 || regionCount + cluster.length <= maxMainlandRegions) {
      keptClusters.push(cluster);
      regionCount += cluster.length;
    } else {
      droppedClusters.push(cluster);
    }
  }
  const keptMainland = keptClusters.flat();
  const droppedMainland = droppedClusters.flat();

  // 超過建議住宿區數量（但天數仍容許保留）的部分標記為 advisory（僅提醒，不捨去）
  const advisoryMainland = keptClusters.slice(maxBases).flat();

  return {
    kept: [...keptMainland, ...keptOffshore],
    dropped: [...droppedMainland, ...droppedOffshore],
    advisory: advisoryMainland,
  };
}

/**
 * 依路線把住宿區排序：抵達/離開都在離機場近的區。
 * 簡化策略：南部聚落起頭、烏布/東部置中、offshore 掛在 sanur 之後、
 * 最後一站盡量是 AIRPORT_NEAR。
 */
const ROUTE_PRIORITY: RegionId[] = [
  'kuta', 'seminyak', 'canggu', 'ubud', 'east-bali', 'sanur',
  'nusa-penida', 'lembongan', 'komodo', 'nusa-dua', 'uluwatu', 'jimbaran',
];

/** 區域到機場的車程估算（AIRPORT_NEAR 視為 0，其餘取到最近 AIRPORT_NEAR 區的車程） */
function airportDistance(region: RegionId): number {
  if (AIRPORT_NEAR.has(region)) return 0;
  let min = Infinity;
  for (const near of AIRPORT_NEAR) {
    const tt = getTravelTime(region, near);
    if (tt.normalMinutes < min) min = tt.normalMinutes;
  }
  return min;
}

function routeOrder(regions: RegionId[]): RegionId[] {
  const inSet = new Set(regions);
  let ordered = ROUTE_PRIORITY.filter((r) => inSet.has(r));
  // 補上不在 ROUTE_PRIORITY 的（理論上不會發生）
  for (const r of regions) if (!ordered.includes(r)) ordered.push(r);

  // 確保最後一個住宿區離機場近；若不是，把整個聚落（保持相鄰）搬到最後
  const last = ordered[ordered.length - 1];
  if (ordered.length > 1 && !AIRPORT_NEAR.has(last)) {
    let moved = false;
    for (let i = 0; i < ordered.length - 1; i++) {
      const cluster = clusterOf(ordered[i]);
      if (cluster.length > 1 && cluster.some((c) => AIRPORT_NEAR.has(c) && inSet.has(c))) {
        const members = ordered.filter((x) => cluster.includes(x));
        ordered = ordered.filter((x) => !cluster.includes(x));
        // 聚落內把離機場近的區排在該聚落的最後
        const nearIdx = members.findIndex((m) => AIRPORT_NEAR.has(m));
        if (nearIdx >= 0 && nearIdx !== members.length - 1) {
          const [near] = members.splice(nearIdx, 1);
          members.push(near);
        }
        ordered.push(...members);
        moved = true;
        break;
      }
    }
    if (!moved) {
      // 都不在 AIRPORT_NEAR：選離機場車程最短的單一區排最後
      let bestIdx = ordered.length - 1;
      let bestDist = airportDistance(last);
      for (let i = 0; i < ordered.length - 1; i++) {
        const d = airportDistance(ordered[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx !== ordered.length - 1) {
        const [r] = ordered.splice(bestIdx, 1);
        ordered.push(r);
      }
    }
  }
  return ordered;
}

// ── 天數分配 ────────────────────────────────────────────────────────

/**
 * 把 numDays 天分配給各住宿區（mainland），offshore 區單獨抽出，
 * 之後作為整天跳島插入鄰近本島住宿期間。
 * 回傳每個 mainland 住宿區的「停留天數」。
 */
function allocateDays(
  baseRegions: RegionId[],
  numDays: number,
  offshoreNights: number,
): { mainland: RegionId[]; offshore: RegionId[]; nights: number[] } {
  const mainland = baseRegions.filter((r) => !OFFSHORE.has(r));
  const offshore = baseRegions.filter((r) => OFFSHORE.has(r));

  // offshore：天數足夠時改為住一晚（2 天），否則維持整天跳島來回（1 天）
  const offshoreDays = offshore.length * offshoreNights;
  const mainlandDays = Math.max(mainland.length, numDays - offshoreDays);

  const n = mainland.length || 1;
  const base = Math.floor(mainlandDays / n);
  let remainder = mainlandDays - base * n;
  const nights = mainland.map(() => {
    let d = base;
    if (remainder > 0) {
      d += 1;
      remainder -= 1;
    }
    return d;
  });
  return { mainland, offshore, nights };
}

// ── 景點挑選 ────────────────────────────────────────────────────────

/**
 * 為某住宿區（含相鄰聚落）挑選候選景點，已選 spotIds 優先。
 */
function candidateSpotsForRegion(
  region: RegionId,
  input: ItineraryInput,
  usedSpotIds: Set<string>,
  arrivalDay = false,
): Spot[] {
  const cluster = clusterOf(region);
  // 抵達日航班通常下午才到，扣除入境通關與前往住宿區的車程，
  // 行程只限當天住宿區本身，不排同聚落其他區的景點（避免下飛機就殺去隔壁區）
  const userPicked: Spot[] = input.spotIds
    .map((id) => spotById[id])
    .filter(
      (s): s is Spot =>
        !!s &&
        (arrivalDay ? s.region === region : cluster.includes(s.region)) &&
        !usedSpotIds.has(s.id),
    );

  // 自動補位的景點限定在「當天的住宿區」本身，或同聚落中「使用者也有勾選」的區域，
  // 避免例如選了 ubud + nusa-dua 卻自動冒出 jimbaran 的景點；
  // 但若使用者選了 seminyak + canggu（同聚落、收斂成一個住宿基地），canggu 的景點仍要能排進去。
  const filler = tripPlannerSpots.filter(
    (s) =>
      (s.region === region ||
        (!arrivalDay && cluster.includes(s.region) && input.regions.includes(s.region))) &&
      !usedSpotIds.has(s.id) &&
      !s.isFullDay &&
      matchAudience(s, input.companion) &&
      passesIntensity(s, input.companion) &&
      !input.spotIds.includes(s.id),
  );

  // 優先排當天住宿區自己的景點，同聚落其他區的景點留作補位；
  // family 則再把含 family 標籤者排前（已由 matchAudience 保證符合）
  filler.sort((a, b) => {
    const ar = a.region === region ? 0 : 1;
    const br = b.region === region ? 0 : 1;
    if (ar !== br) return ar - br;
    if (input.companion === 'family') {
      const af = a.audience.includes('family') ? 0 : 1;
      const bf = b.audience.includes('family') ? 0 : 1;
      if (af !== bf) return af - bf;
    }
    return 0;
  });

  return [...userPicked, ...filler];
}

/**
 * 計算該日實際排入景點所在的區域（多數決），用於同聚落收斂成一個住宿基地時，
 * 各天標題仍能反映當天實際活動的區域（例如住宿基地是 seminyak，但當天排的是 canggu 景點）。
 * 若當天沒有景點或無多數，回傳住宿基地區域本身。
 */
function computeDisplayRegion(
  slots: { time: SlotTime; spot: Spot }[],
  baseRegion: RegionId,
): RegionId {
  if (slots.length === 0) return baseRegion;
  const counts = new Map<RegionId, number>();
  for (const s of slots) counts.set(s.spot.region, (counts.get(s.spot.region) || 0) + 1);
  let best = baseRegion;
  let bestCount = counts.get(baseRegion) || 0;
  for (const [region, count] of counts) {
    if (count > bestCount) {
      best = region;
      bestCount = count;
    }
  }
  return best;
}

/**
 * 把候選景點塞進時段，回傳該日 slots（已依時段排序，含時數上限）。
 */
function fillDaySlots(
  candidates: Spot[],
  cap: number,
  options: { arrivalOnly?: boolean; allowed?: SlotTime[] } = {},
): { time: SlotTime; spot: Spot }[] {
  const allowed: SlotTime[] =
    options.allowed ?? (options.arrivalOnly ? ['afternoon', 'evening'] : SLOT_ORDER);
  const usedSlots = new Set<SlotTime>();
  const chosen: { time: SlotTime; spot: Spot }[] = [];
  let hours = 0;

  for (const spot of candidates) {
    if (chosen.length >= cap) break;
    if (hours + spot.durationHours + DAILY_TRANSIT_BUFFER > DAILY_HOUR_CAP) continue;

    // 找最適合且尚未佔用的時段
    let slot: SlotTime | undefined;
    if (spot.allowedTimes && spot.allowedTimes.length > 0) {
      // 限定時段景點：只能排進其允許時段中、當天還沒被佔用且本日有開放（如離開日只開放 afternoon/evening）的時段
      slot = spot.allowedTimes.find((s) => allowed.includes(s) && !usedSlots.has(s));
      if (!slot) continue; // 這個時段今天排不下，跳過此景點，不要硬塞進不合適的時段
    } else if (spot.bestTime !== 'any' && allowed.includes(spot.bestTime as SlotTime) && !usedSlots.has(spot.bestTime as SlotTime)) {
      slot = spot.bestTime as SlotTime;
    } else {
      slot = allowed.find((s) => !usedSlots.has(s));
      if (!slot) continue;
    }

    usedSlots.add(slot);
    chosen.push({ time: slot, spot });
    hours += spot.durationHours;
  }

  chosen.sort((a, b) => SLOT_ORDER.indexOf(a.time) - SLOT_ORDER.indexOf(b.time));
  return chosen;
}

// ── 行程順序調整 ────────────────────────────────────────────────────

/**
 * 若整天跳島（offshore）被排在行程最後一天，搬到第二天之後（行程前/中段），
 * 並重新計算每天的編號、抵達/離開日標記與換區交通提示。
 */
function moveOffshoreToMiddle(days: ItineraryDay[]): ItineraryDay[] {
  if (days.length === 0) return days;
  const lastDay = days[days.length - 1];
  if (!lastDay.isFullDayTrip) return days;

  const offshoreDays = days.filter((d) => d.isFullDayTrip);
  const mainlandDays = days.filter((d) => !d.isFullDayTrip);
  if (mainlandDays.length <= 1) return days; // 沒有空間搬移

  // 排在第一個住宿區的「最後一天」之後（即同一住宿區的天數排完才跳島）
  let insertPos = 1;
  while (
    insertPos < mainlandDays.length &&
    mainlandDays[insertPos].region === mainlandDays[0].region
  ) {
    insertPos++;
  }
  const reordered = [
    ...mainlandDays.slice(0, insertPos),
    ...offshoreDays,
    ...mainlandDays.slice(insertPos),
  ];

  let prevRegion: RegionId | null = null;
  reordered.forEach((day, idx) => {
    day.dayNumber = idx + 1;
    day.isArrivalDay = idx === 0;
    day.isDepartureDay = false;
    const prevDayWasOffshore = idx > 0 && reordered[idx - 1].isFullDayTrip;
    const prevWasOvernightOffshore =
      prevDayWasOffshore &&
      idx > 1 &&
      reordered[idx - 2].isFullDayTrip &&
      reordered[idx - 2].region === reordered[idx - 1].region;
    if (day.isFullDayTrip) {
      if (prevDayWasOffshore && reordered[idx - 1].region === day.region) {
        // 離島住宿期間的第二天：留宿同一離島，不算換區
        day.isTravelDay = false;
        delete day.travelFrom;
        delete day.travelNote;
      } else {
        // 抵達離島當天：從前一天實際入住的住宿區出發（若前一天是換區當天，則從新入住的區出發）
        const base = reordered[idx - 1].checkInRegion || reordered[idx - 1].region;
        day.isTravelDay = true;
        day.travelFrom = base;
        day.travelNote = buildTravelNote(base, day.region);
      }
    } else if (prevDayWasOffshore && day.checkInRegion) {
      // 這天原本是「上午仍在前一住宿區、下午入住新住宿區」的換區日，
      // 但跳島插入後，前一天傍晚跳島結束就會直接入住新住宿區，
      // 因此這天上午不再回前一住宿區，整天都在新住宿區。
      const dropCount = day.checkInAfterSlots ?? 0;
      day.slots = day.slots.slice(dropCount);
      day.region = day.checkInRegion;
      day.displayRegion = computeDisplayRegion(day.slots, day.region);
      delete day.checkInRegion;
      delete day.checkInAfterSlots;
      if (prevWasOvernightOffshore) {
        // 離島住一晚後，當天從離島返回新住宿區
        day.isTravelDay = true;
        day.travelFrom = prevRegion!;
        day.travelNote = buildTravelNote(prevRegion!, day.region);
      } else {
        // 跳島當天來回，傍晚直接入住新住宿區（標記移到跳島當天）
        day.isTravelDay = false;
        delete day.travelFrom;
        delete day.travelNote;
        const offshoreDay = reordered[idx - 1];
        offshoreDay.checkInRegion = day.region;
        offshoreDay.checkInAfterSlots = offshoreDay.slots.length;
      }
    } else if (prevDayWasOffshore && prevWasOvernightOffshore) {
      // 離島住一晚後，當天從離島返回本島住宿區
      day.isTravelDay = true;
      day.travelFrom = prevRegion!;
      day.travelNote = buildTravelNote(prevRegion!, day.region);
    } else if (prevDayWasOffshore) {
      // 跳島當天來回，回到原本住宿區，不算換區
      day.isTravelDay = false;
      delete day.travelFrom;
      delete day.travelNote;
    } else if (prevRegion !== null && prevRegion !== day.region) {
      day.isTravelDay = true;
      day.travelFrom = prevRegion;
      day.travelNote = buildTravelNote(prevRegion, day.region);
    } else {
      day.isTravelDay = false;
      delete day.travelFrom;
      delete day.travelNote;
    }
    prevRegion = day.checkInRegion || day.region;
  });

  return reordered;
}

// ── 交通警示文字 ────────────────────────────────────────────────────

function buildTravelNote(from: RegionId, to: RegionId): string {
  const tt = getTravelTime(from, to);
  const fromL = regionLabel(from);
  const toL = regionLabel(to);

  if (tt.normalMinutes >= 999) {
    const extra = tt.note ? `｜${tt.note}` : '';
    return `${fromL} → ${toL}${extra}`;
  }

  const normalH = (tt.normalMinutes / 60).toFixed(1).replace(/\.0$/, '');
  const peakH = (tt.peakMinutes / 60).toFixed(1).replace(/\.0$/, '');
  let note = `${fromL} → ${toL}｜車程約 ${tt.normalMinutes}–${tt.peakMinutes} 分（約 ${normalH}–${peakH} 小時）`;

  // 尖峰塞車差異大時加警示
  if (tt.peakMinutes - tt.normalMinutes >= 35) {
    note += `，傍晚尖峰會塞，建議 15:00 前出發`;
  }
  if (tt.note) note += `｜${tt.note}`;
  return note;
}

// ── 取捨說明 ────────────────────────────────────────────────────────

function buildTradeoffNote(
  dropped: RegionId[],
  advisory: RegionId[],
  days: DaysOption,
): string | undefined {
  const numDays = DAYS_MAP[days];
  const maxChanges = MAX_CHANGES[days];
  const notes: string[] = [];

  // 真的無法安排的（主要是天數不足以塞進整天跳島）
  if (dropped.length > 0) {
    const parts = dropped.map((r) => {
      if (OFFSHORE.has(r)) {
        const rec = r === 'komodo' ? 3 : 2;
        return `${regionLabel(r)}（建議下次專程 ${rec} 天）`;
      }
      return regionLabel(r);
    });
    notes.push(`${numDays} 天天數較難安排整天跳島，建議下次再專程安排：${parts.join('、')}`);
  }

  // 超過建議住宿區數量但仍保留在行程中的區域：僅提醒，不捨去
  if (advisory.length > 0) {
    const parts = advisory.map((r) => regionLabel(r));
    notes.push(
      `${numDays} 天建議最多 ${maxChanges + 1} 個住宿區會比較不趕，已盡量把你想去的區域都排進行程；若想更悠閒，可以考慮把 ${parts.join('、')} 留到下次再專程安排。`,
    );
  }

  return notes.length > 0 ? notes.join('\n') : undefined;
}

// ── 主函式 ──────────────────────────────────────────────────────────

export function generateItinerary(input: ItineraryInput): ItineraryResult {
  const numDays = DAYS_MAP[input.days];
  const { baseRegions, dropped, advisory } = planBaseRegions(input);
  // 9 天以上且有選離島：建議該離島住一晚（2 天），否則維持整天跳島來回（1 天）
  const offshoreNights = input.days === '9' ? 2 : 1;
  const { mainland, offshore, nights } = allocateDays(baseRegions, numDays, offshoreNights);

  const usedSpotIds = new Set<string>();
  const days: ItineraryDay[] = [];
  let dayNumber = 0;
  let prevRegion: RegionId | null = null;
  let prevWasTransitionDay = false;

  // offshore 跳島：掛在最後一個 mainland 住宿期間（通常是 sanur）
  // 記錄每個 mainland 住宿索引要插入的 offshore 日
  const offshoreQueue = [...offshore];

  for (let mi = 0; mi < mainland.length; mi++) {
    const region = mainland[mi];
    const stay = nights[mi];
    const isFirstBase = mi === 0;
    const isLastBase = mi === mainland.length - 1;
    const nextRegion = mainland[mi + 1];
    const hasRegionChangeAfter = nextRegion !== undefined && !sameCluster(region, nextRegion);
    // 此住宿區結束後會緊接跳島（從本區出發搭快艇），最後一晚不適用換區提前入住邏輯
    const willInjectOffshoreAfter =
      offshoreQueue.length > 0 && (region === 'sanur' || isLastBase);

    for (let d = 0; d < stay; d++) {
      dayNumber += 1;
      const isArrivalDay = dayNumber === 1;
      // 行程最後一天（離開日）：當天要搭機離開，不換住宿區，整天留在前一個住宿區
      const isLastDayOverall = isLastBase && d === stay - 1 && !willInjectOffshoreAfter;
      const willChangeRegion = prevRegion !== null && !sameCluster(prevRegion, region) && d === 0;
      const changedRegion = willChangeRegion && !isLastDayOverall;
      // 離開日若原本要換區，當天就留在前一個住宿區，不換到新的住宿區
      const effectiveRegion = willChangeRegion && isLastDayOverall ? prevRegion! : region;
      // 換區當天下午即入住下一個住宿區，因此最後一晚的下午/晚上行程改排在下一區
      const isTransitionDay =
        hasRegionChangeAfter && d === stay - 1 && !isArrivalDay && !willInjectOffshoreAfter && stay > 1;

      const day: ItineraryDay = {
        dayNumber,
        region: effectiveRegion,
        slots: [],
      };

      if (isArrivalDay) day.isArrivalDay = true;

      const cap = dailySlotCap(input.companion);

      if (isTransitionDay) {
        day.isTravelDay = true;
        day.travelFrom = region;
        day.travelNote = buildTravelNote(region, nextRegion!);

        const morningCandidates = candidateSpotsForRegion(region, input, usedSpotIds);
        const morningSlots = fillDaySlots(morningCandidates, 1, {
          allowed: ['sunrise', 'morning'],
        });
        morningSlots.forEach((s) => usedSpotIds.add(s.spot.id));

        const afternoonCandidates = candidateSpotsForRegion(nextRegion!, input, usedSpotIds);
        const afternoonSlots = fillDaySlots(afternoonCandidates, Math.max(cap - 1, 1), {
          allowed: ['afternoon', 'evening'],
        });
        afternoonSlots.forEach((s) => usedSpotIds.add(s.spot.id));

        const slots = [...morningSlots, ...afternoonSlots];
        day.slots = slots;
        day.displayRegion = computeDisplayRegion(slots, region);
        day.checkInRegion = nextRegion;
        day.checkInAfterSlots = morningSlots.length;
      } else if (changedRegion && !prevWasTransitionDay) {
        // 換區日：早上活動仍在前一個住宿區（退房前），下午前往新住宿區並入住
        day.isTravelDay = true;
        day.travelFrom = prevRegion!;
        day.travelNote = buildTravelNote(prevRegion!, region);

        const morningCandidates = candidateSpotsForRegion(prevRegion!, input, usedSpotIds);
        const morningSlots = fillDaySlots(morningCandidates, 1, {
          allowed: ['sunrise', 'morning'],
        });
        morningSlots.forEach((s) => usedSpotIds.add(s.spot.id));

        const afternoonCandidates = candidateSpotsForRegion(region, input, usedSpotIds);
        const afternoonSlots = fillDaySlots(afternoonCandidates, Math.max(cap - 1, 1), {
          allowed: ['afternoon', 'evening'],
        });
        afternoonSlots.forEach((s) => usedSpotIds.add(s.spot.id));

        const slots = [...morningSlots, ...afternoonSlots];
        day.slots = slots;
        day.displayRegion = computeDisplayRegion(slots, region);
        day.checkInRegion = region;
        day.checkInAfterSlots = morningSlots.length;
      } else {
        const candidates = candidateSpotsForRegion(effectiveRegion, input, usedSpotIds, isArrivalDay);
        const slots = fillDaySlots(candidates, isArrivalDay ? 2 : cap, {
          arrivalOnly: isArrivalDay,
        });
        slots.forEach((s) => usedSpotIds.add(s.spot.id));
        day.slots = slots;
        day.displayRegion = computeDisplayRegion(slots, effectiveRegion);
      }

      prevWasTransitionDay = isTransitionDay;

      days.push(day);
      prevRegion = region;
    }

    // 在最後一個 mainland 基地（或 sanur）期間插入 offshore 整天跳島
    const shouldInjectOffshore =
      offshoreQueue.length > 0 && (region === 'sanur' || isLastBase);
    if (shouldInjectOffshore) {
      while (offshoreQueue.length > 0 && dayNumber < numDays) {
        const off = offshoreQueue.shift()!;
        const offSpots = tripPlannerSpots.filter(
          (s) =>
            s.region === off &&
            s.isFullDay &&
            matchAudience(s, input.companion),
        );
        // 若無符合同行對象者，退而求其次取任一整天行程
        const offFallback = tripPlannerSpots.filter(
          (s) => s.region === off && s.isFullDay,
        );
        const offPool = offSpots.length > 0 ? offSpots : offFallback;

        const stayNights = Math.min(offshoreNights, numDays - dayNumber);
        for (let on = 0; on < stayNights; on++) {
          dayNumber += 1;
          const spot = offPool.find((s) => !usedSpotIds.has(s.id)) ?? offPool[0];
          const pick = spot ? [spot] : [];
          pick.forEach((s) => usedSpotIds.add(s.id));
          days.push({
            dayNumber,
            region: off,
            isFullDayTrip: true,
            isTravelDay: on === 0,
            ...(on === 0
              ? { travelFrom: region, travelNote: buildTravelNote(region, off) }
              : {}),
            slots: pick.map((s) => ({ time: 'morning' as SlotTime, spot: s })),
          });
        }
      }
    }
  }

  // 跳島（佩尼達/藍夢/科摩多）只排在旅程前段或中段，不能排最後一天（離開日當天搭快艇風險太高）
  const orderedDays = [...moveOffshoreToMiddle(days)];
  days.length = 0;
  days.push(...orderedDays);

  // 標記最後一天為離開日（routeOrder 已確保最後住宿區是離機場最近的選擇），
  // 統一改為輕鬆活動，不再排 SPA 等其他活動
  const lastDay = days[days.length - 1];
  if (lastDay && !lastDay.isFullDayTrip) {
    // 離開日當天要搭機離開，不換住宿區：若這天原本是「換區入住」日，改回前一個住宿區出發
    if (lastDay.checkInRegion) {
      lastDay.region = lastDay.travelFrom ?? lastDay.region;
      delete lastDay.checkInRegion;
      delete lastDay.checkInAfterSlots;
      delete lastDay.isTravelDay;
      delete lastDay.travelFrom;
      delete lastDay.travelNote;
    }
    lastDay.isDepartureDay = true;
    // 離開日統一改為「早上旅館放鬆、或機場附近採買伴手禮」，不再排 SPA 等其他活動
    lastDay.slots = [{ time: 'morning', spot: souvenirSpot(lastDay.region) }];
    // 離開日要從最靠近機場的住宿區出發，標題固定顯示住宿基地，不受當天景點區域影響
    lastDay.displayRegion = lastDay.region;
  }

  const tradeoffNote = buildTradeoffNote(dropped, advisory, input.days);

  return {
    days,
    tradeoffNote,
    baseRegions: mainland.concat(offshore),
  };
}

/** UI 用：把 RegionId 轉成 zh-TW 標籤 */
export function regionDisplayName(r: RegionId): string {
  return regionLabel(r);
}
