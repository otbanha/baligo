export type ReportStatus = 'pending' | 'approved' | 'rejected' | 'archived';
export type VisaType = 'voa' | 'evoa' | 'visa-free' | 'kitas' | 'other';
export type VoaPayment = 'cash-usd' | 'cash-idr' | 'card' | 'qris';
export type EntryTimeSlot = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'late-night';
export type TrustLevel = 'new' | 'trial' | 'trusted' | 'gold';
export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  approved_count: number;
  flagged_count: number;
  last_flag_at?: string;
  is_banned: boolean;
  banned_until?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  airport: string;
  entry_date: string;
  entry_time_slot: EntryTimeSlot;
  visa_type: VisaType;
  voa_payment_method?: VoaPayment;
  queue_minutes?: number;
  customs_checked: boolean;
  customs_issue?: string;
  bribe_attempted: boolean;
  bribe_amount_idr?: number;
  bribe_context?: string;
  general_notes: string;
  proof_image_urls: string[];
  moderation_status: ReportStatus;
  rejected_reason?: string;
  moderated_by?: string;
  moderated_at?: string;
  expires_warning_at?: string;
  archive_at?: string;
  created_at: string;
  updated_at: string;
  user_profiles?: Pick<UserProfile, 'display_name' | 'avatar_url' | 'approved_count'>;
}

export function getTrustLevel(profile: Pick<UserProfile, 'approved_count' | 'flagged_count' | 'last_flag_at'>): TrustLevel {
  const { approved_count, flagged_count, last_flag_at } = profile;
  if (approved_count >= 10 && flagged_count === 0) return 'gold';
  const recentFlag = last_flag_at && new Date(last_flag_at) > new Date(Date.now() - 30 * 86400000);
  if (approved_count >= 3 && !recentFlag) return 'trusted';
  if (approved_count >= 1) return 'trial';
  return 'new';
}

export const VISA_TYPE_LABELS: Record<VisaType, string> = {
  'voa':        '落地簽 (VOA)',
  'evoa':       '電子落地簽 (e-VOA)',
  'visa-free':  '免簽',
  'kitas':      'KITAS/長期居留',
  'other':      '其他',
};

export const TIME_SLOT_LABELS: Record<EntryTimeSlot, string> = {
  'early-morning': '凌晨 00:00–06:00',
  'morning':       '早上 06:00–12:00',
  'afternoon':     '下午 12:00–18:00',
  'evening':       '傍晚 18:00–22:00',
  'late-night':    '深夜 22:00–00:00',
};

export const TRUST_LABELS: Record<TrustLevel, string> = {
  'new':     '新成員',
  'trial':   '試用中',
  'trusted': '可信賴',
  'gold':    '金牌',
};
