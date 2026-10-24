-- 13: Staff change a member's plan directly from the member page.
-- * Trainers and above (role chain) pick Monthly / Six Month / Yearly at the
--   standard price (with any discount).
-- * Only the Gym Owner and Super Admin can set a custom amount or a custom plan
--   (own name, length in days or months).
-- * A plan that starts before the current one ends replaces it: the current
--   plan ends the day before (or is cancelled if it had not started yet).
-- * Creates the payment (paid cash / paid UPI / due) and notifies the member.
-- Safe to re-run. Requires 01-12.

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
  IF p_start IS NULL OR p_start < (NOW() AT TIME ZONE 'Asia/Kolkata')::date - 31 THEN
    RAISE EXCEPTION 'Please choose a start date (up to one month back)';
  END IF;
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

GRANT EXECUTE ON FUNCTION public.assign_membership(UUID, TEXT, DATE, TEXT, NUMERIC, TEXT, INT, INT, TEXT) TO authenticated;
