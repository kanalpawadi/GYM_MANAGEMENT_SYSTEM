import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9'),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  website_honeypot: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. Honeypot Anti-Spam Check
    if (body.website_honeypot && body.website_honeypot.trim() !== '') {
      return NextResponse.json({ error: { code: 'SPAM_DETECTED', message: 'Bot submission blocked.' } }, { status: 400 });
    }

    // 2. Input Validation with Zod
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } },
        { status: 400 }
      );
    }

    const { name, phone, email, notes } = parsed.data;

    // 3. Database Insertion via Supabase Admin
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          name,
          phone,
          email: email || null,
          notes: notes || 'Submitted via website contact form',
          status: 'new',
        }
      ])
      .select()
      .single();

    if (error) {
      // Don't pretend it worked: the enquiry would be lost.
      console.error('Lead insertion error:', error);
      return NextResponse.json(
        { error: { code: 'SAVE_FAILED', message: "We couldn't send your enquiry right now. Please try again in a minute or call the gym." } },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! The RV Fitness team will call you shortly.',
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
