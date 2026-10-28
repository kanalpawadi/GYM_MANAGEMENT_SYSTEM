-- 17: Gym Owner / Super Admin delete a payment entry made by mistake (e.g. the same
-- amount recorded twice), with a reason.
-- The entry is cancelled rather than erased, so invoice numbers stay in order and the
-- accounts show who removed it, when and why:
-- * the bill becomes 'failed' (shown as "Cancelled"), left out of all totals;
-- * its receipts are marked void.
-- Safe to re-run. Requires 01-16.

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment UUID, p_reason TEXT)
RETURNS JSONB AS $$
DECLARE
  bill public.payments;
  voided INT;
  v_reason TEXT := NULLIF(TRIM(p_reason), '');
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the gym owner or Super Admin can delete a payment'; END IF;
  IF v_reason IS NULL OR char_length(v_reason) < 3 THEN RAISE EXCEPTION 'Please write why this payment is being deleted'; END IF;
  IF char_length(v_reason) > 300 THEN RAISE EXCEPTION 'Keep the reason under 300 characters'; END IF;

  SELECT * INTO bill FROM public.payments WHERE id = p_payment FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF bill.member_id IS NOT NULL AND NOT public.can_manage(bill.member_id) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF bill.status = 'failed' THEN RAISE EXCEPTION 'This payment was already deleted'; END IF;

  UPDATE public.payments SET
    status = 'failed',
    cancel_reason = v_reason,
    cancelled_by = auth.uid(),
    cancelled_at = NOW(),
    notes = CONCAT_WS(' · ', NULLIF(notes, ''), 'Deleted: ' || v_reason)
  WHERE id = p_payment;

  UPDATE public.payment_receipts SET voided_at = NOW(), void_reason = v_reason
    WHERE payment_id = p_payment AND voided_at IS NULL;
  GET DIAGNOSTICS voided = ROW_COUNT;

  RETURN jsonb_build_object('payment_id', p_payment, 'receipts_voided', voided, 'amount', bill.total_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.cancel_payment(UUID, TEXT) TO authenticated;
