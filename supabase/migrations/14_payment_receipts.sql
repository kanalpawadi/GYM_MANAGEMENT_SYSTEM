-- 14: Money received, receipts and part payments.
-- * Every amount received gets a numbered receipt (RCPT-YYYY-00001) with mode and note.
-- * Staff can take part payments against a due bill; the bill becomes paid when the
--   receipts add up to its total. Payments tracks amount_paid, so the app can show
--   total paid and remaining for a member.
-- * Money not tied to a plan (e.g. personal training) creates its own paid bill.
-- * Bills marked paid any other way (approvals, Change plan, older screens) get a
--   receipt automatically, so every rupee received has one.
-- Safe to re-run. Requires 01-13.

-------------------------------------------------------------------------------
-- 1. Receipts
-------------------------------------------------------------------------------
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0;

CREATE SEQUENCE IF NOT EXISTS public.receipt_seq;

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no TEXT NOT NULL UNIQUE
    DEFAULT ('RCPT-' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY') || '-' || LPAD(nextval('public.receipt_seq')::text, 5, '0')),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_mode payment_mode NOT NULL DEFAULT 'cash',
  note TEXT CHECK (note IS NULL OR char_length(note) <= 300),
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_receipts_payment ON public.payment_receipts (payment_id);
CREATE INDEX IF NOT EXISTS payment_receipts_member ON public.payment_receipts (member_id, received_at DESC);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chain view receipts" ON public.payment_receipts;
CREATE POLICY "Chain view receipts" ON public.payment_receipts FOR SELECT
  USING (public.can_manage(member_id) OR (member_id IS NULL AND public.my_rank() >= 3));
-- Receipts are only created by the functions below (no insert/update/delete policies).
GRANT SELECT ON public.payment_receipts TO authenticated;

-------------------------------------------------------------------------------
-- 2. Keep amount_paid in step and give every paid bill a receipt
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_payment_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    NEW.amount_paid := GREATEST(NEW.amount_paid, NEW.total_amount);
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_payment_paid ON public.payments;
CREATE TRIGGER sync_payment_paid BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_payment_paid();

CREATE OR REPLACE FUNCTION public.receipt_for_paid_payment()
RETURNS TRIGGER AS $$
DECLARE received NUMERIC;
BEGIN
  IF NEW.status <> 'paid' THEN RETURN NEW; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO received FROM public.payment_receipts WHERE payment_id = NEW.id;
  IF received < NEW.total_amount THEN
    INSERT INTO public.payment_receipts (payment_id, member_id, amount, payment_mode, note, received_by, received_at)
    VALUES (NEW.id, NEW.member_id, NEW.total_amount - received, NEW.payment_mode,
            CASE WHEN received > 0 THEN 'Balance paid' ELSE NULL END,
            COALESCE(auth.uid(), NEW.recorded_by), COALESCE(NEW.paid_at, NOW()));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS receipt_for_paid_payment ON public.payments;
CREATE TRIGGER receipt_for_paid_payment AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.receipt_for_paid_payment();

-- Existing paid bills: set amount_paid and add their receipt once.
UPDATE public.payments SET amount_paid = total_amount WHERE status = 'paid' AND amount_paid < total_amount;
INSERT INTO public.payment_receipts (payment_id, member_id, amount, payment_mode, received_by, received_at)
SELECT p.id, p.member_id, p.total_amount, p.payment_mode, p.recorded_by, COALESCE(p.paid_at, p.created_at)
FROM public.payments p
WHERE p.status = 'paid' AND p.total_amount > 0
  AND NOT EXISTS (SELECT 1 FROM public.payment_receipts r WHERE r.payment_id = p.id);

-------------------------------------------------------------------------------
-- 3. record_payment(): staff record money received
-------------------------------------------------------------------------------
-- p_payment set   -> money towards that due bill (part or full; NULL amount = the rest).
-- p_payment NULL  -> other money from p_member (creates its own paid bill titled p_title).
CREATE OR REPLACE FUNCTION public.record_payment(
  p_payment UUID, p_amount NUMERIC, p_mode TEXT, p_note TEXT DEFAULT NULL,
  p_member UUID DEFAULT NULL, p_title TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  bill public.payments;
  remaining NUMERIC;
  amt NUMERIC;
  rec public.payment_receipts;
  v_mode payment_mode;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can record payments'; END IF;
  IF p_mode NOT IN ('cash', 'upi') THEN RAISE EXCEPTION 'Choose cash or UPI'; END IF;
  v_mode := p_mode::payment_mode;

  IF p_payment IS NOT NULL THEN
    SELECT * INTO bill FROM public.payments WHERE id = p_payment FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bill not found'; END IF;
    IF bill.member_id IS NOT NULL AND NOT public.can_manage(bill.member_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    IF bill.status = 'paid' THEN RAISE EXCEPTION 'This bill is already fully paid'; END IF;
    remaining := bill.total_amount - bill.amount_paid;
    amt := COALESCE(p_amount, remaining);
    IF amt <= 0 THEN RAISE EXCEPTION 'Enter the amount received'; END IF;
    IF amt > remaining THEN
      RAISE EXCEPTION 'Only ₹% is left on this bill. Record the extra as a separate payment.', remaining;
    END IF;

    INSERT INTO public.payment_receipts (payment_id, member_id, amount, payment_mode, note, received_by)
      VALUES (bill.id, bill.member_id, amt, v_mode, NULLIF(TRIM(p_note), ''), auth.uid())
      RETURNING * INTO rec;
    UPDATE public.payments SET
      amount_paid = bill.amount_paid + amt,
      status = CASE WHEN bill.amount_paid + amt >= bill.total_amount THEN 'paid'::payment_status ELSE status END,
      payment_mode = CASE WHEN bill.amount_paid + amt >= bill.total_amount THEN v_mode ELSE payment_mode END,
      recorded_by = COALESCE(recorded_by, auth.uid())
    WHERE id = bill.id RETURNING * INTO bill;
  ELSE
    IF p_member IS NULL THEN RAISE EXCEPTION 'Choose the member'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member AND role::text = 'member') THEN RAISE EXCEPTION 'Member not found'; END IF;
    IF NOT public.can_manage(p_member) THEN RAISE EXCEPTION 'Not allowed'; END IF;
    IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Enter the amount received'; END IF;
    amt := p_amount;

    -- The bill's own trigger creates the receipt; the note goes on both.
    INSERT INTO public.payments (member_id, plan_title, amount, tax_amount, total_amount, discount_amount,
                                 payment_mode, status, recorded_by, notes)
      VALUES (p_member, COALESCE(NULLIF(TRIM(p_title), ''), 'Other payment'), amt, 0, amt, 0, v_mode, 'paid', auth.uid(), NULLIF(TRIM(p_note), ''))
      RETURNING * INTO bill;
    UPDATE public.payment_receipts SET note = NULLIF(TRIM(p_note), '') WHERE payment_id = bill.id RETURNING * INTO rec;
  END IF;

  RETURN jsonb_build_object(
    'receipt_id', rec.id, 'receipt_no', rec.receipt_no, 'payment_id', bill.id, 'amount', amt,
    'bill_total', bill.total_amount, 'bill_paid', bill.amount_paid, 'remaining', bill.total_amount - bill.amount_paid,
    'status', bill.status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.record_payment(UUID, NUMERIC, TEXT, TEXT, UUID, TEXT) TO authenticated;
