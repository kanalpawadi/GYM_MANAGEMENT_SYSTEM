-- 15: Supplement sales with payment, "amount due" bills, and past attendance.
-- * sell_supplement(): staff note a supplement the member bought AT THE GYM and
--   take payment now (cash / UPI -> paid bill + receipt) or later (due bill).
-- * add_charge(): staff add any amount the member must pay later (due bill).
-- * add_attendance_day(): staff add a visit on a past day (from 1 Jan 2023).
-- Safe to re-run. Requires 01-14.

-------------------------------------------------------------------------------
-- 1. Supplement sales
-------------------------------------------------------------------------------
ALTER TABLE public.supplement_logs ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.sell_supplement(
  p_member UUID, p_supplement TEXT, p_price NUMERIC, p_payment TEXT,
  p_taken_on DATE DEFAULT NULL, p_brand TEXT DEFAULT NULL, p_dose TEXT DEFAULT NULL, p_time TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL, p_bill_no TEXT DEFAULT NULL, p_notes TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  log_id UUID;
  bill public.payments;
  rec_no TEXT;
  v_title TEXT;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can record a supplement sale'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member AND role::text = 'member') THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.can_manage(p_member) OR p_member = auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF NULLIF(TRIM(p_supplement), '') IS NULL THEN RAISE EXCEPTION 'Please enter the supplement name'; END IF;
  IF p_price IS NULL OR p_price <= 0 THEN RAISE EXCEPTION 'Enter the price'; END IF;
  IF p_payment NOT IN ('cash', 'upi', 'due') THEN RAISE EXCEPTION 'Choose cash, UPI or pay later'; END IF;

  v_title := 'Supplement: ' || TRIM(p_supplement) || COALESCE(' (' || NULLIF(TRIM(p_brand), '') || ')', '');

  -- A paid bill gets its receipt from the payments trigger (migration 14).
  INSERT INTO public.payments (member_id, plan_title, amount, tax_amount, total_amount, discount_amount,
                               payment_mode, status, recorded_by, notes)
    VALUES (p_member, LEFT(v_title, 120), p_price, 0, p_price, 0,
            (CASE WHEN p_payment = 'upi' THEN 'upi' ELSE 'cash' END)::payment_mode,
            (CASE WHEN p_payment = 'due' THEN 'pending' ELSE 'paid' END)::payment_status,
            auth.uid(), NULLIF(TRIM(p_notes), ''))
    RETURNING * INTO bill;

  INSERT INTO public.supplement_logs (member_id, taken_on, supplement, brand, dose, time_of_day, quantity, price, shop, bill_no, notes, created_by, payment_id)
    VALUES (p_member, COALESCE(p_taken_on, (NOW() AT TIME ZONE 'Asia/Kolkata')::date), TRIM(p_supplement), NULLIF(TRIM(p_brand), ''),
            NULLIF(TRIM(p_dose), ''), NULLIF(p_time, ''), NULLIF(TRIM(p_quantity), ''), p_price, 'RV Fitness (gym)',
            NULLIF(TRIM(p_bill_no), ''), NULLIF(TRIM(p_notes), ''), auth.uid(), bill.id)
    RETURNING id INTO log_id;

  SELECT receipt_no INTO rec_no FROM public.payment_receipts WHERE payment_id = bill.id ORDER BY received_at LIMIT 1;

  IF p_payment = 'due' THEN
    INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (p_member, 'Payment due', LEFT(v_title, 120) || ': ₹' || p_price || ' to pay at the desk.', 'payment');
  END IF;

  RETURN jsonb_build_object('log_id', log_id, 'payment_id', bill.id, 'status', bill.status, 'receipt_no', rec_no, 'amount', p_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.sell_supplement(UUID, TEXT, NUMERIC, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 2. Amount due (any charge to pay later)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_charge(p_member UUID, p_amount NUMERIC, p_title TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE bill public.payments;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can add an amount due'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member AND role::text = 'member') THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF NOT public.can_manage(p_member) OR p_member = auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter the amount due'; END IF;
  IF NULLIF(TRIM(p_title), '') IS NULL THEN RAISE EXCEPTION 'Say what the amount is for'; END IF;

  INSERT INTO public.payments (member_id, plan_title, amount, tax_amount, total_amount, discount_amount, payment_mode, status, recorded_by, notes)
    VALUES (p_member, LEFT(TRIM(p_title), 120), p_amount, 0, p_amount, 0, 'cash', 'pending', auth.uid(), NULLIF(TRIM(p_note), ''))
    RETURNING * INTO bill;

  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_member, 'Payment due', LEFT(TRIM(p_title), 120) || ': ₹' || p_amount || ' to pay at the desk.', 'payment');

  RETURN jsonb_build_object('payment_id', bill.id, 'amount', p_amount, 'title', bill.plan_title);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.add_charge(UUID, NUMERIC, TEXT, TEXT) TO authenticated;

-------------------------------------------------------------------------------
-- 3. Past attendance (from 1 Jan 2023)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_attendance_day(p_member UUID, p_day DATE)
RETURNS JSONB AS $$
DECLARE
  already BOOLEAN;
  att_id UUID;
  today DATE := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF public.my_rank() < 2 THEN RAISE EXCEPTION 'Only trainers and gym staff can add attendance'; END IF;
  IF NOT public.can_manage(p_member) OR p_member = auth.uid() THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF p_day IS NULL OR p_day < DATE '2023-01-01' OR p_day > today THEN
    RAISE EXCEPTION 'Choose a day between 1 Jan 2023 and today';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.attendance WHERE member_id = p_member AND (check_in AT TIME ZONE 'Asia/Kolkata')::date = p_day) INTO already;
  IF NOT already THEN
    -- Old visits are logged at noon on that day.
    INSERT INTO public.attendance (member_id, check_in, method, verified_by)
      VALUES (p_member, (p_day + TIME '12:00') AT TIME ZONE 'Asia/Kolkata', 'manual', auth.uid())
      RETURNING id INTO att_id;
  END IF;
  RETURN jsonb_build_object('already', already, 'id', att_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.add_attendance_day(UUID, DATE) TO authenticated;
