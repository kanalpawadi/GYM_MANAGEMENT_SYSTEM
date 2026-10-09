import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const trialSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number'),
  preferred_date: z.string().min(1, 'Preferred date is required'),
  preferred_slot: z.string().min(1, 'Preferred time slot is required'),
  website_honeypot: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.website_honeypot && body.website_honeypot.trim() !== '') {
      return NextResponse.json({ error: { code: 'SPAM_DETECTED', message: 'Bot submission blocked.' } }, { status: 400 });
    }

    const parsed = trialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 400 }
      );
    }

    const { name, phone, preferred_date, preferred_slot } = parsed.data;

    const { data, error } = await supabaseAdmin
      .from('trial_bookings')
      .insert([
        {
          name,
          phone,
          preferred_date,
          preferred_slot,
          status: 'pending',
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({
        success: true,
        message: 'Free trial pass booked! Show your confirmation SMS at the reception.',
        data: { name, phone, preferred_date, preferred_slot },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Free Trial Pass Confirmed for ${preferred_date} (${preferred_slot})!`,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
