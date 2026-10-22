-- 09: New members must register and be approved by the gym owner.
-- * Every new account (email or Google) starts as 'incomplete'.
-- * The member fills the registration form -> 'pending' (owner is notified).
-- * The owner (or Super Admin) approves -> 'approved', or declines -> 'rejected'
--   (the member can fix the details and send again).
-- * Until approved, the member cannot open the portal, request plans or check in.
-- Safe to re-run. Requires 01-08.

-------------------------------------------------------------------------------
-- 1. Columns
-------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'approval_status') THEN
    ALTER TABLE public.profiles ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved'
      CHECK (approval_status IN ('incomplete', 'pending', 'approved', 'rejected'));

    -- Existing accounts: staff and members with any gym history stay approved.
    -- Members who only signed in (no membership, payment, plan request or check-in)
    -- must now register and wait for approval.
    UPDATE public.profiles p SET approval_status = 'incomplete'
    WHERE p.role = 'member'
      AND NOT EXISTS (SELECT 1 FROM public.memberships m WHERE m.member_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.payments pay WHERE pay.member_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.plan_requests r WHERE r.member_id = p.id)
      AND NOT EXISTS (SELECT 1 FROM public.attendance a WHERE a.member_id = p.id);
  END IF;
END $$;

-- From now on every new profile starts unregistered.
ALTER TABLE public.profiles ALTER COLUMN approval_status SET DEFAULT 'incomplete';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_note TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS registration_submitted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_pending_registrations
  ON public.profiles (registration_submitted_at) WHERE approval_status = 'pending';

-------------------------------------------------------------------------------
-- 2. Nobody can approve themselves by editing their own row
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- Someone made staff (trainer, owner, ...) does not need member approval.
  IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role::text <> 'member' THEN
    NEW.approval_status := 'approved';
  END IF;

  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- SQL editor / service role
  IF current_setting('rv.approval_change', true) = 'on' THEN RETURN NEW; END IF;

  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.approval_note IS DISTINCT FROM OLD.approval_note
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.registration_submitted_at IS DISTINCT FROM OLD.registration_submitted_at THEN
    IF NEW.role IS DISTINCT FROM OLD.role AND NEW.role::text <> 'member' THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Registration approval can only be changed from the approval screen';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_profile_approval ON public.profiles;
CREATE TRIGGER guard_profile_approval
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_approval();

-------------------------------------------------------------------------------
-- 3. Member sends the registration form
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_registration(
  p_full_name TEXT, p_phone TEXT, p_dob DATE,
  p_blood_group TEXT DEFAULT NULL, p_height_cm NUMERIC DEFAULT NULL, p_weight_kg NUMERIC DEFAULT NULL,
  p_medicines TEXT DEFAULT NULL, p_health_notes TEXT DEFAULT NULL)
RETURNS public.profiles AS $$
DECLARE
  me public.profiles;
  v_phone TEXT := NULLIF(TRIM(p_phone), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
  IF me.role::text <> 'member' OR me.approval_status = 'approved' THEN
    RAISE EXCEPTION 'Your registration is already approved';
  END IF;

  IF NULLIF(TRIM(p_full_name), '') IS NULL THEN RAISE EXCEPTION 'Please enter your full name'; END IF;
  IF v_phone IS NULL OR v_phone !~ '^[6-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'Enter a valid 10-digit mobile number';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone AND id <> me.id) THEN
    RAISE EXCEPTION 'This mobile number is already registered to another account';
  END IF;
  IF p_dob IS NULL OR p_dob > CURRENT_DATE - INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Please enter a valid date of birth';
  END IF;

  PERFORM set_config('rv.approval_change', 'on', true);
  UPDATE public.profiles SET
    full_name = TRIM(p_full_name),
    phone = v_phone,
    dob = p_dob,
    blood_group = NULLIF(p_blood_group, ''),
    height_cm = p_height_cm,
    weight_kg = p_weight_kg,
    medicines = NULLIF(TRIM(p_medicines), ''),
    health_notes = NULLIF(TRIM(p_health_notes), ''),
    approval_status = 'pending',
    approval_note = NULL,
    registration_submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = me.id
  RETURNING * INTO me;
  PERFORM set_config('rv.approval_change', 'off', true);

  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT p.id, 'New member registration', me.full_name || ' registered and is waiting for your approval.', 'registration'
  FROM public.profiles p WHERE p.role::text IN ('owner', 'super_admin');

  RETURN me;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.submit_registration(TEXT, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Owner approves or declines
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decide_registration(p_member UUID, p_approve BOOLEAN, p_note TEXT DEFAULT NULL)
RETURNS public.profiles AS $$
DECLARE
  m public.profiles;
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the gym owner can approve new members'; END IF;
  SELECT * INTO m FROM public.profiles WHERE id = p_member FOR UPDATE;
  IF NOT FOUND OR m.role::text <> 'member' OR m.approval_status <> 'pending' THEN
    RAISE EXCEPTION 'This registration is no longer waiting for approval';
  END IF;

  PERFORM set_config('rv.approval_change', 'on', true);
  UPDATE public.profiles SET
    approval_status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    approval_note = NULLIF(TRIM(p_note), ''),
    approved_by = auth.uid(),
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_member
  RETURNING * INTO m;
  PERFORM set_config('rv.approval_change', 'off', true);

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_member,
    CASE WHEN p_approve THEN 'Welcome to RV Fitness!' ELSE 'Registration needs changes' END,
    CASE WHEN p_approve THEN 'Your registration is approved. Your dashboard is ready.'
         ELSE COALESCE(NULLIF(TRIM(p_note), ''), 'Please check your details and send them again, or contact the front desk.') END,
    'registration');

  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.decide_registration(UUID, BOOLEAN, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 5. Unapproved members cannot request plans or check in
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.require_approved_member()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE id = NEW.member_id AND role::text = 'member' AND approval_status <> 'approved') THEN
    RAISE EXCEPTION 'This member''s registration is not approved by the gym yet';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS require_approved_member ON public.plan_requests;
CREATE TRIGGER require_approved_member BEFORE INSERT ON public.plan_requests
  FOR EACH ROW EXECUTE FUNCTION public.require_approved_member();

DROP TRIGGER IF EXISTS require_approved_member ON public.attendance;
CREATE TRIGGER require_approved_member BEFORE INSERT ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.require_approved_member();
