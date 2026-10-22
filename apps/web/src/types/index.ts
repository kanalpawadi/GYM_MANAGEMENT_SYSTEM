export type UserRole = 'visitor' | 'member' | 'trainer' | 'receptionist' | 'manager' | 'owner' | 'super_admin';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relation: string;
  };
  health_notes?: string | null;
  assigned_trainer_id?: string | null;
  dob?: string | null;
  blood_group?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  medicines?: string | null;
  membership_tier?: 'normal' | 'premium';
  member_code?: string | null;
  /** New members register and wait for the owner's approval (migration 09). */
  approval_status?: ApprovalStatus;
  approval_note?: string | null;
  registration_submitted_at?: string | null;
  created_at: string;
}

export type ApprovalStatus = 'incomplete' | 'pending' | 'approved' | 'rejected';

export interface MembershipPlan {
  id: string;
  title: string;
  description: string;
  duration_months: number;
  original_price: number;
  offer_price: number;
  features: string[];
  is_active: boolean;
}

export interface Membership {
  id: string;
  member_id: string;
  plan_id: string;
  plan?: MembershipPlan;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'frozen' | 'cancelled';
  remaining_freeze_days: number;
}

export interface Trainer {
  id: string;
  profile_id: string;
  name: string;
  bio: string;
  specialization: string;
  experience_years: number;
  rating: number;
  photo_url: string;
  is_active: boolean;
}

export interface ClassSession {
  id: string;
  title: string;
  trainer_id?: string;
  trainer_name?: string;
  category: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings?: number;
  room: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: 'new' | 'contacted' | 'trial' | 'converted' | 'lost';
  notes?: string;
  follow_up_date?: string;
  assigned_to?: string;
  created_at: string;
}

export interface TrialBooking {
  name: string;
  phone: string;
  preferred_date: string;
  preferred_slot: string;
  website_honeypot?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string;
  published_at: string;
}

export interface Testimonial {
  id: string;
  member_name: string;
  rating: number;
  feedback: string;
  avatar_url: string;
  achievement: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image_url: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface BannerOffer {
  id: string;
  title: string;
  subtitle?: string;
  coupon_code?: string;
  discount_text?: string;
  banner_image?: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
