-- 20: Freeze a member's account (with a reason) and food type (Pure Veg / Non-Veg / Veg + Egg).
-- Freeze (owner and Super Admin only, reason required):
-- * The member can't use the portal, check in or request plans until unfrozen.
-- * Plan days are paused: on unfreeze, the frozen days are added to their current and
--   upcoming plans, and the plan-end check skips frozen members.
-- * Every freeze is kept in member_freezes (who, when, why, days added).
-- Food type:
-- * Asked at registration; existing members set it in their profile.
-- * Up to three common diet plans, one per food type. Members see the one for their type.
--   An existing common diet plan becomes the Pure Veg plan.
-- Safe to re-run. Requires 01-19.

-------------------------------------------------------------------------------
-- 1. Columns
-------------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS food_preference TEXT,
  ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS frozen_reason TEXT,
  ADD COLUMN IF NOT EXISTS frozen_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_food_preference_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_food_preference_check
  CHECK (food_preference IS NULL OR food_preference IN ('veg', 'nonveg', 'veg_egg'));

ALTER TABLE public.diet_plans ADD COLUMN IF NOT EXISTS food_type TEXT;
ALTER TABLE public.diet_plans DROP CONSTRAINT IF EXISTS diet_plans_food_type_check;
ALTER TABLE public.diet_plans ADD CONSTRAINT diet_plans_food_type_check
  CHECK (food_type IS NULL OR food_type IN ('veg', 'nonveg', 'veg_egg'));
UPDATE public.diet_plans SET food_type = 'veg' WHERE is_common AND food_type IS NULL;

CREATE TABLE IF NOT EXISTS public.member_freezes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  frozen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  frozen_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  unfrozen_at TIMESTAMPTZ,
  unfrozen_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  days_added INT
);
CREATE INDEX IF NOT EXISTS member_freezes_member_idx ON public.member_freezes (member_id, frozen_at DESC);
ALTER TABLE public.member_freezes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chain view freezes" ON public.member_freezes;
CREATE POLICY "Chain view freezes" ON public.member_freezes FOR SELECT USING (public.can_manage(member_id));

-------------------------------------------------------------------------------
-- 2. Nobody freezes or unfreezes by editing the profile directly
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_profile_freeze()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;  -- SQL editor / service role
  IF current_setting('rv.freeze_change', true) = 'on' THEN RETURN NEW; END IF;
  IF NEW.frozen_at IS DISTINCT FROM OLD.frozen_at
     OR NEW.frozen_reason IS DISTINCT FROM OLD.frozen_reason
     OR NEW.frozen_by IS DISTINCT FROM OLD.frozen_by THEN
    RAISE EXCEPTION 'Use the Freeze / Unfreeze buttons to change this';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS guard_profile_freeze ON public.profiles;
CREATE TRIGGER guard_profile_freeze
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_freeze();

-------------------------------------------------------------------------------
-- 3. Freeze / unfreeze
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.freeze_member(p_member UUID, p_reason TEXT)
RETURNS public.profiles AS $$
DECLARE
  m public.profiles;
  v_reason TEXT := NULLIF(TRIM(p_reason), '');
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the owner can freeze a member'; END IF;
  IF v_reason IS NULL OR LENGTH(v_reason) < 3 THEN RAISE EXCEPTION 'Please write the reason for freezing'; END IF;
  SELECT * INTO m FROM public.profiles WHERE id = p_member FOR UPDATE;
  IF NOT FOUND OR m.role::text <> 'member' THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF m.frozen_at IS NOT NULL THEN RAISE EXCEPTION 'This member is already frozen'; END IF;

  PERFORM set_config('rv.freeze_change', 'on', true);
  UPDATE public.profiles SET frozen_at = NOW(), frozen_reason = LEFT(v_reason, 500), frozen_by = auth.uid(), updated_at = NOW()
    WHERE id = p_member RETURNING * INTO m;
  PERFORM set_config('rv.freeze_change', 'off', true);

  INSERT INTO public.member_freezes (member_id, frozen_by, reason) VALUES (p_member, auth.uid(), LEFT(v_reason, 500));
  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_member, 'Your account is frozen', 'Reason: ' || LEFT(v_reason, 200) || '. Your plan days are paused. Please contact the gym.', 'freeze');
  RETURN m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.freeze_member(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.unfreeze_member(p_member UUID)
RETURNS JSONB AS $$
DECLARE
  m public.profiles;
  frozen_on DATE;
  today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  days INT;
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the owner can unfreeze a member'; END IF;
  SELECT * INTO m FROM public.profiles WHERE id = p_member FOR UPDATE;
  IF NOT FOUND OR m.role::text <> 'member' THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF m.frozen_at IS NULL THEN RAISE EXCEPTION 'This member is not frozen'; END IF;

  frozen_on := (m.frozen_at AT TIME ZONE 'Asia/Kolkata')::date;
  days := GREATEST(today - frozen_on, 0);
  IF days > 0 THEN
    -- Plans that had not started yet move forward; the running plan ends later.
    UPDATE public.memberships SET start_date = start_date + days, end_date = end_date + days
      WHERE member_id = p_member AND status = 'active' AND start_date > frozen_on;
    UPDATE public.memberships SET end_date = end_date + days
      WHERE member_id = p_member AND status = 'active' AND start_date <= frozen_on AND end_date >= frozen_on;
  END IF;

  PERFORM set_config('rv.freeze_change', 'on', true);
  UPDATE public.profiles SET frozen_at = NULL, frozen_reason = NULL, frozen_by = NULL, updated_at = NOW() WHERE id = p_member;
  PERFORM set_config('rv.freeze_change', 'off', true);

  UPDATE public.member_freezes SET unfrozen_at = NOW(), unfrozen_by = auth.uid(), days_added = days
    WHERE member_id = p_member AND unfrozen_at IS NULL;
  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_member, 'Your account is active again',
            CASE WHEN days > 0 THEN days || ' frozen day' || CASE WHEN days = 1 THEN ' was' ELSE 's were' END || ' added to your plan. Welcome back!'
                 ELSE 'Welcome back!' END, 'freeze');
  RETURN jsonb_build_object('days_added', days);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.unfreeze_member(UUID) TO authenticated;

-------------------------------------------------------------------------------
-- 4. Frozen members can't check in or request plans
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.require_approved_member()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles
             WHERE id = NEW.member_id AND role::text = 'member' AND approval_status <> 'approved') THEN
    RAISE EXCEPTION 'This member''s registration is not approved by the gym yet';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.member_id AND frozen_at IS NOT NULL) THEN
    RAISE EXCEPTION 'This account is frozen by the gym. Please contact the gym.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 5. Plan-end check skips frozen members
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.membership_expiry_check(p_member UUID)
RETURNS JSONB AS $$
DECLARE
  m public.profiles;
  today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  current_end DATE;
  last_end DATE;
  days_left INT;
  expired BOOLEAN := false;
  reminded BOOLEAN := false;
BEGIN
  SELECT * INTO m FROM public.profiles WHERE id = p_member;
  IF NOT FOUND OR m.role::text <> 'member' THEN RETURN jsonb_build_object('expired', false, 'days_left', NULL); END IF;
  -- Frozen: plan days are paused (added back on unfreeze), so nothing expires meanwhile.
  IF m.frozen_at IS NOT NULL THEN RETURN jsonb_build_object('expired', false, 'frozen', true, 'days_left', NULL); END IF;

  -- Plans whose last day has passed are marked expired.
  UPDATE public.memberships SET status = 'expired'
    WHERE member_id = p_member AND status = 'active' AND end_date < today;

  -- The plan covering today (or the latest one still to come).
  SELECT MAX(end_date) INTO current_end FROM public.memberships
    WHERE member_id = p_member AND status = 'active' AND end_date >= today;
  SELECT MAX(end_date) INTO last_end FROM public.memberships
    WHERE member_id = p_member AND status IN ('active', 'expired');

  -- Re-approved after the plan ended? Then wait for their next plan to end.
  IF current_end IS NULL AND last_end IS NOT NULL AND m.approval_status = 'approved'
     AND (m.approved_at IS NULL OR (m.approved_at AT TIME ZONE 'Asia/Kolkata')::date <= last_end) THEN
    PERFORM set_config('rv.approval_change', 'on', true);
    UPDATE public.profiles SET
      approval_status = 'incomplete',
      approval_note = 'Your membership ended on ' || TO_CHAR(last_end, 'DD Mon YYYY') || '. Please fill the admission form again for approval.',
      updated_at = NOW()
    WHERE id = p_member;
    PERFORM set_config('rv.approval_change', 'off', true);
    expired := true;

    INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (p_member, 'Membership ended', 'Your plan ended on ' || TO_CHAR(last_end, 'DD Mon YYYY') || '. Fill the admission form again to continue.', 'renewal');
    INSERT INTO public.notifications (user_id, title, message, type)
      SELECT p.id, 'Membership ended', m.full_name || '''s plan ended on ' || TO_CHAR(last_end, 'DD Mon YYYY') || '. Their ID is back for approval.', 'renewal'
      FROM public.profiles p WHERE p.role::text IN ('owner', 'super_admin');
  END IF;

  IF current_end IS NOT NULL THEN
    days_left := current_end - today;
    -- Recharge-style reminder: once a day when 5 days or fewer are left.
    IF days_left <= 5 AND NOT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = p_member AND type = 'renewal_reminder'
        AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = today
    ) THEN
      INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (p_member,
                CASE WHEN days_left = 0 THEN 'Your plan ends today' ELSE 'Your plan ends in ' || days_left || ' day' || CASE WHEN days_left = 1 THEN '' ELSE 's' END END,
                'Your membership runs until ' || TO_CHAR(current_end, 'DD Mon YYYY') || '. Renew now to keep training without a break.',
                'renewal_reminder');
      reminded := true;
    END IF;
  END IF;

  RETURN jsonb_build_object('expired', expired, 'days_left', days_left, 'ends_on', current_end, 'reminded', reminded);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.membership_expiry_check(UUID) FROM PUBLIC, anon, authenticated;

-------------------------------------------------------------------------------
-- 6. Registration asks for the food type
-------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.submit_registration(TEXT, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.submit_registration(
  p_full_name TEXT, p_phone TEXT, p_dob DATE,
  p_blood_group TEXT DEFAULT NULL, p_height_cm NUMERIC DEFAULT NULL, p_weight_kg NUMERIC DEFAULT NULL,
  p_medicines TEXT DEFAULT NULL, p_health_notes TEXT DEFAULT NULL, p_food_preference TEXT DEFAULT NULL)
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
  IF p_dob IS NULL THEN RAISE EXCEPTION 'Please enter your date of birth'; END IF;
  IF p_food_preference IS NULL OR p_food_preference NOT IN ('veg', 'nonveg', 'veg_egg') THEN
    RAISE EXCEPTION 'Please choose your food type: Pure Veg, Non-Veg or Veg + Egg';
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
    food_preference = p_food_preference,
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
GRANT EXECUTE ON FUNCTION public.submit_registration(TEXT, TEXT, DATE, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
