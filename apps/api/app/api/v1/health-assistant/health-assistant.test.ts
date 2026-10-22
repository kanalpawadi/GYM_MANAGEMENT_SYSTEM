import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  user: { id: 'member-1' } as { id: string } | null,
  profile: { role: 'member', approval_status: 'approved' } as Record<string, unknown> | null,
}));
vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  for (const m of ['from', 'select', 'eq']) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: auth.profile, error: null }));
  chain.auth = {
    getUser: vi.fn(async () => (auth.user ? { data: { user: auth.user }, error: null } : { data: { user: null }, error: { message: 'bad jwt' } })),
  };
  return { supabaseAdmin: chain };
});

import { POST } from './route';
import { OFF_TOPIC_REPLY, SYSTEM_PROMPT, allowRequest, resetRateLimit } from '@/lib/healthAssistant';

const ask = (messages: unknown, token: string | null = 'token-1') =>
  POST(
    new Request('http://localhost/api/v1/health-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ messages }),
    }),
  );

const grokReply = (content: string, status = 200) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { 'Content-Type': 'application/json' } }),
  );

beforeEach(() => {
  process.env.XAI_API_KEY = 'xai-test-key';
  delete process.env.XAI_MODEL;
  auth.user = { id: 'member-1' };
  auth.profile = { role: 'member', approval_status: 'approved' };
  resetRateLimit();
});
afterEach(() => vi.restoreAllMocks());

describe('POST /health-assistant', () => {
  it('answers a health question through Grok with the domain rules', async () => {
    const fetchSpy = grokReply('Aim for 1.6 g protein per kg body weight.');
    const res = await ask([{ role: 'user', content: 'How much protein do I need?' }]);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, reply: 'Aim for 1.6 g protein per kg body weight.' });
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.x.ai/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer xai-test-key');
    const sent = JSON.parse(init.body as string);
    expect(sent.model).toBe('grok-3-mini');
    expect(sent.messages[0]).toEqual({ role: 'system', content: SYSTEM_PROMPT });
    expect(sent.messages[1]).toEqual({ role: 'user', content: 'How much protein do I need?' });
  });

  it('the rules tell Grok to refuse anything outside health and fitness', () => {
    expect(SYSTEM_PROMPT).toContain(OFF_TOPIC_REPLY);
    expect(SYSTEM_PROMPT).toMatch(/coding, maths, homework, politics/);
    expect(SYSTEM_PROMPT).toMatch(/not a doctor/);
  });

  it('uses the model from XAI_MODEL and sends only the last 12 turns', async () => {
    process.env.XAI_MODEL = 'grok-4';
    const fetchSpy = grokReply('ok');
    const turns = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `turn ${i}` }));
    await ask(turns);
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.model).toBe('grok-4');
    expect(sent.messages).toHaveLength(13);
    expect(sent.messages[1].content).toBe('turn 3');
    expect(sent.messages[12].content).toBe('turn 14');
  });

  it('needs a signed-in user', async () => {
    const fetchSpy = grokReply('x');
    expect((await ask([{ role: 'user', content: 'hi' }], null)).status).toBe(401);
    auth.user = null;
    expect((await ask([{ role: 'user', content: 'hi' }])).status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('members waiting for approval cannot use it', async () => {
    auth.profile = { role: 'member', approval_status: 'pending' };
    const res = await ask([{ role: 'user', content: 'diet plan?' }]);
    expect(res.status).toBe(403);
  });

  it('trainers and staff can use it', async () => {
    auth.profile = { role: 'trainer', approval_status: 'incomplete' };
    grokReply('Sure');
    expect((await ask([{ role: 'user', content: 'warm-up ideas?' }])).status).toBe(200);
  });

  it.each([
    ['empty list', []],
    ['last turn not from the user', [{ role: 'assistant', content: 'hi' }]],
    ['too long', [{ role: 'user', content: 'x'.repeat(1001) }]],
    ['blank', [{ role: 'user', content: '   ' }]],
  ])('rejects %s', async (_label, messages) => {
    expect((await ask(messages)).status).toBe(400);
  });

  it('explains when the Grok key is missing', async () => {
    delete process.env.XAI_API_KEY;
    const res = await ask([{ role: 'user', content: 'protein?' }]);
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/not set up yet/);
  });

  it('turns Grok errors into friendly messages', async () => {
    grokReply('', 401);
    const res = await ask([{ role: 'user', content: 'protein?' }]);
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/key is not valid/);
  });

  it('limits each user to 20 questions per 10 minutes', async () => {
    const now = 1_000_000;
    for (let i = 0; i < 20; i++) expect(allowRequest('u', now + i)).toBe(true);
    expect(allowRequest('u', now + 21)).toBe(false);
    expect(allowRequest('someone-else', now + 21)).toBe(true);
    expect(allowRequest('u', now + 10 * 60_000 + 30)).toBe(true);
  });
});
