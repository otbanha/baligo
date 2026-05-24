-- Forum seed data (development / staging only)
-- Run: supabase db reset  (applies migrations then this seed)

-- Test admin user profile (replace UUID with actual Supabase auth user ID)
-- INSERT INTO public.user_profiles (id, display_name, avatar_url, approved_count, role)
-- VALUES ('00000000-0000-0000-0000-000000000001', '管理員', null, 0, 'admin');

-- Seed: 5 approved reports for local testing
DO $$
DECLARE
  fake_user_id uuid := gen_random_uuid();
BEGIN
  -- Create a fake user profile
  INSERT INTO public.user_profiles (id, display_name, approved_count, flagged_count)
  VALUES (fake_user_id, '測試旅客 A', 5, 0)
  ON CONFLICT (id) DO NOTHING;

  -- Report 1: recent, no issues
  INSERT INTO public.reports (
    user_id, entry_date, airport, entry_time_slot, visa_type,
    queue_minutes, customs_checked, bribe_attempted,
    general_notes, status
  ) VALUES (
    fake_user_id,
    CURRENT_DATE - INTERVAL '3 days',
    'DPS', 'morning', 'voa',
    25, false, false,
    '入境過程非常順利。VOA 隊伍不長，大約等了 25 分鐘。海關官員態度友善，沒有刁難。行李提取也很快。整體體驗很好，推薦早班機入境。',
    'approved'
  );

  -- Report 2: customs checked, longer queue
  INSERT INTO public.reports (
    user_id, entry_date, airport, entry_time_slot, visa_type,
    queue_minutes, customs_checked, customs_issue, bribe_attempted,
    general_notes, status
  ) VALUES (
    fake_user_id,
    CURRENT_DATE - INTERVAL '7 days',
    'DPS', 'afternoon', 'evoa',
    45, true, '攜帶食品被抽查，需要申報。官員檢查了我的背包，確認是密封商業包裝後放行。', false,
    '下午航班入境，排隊人潮較多。e-VOA 通道比現場辦 VOA 快一些。海關抽查了食品，但態度還算合理，只要是商業包裝都沒問題。建議早班機入境或辦 e-VOA 可以節省時間。',
    'approved'
  );

  -- Report 3: bribe attempted
  INSERT INTO public.reports (
    user_id, entry_date, airport, entry_time_slot, visa_type,
    queue_minutes, customs_checked, bribe_attempted,
    bribe_amount_idr, bribe_context,
    general_notes, status
  ) VALUES (
    fake_user_id,
    CURRENT_DATE - INTERVAL '10 days',
    'DPS', 'evening', 'voa',
    35, false, true,
    200000,
    '入境蓋章時官員說我的護照有問題（其實沒有），暗示可以「加快處理」，並示意需要小費。我說聽不懂並要求主管，官員立刻態度轉變並正常蓋章放行。',
    '夜間航班入境，官員精神不太好。整個流程除了索賄事件外其餘正常。遇到索賄建議直接說聽不懂或要求叫主管，通常他們就會放棄。',
    'approved'
  );

  -- Report 4: older report (warning range)
  INSERT INTO public.reports (
    user_id, entry_date, airport, entry_time_slot, visa_type,
    voa_payment_method, queue_minutes, customs_checked, bribe_attempted,
    general_notes, status
  ) VALUES (
    fake_user_id,
    CURRENT_DATE - INTERVAL '17 days',
    'DPS', 'early_morning', 'voa',
    'cash_usd', 15, false, false,
    '清晨班機，幾乎沒有排隊，15 分鐘搞定。VOA 用美金付款很順暢，帶夠零錢就好。這個時段入境是最舒服的，人少、快速、官員也比較有精神。',
    'approved'
  );

  -- Report 5: pending (for moderation testing)
  INSERT INTO public.reports (
    user_id, entry_date, airport, entry_time_slot, visa_type,
    queue_minutes, customs_checked, bribe_attempted,
    general_notes, status
  ) VALUES (
    fake_user_id,
    CURRENT_DATE - INTERVAL '1 day',
    'DPS', 'morning', 'visa-free',
    20, false, false,
    '免簽入境超快，20 分鐘就出來了。護照蓋章後直接走，不需要繳任何費用。最近感覺 DPS 入境效率有提升，工作人員也增加了。',
    'pending'
  );
END $$;
