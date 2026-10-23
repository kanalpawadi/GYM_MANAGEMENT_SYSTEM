-- 11: Gym Owner / Super Admin can permanently delete a member.
-- * Deletes the member's login and everything personal: profile, memberships,
--   plan requests, attendance, diet/workout plans, body metrics, water logs,
--   notifications and chats (photos are removed by the app through Storage).
-- * Payments and invoices are KEPT for accounts/GST, labelled "Deleted member",
--   with the plan period copied onto the payment.
-- Safe to re-run. Requires 01-10.

-------------------------------------------------------------------------------
-- 1. Payments survive the member, anonymised
-------------------------------------------------------------------------------
ALTER TABLE public.payments ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_member_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deleted_member_label TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS period_start DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS period_end DATE;

-- Staff still see (and can mark paid) payments whose member was deleted.
DROP POLICY IF EXISTS "Staff view deleted-member payments" ON public.payments;
CREATE POLICY "Staff view deleted-member payments" ON public.payments FOR SELECT
  USING (member_id IS NULL AND public.my_rank() >= 3);
DROP POLICY IF EXISTS "Staff update deleted-member payments" ON public.payments;
CREATE POLICY "Staff update deleted-member payments" ON public.payments FOR UPDATE
  USING (member_id IS NULL AND public.my_rank() >= 3)
  WITH CHECK (member_id IS NULL AND public.my_rank() >= 3);

-------------------------------------------------------------------------------
-- 2. Owner / Super Admin may remove a member's photos from Storage
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_delete_member_files(folder TEXT)
RETURNS BOOLEAN AS $$
  SELECT public.my_rank() >= 5
     AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id::text = folder AND p.role::text = 'member');
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Owners delete member files" ON storage.objects;
CREATE POLICY "Owners delete member files" ON storage.objects FOR DELETE
  USING (bucket_id IN ('avatars', 'progress-photos', 'attendance-selfies')
         AND public.can_delete_member_files((storage.foldername(name))[1]));

-------------------------------------------------------------------------------
-- 3. delete_member(): the permanent delete
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_member(p_member UUID)
RETURNS JSONB AS $$
DECLARE
  m public.profiles;
  label TEXT;
  kept INT;
  fk RECORD;
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the gym owner or Super Admin can delete members'; END IF;
  IF p_member = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own account'; END IF;

  SELECT * INTO m FROM public.profiles WHERE id = p_member FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF m.role::text <> 'member' THEN
    RAISE EXCEPTION 'Only members can be deleted. Change this person''s role to Member first.';
  END IF;

  -- Keep payments for the accounts, without personal details.
  label := 'Deleted member' || COALESCE(' · ' || m.member_code, '');
  UPDATE public.payments pay SET
    deleted_member_label = label,
    period_start = COALESCE(pay.period_start, ms.start_date),
    period_end = COALESCE(pay.period_end, ms.end_date)
  FROM (SELECT p2.id, mem.start_date, mem.end_date
          FROM public.payments p2 LEFT JOIN public.memberships mem ON mem.id = p2.membership_id
         WHERE p2.member_id = p_member) ms
  WHERE pay.id = ms.id;
  GET DIAGNOSTICS kept = ROW_COUNT;

  -- Loose references (created_by, verified_by, ...) that don't cascade: clear them.
  FOR fk IN
    SELECT c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE c.contype = 'f' AND c.confrelid = 'public.profiles'::regclass
      AND array_length(c.conkey, 1) = 1 AND c.confdeltype IN ('a', 'r') AND NOT a.attnotnull
  LOOP
    EXECUTE format('UPDATE %s SET %I = NULL WHERE %I = $1', fk.tbl, fk.col, fk.col) USING p_member;
  END LOOP;

  -- "X registered and is waiting for approval" notifications sent to the owners.
  DELETE FROM public.notifications
  WHERE type = 'registration' AND message LIKE m.full_name || ' registered%';

  -- Deleting the login removes the profile and, through cascades, everything linked to it.
  DELETE FROM auth.users WHERE id = p_member;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_member) THEN
    DELETE FROM public.profiles WHERE id = p_member;
  END IF;

  RETURN jsonb_build_object('deleted', p_member, 'name', m.full_name, 'payments_kept', kept);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.delete_member(UUID) TO authenticated;
