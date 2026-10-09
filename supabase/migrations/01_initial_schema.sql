-- RV-Fitness Gym Database Schema Migration
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Custom Enum Types
CREATE TYPE user_role AS ENUM ('visitor', 'member', 'trainer', 'receptionist', 'manager', 'owner');
CREATE TYPE membership_status AS ENUM ('active', 'expired', 'frozen', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE payment_mode AS ENUM ('online', 'upi', 'cash');
CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'trial', 'converted', 'lost');
CREATE TYPE booking_status AS ENUM ('booked', 'attended', 'cancelled', 'waitlist');
CREATE TYPE freeze_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE equipment_status AS ENUM ('operational', 'maintenance', 'replaced');

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  emergency_contact JSONB DEFAULT '{}'::jsonb,
  health_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Membership Plans
CREATE TABLE public.membership_plans (
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

-- 3. Memberships
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  remaining_freeze_days INT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Payments & GST Invoices
CREATE TABLE public.payments (
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

-- 5. Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INT DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  valid_till TIMESTAMPTZ NOT NULL,
  max_uses INT DEFAULT 100,
  current_uses INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 6. Attendance Log
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  method TEXT NOT NULL DEFAULT 'qr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Leads CRM
CREATE TABLE public.leads (
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

-- 8. Trial Bookings
CREATE TABLE public.trial_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_slot TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Trainers
CREATE TABLE public.trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio TEXT,
  specialization TEXT NOT NULL,
  experience_years INT NOT NULL DEFAULT 1,
  rating NUMERIC(2,1) DEFAULT 5.0,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true
);

-- 10. Group Classes
CREATE TABLE public.classes (
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

-- 11. Class Bookings
CREATE TABLE public.class_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status booking_status NOT NULL DEFAULT 'booked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, member_id, booking_date)
);

-- 12. PT Sessions
CREATE TABLE public.pt_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Workout Plans
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id),
  title TEXT NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Diet Plans
CREATE TABLE public.diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainer_id UUID REFERENCES public.trainers(id),
  title TEXT NOT NULL,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Progress Logs
CREATE TABLE public.progress_logs (
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Freeze Requests
CREATE TABLE public.freeze_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status freeze_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_name TEXT NOT NULL,
  referee_phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reward_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id)
);

-- 20. Equipment
CREATE TABLE public.equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT DEFAULT 1,
  status equipment_status DEFAULT 'operational',
  last_maintenance_date DATE
);

-- 21. Blog Posts
CREATE TABLE public.blog_posts (
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

-- 22. Testimonials
CREATE TABLE public.testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT NOT NULL,
  avatar_url TEXT,
  achievement TEXT,
  is_featured BOOLEAN DEFAULT true
);

-- 23. Gallery Items
CREATE TABLE public.gallery_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0
);

-- 24. FAQs
CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INT DEFAULT 0
);

-- 25. Banners & Offers
CREATE TABLE public.banners_offers (
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

-- 26. Feedback Tickets
CREATE TABLE public.feedback_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 27. Audit Logs
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  record_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 28. Settings
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_memberships_lookup ON public.memberships(member_id, end_date, status);
CREATE INDEX idx_attendance_lookup ON public.attendance(member_id, check_in);
CREATE INDEX idx_leads_lookup ON public.leads(status, follow_up_date);
CREATE INDEX idx_payments_razorpay ON public.payments(razorpay_order_id);

-- Helper Security Definer Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('manager', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('receptionist', 'manager', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Automatically handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Member'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'member')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: GST Invoice Generator
CREATE OR REPLACE FUNCTION public.generate_gst_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.gst_invoice_no IS NULL THEN
    NEW.gst_invoice_no := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_gst_invoice
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.generate_gst_invoice();

-- Cron Function: Expire memberships daily
CREATE OR REPLACE FUNCTION public.expire_memberships_job()
RETURNS VOID AS $$
BEGIN
  UPDATE public.memberships
  SET status = 'expired'
  WHERE end_date < CURRENT_DATE AND status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Row Level Security (RLS) Policies
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

-- Public Read Policies for CMS
CREATE POLICY "Public read plans" ON public.membership_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Public read trainers" ON public.trainers FOR SELECT USING (is_active = true);
CREATE POLICY "Public read classes" ON public.classes FOR SELECT USING (is_active = true);
CREATE POLICY "Public read blog" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Public read testimonials" ON public.testimonials FOR SELECT USING (is_featured = true);
CREATE POLICY "Public read gallery" ON public.gallery_items FOR SELECT USING (true);
CREATE POLICY "Public read faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Public read banners" ON public.banners_offers FOR SELECT USING (is_active = true);

-- Member Specific Policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR is_staff());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Members view own memberships" ON public.memberships FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members view own payments" ON public.payments FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members view own attendance" ON public.attendance FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members view own bookings" ON public.class_bookings FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members manage own bookings" ON public.class_bookings FOR ALL USING (member_id = auth.uid());
CREATE POLICY "Members view own workout" ON public.workout_plans FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members view own diet" ON public.diet_plans FOR SELECT USING (member_id = auth.uid() OR is_staff());
CREATE POLICY "Members view own progress" ON public.progress_logs FOR ALL USING (member_id = auth.uid() OR is_staff());

-- Staff / Admin Master Policies
CREATE POLICY "Staff full access profiles" ON public.profiles FOR ALL USING (is_staff());
CREATE POLICY "Staff full access leads" ON public.leads FOR ALL USING (is_staff());
CREATE POLICY "Staff full access trial_bookings" ON public.trial_bookings FOR ALL USING (is_staff());
CREATE POLICY "Staff full access attendance" ON public.attendance FOR ALL USING (is_staff());
CREATE POLICY "Admin full access plans" ON public.membership_plans FOR ALL USING (is_admin());
CREATE POLICY "Admin full access expenses" ON public.expenses FOR ALL USING (is_admin());
CREATE POLICY "Admin full access audit" ON public.audit_logs FOR ALL USING (is_admin());
CREATE POLICY "Admin full access settings" ON public.settings FOR ALL USING (is_admin());
