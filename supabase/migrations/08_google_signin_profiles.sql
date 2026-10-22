-- 08: Google sign-in profiles.
-- * New users (email or Google) get a profile with their name and Google photo.
-- * ensure_my_profile(): if a signed-in user has no profile row (for example the
--   sign-up trigger skipped it), the app calls this to create one as a member.
-- Safe to re-run. Requires 01-07.

-- Best display name from sign-up / Google metadata.
CREATE OR REPLACE FUNCTION public.profile_name_from_meta(meta JSONB, email TEXT)
RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(TRIM(meta->>'full_name'), ''),
    NULLIF(TRIM(meta->>'name'), ''),
    NULLIF(SPLIT_PART(COALESCE(email, ''), '@', 1), ''),
    'Member'
  );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');
BEGIN
  -- A phone number already used by someone else is dropped so sign-up never fails.
  IF v_phone IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE phone = v_phone AND id <> NEW.id) THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, avatar_url, role)
  VALUES (
    NEW.id,
    public.profile_name_from_meta(NEW.raw_user_meta_data, NEW.email),
    NEW.email,
    v_phone,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'), ''),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the login itself; ensure_my_profile() fills the gap afterwards.
  RAISE WARNING 'handle_new_user could not create a profile for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Creates the signed-in user's profile if it is missing. Always a member;
-- returns the profile id. Does nothing if the profile already exists.
CREATE OR REPLACE FUNCTION public.ensure_my_profile()
RETURNS UUID AS $$
DECLARE
  u RECORD;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in first'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN RETURN auth.uid(); END IF;

  SELECT id, email, raw_user_meta_data INTO u FROM auth.users WHERE id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;

  v_email := u.email;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email = v_email AND id <> u.id) THEN
    RAISE EXCEPTION 'Another RV Fitness account already uses %. Please sign in with your email and password, or ask the gym to merge the accounts.', v_email;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    u.id,
    public.profile_name_from_meta(u.raw_user_meta_data, u.email),
    u.email,
    NULLIF(COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'), ''),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.ensure_my_profile() TO authenticated;
