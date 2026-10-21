-- Profile photos, "My Trainer" lookup and private body-progress photos.
-- Requires 04_roles_plans_content.sql.

-------------------------------------------------------------------------------
-- 1. Profile photos (public bucket; each user writes only their own folder)
--    Path: avatars/<user id>/<file>
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users change own avatar" ON storage.objects;
CREATE POLICY "Users change own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-------------------------------------------------------------------------------
-- 2. A member can see who their trainer is (name, phone, photo only)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_trainer()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, phone TEXT, avatar_url TEXT) AS $$
  SELECT t.id, t.full_name, t.email, t.phone, t.avatar_url
  FROM public.profiles me
  JOIN public.profiles t ON t.id = me.assigned_trainer_id
  WHERE me.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_trainer() TO authenticated;

-------------------------------------------------------------------------------
-- 3. Body progress logs: member, their assigned trainer and admins
-------------------------------------------------------------------------------
ALTER TABLE public.progress_logs ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE INDEX IF NOT EXISTS idx_progress_logs_member ON public.progress_logs(member_id, date DESC);

-- 01 gave "FOR ALL ... OR is_staff()" (receptionists included). Body photos are
-- sensitive, so narrow it: the member manages their own; trainer + admins read.
DROP POLICY IF EXISTS "Members view own progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Members manage own progress" ON public.progress_logs;
CREATE POLICY "Members manage own progress" ON public.progress_logs
  FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Trainers and admins view progress" ON public.progress_logs;
CREATE POLICY "Trainers and admins view progress" ON public.progress_logs
  FOR SELECT USING (public.is_assigned_trainer(member_id) OR public.is_admin());

-------------------------------------------------------------------------------
-- 4. Private progress photos. Path: progress-photos/<member id>/<file>
--    Never public: the app shows them through short-lived signed URLs.
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('progress-photos', 'progress-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.can_view_member_files(folder TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF folder IS NULL OR folder !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN false;
  END IF;
  RETURN folder = auth.uid()::text
      OR public.is_assigned_trainer(folder::uuid)
      OR public.is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "View permitted progress photos" ON storage.objects;
CREATE POLICY "View permitted progress photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'progress-photos' AND public.can_view_member_files((storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Members upload own progress photos" ON storage.objects;
CREATE POLICY "Members upload own progress photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Members delete own progress photos" ON storage.objects;
CREATE POLICY "Members delete own progress photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
