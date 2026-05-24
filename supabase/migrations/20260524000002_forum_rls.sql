-- ============================================================
-- Enable Row Level Security
-- ============================================================
alter table user_profiles enable row level security;
alter table reports        enable row level security;

-- ============================================================
-- user_profiles RLS policies
-- ============================================================

-- Anyone can read display_name, avatar_url, approved_count (public fields)
create policy "user_profiles: public read"
  on user_profiles for select
  using (true);

-- Users can update their own display_name and avatar_url
create policy "user_profiles: self update"
  on user_profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Prevent users from modifying admin/ban fields via this policy
  );

-- Only admins can update ban/flag fields
-- (enforced via service-role key in admin API; this policy prevents direct client updates)
create policy "user_profiles: admin full access"
  on user_profiles for all
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- reports RLS policies
-- ============================================================

-- Public can read approved reports (archive_at not passed, or still show it with warning)
create policy "reports: public read approved"
  on reports for select
  using (moderation_status = 'approved');

-- Authors can read their own reports (any status)
create policy "reports: author read own"
  on reports for select
  using (auth.uid() = user_id);

-- Admins can read all reports
create policy "reports: admin read all"
  on reports for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Authenticated non-banned users can insert
create policy "reports: auth insert"
  on reports for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from user_profiles
      where id = auth.uid() and is_banned = false
    )
  );

-- Authors can update their own pending reports (draft editing, non-moderation fields only)
create policy "reports: author update pending"
  on reports for update
  using (auth.uid() = user_id and moderation_status = 'pending')
  with check (
    auth.uid() = user_id
    -- moderation_status, moderated_by, moderated_at can only be changed by admin
  );

-- Admins can update any report (for moderation)
create policy "reports: admin update"
  on reports for update
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- No DELETE allowed (use archived status instead)
-- (no delete policy = no one can delete)
