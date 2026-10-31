-- 18: Membership expiry -> back to admission approval, renewal reminders, and staff
-- adding body-progress photos.
-- * When a member's plan has run out (the day after its last day) and no plan covers
--   today or later, their ID goes back for approval: approval_status becomes
--   'incomplete' and they see the admission form again, like a first registration.
-- * Reminders like a mobile recharge: with 5 days or fewer left, the member gets one
--   notification a day ("Your plan ends in 3 days").
-- * Checks run when the member opens the portal and when staff open the admin panel
--   (and daily at 00:05 India time if pg_cron is enabled).
-- * Trainer, owner and Super Admin can upload / delete progress photos for a member.
-- Safe to re-run. Requires 01-17.

-------------------------------------------------------------------------------
-- 1. Expiry check for one member
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

-- The signed-in member checks themselves (portal opens).
CREATE OR REPLACE FUNCTION public.check_my_membership()
RETURNS JSONB AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  RETURN public.membership_expiry_check(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.check_my_membership() TO authenticated;

-- Staff check everyone (admin panel opens) — and the daily job.
CREATE OR REPLACE FUNCTION public.run_membership_expiry()
RETURNS INT AS $$
DECLARE
  r RECORD;
  n INT := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff can run this'; END IF;
  FOR r IN SELECT id FROM public.profiles WHERE role::text = 'member' AND approval_status = 'approved' LOOP
    IF (public.membership_expiry_check(r.id)->>'expired')::boolean THEN n := n + 1; END IF;
  END LOOP;
  RETURN n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.run_membership_expiry() TO authenticated;

-- Daily at 00:05 India time (18:35 UTC) when pg_cron is available; otherwise the
-- portal and admin checks above do the job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('rv-membership-expiry') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'rv-membership-expiry');
    PERFORM cron.schedule('rv-membership-expiry', '35 18 * * *', 'SELECT public.run_membership_expiry()');
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Daily expiry job not scheduled: %', SQLERRM;
END $$;

-------------------------------------------------------------------------------
-- 2. Staff can add / remove a member's progress photos
-------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff upload member progress photos" ON storage.objects;
CREATE POLICY "Staff upload member progress photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'progress-photos' AND public.my_rank() >= 2 AND public.can_view_member_files((storage.foldername(name))[1]));
DROP POLICY IF EXISTS "Staff delete member progress photos" ON storage.objects;
CREATE POLICY "Staff delete member progress photos" ON storage.objects FOR DELETE
  USING (bucket_id = 'progress-photos' AND public.my_rank() >= 2 AND public.can_view_member_files((storage.foldername(name))[1]));
