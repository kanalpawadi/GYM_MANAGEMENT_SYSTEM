import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
import { PLANS } from '@/lib/plans';

const mockPlans = PLANS;

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
