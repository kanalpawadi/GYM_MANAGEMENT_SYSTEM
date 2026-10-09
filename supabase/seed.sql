-- Seed Data for RV-Fitness Gym

-- 1. Membership Plans
INSERT INTO public.membership_plans (id, title, description, duration_months, original_price, offer_price, features, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Monthly Starter', 'Ideal for short-term goals and flexible training.', 1, 1999.00, 1499.00, '["Full Gym Floor Access", "Locker Room & Shower Access", "1 Free Trainer Consultation", "General Fitness Assessment"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Quarterly Fit', 'Our most popular plan for building sustainable habits.', 3, 4999.00, 3999.00, '["All Starter Features", "Access to Group Yoga & Zumba", "2 Free Personal Training Sessions", "Steam Bath Access (2x/month)", "Diet Blueprint"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Half-Yearly Pro', 'For dedicated fitness enthusiasts seeking real transformations.', 6, 8999.00, 6999.00, '["All Quarterly Features", "Unlimited Group Classes", "Free Gym Merchandise T-Shirt", "1 Freeze Membership (Up to 15 Days)", "Body Composition Tracking"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Annual Elite', 'Maximum savings and VIP privileges for 12 months.', 12, 15999.00, 11999.00, '["All Pro Features", "Dedicated Personal Locker", "5 Free PT Sessions", "2 Free Guest Passes / Month", "Priority Class Reservations", "Unlimited Freeze (Up to 30 Days)"]'::jsonb, true);

-- 2. Coupons
INSERT INTO public.coupons (code, discount_percent, discount_amount, valid_till, max_uses, is_active) VALUES
('RVFIT20', 20, 0, '2027-12-31 23:59:59+00', 500, true),
('FLAT500', 0, 500.00, '2027-12-31 23:59:59+00', 200, true);

-- 3. FAQs
INSERT INTO public.faqs (question, answer, category, display_order) VALUES
('What are the gym timings?', 'RV-Fitness Gym is open Monday through Saturday from 5:30 AM to 10:00 PM, and Sundays from 7:00 AM to 2:00 PM.', 'General', 1),
('Is a free trial available?', 'Yes! We offer a complimentary 1-day pass so you can experience our state-of-the-art equipment and class atmosphere before joining.', 'Membership', 2),
('Do you provide personal trainers?', 'Yes, we have certified personal trainers specializing in weight loss, muscle gain, posture correction, and contest preparation.', 'Training', 3),
('Is there parking space available?', 'Yes, we provide dedicated two-wheeler and four-wheeler parking spaces with 24/7 CCTV surveillance for all members.', 'Facilities', 4),
('Can I freeze my membership if I travel?', 'Yes, Half-Yearly and Annual plans allow membership freezing for valid reasons like travel or medical recovery.', 'Policies', 5);

-- 4. Testimonials
INSERT INTO public.testimonials (member_name, rating, feedback, avatar_url, achievement, is_featured) VALUES
('Rahul Sharma', 5, 'RV-Fitness completely changed my life. I lost 18 kg in 6 months under Coach Vikram’s guidance. The vibe is unmatched!', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 'Lost 18 kg in 6 Months', true),
('Sneha Reddy', 5, 'The Zumba and Yoga classes are top-tier. Clean lockers, high-energy environment, and super helpful trainers!', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80', 'Gained Core Strength', true),
('Amit Verma', 5, 'Best equipment setup in town! Hammer Strength machines and huge dumbbell rack up to 50 kg.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', 'Bench Press +30kg', true);

-- 5. Gallery Items
INSERT INTO public.gallery_items (title, category, image_url, display_order) VALUES
('Heavy Duty Dumbbell Section', 'Facility', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80', 1),
('Cardio & Treadmill Zone', 'Facility', 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=800&q=80', 2),
('CrossFit Functional Area', 'Classes', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80', 3),
('Yoga & Mindfulness Studio', 'Classes', 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80', 4);

-- 6. Blog Posts
INSERT INTO public.blog_posts (title, slug, summary, content, cover_image, is_published) VALUES
('5 Essential Rules for Gaining Lean Muscle', '5-essential-rules-gaining-lean-muscle', 'Master progressive overload, optimal protein intake, and sleep to maximize your physique goals.', 'Building lean muscle mass requires more than just lifting weights. In this comprehensive guide, we cover progressive overload, hitting 1.6g to 2.2g of protein per kg of bodyweight, hydration, compound lifts, and recovery cycles.', 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80', true),
('High-Protein Indian Meal Prep Guide', 'high-protein-indian-meal-prep-guide', 'Delicious paneer, chicken, chana, and soya recipes designed for busy professionals.', 'Struggling to hit your daily protein intake on an Indian diet? Learn how to prepare high-protein paneer bhurji, grilled tandoori chicken breast, high-protein sattu shakes, and sprouted moong salads ahead of time.', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80', true);

-- 7. Active Banners / Offers
INSERT INTO public.banners_offers (title, subtitle, coupon_code, discount_text, banner_image, start_date, end_date, is_active) VALUES
('Diwali Fitness Blitz!', 'Get Flat 20% OFF on Annual Memberships + Free Gym Bag', 'RVFIT20', '20% OFF', 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '14 days', true);

-- 8. Gym Settings
INSERT INTO public.settings (key, value) VALUES
('gym_info', '{"name": "RV-Fitness Gym", "phone": "+91 98765 43210", "email": "info@rvfitnessgym.in", "address": "Plot 42, Sector 18, Commercial Belt, Metro City, India - 400705", "gstin": "27AAAAA0000A1Z5"}'::jsonb);
