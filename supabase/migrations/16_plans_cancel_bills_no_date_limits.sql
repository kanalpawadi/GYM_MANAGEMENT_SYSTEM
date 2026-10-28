-- 16: Owner-managed subscription plans, cancelling a supplement sale, and no date limits.
-- * subscription_plans: the Gym Owner / Super Admin add, edit and remove plans
--   (name, months, price, description, features). plan_catalog() now reads this
--   table, so plan requests and Change plan use the owner's prices.
-- * delete_supplement(): deleting a supplement entry that was a gym sale also
--   cancels its bill (status 'failed', shown as "Cancelled" and left out of totals).
-- * Date limits removed: attendance any day, plan start any date, any date of
--   birth, supplement dates in the future.
-- Safe to re-run. Requires 01-15.

-------------------------------------------------------------------------------
-- 1. Subscription plans
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code TEXT PRIMARY KEY CHECK (code ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 60),
  months INT NOT NULL CHECK (months BETWEEN 1 AND 60),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge TEXT CHECK (badge IS NULL OR char_length(badge) <= 30),
  highlight BOOLEAN NOT NULL DEFAULT false,
  sort INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_plans (code, title, months, price, description, features, badge, highlight, sort) VALUES
  ('monthly', 'Monthly', 1, 1500, 'Flexible monthly membership with full gym access.',
   '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water"]', NULL, false, 1),
  ('six-month', 'Six Month', 6, 7500, 'Best value for committed members.',
   '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan"]', 'Popular', true, 2),
  ('yearly', 'Yearly', 12, 12000, 'Maximum savings with a full year of transformation.',
   '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan", "Body progress tracking", "Priority trainer support"]', 'Best value', false, 3)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads plans" ON public.subscription_plans;
DROP POLICY IF EXISTS "Owner manages plans" ON public.subscription_plans;
-- The public website shows active plans; the owner also sees removed ones (to restore).
CREATE POLICY "Anyone reads plans" ON public.subscription_plans FOR SELECT USING (active OR public.my_rank() >= 5);
CREATE POLICY "Owner manages plans" ON public.subscription_plans FOR ALL
  USING (public.my_rank() >= 5) WITH CHECK (public.my_rank() >= 5);
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;

-- Plan requests and Change plan read the owner's plans.
CREATE OR REPLACE FUNCTION public.plan_catalog()
RETURNS TABLE (code TEXT, title TEXT, months INT, price NUMERIC) AS $$
  SELECT p.code, p.title, p.months, p.price FROM public.subscription_plans p WHERE p.active ORDER BY p.sort, p.months;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-------------------------------------------------------------------------------
-- 2. Deleting a supplement entry cancels its gym bill
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_supplement(p_log UUID)
RETURNS JSONB AS $$
DECLARE
  l public.supplement_logs;
  cancelled UUID;
BEGIN
  SELECT * INTO l FROM public.supplement_logs WHERE id = p_log;
  IF NOT FOUND OR NOT public.can_manage(l.member_id) THEN RAISE EXCEPTION 'Entry not found'; END IF;
  IF l.payment_id IS NOT NULL THEN
    IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can delete a supplement sale (it has a bill)'; END IF;
    UPDATE public.payments
      SET status = 'failed',
          notes = CONCAT_WS(' · ', NULLIF(notes, ''), 'Cancelled: supplement entry deleted')
      WHERE id = l.payment_id AND status <> 'failed'
      RETURNING id INTO cancelled;
  END IF;
  DELETE FROM public.supplement_logs WHERE id = p_log;
  RETURN jsonb_build_object('deleted', p_log, 'cancelled_payment', cancelled);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.delete_supplement(UUID) TO authenticated;

-- Members can't delete a sale entry directly (it would leave the bill behind).
DROP POLICY IF EXISTS "Chain delete supplements" ON public.supplement_logs;
CREATE POLICY "Chain delete supplements" ON public.supplement_logs FOR DELETE
  USING (public.can_manage(member_id) AND (payment_id IS NULL OR public.my_rank() >= 3));

-------------------------------------------------------------------------------
-- 3. No date limits
-------------------------------------------------------------------------------
ALTER TABLE public.supplement_logs DROP CONSTRAINT IF EXISTS supplement_logs_check;
ALTER TABLE public.supplement_logs DROP CONSTRAINT IF EXISTS supplement_logs_taken_on_check;

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
  IF p_dob IS NULL THEN RAISE EXCEPTION 'Please enter your date of birth'; END IF;

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

CREATE OR REPLACE FUNCTION public.add_attendance_day(p_member UUID, p_day DATE)
RETURNS JSONB AS $$
DECLARE
  already BOOLEAN;
  att_id UUID;
BEGIN
  IF public.my_rank() < 2 THEN RAISE EXCEPTION 'Only trainers and gym staff can add attendance'; END IF;
  IF NOT public.can_manage(p_member) OR p_member = auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_day IS NULL THEN RAISE EXCEPTION 'Choose a day'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.attendance WHERE member_id = p_member AND (check_in AT TIME ZONE 'Asia/Kolkata')::date = p_day) INTO already;
  IF NOT already THEN
    -- Added visits are logged at noon on that day.
    INSERT INTO public.attendance (member_id, check_in, method, verified_by)
      VALUES (p_member, (p_day + TIME '12:00') AT TIME ZONE 'Asia/Kolkata', 'manual', auth.uid())
      RETURNING id INTO att_id;
  END IF;
  RETURN jsonb_build_object('already', already, 'id', att_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_membership(
  p_member UUID,
  p_plan_code TEXT,              -- 'monthly' | 'six-month' | 'yearly' | 'custom'
  p_start DATE,
  p_payment TEXT,                -- 'cash' | 'upi' | 'due'
  p_price NUMERIC DEFAULT NULL,  -- custom amount (owner / super admin only)
  p_title TEXT DEFAULT NULL,     -- custom plan name
  p_months INT DEFAULT NULL,     -- custom length in months ...
  p_days INT DEFAULT NULL,       -- ... or in days
  p_note TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  m public.profiles;
  cat RECORD;
  v_title TEXT;
  v_base NUMERIC;
  v_price NUMERIC;
  v_end DATE;
  v_custom BOOLEAN := p_plan_code = 'custom';
  ms_id UUID;
  pay_id UUID;
  replaced INT;
BEGIN
  IF public.my_rank() < 2 THEN RAISE EXCEPTION 'Only trainers and gym staff can change a plan'; END IF;
  SELECT * INTO m FROM public.profiles WHERE id = p_member;
  IF NOT FOUND OR m.role::text <> 'member' THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.can_manage(p_member) OR p_member = auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_start IS NULL THEN RAISE EXCEPTION 'Please choose a start date'; END IF;
  IF p_payment NOT IN ('cash', 'upi', 'due') THEN RAISE EXCEPTION 'Choose how it is paid'; END IF;

  IF v_custom THEN
    IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the gym owner can create a custom plan'; END IF;
    v_title := COALESCE(NULLIF(TRIM(p_title), ''), 'Custom plan');
    IF p_price IS NULL OR p_price < 0 THEN RAISE EXCEPTION 'Enter the amount for the custom plan'; END IF;
    IF COALESCE(p_months, 0) > 0 THEN
      IF p_months > 36 THEN RAISE EXCEPTION 'A plan can be at most 36 months'; END IF;
      v_end := (p_start + make_interval(months => p_months))::date - 1;
    ELSIF COALESCE(p_days, 0) > 0 THEN
      IF p_days > 1100 THEN RAISE EXCEPTION 'A plan can be at most 1100 days'; END IF;
      v_end := p_start + p_days - 1;
    ELSE
      RAISE EXCEPTION 'Enter how long the custom plan lasts';
    END IF;
    v_base := p_price;
    v_price := p_price;
  ELSE
    SELECT * INTO cat FROM public.plan_catalog() c WHERE c.code = p_plan_code;
    IF NOT FOUND THEN RAISE EXCEPTION 'Unknown plan'; END IF;
    v_title := cat.title;
    v_base := cat.price;
    v_price := public.discounted_price(cat.price);
    IF p_price IS NOT NULL AND p_price <> v_price THEN
      IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the gym owner can set a custom amount'; END IF;
      IF p_price < 0 THEN RAISE EXCEPTION 'Please check the amount'; END IF;
      v_price := p_price;
    END IF;
    v_end := (p_start + make_interval(months => cat.months))::date - 1;
  END IF;

  -- Replace any active plan that overlaps the new one.
  UPDATE public.memberships SET status = 'cancelled'
    WHERE member_id = p_member AND status = 'active' AND start_date >= p_start;
  GET DIAGNOSTICS replaced = ROW_COUNT;
  UPDATE public.memberships SET end_date = p_start - 1
    WHERE member_id = p_member AND status = 'active' AND start_date < p_start AND end_date >= p_start;

  INSERT INTO public.memberships (member_id, plan_code, plan_title, price, start_date, end_date, status)
    VALUES (p_member, p_plan_code, v_title, v_price, p_start, v_end, 'active')
    RETURNING id INTO ms_id;

  INSERT INTO public.payments (member_id, membership_id, plan_code, plan_title, amount, tax_amount, total_amount,
                               discount_amount, payment_mode, status, recorded_by, paid_at, notes)
    VALUES (p_member, ms_id, p_plan_code, v_title, v_price, 0, v_price, GREATEST(v_base - v_price, 0),
            (CASE WHEN p_payment = 'upi' THEN 'upi' ELSE 'cash' END)::payment_mode,
            (CASE WHEN p_payment = 'due' THEN 'pending' ELSE 'paid' END)::payment_status,
            auth.uid(), CASE WHEN p_payment = 'due' THEN NULL ELSE NOW() END, NULLIF(TRIM(p_note), ''))
    RETURNING id INTO pay_id;

  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_member, 'Your plan was updated',
            'Your ' || v_title || ' plan runs ' || TO_CHAR(p_start, 'DD Mon YYYY') || ' to ' || TO_CHAR(v_end, 'DD Mon YYYY') ||
            CASE WHEN p_payment = 'due' THEN '. Payment of ₹' || v_price || ' is due at the desk.' ELSE '.' END,
            'plan_request');

  RETURN jsonb_build_object('membership_id', ms_id, 'payment_id', pay_id, 'title', v_title, 'price', v_price,
                            'start_date', p_start, 'end_date', v_end);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
