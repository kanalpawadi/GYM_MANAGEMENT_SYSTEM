-- Migration 06: Fix Signup Trigger & Duplicate Phone/Email handling
-- Prevents "Database error saving new user" when phone number or email conflict occurs.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_phone TEXT;
BEGIN
  v_phone := NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '');

  -- Check if this phone number is already registered to another profile.
  -- If it already exists, avoid crashing the signup process; set phone to NULL
  -- so the user can still create their account and update their phone in profile settings.
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE phone = v_phone AND id <> NEW.id
  ) THEN
    v_phone := NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), 'Member'),
    NEW.email,
    v_phone,
    'member'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = COALESCE(v_phone, public.profiles.phone),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch all unexpected errors (e.g. constraints, casting) so user creation in auth.users never fails
  RAISE WARNING 'handle_new_user trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the trigger to make sure it is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
