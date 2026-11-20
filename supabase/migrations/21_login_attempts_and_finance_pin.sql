-- 21: Login lock after 3 wrong passwords, and a security PIN for money information.
-- Login:
-- * 3 wrong passwords in a row for one email lock that email for 15 minutes.
-- * A correct sign-in clears the count. Only a signed-in user can clear their own count.
-- Security PIN (staff who use the admin area):
-- * Each staff member sets their own 4-6 digit PIN. Only a bcrypt hash is stored.
-- * Revenue, payments and other money figures stay hidden until the PIN is entered.
-- * 3 wrong PINs lock the PIN for 15 minutes.
-- * Owner and Super Admin can reset the PIN of staff below them; that person sets a new one.
-- Safe to re-run. Requires 01-20.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-------------------------------------------------------------------------------
-- 1. Login attempts
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  email TEXT PRIMARY KEY,
  failed_count INT NOT NULL DEFAULT 0,
  last_failed_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ
);
-- Only the functions below read or write this table.
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.login_attempts FROM anon, authenticated;

-- Before signing in: is this email locked?
CREATE OR REPLACE FUNCTION public.check_login_allowed(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  r public.login_attempts;
  v_email TEXT := LOWER(TRIM(p_email));
BEGIN
  SELECT * INTO r FROM public.login_attempts WHERE email = v_email;
  IF FOUND AND r.locked_until IS NOT NULL AND r.locked_until > NOW() THEN
    RETURN jsonb_build_object('allowed', false, 'attempts_left', 0,
      'locked_seconds', CEIL(EXTRACT(EPOCH FROM (r.locked_until - NOW())))::INT);
  END IF;
  RETURN jsonb_build_object('allowed', true, 'locked_seconds', 0,
    'attempts_left', 3 - CASE WHEN FOUND AND (r.locked_until IS NULL OR r.locked_until > NOW())
                                   AND r.last_failed_at > NOW() - INTERVAL '15 minutes'
                              THEN r.failed_count ELSE 0 END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- After a wrong password.
CREATE OR REPLACE FUNCTION public.record_login_failure(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  r public.login_attempts;
  v_email TEXT := LOWER(TRIM(p_email));
  v_count INT;
BEGIN
  IF v_email = '' OR LENGTH(v_email) > 320 THEN
    RETURN jsonb_build_object('attempts_left', 3, 'locked_seconds', 0);
  END IF;
  SELECT * INTO r FROM public.login_attempts WHERE email = v_email FOR UPDATE;
  IF FOUND AND r.locked_until > NOW() THEN
    RETURN jsonb_build_object('attempts_left', 0,
      'locked_seconds', CEIL(EXTRACT(EPOCH FROM (r.locked_until - NOW())))::INT);
  END IF;
  -- A lock that ran out, or an old failure, starts a fresh count.
  v_count := CASE WHEN FOUND AND r.locked_until IS NULL AND r.last_failed_at > NOW() - INTERVAL '15 minutes'
                  THEN r.failed_count ELSE 0 END + 1;
  INSERT INTO public.login_attempts (email, failed_count, last_failed_at, locked_until)
  VALUES (v_email, v_count, NOW(), CASE WHEN v_count >= 3 THEN NOW() + INTERVAL '15 minutes' END)
  ON CONFLICT (email) DO UPDATE
    SET failed_count = EXCLUDED.failed_count,
        last_failed_at = EXCLUDED.last_failed_at,
        locked_until = EXCLUDED.locked_until;
  RETURN jsonb_build_object('attempts_left', GREATEST(3 - v_count, 0),
    'locked_seconds', CASE WHEN v_count >= 3 THEN 900 ELSE 0 END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- After a correct sign-in: clear the signed-in user's own count.
CREATE OR REPLACE FUNCTION public.record_login_success()
RETURNS VOID AS $$
  DELETE FROM public.login_attempts
  WHERE email = (SELECT LOWER(email) FROM auth.users WHERE id = auth.uid());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.check_login_allowed(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_failure(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_login_success() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_login_allowed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_failure(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_login_success() TO authenticated;

-------------------------------------------------------------------------------
-- 2. Security PIN for money information
-------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finance_pins (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.finance_pins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_pins FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.finance_pin_status()
RETURNS JSONB AS $$
DECLARE
  r public.finance_pins;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff use the security PIN'; END IF;
  SELECT * INTO r FROM public.finance_pins WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'has_pin', FOUND,
    'locked_seconds', CASE WHEN FOUND AND r.locked_until > NOW()
                           THEN CEIL(EXTRACT(EPOCH FROM (r.locked_until - NOW())))::INT ELSE 0 END);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Checks a PIN and counts wrong ones. Returns {ok, attempts_left, locked_seconds}.
CREATE OR REPLACE FUNCTION public.verify_finance_pin(p_pin TEXT)
RETURNS JSONB AS $$
DECLARE
  r public.finance_pins;
  v_count INT;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff use the security PIN'; END IF;
  SELECT * INTO r FROM public.finance_pins WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Set your security PIN first'; END IF;
  IF r.locked_until > NOW() THEN
    RETURN jsonb_build_object('ok', false, 'attempts_left', 0,
      'locked_seconds', CEIL(EXTRACT(EPOCH FROM (r.locked_until - NOW())))::INT);
  END IF;
  IF r.pin_hash = extensions.crypt(COALESCE(p_pin, ''), r.pin_hash) THEN
    UPDATE public.finance_pins SET failed_count = 0, locked_until = NULL WHERE user_id = auth.uid();
    RETURN jsonb_build_object('ok', true, 'attempts_left', 3, 'locked_seconds', 0);
  END IF;
  v_count := CASE WHEN r.locked_until IS NULL THEN r.failed_count ELSE 0 END + 1;
  UPDATE public.finance_pins
    SET failed_count = CASE WHEN v_count >= 3 THEN 0 ELSE v_count END,
        locked_until = CASE WHEN v_count >= 3 THEN NOW() + INTERVAL '15 minutes' END
    WHERE user_id = auth.uid();
  RETURN jsonb_build_object('ok', false, 'attempts_left', GREATEST(3 - v_count, 0),
    'locked_seconds', CASE WHEN v_count >= 3 THEN 900 ELSE 0 END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Sets the first PIN, or changes it (the current PIN is then required).
CREATE OR REPLACE FUNCTION public.set_finance_pin(p_pin TEXT, p_current TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_check JSONB;
BEGIN
  IF public.my_rank() < 3 THEN RAISE EXCEPTION 'Only gym staff use the security PIN'; END IF;
  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4,6}$' THEN RAISE EXCEPTION 'The PIN must be 4 to 6 digits'; END IF;
  IF EXISTS (SELECT 1 FROM public.finance_pins WHERE user_id = auth.uid()) THEN
    v_check := public.verify_finance_pin(p_current);
    IF NOT (v_check->>'ok')::BOOLEAN THEN RETURN v_check; END IF;
    UPDATE public.finance_pins
      SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')), failed_count = 0, locked_until = NULL, updated_at = NOW()
      WHERE user_id = auth.uid();
  ELSE
    INSERT INTO public.finance_pins (user_id, pin_hash) VALUES (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')));
  END IF;
  RETURN jsonb_build_object('ok', true, 'attempts_left', 3, 'locked_seconds', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Owner / Super Admin: clear the PIN of someone below them so they can set a new one.
CREATE OR REPLACE FUNCTION public.reset_finance_pin(p_user UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.my_rank() < 5 THEN RAISE EXCEPTION 'Only the owner or Super Admin can reset a security PIN'; END IF;
  IF p_user = auth.uid() OR NOT public.can_manage(p_user) THEN
    RAISE EXCEPTION 'You can only reset the PIN of staff below you';
  END IF;
  DELETE FROM public.finance_pins WHERE user_id = p_user;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.finance_pin_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_finance_pin(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_finance_pin(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reset_finance_pin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finance_pin_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_finance_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_finance_pin(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_finance_pin(UUID) TO authenticated;
