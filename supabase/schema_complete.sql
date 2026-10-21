-- ==============================================================================
-- RV-FITNESS GYM: UNIFIED MASTER DATABASE SCHEMA & SEED SCRIPT
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM TYPES (Idempotent)
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('visitor', 'member', 'trainer', 'receptionist', 'manager', 'owner', 'super_admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM ('active', 'expired', 'frozen', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('online', 'upi', 'cash');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'trial', 'converted', 'lost');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('booked', 'attended', 'cancelled', 'waitlist');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE freeze_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE equipment_status AS ENUM ('operational', 'maintenance', 'replaced');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. TABLES

-- 3.1 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  assigned_trainer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  health_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Membership Plans
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  duration_months INT NOT NULL,
  original_price NUMERIC(10,2) NOT NULL,
  offer_price NUMERIC(10,2) NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.3 Memberships
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  remaining_freeze_days INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Payments & GST Invoices
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES public.memberships(id) ON DELETE SET NULL,
  razorpay_order_id TEXT UNIQUE,
  razorpay_payment_id TEXT UNIQUE,
  amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL,
  payment_mode payment_mode NOT NULL DEFAULT 'online',
  status payment_status NOT NULL DEFAULT 'pending',
  gst_invoice_no TEXT UNIQUE,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  valid_till TIMESTAMPTZ NOT NULL,
  max_uses INT DEFAULT 100,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 3.6 Attendance Log
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  method TEXT NOT NULL DEFAULT 'qr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 Leads CRM
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  follow_up_date DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 Trial Bookings
CREATE TABLE IF NOT EXISTS public.trial_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.9 Trainers
CREATE TABLE IF NOT EXISTS public.trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  specialization TEXT NOT NULL,
  experience_years INT NOT NULL DEFAULT 1,
  rating NUMERIC(2,1) DEFAULT 5.0,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 3.10 Group Classes
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INT NOT NULL DEFAULT 20,
  room TEXT DEFAULT 'Main Floor',
  is_active BOOLEAN DEFAULT true
);

-- 3.11 Class Bookings
CREATE TABLE IF NOT EXISTS public.class_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status booking_status NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, member_id, booking_date)
);

-- 3.12 PT Sessions
CREATE TABLE IF NOT EXISTS public.pt_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.13 Workout Plans
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trainer_name TEXT,
  title TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.14 Diet Plans
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trainer_name TEXT,
  title TEXT NOT NULL,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.15 Progress Logs
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2),
  body_fat_pct NUMERIC(4,1),
  chest_cm NUMERIC(5,1),
  waist_cm NUMERIC(5,1),
  hips_cm NUMERIC(5,1),
  bicep_cm NUMERIC(5,1),
  front_photo_url TEXT,
  side_photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.16 Freeze Requests
CREATE TABLE IF NOT EXISTS public.freeze_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status freeze_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.17 Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_name TEXT NOT NULL,
  referee_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reward_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.18 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.19 Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id)
);

-- 3.20 Equipment
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT DEFAULT 1,
  status equipment_status DEFAULT 'operational',
  last_maintenance_date DATE
);

-- 3.21 Blog Posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id UUID REFERENCES public.profiles(id),
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.22 Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL,
  avatar_url TEXT,
  achievement TEXT,
  is_featured BOOLEAN DEFAULT true
);

-- 3.23 Gallery Items
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0
);

-- 3.24 FAQs
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INT DEFAULT 0
);

-- 3.25 Banners & Offers
CREATE TABLE IF NOT EXISTS public.banners_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  subtitle TEXT,
  coupon_code TEXT,
  discount_text TEXT,
  banner_image TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- 3.26 Feedback Tickets
CREATE TABLE IF NOT EXISTS public.feedback_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.27 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  record_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3.28 Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.29 Website Content (CMS)
CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_memberships_lookup ON public.memberships(member_id, end_date, status);
CREATE INDEX IF NOT EXISTS idx_attendance_lookup ON public.attendance(member_id, check_in);
CREATE INDEX IF NOT EXISTS idx_leads_lookup ON public.leads(status, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_profiles_assigned_trainer ON public.profiles(assigned_trainer_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_member ON public.diet_plans(member_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_plans_member ON public.workout_plans(member_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_logs_member ON public.progress_logs(member_id, date DESC);

-- 5. SECURITY & HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() = 'super_admin', false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('manager', 'owner', 'super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('receptionist', 'manager', 'owner', 'super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.can_edit_content()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(public.current_role_name() IN ('super_admin'), false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_assigned_trainer(member UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = member AND assigned_trainer_id = auth.uid()
  ) AND public.current_role_name() = 'trainer';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_my_trainer()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, phone TEXT, avatar_url TEXT) AS $$
  SELECT t.id, t.full_name, t.email, t.phone, t.avatar_url
  FROM public.profiles me
  JOIN public.profiles t ON t.id = me.assigned_trainer_id
  WHERE me.id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.get_my_trainer() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_member_files(folder TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF folder IS NULL OR folder !~ '^[0-9a-fA-F-]{36}$' THEN
    RETURN false;
  END IF;
  RETURN folder = auth.uid()::text
      OR public.is_assigned_trainer(folder::uuid)
      OR public.is_admin();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 6. TRIGGERS

-- 6.1 Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Member'),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6.2 Prevent Role Self Escalation
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'You cannot change your own role';
    END IF;
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only an admin can change a user role';
    END IF;
    IF (NEW.role IN ('owner', 'super_admin') OR OLD.role IN ('owner', 'super_admin'))
       AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Only the super admin can grant or remove owner access';
    END IF;
  END IF;

  IF NEW.assigned_trainer_id IS DISTINCT FROM OLD.assigned_trainer_id AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Only gym staff can assign trainers';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS profiles_prevent_role_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 6.3 GST Invoice Trigger
CREATE OR REPLACE FUNCTION public.generate_gst_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.gst_invoice_no IS NULL THEN
    NEW.gst_invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gst_invoice ON public.payments;
CREATE TRIGGER trigger_gst_invoice
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_gst_invoice();

-- 6.4 Membership Expiration Job
CREATE OR REPLACE FUNCTION public.expire_memberships_job()
RETURNS VOID AS $$
BEGIN
  UPDATE public.memberships
  SET status = 'expired'
  WHERE end_date < CURRENT_DATE AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freeze_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES (Drop existing to make script re-runnable)

-- Public Reads
DROP POLICY IF EXISTS "Public read plans" ON public.membership_plans;
CREATE POLICY "Public read plans" ON public.membership_plans FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read trainers" ON public.trainers;
CREATE POLICY "Public read trainers" ON public.trainers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read classes" ON public.classes;
CREATE POLICY "Public read classes" ON public.classes FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read blog" ON public.blog_posts;
CREATE POLICY "Public read blog" ON public.blog_posts FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Public read testimonials" ON public.testimonials;
CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_featured = true);

DROP POLICY IF EXISTS "Public read gallery" ON public.gallery_items;
CREATE POLICY "Public read gallery" ON public.gallery_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read faqs" ON public.faqs;
CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read banners" ON public.banners_offers;
CREATE POLICY "Public read banners" ON public.banners_offers FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read site content" ON public.site_content;
CREATE POLICY "Public read site content" ON public.site_content FOR SELECT USING (true);

-- Profile Policies
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_staff());

DROP POLICY IF EXISTS "Trainers view assigned members" ON public.profiles;
CREATE POLICY "Trainers view assigned members" ON public.profiles FOR SELECT USING (assigned_trainer_id = auth.uid());

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Member Specific Policies
DROP POLICY IF EXISTS "Members view own memberships" ON public.memberships;
CREATE POLICY "Members view own memberships" ON public.memberships FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Members view own payments" ON public.payments;
CREATE POLICY "Members view own payments" ON public.payments FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Members view own attendance" ON public.attendance;
CREATE POLICY "Members view own attendance" ON public.attendance FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Members view own bookings" ON public.class_bookings;
CREATE POLICY "Members view own bookings" ON public.class_bookings FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Members manage own bookings" ON public.class_bookings;
CREATE POLICY "Members manage own bookings" ON public.class_bookings FOR ALL USING (member_id = auth.uid());

DROP POLICY IF EXISTS "Members view own workout" ON public.workout_plans;
CREATE POLICY "Members view own workout" ON public.workout_plans FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Members view own diet" ON public.diet_plans;
CREATE POLICY "Members view own diet" ON public.diet_plans FOR SELECT USING (member_id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Trainers manage assigned diet" ON public.diet_plans;
CREATE POLICY "Trainers manage assigned diet" ON public.diet_plans
  FOR ALL USING (public.is_assigned_trainer(member_id) OR public.is_admin())
  WITH CHECK (public.is_assigned_trainer(member_id) OR public.is_admin());

DROP POLICY IF EXISTS "Trainers manage assigned workout" ON public.workout_plans;
CREATE POLICY "Trainers manage assigned workout" ON public.workout_plans
  FOR ALL USING (public.is_assigned_trainer(member_id) OR public.is_admin())
  WITH CHECK (public.is_assigned_trainer(member_id) OR public.is_admin());

DROP POLICY IF EXISTS "Members view own progress" ON public.progress_logs;
DROP POLICY IF EXISTS "Members manage own progress" ON public.progress_logs;
CREATE POLICY "Members manage own progress" ON public.progress_logs
  FOR ALL USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "Trainers and admins view progress" ON public.progress_logs;
CREATE POLICY "Trainers and admins view progress" ON public.progress_logs
  FOR SELECT USING (public.is_assigned_trainer(member_id) OR public.is_admin());

-- Staff & Admin Master Policies
DROP POLICY IF EXISTS "Staff full access profiles" ON public.profiles;
CREATE POLICY "Staff full access profiles" ON public.profiles FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff full access leads" ON public.leads;
CREATE POLICY "Staff full access leads" ON public.leads FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff full access trial_bookings" ON public.trial_bookings;
CREATE POLICY "Staff full access trial_bookings" ON public.trial_bookings FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Staff full access attendance" ON public.attendance;
CREATE POLICY "Staff full access attendance" ON public.attendance FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Admin full access plans" ON public.membership_plans;
CREATE POLICY "Admin full access plans" ON public.membership_plans FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin full access expenses" ON public.expenses;
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin full access audit" ON public.audit_logs;
CREATE POLICY "Admin full access audit" ON public.audit_logs FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Admin full access settings" ON public.settings;
CREATE POLICY "Admin full access settings" ON public.settings FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Editors manage site content" ON public.site_content;
CREATE POLICY "Editors manage site content" ON public.site_content
  FOR ALL USING (public.can_edit_content()) WITH CHECK (public.can_edit_content());

-- 9. STORAGE BUCKETS & STORAGE POLICIES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('site-media', 'site-media', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('progress-photos', 'progress-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- site-media storage policies
DROP POLICY IF EXISTS "Public read site media" ON storage.objects;
CREATE POLICY "Public read site media" ON storage.objects FOR SELECT USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS "Editors upload site media" ON storage.objects;
CREATE POLICY "Editors upload site media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.can_edit_content());

DROP POLICY IF EXISTS "Editors change site media" ON storage.objects;
CREATE POLICY "Editors change site media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'site-media' AND public.can_edit_content());

DROP POLICY IF EXISTS "Editors delete site media" ON storage.objects;
CREATE POLICY "Editors delete site media" ON storage.objects
  FOR DELETE USING (bucket_id = 'site-media' AND public.can_edit_content());

-- avatars storage policies
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users change own avatar" ON storage.objects;
CREATE POLICY "Users change own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- progress-photos storage policies
DROP POLICY IF EXISTS "View permitted progress photos" ON storage.objects;
CREATE POLICY "View permitted progress photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'progress-photos' AND public.can_view_member_files((storage.foldername(name))[1]));

DROP POLICY IF EXISTS "Members upload own progress photos" ON storage.objects;
CREATE POLICY "Members upload own progress photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Members delete own progress photos" ON storage.objects;
CREATE POLICY "Members delete own progress photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 10. SEED INITIAL DATA (Plans, FAQs, Coupons, Testimonials, Settings)
INSERT INTO public.membership_plans (id, title, description, duration_months, original_price, offer_price, features, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Monthly', 'Flexible monthly membership with full gym access.', 1, 1500.00, 1500.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Six Month', 'Best value for committed members — save with a 6-month plan.', 6, 7500.00, 7500.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Yearly', 'Maximum savings with a full year of transformation.', 12, 12000.00, 12000.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan", "Body progress tracking", "Priority trainer support"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.coupons (code, discount_percent, discount_amount, valid_till, max_uses, is_active) VALUES
('RVFIT20', 20, 0, '2027-12-31 23:59:59+00', 500, true),
('FLAT500', 0, 500.00, '2027-12-31 23:59:59+00', 200, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.faqs (question, answer, category, display_order) VALUES
('What are the gym timings?', 'RV Fitness is open Monday through Saturday from 5:30 AM to 10:00 PM, and Sundays from 7:00 AM to 2:00 PM.', 'General', 1),
('Is a free trial available?', 'Yes! We offer a complimentary 1-day pass so you can experience our state-of-the-art equipment and class atmosphere before joining.', 'Membership', 2),
('Do you provide personal trainers?', 'Yes, we have certified personal trainers specializing in weight loss, muscle gain, posture correction, and contest preparation.', 'Training', 3),
('Is there parking space available?', 'Yes, we provide dedicated two-wheeler and four-wheeler parking spaces with 24/7 CCTV surveillance for all members.', 'Facilities', 4),
('Can I freeze my membership if I travel?', 'Freeze requests for Six Month and Yearly plans can be discussed with gym management for valid reasons like travel or medical recovery.', 'Policies', 5);

INSERT INTO public.testimonials (member_name, rating, feedback, avatar_url, achievement, is_featured) VALUES
('Rahul Sharma', 5, 'RV-Fitness completely changed my life. I lost 18 kg in 6 months under Coach Vikram’s guidance. The vibe is unmatched!', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'Lost 18 kg in 6 Months', true),
('Sneha Reddy', 5, 'The Zumba and Yoga classes are top-tier. Clean lockers, high-energy environment, and super helpful trainers!', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', 'Gained Core Strength', true),
('Amit Verma', 5, 'Best equipment setup in town! Hammer Strength machines and huge dumbbell rack up to 50 kg.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'Bench Press +30kg', true);

INSERT INTO public.gallery_items (title, category, image_url, display_order) VALUES
('Heavy Duty Dumbbell Section', 'Facility', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', 1),
('Cardio & Treadmill Zone', 'Facility', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80', 2),
('CrossFit Functional Area', 'Classes', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', 3),
('Yoga & Mindfulness Studio', 'Classes', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', 4);

INSERT INTO public.blog_posts (title, slug, summary, content, cover_image, is_published) VALUES
('5 Essential Rules for Gaining Lean Muscle', '5-essential-rules-gaining-lean-muscle', 'Master progressive overload, optimal protein intake, and sleep to maximize your physique goals.', 'Building lean muscle mass requires more than just lifting weights. In this comprehensive guide, we cover progressive overload, hitting 1.6g to 2.2g of protein per kg of bodyweight, hydration, compound lifts, and recovery cycles.', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', true),
('High-Protein Indian Meal Prep Guide', 'high-protein-indian-meal-prep-guide', 'Delicious paneer, chicken, chana, and soya recipes designed for busy professionals.', 'Struggling to hit your daily protein intake on an Indian diet? Learn how to prepare high-protein paneer bhurji, grilled tandoori chicken breast, high-protein sattu shakes, and sprouted moong salads ahead of time.', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.banners_offers (title, subtitle, coupon_code, discount_text, banner_image, start_date, end_date, is_active) VALUES
('Diwali Fitness Blitz!', 'Get Flat 20% OFF on Annual Memberships + Free Gym Bag', 'RVFIT20', '20% OFF', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '14 days', true);

INSERT INTO public.settings (key, value) VALUES
('gym_info', '{"name": "RV Fitness, Narsobawadi", "founder": "Rushikesh Arvind Vagare", "phone": "+91 96233 72426", "email": "rvfitness.narsobawadi@gmail.com", "address": "Narsobawadi, Maharashtra, India", "gstin": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
