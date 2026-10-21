import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Chainable Supabase query mock: from().insert().select().single() / from().select().eq().order()
const db = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown } }));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  for (const m of ['from', 'insert', 'select', 'eq', 'order']) chain[m] = vi.fn(() => chain);
  chain.single = vi.fn(async () => db.result);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(db.result);
  return { supabaseAdmin: chain };
});

import { POST as postLead } from './leads/route';
import { POST as postTrial } from './trial-bookings/route';
import { GET as getPlans } from './plans/route';
import { POST as postCheckout } from './memberships/checkout/route';
import { POST as postWebhook } from './payments/webhook/route';
import crypto from 'crypto';

const jsonRequest = (body: unknown) =>
  new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  db.result = { data: { id: 'row-1' }, error: null };
});

describe('POST /leads', () => {
  const valid = { name: 'Asha Patil', phone: '9623372426', email: '', notes: 'Yearly plan' };

  it('accepts a valid enquiry', async () => {
    const res = await postLead(jsonRequest(valid));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('RV Fitness');
  });

  it.each([
    ['short name', { ...valid, name: 'A' }, /at least 2/],
    ['invalid phone', { ...valid, phone: '1234567890' }, /valid 10-digit/],
    ['bad email', { ...valid, email: 'not-an-email' }, /email/i],
  ])('rejects %s', async (_label, body, message) => {
    const res = await postLead(jsonRequest(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toMatch(message);
  });

  it('blocks honeypot spam', async () => {
    const res = await postLead(jsonRequest({ ...valid, website_honeypot: 'http://spam' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('SPAM_DETECTED');
  });

  it('returns 500 for malformed JSON', async () => {
    const res = await postLead(new Request('http://localhost/api', { method: 'POST', body: '{oops' }));
    expect(res.status).toBe(500);
  });
});

describe('POST /leads when the database fails', () => {
  it('returns an error instead of a fake success', async () => {
    db.result = { data: null, error: { message: 'db down' } };
    const res = await postLead(jsonRequest({ name: 'Asha Patil', phone: '9623372426' }));
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe('SAVE_FAILED');
  });
});

describe('POST /trial-bookings', () => {
  const valid = { name: 'Rahul', phone: '9822012345', preferred_date: '2030-01-15', preferred_slot: 'Morning (6 AM - 10 AM)' };

  it('books a visit', async () => {
    const res = await postTrial(jsonRequest(valid));
    expect(res.status).toBe(200);
    expect((await res.json()).message).toMatch(/Visit booked for 2030-01-15/);
  });

  it('requires a date', async () => {
    const res = await postTrial(jsonRequest({ ...valid, preferred_date: '' }));
    expect(res.status).toBe(400);
  });

  it('tells the visitor when the booking could not be saved', async () => {
    db.result = { data: null, error: { message: 'db down' } };
    const res = await postTrial(jsonRequest(valid));
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/couldn't book your visit/);
  });
});

describe('GET /plans', () => {
  it('falls back to the RV Fitness price list when the table is empty', async () => {
    db.result = { data: [], error: null };
    const body = await (await getPlans()).json();
    expect(body.data.map((p: any) => [p.title, p.offer_price])).toEqual([
      ['Monthly', 1500],
      ['Six Month', 7500],
      ['Yearly', 12000],
    ]);
  });
});

describe('POST /memberships/checkout', () => {
  it('charges the selected plan price in paise', async () => {
    const res = await postCheckout(jsonRequest({ plan_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13' }));
    const body = await res.json();
    expect(body.amount).toBe(1200000);
    expect(body.currency).toBe('INR');
  });

  it('rejects unknown plans', async () => {
    const res = await postCheckout(jsonRequest({ plan_id: 'nope' }));
    expect(res.status).toBe(404);
  });
});

describe('POST /payments/webhook', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1', amount: 150000 } } } });
  const sign = (secret: string) => crypto.createHmac('sha256', secret).update(body).digest('hex');
  const webhookRequest = (signature?: string) =>
    new Request('http://localhost/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(signature ? { 'x-razorpay-signature': signature } : {}) },
      body,
    });

  beforeEach(() => vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'test-secret'));
  afterEach(() => vi.unstubAllEnvs());

  it('accepts an event with a valid Razorpay signature', async () => {
    const res = await postWebhook(webhookRequest(sign('test-secret')));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  });

  it('rejects an event with no signature', async () => {
    const res = await postWebhook(webhookRequest());
    expect(res.status).toBe(400);
  });

  it('rejects an event signed with the wrong secret', async () => {
    const res = await postWebhook(webhookRequest(sign('attacker-secret')));
    expect(res.status).toBe(400);
  });

  it('refuses all events when the secret is not configured', async () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', '');
    const res = await postWebhook(webhookRequest(sign('test-secret')));
    expect(res.status).toBe(500);
  });
});
