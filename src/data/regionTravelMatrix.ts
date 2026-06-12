/**
 * Trip Planner — 12 區之間的車程時間矩陣
 *
 * 峇里島最大的痛點是「分區交通時間」：南部到烏布單趟就要 1.5 小時，
 * 傍晚遇到塞車甚至破 2.5 小時。這份矩陣是 Day-by-Day 行程表的核心差異化資料。
 *
 * ⚠️ 注意：以下分鐘數皆為「合理實測估算值」，依在地經驗推估，尚未逐筆校正。
 *    請以實際 Google Maps / 包車司機建議為準，後續可由在地編輯校正。
 *
 * 規則：
 * - normalMinutes：離峰一般車程
 * - peakMinutes：尖峰（上下班、傍晚 16:00–19:00）車程
 * - 跳島區（nusa-penida / lembongan / komodo）非同日道路可達，
 *   以 999 作為 placeholder，note 說明需搭快艇 / 多日專程。
 * - 只寫單向，getTravelTime() 找不到時自動取反向（對稱）。
 */

import type { RegionId } from './tripPlannerSpots';

export interface TravelTime {
  from: RegionId;
  to: RegionId;
  normalMinutes: number;
  peakMinutes: number;
  note?: string;
}

const OFFSHORE_NOTE = '需搭快艇往返';
const KOMODO_NOTE = '需搭機飛 Labuan Bajo，建議專程 3 天以上';

/**
 * 本島區間車程（單向；反向由 getTravelTime 自動補）。
 * 南部聚落 {kuta,seminyak,canggu} 與 {jimbaran,uluwatu,nusa-dua} 內部 ~15–30 分。
 */
export const regionTravelMatrix: TravelTime[] = [
  // ── 南部西岸聚落 kuta / seminyak / canggu ──
  { from: 'kuta', to: 'seminyak', normalMinutes: 20, peakMinutes: 40 },
  { from: 'kuta', to: 'canggu', normalMinutes: 35, peakMinutes: 70 },
  { from: 'seminyak', to: 'canggu', normalMinutes: 25, peakMinutes: 50 },

  // ── 南部半島聚落 jimbaran / uluwatu / nusa-dua ──
  { from: 'jimbaran', to: 'uluwatu', normalMinutes: 30, peakMinutes: 45 },
  { from: 'jimbaran', to: 'nusa-dua', normalMinutes: 20, peakMinutes: 30 },
  { from: 'uluwatu', to: 'nusa-dua', normalMinutes: 30, peakMinutes: 45 },

  // ── 西岸聚落 ↔ 半島聚落 ──
  { from: 'kuta', to: 'jimbaran', normalMinutes: 25, peakMinutes: 45 },
  { from: 'kuta', to: 'uluwatu', normalMinutes: 50, peakMinutes: 80 },
  { from: 'kuta', to: 'nusa-dua', normalMinutes: 35, peakMinutes: 60 },
  { from: 'seminyak', to: 'jimbaran', normalMinutes: 35, peakMinutes: 60 },
  { from: 'seminyak', to: 'uluwatu', normalMinutes: 60, peakMinutes: 95 },
  { from: 'seminyak', to: 'nusa-dua', normalMinutes: 45, peakMinutes: 75 },
  { from: 'canggu', to: 'jimbaran', normalMinutes: 55, peakMinutes: 90 },
  { from: 'canggu', to: 'uluwatu', normalMinutes: 80, peakMinutes: 120 },
  { from: 'canggu', to: 'nusa-dua', normalMinutes: 65, peakMinutes: 100 },

  // ── 南部 ↔ 烏布 ──
  { from: 'kuta', to: 'ubud', normalMinutes: 75, peakMinutes: 120 },
  { from: 'seminyak', to: 'ubud', normalMinutes: 75, peakMinutes: 130, note: '傍晚出發會塞到 2.5hr，建議 15:00 前出發' },
  { from: 'canggu', to: 'ubud', normalMinutes: 70, peakMinutes: 110 },
  { from: 'jimbaran', to: 'ubud', normalMinutes: 90, peakMinutes: 140 },
  { from: 'uluwatu', to: 'ubud', normalMinutes: 110, peakMinutes: 160 },
  { from: 'nusa-dua', to: 'ubud', normalMinutes: 95, peakMinutes: 145 },

  // ── 沙努爾 sanur ──
  { from: 'sanur', to: 'ubud', normalMinutes: 60, peakMinutes: 90 },
  { from: 'sanur', to: 'kuta', normalMinutes: 40, peakMinutes: 70 },
  { from: 'sanur', to: 'seminyak', normalMinutes: 45, peakMinutes: 80 },
  { from: 'sanur', to: 'canggu', normalMinutes: 55, peakMinutes: 95 },
  { from: 'sanur', to: 'jimbaran', normalMinutes: 40, peakMinutes: 65 },
  { from: 'sanur', to: 'uluwatu', normalMinutes: 60, peakMinutes: 95 },
  { from: 'sanur', to: 'nusa-dua', normalMinutes: 35, peakMinutes: 55 },

  // ── 東部峇里 east-bali（離哪都遠） ──
  { from: 'east-bali', to: 'ubud', normalMinutes: 90, peakMinutes: 120 },
  { from: 'east-bali', to: 'sanur', normalMinutes: 90, peakMinutes: 120 },
  { from: 'east-bali', to: 'kuta', normalMinutes: 120, peakMinutes: 160 },
  { from: 'east-bali', to: 'seminyak', normalMinutes: 125, peakMinutes: 165 },
  { from: 'east-bali', to: 'canggu', normalMinutes: 130, peakMinutes: 170 },
  { from: 'east-bali', to: 'jimbaran', normalMinutes: 135, peakMinutes: 175 },
  { from: 'east-bali', to: 'uluwatu', normalMinutes: 150, peakMinutes: 190 },
  { from: 'east-bali', to: 'nusa-dua', normalMinutes: 130, peakMinutes: 170 },

  // ── 跳島區 nusa-penida：快艇多自 sanur 出發 ──
  { from: 'nusa-penida', to: 'sanur', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE + '（快艇約 45 分，自 Sanur 出發）' },
  { from: 'nusa-penida', to: 'ubud', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'kuta', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'seminyak', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'canggu', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'jimbaran', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'uluwatu', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'nusa-dua', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'east-bali', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'nusa-penida', to: 'lembongan', normalMinutes: 999, peakMinutes: 999, note: '佩尼達↔藍夢島快艇約 20 分' },
  { from: 'nusa-penida', to: 'komodo', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },

  // ── 跳島區 lembongan ──
  { from: 'lembongan', to: 'sanur', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE + '（快艇約 30 分，自 Sanur 出發）' },
  { from: 'lembongan', to: 'ubud', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'kuta', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'seminyak', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'canggu', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'jimbaran', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'uluwatu', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'nusa-dua', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'east-bali', normalMinutes: 999, peakMinutes: 999, note: OFFSHORE_NOTE },
  { from: 'lembongan', to: 'komodo', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },

  // ── 跳島區 komodo（需飛機） ──
  { from: 'komodo', to: 'sanur', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'ubud', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'kuta', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'seminyak', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'canggu', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'jimbaran', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'uluwatu', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'nusa-dua', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
  { from: 'komodo', to: 'east-bali', normalMinutes: 999, peakMinutes: 999, note: KOMODO_NOTE },
];

// 建索引以加速查詢
const matrixIndex = new Map<string, TravelTime>();
for (const t of regionTravelMatrix) {
  matrixIndex.set(`${t.from}|${t.to}`, t);
}

/**
 * 取得兩區間車程；找不到正向時自動取反向（對稱）。
 * 同區回傳 0/0。完全查無資料時回傳保守預設 60/100。
 */
export function getTravelTime(from: RegionId, to: RegionId): TravelTime {
  if (from === to) return { from, to, normalMinutes: 0, peakMinutes: 0 };
  const fwd = matrixIndex.get(`${from}|${to}`);
  if (fwd) return fwd;
  const rev = matrixIndex.get(`${to}|${from}`);
  if (rev) {
    return {
      from,
      to,
      normalMinutes: rev.normalMinutes,
      peakMinutes: rev.peakMinutes,
      note: rev.note,
    };
  }
  // Fallback：未定義的本島區間，給保守估算
  return { from, to, normalMinutes: 60, peakMinutes: 100, note: '車程為粗略估算，請以實際路況為準' };
}
