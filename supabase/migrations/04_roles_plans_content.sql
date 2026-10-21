-- Roles, trainer plans and editable website content.
-- Requires 02_secure_profile_roles.sql and 03_super_admin_role.sql.

-------------------------------------------------------------------------------
-- 1. Role helpers (super_admin counts as admin and staff everywhere)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() = 'super_admin', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('manager', 'owner', 'super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('receptionist', 'manager', 'owner', 'super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Who may edit website text and images. To let the gym owner edit too,
-- change the list to ('super_admin', 'owner') and set
-- CONTENT_EDITOR_ROLES in apps/web/src/config/roles.ts to match.
CREATE OR REPLACE FUNCTION public.can_edit_content()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 2. Trainer assignment
-------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS assigned_trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_trainer ON public.profiles(assigned_trainer_id);

CREATE OR REPLACE FUNCTION public.is_assigned_trainer(member UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = member AND assigned_trainer_id = auth.uid()
  ) AND public.current_role_name() = 'trainer';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Trainers can see the members assigned to them.
DROP POLICY IF EXISTS "Trainers view assigned members" ON public.profiles;
CREATE POLICY "Trainers view assigned members" ON public.profiles
  FOR SELECT USING (assigned_trainer_id = auth.uid());

-------------------------------------------------------------------------------
-- 3. Role and assignment changes are guarded (replaces the 02 trigger)
--    * nobody changes their own role
--    * owner / manager may grant member, trainer, receptionist, manager
--    * only super_admin may grant owner / super_admin or edit an owner / super_admin
--    * only staff may (re)assign a member's trainer
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- SQL editor / service role (no end-user JWT) is trusted.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot change your own role';
    END IF;
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an admin can change a user role';
    END IF;
    IF (NEW.role IN ('owner', 'super_admin') OR OLD.role IN ('owner', 'super_admin'))
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only the super admin can grant or remove owner access';
    END IF;
  END IF;

  IF NEW.assigned_trainer_id IS DISTINCT FROM OLD.assigned_trainer_id AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only gym staff can assign trainers';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-------------------------------------------------------------------------------
-- 4. Diet & workout plans written by trainers, read by members
-------------------------------------------------------------------------------
ALTER TABLE public.diet_plans
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trainer_name TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.workout_plans
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trainer_name TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_diet_plans_member ON public.diet_plans(member_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_plans_member ON public.workout_plans(member_id, is_active, created_at DESC);

DROP POLICY IF EXISTS "Trainers manage assigned diet" ON public.diet_plans;
CREATE POLICY "Trainers manage assigned diet" ON public.diet_plans
  FOR ALL USING (public.is_assigned_trainer(member_id) OR public.is_admin())
  WITH CHECK (public.is_assigned_trainer(member_id) OR public.is_admin());

DROP POLICY IF EXISTS "Trainers manage assigned workout" ON public.workout_plans;
CREATE POLICY "Trainers manage assigned workout" ON public.workout_plans
  FOR ALL USING (public.is_assigned_trainer(member_id) OR public.is_admin())
  WITH CHECK (public.is_assigned_trainer(member_id) OR public.is_admin());

-------------------------------------------------------------------------------
-- 5. Editable website content (one JSON document per section)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read site content" ON public.site_content;
CREATE POLICY "Public read site content" ON public.site_content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors manage site content" ON public.site_content;
CREATE POLICY "Editors manage site content" ON public.site_content
  FOR ALL USING (public.can_edit_content()) WITH CHECK (public.can_edit_content());

-------------------------------------------------------------------------------
-- 6. Image storage for the website editor
-------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-media', 'site-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site media" ON storage.objects;
CREATE POLICY "Public read site media" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "Editors upload site media" ON storage.objects;
CREATE POLICY "Editors upload site media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.can_edit_content());

DROP POLICY IF EXISTS "Editors change site media" ON storage.objects;
CREATE POLICY "Editors change site media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'site-media' AND public.can_edit_content());

DROP POLICY IF EXISTS "Editors delete site media" ON storage.objects;
CREATE POLICY "Editors delete site media" ON storage.objects
  FOR DELETE USING (bucket_id = 'site-media' AND public.can_edit_content());
