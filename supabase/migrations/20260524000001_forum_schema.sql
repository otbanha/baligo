-- ============================================================
-- Forum: user_profiles
-- ============================================================
create table if not exists user_profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  display_name    text        not null,
  avatar_url      text,
  approved_count  integer     not null default 0,
  flagged_count   integer     not null default 0,
  last_flag_at    timestamptz,
  is_banned       boolean     not null default false,
  banned_until    timestamptz,
  role            text        not null default 'user' check (role in ('user', 'admin')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Trust level view (computed, never stored)
create or replace view user_trust_levels as
select
  id,
  display_name,
  avatar_url,
  approved_count,
  flagged_count,
  case
    when approved_count >= 10 and flagged_count = 0 then 'gold'
    when approved_count >= 3
      and (last_flag_at is null or last_flag_at < now() - interval '30 days')
      then 'trusted'
    when approved_count >= 1 then 'trial'
    else 'new'
  end as trust_level
from user_profiles;

-- ============================================================
-- Forum: reports
-- ============================================================
create table if not exists reports (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users(id),

  -- entry info
  airport              text        not null default 'DPS',
  entry_date           date        not null,
  entry_time_slot      text        not null
    check (entry_time_slot in ('early-morning','morning','afternoon','evening','late-night')),

  -- visa
  visa_type            text        not null
    check (visa_type in ('voa','evoa','visa-free','kitas','other')),
  voa_payment_method   text
    check (voa_payment_method in ('cash-usd','cash-idr','card','qris') or voa_payment_method is null),

  -- queue
  queue_minutes        integer,

  -- customs
  customs_checked      boolean     not null default false,
  customs_issue        text,

  -- bribe
  bribe_attempted      boolean     not null default false,
  bribe_amount_idr     integer,
  bribe_context        text,

  -- content
  general_notes        text        not null,
  proof_image_urls     text[]      not null,

  -- moderation
  moderation_status    text        not null default 'pending'
    check (moderation_status in ('pending','approved','rejected','archived')),
  rejected_reason      text,
  moderated_by         uuid        references auth.users(id),
  moderated_at         timestamptz,

  -- auto-expiry (generated columns)
  expires_warning_at   timestamptz generated always as (entry_date::timestamptz + interval '14 days') stored,
  archive_at           timestamptz generated always as (entry_date::timestamptz + interval '30 days') stored,

  -- meta
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_reports_status_date on reports (moderation_status, entry_date desc);
create index if not exists idx_reports_user        on reports (user_id);

-- ============================================================
-- updated_at auto-update trigger
-- ============================================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at
  before update on user_profiles
  for each row execute function update_updated_at();

create trigger trg_reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

-- ============================================================
-- Trigger: increment approved_count when report is approved
-- ============================================================
create or replace function handle_report_approved()
returns trigger language plpgsql security definer as $$
begin
  if new.moderation_status = 'approved' and old.moderation_status <> 'approved' then
    update user_profiles
    set approved_count = approved_count + 1
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger trg_report_approved
  after update of moderation_status on reports
  for each row execute function handle_report_approved();

-- ============================================================
-- Trigger: create user_profiles on first login
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger trg_new_user
  after insert on auth.users
  for each row execute function handle_new_user();
