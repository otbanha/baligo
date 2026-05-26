-- ============================================================
-- Storage bucket for report proof images
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'report-images',
  'report-images',
  true,    -- public read
  512000,  -- 500 KB limit
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- ============================================================
-- Storage RLS
-- ============================================================

-- Anyone can read (public bucket)
create policy "report-images: public read"
  on storage.objects for select
  using (bucket_id = 'report-images');

-- Authenticated users can upload to their own prefix
create policy "report-images: auth upload own prefix"
  on storage.objects for insert
  with check (
    bucket_id = 'report-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own uploads (for retry cleanup)
create policy "report-images: auth delete own"
  on storage.objects for delete
  using (
    bucket_id = 'report-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
