import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ profile: { role: 'member', approval_status: 'approved' } as Record<string, unknown> }));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  for (const m of ['from', 'select', 'eq']) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: auth.profile, error: null }));
  chain.auth = { getUser: vi.fn(async () => ({ data: { user: { id: 'member-1' } }, error: null })) };
  return { supabaseAdmin: chain };
});

import { POST } from './route';
import { OFF_TOPIC_REPLIES, SYSTEM_PROMPT, requestSchema, resetRateLimit, systemPrompt } from '@/lib/healthAssistant';

const ask = (body: unknown) =>
  POST(new Request('http://localhost/api/v1/health-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer t' }, body: JSON.stringify(body) }));

beforeEach(() => {
  process.env.XAI_API_KEY = 'xai-test-key';
  resetRateLimit();
});
afterEach(() => vi.restoreAllMocks());

describe('Coach RV: a trainer in English, Hindi and Marathi', () => {
  it('acts only as a gym trainer and stays on fitness', () => {
    expect(SYSTEM_PROMPT).toMatch(/You are "Coach RV", the AI personal trainer of RV Fitness/);
    expect(SYSTEM_PROMPT).toMatch(/You are ONLY a fitness trainer/);
    expect(SYSTEM_PROMPT).toContain(OFF_TOPIC_REPLIES.en);
  });

  it.each([
    ['hi', 'Hindi', OFF_TOPIC_REPLIES.hi],
    ['mr', 'Marathi', OFF_TOPIC_REPLIES.mr],
  ] as const)('%s: replies in %s (Devanagari) with the off-topic line in that language', (lang, name, offTopic) => {
    const prompt = systemPrompt(lang);
    expect(prompt).toContain(`Always reply in ${name} using Devanagari script`);
    expect(prompt).toContain(offTopic);
    expect(offTopic).toMatch(/[ऀ-ॿ]/);
  });

  it('the chosen language reaches Grok', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'रोज ८ ग्लास पाणी प्या.' } }] }), { status: 200 }));
    const res = await ask({ messages: [{ role: 'user', content: 'पाणी किती प्यावे?' }], language: 'mr' });
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.messages[0].content).toContain('Always reply in Marathi');
  });

  it('only English, Hindi or Marathi are accepted', () => {
    expect(requestSchema.safeParse({ messages: [{ role: 'user', content: 'hi' }], language: 'fr' }).success).toBe(false);
    expect(requestSchema.safeParse({ messages: [{ role: 'user', content: 'hi' }] }).success).toBe(true);
  });
});
