import { NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan_id: z.string().min(1),
  coupon_code: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.errors[0].message } }, { status: 400 });
    }

    const { plan_id, coupon_code } = parsed.data;

    // Razorpay Order Creation simulation
    const orderId = `order_${Math.random().toString(36).substring(2, 12)}`;
    const amountInPaise = 471900; // ₹4,719.00 inclusive of 18% GST

    return NextResponse.json({
      success: true,
      order_id: orderId,
      currency: 'INR',
      amount: amountInPaise,
      key: process.env.RAZORPAY_KEY_ID || 'rzp_test_rvfitnessgym123',
    });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'CHECKOUT_FAILED', message: err.message } }, { status: 500 });
  }
}
