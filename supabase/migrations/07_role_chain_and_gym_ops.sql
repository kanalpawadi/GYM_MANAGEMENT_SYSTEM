-- 07: Role chain, member profile fields, premium/normal members, plan requests,
--     discount, invoices, QR + selfie attendance, website-edit approval,
--     common diet/workout plans, notifications and water tracking.
-- Requires 01-06. Safe to re-run.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-------------------------------------------------------------------------------
-- 1. Role chain: super_admin > owner > manager > receptionist > trainer > member
--    A user can view and change anyone with a LOWER rank (and themselves).
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_rank(r TEXT)
RETURNS INT AS $$
  SELECT CASE r
    WHEN 'super_admin' THEN 6 WHEN 'owner' THEN 5 WHEN 'manager' THEN 4
    WHEN 'receptionist' THEN 3 WHEN 'trainer' THEN 2 WHEN 'member' THEN 1
    ELSE 0 END;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.my_rank()
RETURNS INT AS $$
  SELECT public.role_rank(public.current_role_name());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_manage(target UUID)
RETURNS BOOLEAN AS $$
  SELECT target = auth.uid()
      OR (public.my_rank() >= 2
          AND public.my_rank() > COALESCE((SELECT public.role_rank(role::text) FROM public.profiles WHERE id = target), 0));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Staff = receptionist and above (front desk, managers, owner, super admin).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$ SELECT public.my_rank() >= 3; $$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 2. Profile fields
-------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.member_code_seq;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dob DATE,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS medicines TEXT,
  ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS member_code TEXT UNIQUE DEFAULT ('RVF-' || LPAD(nextval('public.member_code_seq')::text, 4, '0'));

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_membership_tier_check CHECK (membership_tier IN ('normal', 'premium'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profile policies follow the role chain.
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Trainers view assigned members" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chain view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chain update profiles" ON public.profiles;
CREATE POLICY "Chain view profiles" ON public.profiles FOR SELECT
  USING (public.can_manage(id) OR public.my_rank() >= 3);
CREATE POLICY "Chain update profiles" ON public.profiles FOR UPDATE
  USING (public.can_manage(id)) WITH CHECK (public.can_manage(id));

-- Guard sensitive columns (replaces the 04 trigger function).
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- SQL editor / service role

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.id = auth.uid() THEN RAISE EXCEPTION 'You cannot change your own role'; END IF;
    IF public.my_rank() < 4 THEN RAISE EXCEPTION 'Only an admin can change a user role'; END IF;
    -- You can only hand out roles below your own.
    IF public.role_rank(NEW.role::text) >= public.my_rank() AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'You cannot grant a role equal to or above your own';
    END IF;
    IF public.role_rank(OLD.role::text) >= public.my_rank() AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'You cannot change the role of someone at or above your level';
    END IF;
  END IF;

  IF NEW.assigned_trainer_id IS DISTINCT FROM OLD.assigned_trainer_id AND public.my_rank() < 3 THEN
    RAISE EXCEPTION 'Only gym staff can assign trainers';
  END IF;

  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier AND public.my_rank() < 3 THEN
    RAISE EXCEPTION 'Only gym staff can change premium / normal membership';
  END IF;

  IF NEW.member_code IS DISTINCT FROM OLD.member_code THEN
    RAISE EXCEPTION 'Member code cannot be changed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 3. Diet & workout plans: personal (premium) or common (normal members)
-------------------------------------------------------------------------------
ALTER TABLE public.diet_plans ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.workout_plans ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS is_common BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.workout_plans ADD COLUMN IF NOT EXISTS is_common BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Members view own diet" ON public.diet_plans;
DROP POLICY IF EXISTS "Trainers manage assigned diet" ON public.diet_plans;
DROP POLICY IF EXISTS "Members view own workout" ON public.workout_plans;
DROP POLICY IF EXISTS "Trainers manage assigned workout" ON public.workout_plans;
DROP POLICY IF EXISTS "View own or common diet" ON public.diet_plans;
DROP POLICY IF EXISTS "Chain manage diet" ON public.diet_plans;
DROP POLICY IF EXISTS "View own or common workout" ON public.workout_plans;
DROP POLICY IF EXISTS "Chain manage workout" ON public.workout_plans;

CREATE POLICY "View own or common diet" ON public.diet_plans FOR SELECT
  USING ((is_common AND auth.uid() IS NOT NULL) OR (member_id IS NOT NULL AND public.can_manage(member_id)));
CREATE POLICY "Chain manage diet" ON public.diet_plans FOR ALL
  USING (public.my_rank() >= 2 AND (is_common OR public.can_manage(member_id)))
  WITH CHECK (public.my_rank() >= 2 AND (is_common OR public.can_manage(member_id)));

CREATE POLICY "View own or common workout" ON public.workout_plans FOR SELECT
  USING ((is_common AND auth.uid() IS NOT NULL) OR (member_id IS NOT NULL AND public.can_manage(member_id)));
CREATE POLICY "Chain manage workout" ON public.workout_plans FOR ALL
  USING (public.my_rank() >= 2 AND (is_common OR public.can_manage(member_id)))
  WITH CHECK (public.my_rank() >= 2 AND (is_common OR public.can_manage(member_id)));

-------------------------------------------------------------------------------
-- 4. Progress logs follow the chain (member manages own; anyone above can view/edit)
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members manage own progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Trainers and admins view progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Chain manage progress" ON public.progress_logs;
CREATE POLICY "Chain manage progress" ON public.progress_logs FOR ALL
  USING (public.can_manage(member_id)) WITH CHECK (public.can_manage(member_id));

CREATE OR REPLACE FUNCTION public.can_view_member_files(folder TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF folder IS NULL OR folder !~ '^[0-9a-fA-F-]{36}$' THEN RETURN false; END IF;
  RETURN public.can_manage(folder::uuid);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 5. Memberships, payments and invoices
-------------------------------------------------------------------------------
ALTER TABLE public.memberships ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS plan_title TEXT,
  ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan_code TEXT,
  ADD COLUMN IF NOT EXISTS plan_title TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE SEQUENCE IF NOT EXISTS public.invoice_seq;
CREATE OR REPLACE FUNCTION public.generate_gst_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.gst_invoice_no IS NULL THEN
    NEW.gst_invoice_no := 'RVF-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.invoice_seq')::text, 5, '0');
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP POLICY IF EXISTS "Members view own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Chain view memberships" ON public.memberships;
DROP POLICY IF EXISTS "Staff manage memberships" ON public.memberships;
CREATE POLICY "Chain view memberships" ON public.memberships FOR SELECT USING (public.can_manage(member_id));
CREATE POLICY "Staff manage memberships" ON public.memberships FOR ALL
  USING (public.my_rank() >= 3 AND public.can_manage(member_id))
  WITH CHECK (public.my_rank() >= 3 AND public.can_manage(member_id));

DROP POLICY IF EXISTS "Members view own payments" ON public.payments;
DROP POLICY IF EXISTS "Chain view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
CREATE POLICY "Chain view payments" ON public.payments FOR SELECT USING (public.can_manage(member_id));
CREATE POLICY "Staff manage payments" ON public.payments FOR ALL
  USING (public.my_rank() >= 3 AND public.can_manage(member_id))
  WITH CHECK (public.my_rank() >= 3 AND public.can_manage(member_id));

-------------------------------------------------------------------------------
-- 6. Settings: discount, geofence, website-edit approval
-------------------------------------------------------------------------------
INSERT INTO public.settings (key, value) VALUES
  ('discount', '{"enabled": false, "percent": 10, "label": "Special offer"}'::jsonb),
  ('geofence', '{"enabled": false, "lat": null, "lng": null, "radius_m": 100}'::jsonb),
  ('content_approval', '{"required": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

DROP POLICY IF EXISTS "Admin full access settings" ON public.settings;
DROP POLICY IF EXISTS "Public read gym settings" ON public.settings;
DROP POLICY IF EXISTS "Owners manage gym settings" ON public.settings;
CREATE POLICY "Public read gym settings" ON public.settings FOR SELECT
  USING (key IN ('discount', 'geofence', 'content_approval') OR public.my_rank() >= 4);
-- Owner and super admin change discount / geofence; only super admin changes the approval rule.
CREATE POLICY "Owners manage gym settings" ON public.settings FOR ALL
  USING (public.is_super_admin() OR (public.my_rank() >= 5 AND key <> 'content_approval'))
  WITH CHECK (public.is_super_admin() OR (public.my_rank() >= 5 AND key <> 'content_approval'));

-- Server-side plan catalogue (must match apps/web/src/config/site.ts and apps/api/lib/plans.ts).
CREATE OR REPLACE FUNCTION public.plan_catalog()
RETURNS TABLE (code TEXT, title TEXT, months INT, price NUMERIC) AS $$
  SELECT * FROM (VALUES
    ('monthly', 'Monthly', 1, 1500::numeric),
    ('six-month', 'Six Month', 6, 7500::numeric),
    ('yearly', 'Yearly', 12, 12000::numeric)
  ) AS t(code, title, months, price);
$$ LANGUAGE sql IMMUTABLE;

-- Applies the admin's discount switch (0-90%) to a base price.
CREATE OR REPLACE FUNCTION public.discounted_price(base NUMERIC)
RETURNS NUMERIC AS $$
DECLARE d JSONB;
BEGIN
  SELECT value INTO d FROM public.settings WHERE key = 'discount';
  IF d IS NULL OR NOT COALESCE((d->>'enabled')::boolean, false) THEN RETURN base; END IF;
  RETURN ROUND(base * (100 - LEAST(GREATEST(COALESCE((d->>'percent')::int, 0), 0), 90)) / 100.0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 7. Plan change / renewal requests (owner approves)
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL,
  plan_title TEXT NOT NULL,
  months INT NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'renew' CHECK (request_type IN ('renew', 'change')),
  payment_preference TEXT NOT NULL DEFAULT 'desk' CHECK (payment_preference IN ('online', 'desk')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  note TEXT,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plan_requests_status ON public.plan_requests(status, created_at DESC);
ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chain view plan requests" ON public.plan_requests;
DROP POLICY IF EXISTS "Members cancel own requests" ON public.plan_requests;
CREATE POLICY "Chain view plan requests" ON public.plan_requests FOR SELECT USING (public.can_manage(member_id));
CREATE POLICY "Members cancel own requests" ON public.plan_requests FOR UPDATE
  USING (member_id = auth.uid() AND status = 'pending') WITH CHECK (member_id = auth.uid() AND status = 'cancelled');

-- Members create requests through this function so the price is decided by the server.
CREATE OR REPLACE FUNCTION public.request_plan(p_plan_code TEXT, p_payment TEXT, p_type TEXT DEFAULT 'renew')
RETURNS public.plan_requests AS $$
DECLARE
  plan RECORD;
  req public.plan_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  SELECT * INTO plan FROM public.plan_catalog() WHERE code = p_plan_code;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown plan'; END IF;
  IF EXISTS (SELECT 1 FROM public.plan_requests WHERE member_id = auth.uid() AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending request. Please wait for the gym to respond.';
  END IF;
  INSERT INTO public.plan_requests (member_id, plan_code, plan_title, months, base_price, price, request_type, payment_preference)
  VALUES (auth.uid(), plan.code, plan.title, plan.months, plan.price, public.discounted_price(plan.price),
          CASE WHEN p_type = 'change' THEN 'change' ELSE 'renew' END,
          CASE WHEN p_payment = 'online' THEN 'online' ELSE 'desk' END)
  RETURNING * INTO req;

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT id, 'New plan request', (SELECT full_name FROM public.profiles WHERE id = auth.uid()) || ' requested the ' || plan.title || ' plan.', 'plan_request'
  FROM public.profiles WHERE role IN ('owner', 'manager', 'super_admin');
  RETURN req;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.request_plan(TEXT, TEXT, TEXT) TO authenticated;

-- Staff approve or reject. On approval a membership is created (starting after any
-- current one ends) and a payment row: paid now (desk) or pending (online).
CREATE OR REPLACE FUNCTION public.decide_plan_request(p_request UUID, p_approve BOOLEAN, p_mark_paid BOOLEAN DEFAULT false,
                                                      p_mode TEXT DEFAULT 'cash', p_note TEXT DEFAULT NULL)
RETURNS public.plan_requests AS $$
DECLARE
  req public.plan_requests;
  start_on DATE;
  m_id UUID;
  pay_id UUID;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can approve requests'; END IF;
  SELECT * INTO req FROM public.plan_requests WHERE id = p_request FOR UPDATE;
  IF NOT FOUND OR req.status <> 'pending' THEN RAISE EXCEPTION 'This request is no longer pending'; END IF;
  IF NOT public.can_manage(req.member_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;

  IF NOT p_approve THEN
    UPDATE public.plan_requests SET status = 'rejected', note = p_note, decided_by = auth.uid(), decided_at = NOW()
      WHERE id = p_request RETURNING * INTO req;
    INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (req.member_id, 'Plan request declined', COALESCE(p_note, 'Please contact the front desk for details.'), 'plan_request');
    RETURN req;
  END IF;

  SELECT GREATEST(CURRENT_DATE, COALESCE(MAX(end_date) + 1, CURRENT_DATE)) INTO start_on
    FROM public.memberships WHERE member_id = req.member_id AND status = 'active';

  INSERT INTO public.memberships (member_id, plan_code, plan_title, price, start_date, end_date, status)
    VALUES (req.member_id, req.plan_code, req.plan_title, req.price, start_on, (start_on + make_interval(months => req.months))::date - 1, 'active')
    RETURNING id INTO m_id;

  INSERT INTO public.payments (member_id, membership_id, plan_code, plan_title, amount, tax_amount, total_amount,
                               discount_amount, payment_mode, status, recorded_by, notes)
    VALUES (req.member_id, m_id, req.plan_code, req.plan_title, req.price, 0, req.price, req.base_price - req.price,
            (CASE WHEN p_mark_paid THEN (CASE WHEN p_mode IN ('cash', 'upi', 'online') THEN p_mode ELSE 'cash' END)
                  ELSE 'online' END)::payment_mode,
            (CASE WHEN p_mark_paid THEN 'paid' ELSE 'pending' END)::payment_status,
            auth.uid(), p_note)
    RETURNING id INTO pay_id;

  UPDATE public.plan_requests SET status = 'approved', note = p_note, decided_by = auth.uid(), decided_at = NOW(),
         membership_id = m_id, payment_id = pay_id
    WHERE id = p_request RETURNING * INTO req;

  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (req.member_id, 'Plan approved', 'Your ' || req.plan_title || ' plan is approved and starts on ' || TO_CHAR(start_on, 'DD Mon YYYY') || '.', 'plan_request');
  RETURN req;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.decide_plan_request(UUID, BOOLEAN, BOOLEAN, TEXT, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 8. Attendance: staff QR scan (rotating token) and selfie check-in with geofence
-------------------------------------------------------------------------------
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS selfie_path TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS distance_m INT;

DROP POLICY IF EXISTS "Members view own attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff full access attendance" ON public.attendance;
DROP POLICY IF EXISTS "Chain view attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff manage attendance" ON public.attendance;
CREATE POLICY "Chain view attendance" ON public.attendance FOR SELECT USING (public.can_manage(member_id));
CREATE POLICY "Staff manage attendance" ON public.attendance FOR ALL
  USING (public.my_rank() >= 2 AND public.can_manage(member_id))
  WITH CHECK (public.my_rank() >= 2 AND public.can_manage(member_id));

-- Private secret for QR tokens; no policies, so only SECURITY DEFINER functions can read it.
CREATE TABLE IF NOT EXISTS public.app_secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.app_secrets (name, value)
  VALUES ('qr_secret', encode(extensions.gen_random_bytes(32), 'hex'))
  ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.qr_signature(p_member UUID, p_window BIGINT)
RETURNS TEXT AS $$
  SELECT LEFT(encode(extensions.hmac(p_member::text || ':' || p_window::text,
                                     (SELECT value FROM public.app_secrets WHERE name = 'qr_secret'), 'sha256'), 'hex'), 20);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.qr_signature(UUID, BIGINT) FROM PUBLIC, anon, authenticated;

-- The member's QR value; changes every 30 seconds.
CREATE OR REPLACE FUNCTION public.my_qr_token()
RETURNS TEXT AS $$
DECLARE w BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  RETURN 'RVF1.' || auth.uid()::text || '.' || w::text || '.' || public.qr_signature(auth.uid(), w);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.my_qr_token() TO authenticated;

CREATE OR REPLACE FUNCTION public.member_status(p_member UUID)
RETURNS TEXT AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.memberships WHERE member_id = p_member AND status = 'active'
                           AND CURRENT_DATE BETWEEN start_date AND end_date) THEN 'active' ELSE 'inactive' END;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Trainer / staff scans a member's QR.
CREATE OR REPLACE FUNCTION public.check_in_by_qr(p_token TEXT)
RETURNS JSONB AS $$
DECLARE
  parts TEXT[] := string_to_array(p_token, '.');
  m_id UUID; w BIGINT; now_w BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
  prof RECORD; att_id UUID; already BOOLEAN;
BEGIN
  IF public.my_rank() < 2 THEN RAISE EXCEPTION 'Only trainers and staff can scan passes'; END IF;
  IF array_length(parts, 1) <> 4 OR parts[1] <> 'RVF1' THEN RAISE EXCEPTION 'This is not an RV Fitness pass'; END IF;
  BEGIN m_id := parts[2]::uuid; w := parts[3]::bigint; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'This is not an RV Fitness pass'; END;
  IF w < now_w - 2 OR w > now_w + 1 OR public.qr_signature(m_id, w) <> parts[4] THEN
    RAISE EXCEPTION 'This pass has expired. Ask the member to refresh their QR card.';
  END IF;
  SELECT id, full_name, member_code, avatar_url INTO prof FROM public.profiles WHERE id = m_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.attendance WHERE member_id = m_id AND (check_in AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date) INTO already;
  IF NOT already THEN
    INSERT INTO public.attendance (member_id, method, verified_by) VALUES (m_id, 'qr', auth.uid()) RETURNING id INTO att_id;
  END IF;
  RETURN jsonb_build_object('member_id', prof.id, 'full_name', prof.full_name, 'member_code', prof.member_code,
                            'avatar_url', prof.avatar_url, 'status', public.member_status(m_id), 'already_checked_in', already);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.check_in_by_qr(TEXT) TO authenticated;

-- Member checks in with a selfie when inside the gym's geofence.
CREATE OR REPLACE FUNCTION public.self_check_in(p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_selfie_path TEXT)
RETURNS JSONB AS $$
DECLARE
  g JSONB; dist DOUBLE PRECISION; att_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  SELECT value INTO g FROM public.settings WHERE key = 'geofence';
  IF g IS NULL OR NOT COALESCE((g->>'enabled')::boolean, false) THEN
    RAISE EXCEPTION 'Selfie check-in is turned off. Please ask a trainer to scan your QR pass.';
  END IF;
  IF (g->>'lat') IS NULL OR (g->>'lng') IS NULL THEN RAISE EXCEPTION 'The gym location has not been set yet.'; END IF;
  IF p_selfie_path IS NULL OR split_part(p_selfie_path, '/', 1) <> auth.uid()::text THEN
    RAISE EXCEPTION 'Please take a selfie to check in.';
  END IF;

  -- Haversine distance in metres.
  dist := 2 * 6371000 * asin(sqrt(
            power(sin(radians((p_lat - (g->>'lat')::float) / 2)), 2) +
            cos(radians((g->>'lat')::float)) * cos(radians(p_lat)) *
            power(sin(radians((p_lng - (g->>'lng')::float) / 2)), 2)));
  IF dist > COALESCE((g->>'radius_m')::float, 100) THEN
    RAISE EXCEPTION 'You are % m from the gym. Please check in from inside the gym.', ROUND(dist);
  END IF;
  IF EXISTS (SELECT 1 FROM public.attendance WHERE member_id = auth.uid() AND (check_in AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date) THEN
    RETURN jsonb_build_object('already_checked_in', true, 'distance_m', ROUND(dist));
  END IF;
  INSERT INTO public.attendance (member_id, method, selfie_path, latitude, longitude, distance_m)
    VALUES (auth.uid(), 'selfie', p_selfie_path, p_lat, p_lng, ROUND(dist)) RETURNING id INTO att_id;
  RETURN jsonb_build_object('already_checked_in', false, 'distance_m', ROUND(dist), 'attendance_id', att_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.self_check_in(DOUBLE PRECISION, DOUBLE PRECISION, TEXT) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('attendance-selfies', 'attendance-selfies', false, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "View permitted attendance selfies" ON storage.objects;
DROP POLICY IF EXISTS "Members upload own selfies" ON storage.objects;
CREATE POLICY "View permitted attendance selfies" ON storage.objects
  FOR SELECT USING (bucket_id = 'attendance-selfies' AND public.can_view_member_files((storage.foldername(name))[1]));
CREATE POLICY "Members upload own selfies" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attendance-selfies' AND (storage.foldername(name))[1] = auth.uid()::text);

-------------------------------------------------------------------------------
-- 9. Website edits: owner edits directly, or waits for Super Admin approval
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.content_approval_required()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT (value->>'required')::boolean FROM public.settings WHERE key = 'content_approval'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Who may publish website changes straight away.
CREATE OR REPLACE FUNCTION public.can_edit_content()
RETURNS BOOLEAN AS $$
  SELECT public.is_super_admin() OR (public.current_role_name() = 'owner' AND NOT public.content_approval_required());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Owner can upload images even when approval is on (images are only used once approved).
DROP POLICY IF EXISTS "Editors upload site media" ON storage.objects;
CREATE POLICY "Editors upload site media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.my_rank() >= 5);

CREATE TABLE IF NOT EXISTS public.site_content_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.site_content_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners submit drafts" ON public.site_content_drafts;
DROP POLICY IF EXISTS "Editors view drafts" ON public.site_content_drafts;
CREATE POLICY "Owners submit drafts" ON public.site_content_drafts FOR INSERT
  WITH CHECK (public.my_rank() >= 5 AND submitted_by = auth.uid() AND status = 'pending');
CREATE POLICY "Editors view drafts" ON public.site_content_drafts FOR SELECT USING (public.my_rank() >= 5);

CREATE OR REPLACE FUNCTION public.decide_content_draft(p_draft UUID, p_approve BOOLEAN)
RETURNS VOID AS $$
DECLARE d public.site_content_drafts;
BEGIN
  IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Only the Super Admin can approve website changes'; END IF;
  SELECT * INTO d FROM public.site_content_drafts WHERE id = p_draft FOR UPDATE;
  IF NOT FOUND OR d.status <> 'pending' THEN RAISE EXCEPTION 'This change is no longer pending'; END IF;
  IF p_approve THEN
    INSERT INTO public.site_content (key, value, updated_by, updated_at) VALUES (d.key, d.value, d.submitted_by, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = NOW();
  END IF;
  UPDATE public.site_content_drafts SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         decided_by = auth.uid(), decided_at = NOW() WHERE id = p_draft;
  IF d.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (d.submitted_by, CASE WHEN p_approve THEN 'Website change approved' ELSE 'Website change declined' END,
              'Your change to the "' || d.key || '" section was ' || CASE WHEN p_approve THEN 'published.' ELSE 'not approved.' END, 'content');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.decide_content_draft(UUID, BOOLEAN) TO authenticated;

-------------------------------------------------------------------------------
-- 10. Notifications and water tracking
-------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.water_logs (
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  glasses INT NOT NULL DEFAULT 0 CHECK (glasses BETWEEN 0 AND 30),
  PRIMARY KEY (member_id, log_date)
);
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chain manage water" ON public.water_logs;
CREATE POLICY "Chain manage water" ON public.water_logs FOR ALL
  USING (public.can_manage(member_id)) WITH CHECK (public.can_manage(member_id));

-------------------------------------------------------------------------------
-- 11. Leads / visit bookings / expenses for the admin screens
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff full access leads" ON public.leads;
DROP POLICY IF EXISTS "Staff full access trial_bookings" ON public.trial_bookings;
DROP POLICY IF EXISTS "Admin full access expenses" ON public.expenses;
CREATE POLICY "Staff full access leads" ON public.leads FOR ALL USING (public.my_rank() >= 3) WITH CHECK (public.my_rank() >= 3);
CREATE POLICY "Staff full access trial_bookings" ON public.trial_bookings FOR ALL USING (public.my_rank() >= 3) WITH CHECK (public.my_rank() >= 3);
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL USING (public.my_rank() >= 4) WITH CHECK (public.my_rank() >= 4);
