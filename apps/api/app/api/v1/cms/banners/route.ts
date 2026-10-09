import { NextResponse } from 'next/server';

const mockOffer = {
  id: 'b1',
  title: 'Diwali Fitness Blitz!',
  subtitle: 'Get Flat 20% OFF on Annual Memberships + Free Gym Bag',
  coupon_code: 'RVFIT20',
  discount_text: '20% OFF',
  banner_image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80',
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  is_active: true,
};

export async function GET() {
  return NextResponse.json({ success: true, data: mockOffer });
}
