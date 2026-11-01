import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase', () => {
  const chain: any = {};
  for (const m of ['from', 'select', 'eq']) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: { role: 'member', approval_status: 'approved' }, error: null }));
  chain.auth = { getUser: vi.fn(async () => ({ data: { user: { id: 'member-1' } }, error: null })) };
  return { supabaseAdmin: chain };
});

import { GET, POST } from './route';
import { assistantConfig, resetAssistantCheck, resetRateLimit } from '@/lib/healthAssistant';

const KEYS = ['XAI_API_KEY', 'XAI_BASE_URL', 'XAI_MODEL', 'GROQ_API_KEY', 'GROQ_BASE_URL', 'GROQ_MODEL'];

const ask = () =>
  POST(
    new Request('http://localhost/api/v1/health-assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'How much protein do I need?' }] }),
    }),
  );

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  for (const k of KEYS) delete process.env[k];
  resetRateLimit();
  resetAssistantCheck();
});
afterEach(() => vi.restoreAllMocks());

describe('AI settings typed in Vercel', () => {
  it('a Groq key works even with no address or model set', () => {
    expect(assistantConfig({ XAI_API_KEY: 'gsk_abc' })).toMatchObject({
      provider: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: 'llama-3.3-70b-versatile',
      fixes: [],
    });
  });

  it('tidies spaces, quotes, a trailing slash or /chat/completions', () => {
    const c = assistantConfig({
      XAI_API_KEY: '  "gsk_abc"\n',
      XAI_BASE_URL: ' https://api.groq.com/openai/v1/chat/completions/ ',
      XAI_MODEL: ' llama-3.3-70b-versatile ',
    })!;
    expect(c.apiKey).toBe('gsk_abc');
    expect(c.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(c.model).toBe('llama-3.3-70b-versatile');
  });

  it('a Groq key with the Grok address or a Grok model name is corrected', () => {
    const c = assistantConfig({ XAI_API_KEY: 'gsk_abc', XAI_BASE_URL: 'https://api.x.ai/v1', XAI_MODEL: 'grok-3-mini' })!;
    expect(c.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(c.model).toBe('llama-3.3-70b-versatile');
    expect(c.fixes).toHaveLength(2);
  });

  it('a Grok key keeps working as before', () => {
    expect(assistantConfig({ XAI_API_KEY: 'xai-abc' })).toMatchObject({ provider: 'xai', baseUrl: 'https://api.x.ai/v1', model: 'grok-3-mini' });
  });

  it('GROQ_* names work too', () => {
    expect(assistantConfig({ GROQ_API_KEY: 'gsk_abc', GROQ_MODEL: 'openai/gpt-oss-120b' })).toMatchObject({ provider: 'groq', model: 'openai/gpt-oss-120b' });
  });
});

describe('Answering when the model setting is wrong', () => {
  it('falls back to a working Groq model', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    process.env.XAI_MODEL = 'qwen/qwen3.8-27b';
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ error: { message: 'The model `qwen/qwen3.8-27b` does not exist', code: 'model_not_found' } }, 404))
      .mockResolvedValueOnce(json({ choices: [{ message: { content: 'About 1.6 g per kg.' } }] }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const res = await ask();
    expect(res.status).toBe(200);
    expect((await res.json()).reply).toBe('About 1.6 g per kg.');
    const second = JSON.parse((fetchSpy.mock.calls[1][1] as RequestInit).body as string);
    expect(second.model).toBe('llama-3.3-70b-versatile');
    expect(fetchSpy.mock.calls[1][0]).toBe('https://api.groq.com/openai/v1/chat/completions');
  });

  it('hides the thinking of reasoning models', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ choices: [{ message: { content: '<think>user wants protein</think>\nAbout 1.6 g per kg.' } }] }));
    expect((await (await ask()).json()).reply).toBe('About 1.6 g per kg.');
  });

  it('says the setup is wrong when no model works', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => json({ error: { message: 'model not found' } }, 404));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await ask();
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/not set up correctly/);
  });
});

describe('GET /health-assistant setup check', () => {
  it('reports a missing key', async () => {
    const body = await (await GET()).json();
    expect(body).toMatchObject({ configured: false });
    expect(body.advice).toMatch(/XAI_API_KEY/);
  });

  it('reports a refused key, never showing it', async () => {
    process.env.XAI_API_KEY = 'gsk_secret_value';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ error: 'invalid key' }, 401));
    const res = await GET();
    const text = await res.text();
    expect(text).not.toContain('gsk_secret_value');
    expect(JSON.parse(text)).toMatchObject({ configured: true, provider: 'Groq', key: 'not valid' });
  });

  it('reports a model that does not exist and suggests one that does', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    process.env.XAI_MODEL = 'qwen/qwen3.8-27b';
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'openai/gpt-oss-120b' }] }));
    const body = await (await GET()).json();
    expect(body).toMatchObject({ key: 'valid', model: 'qwen/qwen3.8-27b', model_available: false });
    expect(body.advice).toMatch(/Set XAI_MODEL to llama-3.3-70b-versatile/);
  });

  it('all good', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ data: [{ id: 'llama-3.3-70b-versatile' }] }));
    const body = await (await GET()).json();
    expect(body).toMatchObject({ key: 'valid', model_available: true, advice: 'Everything looks right.' });
    expect(fetchSpy.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/models');
  });
});

describe('Reply style', () => {
  it('asks for short, simple chat-style answers without tables', async () => {
    const { systemPrompt } = await import('@/lib/healthAssistant');
    const prompt = systemPrompt('en');
    expect(prompt).toMatch(/under 80 words/);
    expect(prompt).toMatch(/at most 4 short bullet points/);
    expect(prompt).toMatch(/No tables/);
  });
});

describe('Long earlier answers', () => {
  it('a follow-up question works after a long answer (was "Messages can be up to 1000 characters")', async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ choices: [{ message: { content: 'Yes, 2 eggs is fine.' } }] }));
    const res = await POST(
      new Request('http://localhost/api/v1/health-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' },
        body: JSON.stringify({
          messages: [
            { role: 'user', content: 'How much protein do I need?' },
            { role: 'assistant', content: 'x'.repeat(2500) },
            { role: 'user', content: 'Are eggs good?' },
          ],
        }),
      }),
    );
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.messages[2].content.length).toBe(2000);
  });

  it("the member's own question is still limited to 1000 characters", async () => {
    process.env.XAI_API_KEY = 'gsk_abc';
    const res = await POST(
      new Request('http://localhost/api/v1/health-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'y'.repeat(1001) }] }),
      }),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.message).toBe('Messages can be up to 1000 characters.');
  });
});
