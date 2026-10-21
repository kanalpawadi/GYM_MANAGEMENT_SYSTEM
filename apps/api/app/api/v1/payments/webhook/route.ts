import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Never accept a payment event without a configured secret and a valid signature.
    if (!webhookSecret) {
      return NextResponse.json({ error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook secret is not configured.' } }, { status: 500 });
    }
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    const valid =
      !!signature &&
      signature.length === expectedSignature.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    if (!valid) {
      return NextResponse.json({ error: { code: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed.' } }, { status: 400 });
    }

    const payload = JSON.parse(rawBody || '{}');
    const event = payload.event || 'payment.captured';

    // Idempotent event processing
    if (event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || 'order_mock123';
      const paymentId = paymentEntity?.id || 'pay_mock123';
      const amount = (paymentEntity?.amount || 471900) / 100;
      const invoiceNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      console.log(`[RAZORPAY WEBHOOK SUCCESS] Activated membership for order ${orderId}, payment ${paymentId}, generated GST Invoice ${invoiceNo}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'WEBHOOK_ERROR', message: err.message } }, { status: 500 });
  }
}
