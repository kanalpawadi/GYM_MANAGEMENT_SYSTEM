-- 19: Reverse QR attendance. A trainer / front desk shows a gym check-in QR on their
-- screen; members scan it with their phone to mark their own attendance.
-- * The QR changes every 30 seconds (HMAC with the private qr_secret from migration 07),
--   so a photo of it stops working within about a minute.
-- * It carries the staff member who shows it; they are recorded as the verifier.
-- * If selfie check-in (geofence) is turned on, the member must also be inside the gym.
-- * Member passes scanned by staff, name search and selfie check-in keep working.
-- Safe to re-run. Requires 01-18.

CREATE OR REPLACE FUNCTION public.gym_qr_signature(p_staff UUID, p_window BIGINT)
RETURNS TEXT AS $$
  SELECT LEFT(encode(extensions.hmac('gym-checkin:' || p_staff::text || ':' || p_window::text,
                                     (SELECT value FROM public.app_secrets WHERE name = 'qr_secret'), 'sha256'), 'hex'), 20);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
REVOKE ALL ON FUNCTION public.gym_qr_signature(UUID, BIGINT) FROM PUBLIC, anon, authenticated;

-- Staff screen: the current gym QR value and how long it is valid.
CREATE OR REPLACE FUNCTION public.my_gym_qr_token()
RETURNS JSONB AS $$
DECLARE
  w BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
BEGIN
  IF public.my_rank() < 2 THEN RAISE EXCEPTION 'Only trainers and gym staff can show the check-in QR'; END IF;
  RETURN jsonb_build_object(
    'token', 'RVFG1.' || auth.uid()::text || '.' || w::text || '.' || public.gym_qr_signature(auth.uid(), w),
    'seconds_left', 30 - (FLOOR(EXTRACT(EPOCH FROM NOW()))::bigint % 30));
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.my_gym_qr_token() TO authenticated;

-- Member scans the gym QR.
CREATE OR REPLACE FUNCTION public.check_in_with_gym_qr(p_token TEXT, p_lat DOUBLE PRECISION DEFAULT NULL, p_lng DOUBLE PRECISION DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  parts TEXT[] := string_to_array(TRIM(p_token), '.');
  staff_id UUID;
  w BIGINT;
  now_w BIGINT := FLOOR(EXTRACT(EPOCH FROM NOW()) / 30);
  me public.profiles;
  g JSONB;
  dist DOUBLE PRECISION;
  already BOOLEAN;
  att_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  SELECT * INTO me FROM public.profiles WHERE id = auth.uid();
  IF NOT FOUND OR me.role::text <> 'member' THEN RAISE EXCEPTION 'Only members check in with the gym QR'; END IF;

  IF array_length(parts, 1) <> 4 OR parts[1] <> 'RVFG1' THEN RAISE EXCEPTION 'This is not the RV Fitness check-in QR'; END IF;
  BEGIN staff_id := parts[2]::uuid; w := parts[3]::bigint; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'This is not the RV Fitness check-in QR'; END;
  IF w < now_w - 2 OR w > now_w + 1 OR public.gym_qr_signature(staff_id, w) <> parts[4] THEN
    RAISE EXCEPTION 'This QR has expired. Please scan the QR on the trainer''s screen again.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = staff_id AND public.role_rank(role::text) >= 2) THEN
    RAISE EXCEPTION 'This is not the RV Fitness check-in QR';
  END IF;

  -- With geofencing on, the member must also be at the gym.
  SELECT value INTO g FROM public.settings WHERE key = 'geofence';
  IF g IS NOT NULL AND COALESCE((g->>'enabled')::boolean, false) AND (g->>'lat') IS NOT NULL THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RAISE EXCEPTION 'Please allow location access so we can confirm you are at the gym.';
    END IF;
    dist := 2 * 6371000 * asin(sqrt(
              power(sin(radians((p_lat - (g->>'lat')::float) / 2)), 2) +
              cos(radians((g->>'lat')::float)) * cos(radians(p_lat)) *
              power(sin(radians((p_lng - (g->>'lng')::float) / 2)), 2)));
    IF dist > COALESCE((g->>'radius_m')::float, 100) THEN
      RAISE EXCEPTION 'You are % m from the gym. Please scan the QR inside the gym.', ROUND(dist);
    END IF;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.attendance WHERE member_id = me.id
                 AND (check_in AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date) INTO already;
  IF NOT already THEN
    INSERT INTO public.attendance (member_id, method, verified_by, latitude, longitude, distance_m)
      VALUES (me.id, 'gym_qr', staff_id, p_lat, p_lng, ROUND(dist))
      RETURNING id INTO att_id;
  END IF;

  RETURN jsonb_build_object('already_checked_in', already, 'attendance_id', att_id, 'status', public.member_status(me.id),
                            'staff_name', (SELECT full_name FROM public.profiles WHERE id = staff_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.check_in_with_gym_qr(TEXT, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
