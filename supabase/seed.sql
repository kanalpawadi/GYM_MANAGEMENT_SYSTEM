-- Seed Data for RV Fitness, Narsobawadi

-- 1. Membership Plans
INSERT INTO public.membership_plans (id, title, description, duration_months, original_price, offer_price, features, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Monthly', 'Flexible monthly membership with full gym access.', 1, 1500.00, 1500.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Six Month', 'Best value for committed members — save with a 6-month plan.', 6, 7500.00, 7500.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan"]'::jsonb, true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Yearly', 'Maximum savings with a full year of transformation.', 12, 12000.00, 12000.00, '["Full gym access", "Cardio & strength equipment", "Locker facility", "RO water", "Diet guidance", "Personalised workout plan", "Body progress tracking", "Priority trainer support"]'::jsonb, true);

-- 2. Coupons
INSERT INTO public.coupons (code, discount_percent, discount_amount, valid_till, max_uses, is_active) VALUES
('RVFIT20', 20, 0, '2027-12-31 23:59:59+00', 500, true),
('FLAT500', 0, 500.00, '2027-12-31 23:59:59+00', 200, true);

-- 3. FAQs
INSERT INTO public.faqs (question, answer, category, display_order) VALUES
('What are the gym timings?', 'RV Fitness is open Monday through Saturday from 5:30 AM to 10:00 PM, and Sundays from 7:00 AM to 2:00 PM.', 'General', 1),
('Is a free trial available?', 'Yes! We offer a complimentary 1-day pass so you can experience our state-of-the-art equipment and class atmosphere before joining.', 'Membership', 2),
('Do you provide personal trainers?', 'Yes, we have certified personal trainers specializing in weight loss, muscle gain, posture correction, and contest preparation.', 'Training', 3),
('Is there parking space available?', 'Yes, we provide dedicated two-wheeler and four-wheeler parking spaces with 24/7 CCTV surveillance for all members.', 'Facilities', 4),
('Can I freeze my membership if I travel?', 'Freeze requests for Six Month and Yearly plans can be discussed with gym management for valid reasons like travel or medical recovery.', 'Policies', 5);

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
('gym_info', '{"name": "RV Fitness, Narsobawadi", "founder": "Rushikesh Arvind Vagare", "phone": "+91 96233 72426", "email": "rvfitness.narsobawadi@gmail.com", "address": "Narsobawadi, Maharashtra, India", "gstin": ""}'::jsonb);
