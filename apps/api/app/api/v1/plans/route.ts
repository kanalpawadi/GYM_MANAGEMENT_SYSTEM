import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const mockPlans = [
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    title: 'Monthly Starter',
    description: 'Ideal for short-term goals and flexible training.',
    duration_months: 1,
    original_price: 1999,
    offer_price: 1499,
    features: ['Full Gym Floor Access', 'Locker Room & Shower Access', '1 Free Trainer Consultation', 'General Fitness Assessment'],
    is_active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    title: 'Quarterly Fit',
    description: 'Our most popular plan for building sustainable habits.',
    duration_months: 3,
    original_price: 4999,
    offer_price: 3999,
    features: ['All Starter Features', 'Access to Group Yoga & Zumba', '2 Free Personal Training Sessions', 'Steam Bath Access (2x/month)', 'Diet Blueprint'],
    is_active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
    title: 'Half-Yearly Pro',
    description: 'For dedicated fitness enthusiasts seeking real transformations.',
    duration_months: 6,
    original_price: 8999,
    offer_price: 6999,
    features: ['All Quarterly Features', 'Unlimited Group Classes', 'Free Gym Merchandise T-Shirt', '1 Freeze Membership (Up to 15 Days)', 'Body Composition Tracking'],
    is_active: true,
  },
  {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
    title: 'Annual Elite',
    description: 'Maximum savings and VIP privileges for 12 months.',
    duration_months: 12,
    original_price: 15999,
    offer_price: 11999,
    features: ['All Pro Features', 'Dedicated Personal Locker', '5 Free PT Sessions', '2 Free Guest Passes / Month', 'Priority Class Reservations', 'Unlimited Freeze (Up to 30 Days)'],
    is_active: true,
  },
];

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('membership_plans')
      .select('*')
      .eq('is_active', true)
      .order('offer_price', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ success: true, data: mockPlans });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: true, data: mockPlans });
  }
}
