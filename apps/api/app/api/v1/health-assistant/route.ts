import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AssistantError, allowRequest, askGrok, checkAssistantCached, requestSchema } from '@/lib/healthAssistant';

const fail = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * GET /api/v1/health-assistant
 * Setup check for the gym owner: open it in a browser to see whether the AI key is accepted
 * and the model exists. Never shows the key.
 */
export async function GET() {
  return NextResponse.json(await checkAssistantCached(), { headers: { 'Cache-Control': 'no-store' } });
}

/**
 * POST /api/v1/health-assistant
 * Header: Authorization: Bearer <Supabase access token>
 * Body: { messages: [{ role: 'user' | 'assistant', content }] }
 * Only signed-in, approved members and staff can use it (the Grok API costs money).
 */
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) return fail(401, 'UNAUTHENTICATED', 'Please sign in to use the health assistant.');

    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !auth?.user) return fail(401, 'UNAUTHENTICATED', 'Your session has expired. Please sign in again.');

    type ProfileRow = { role: string; approval_status?: string | null; frozen_at?: string | null } | null;
    const readProfile = async (columns: string) => {
      const { data, error } = await supabaseAdmin.from('profiles').select(columns).eq('id', auth.user.id).maybeSingle();
      return { profile: data as unknown as ProfileRow, error };
    };
    let { profile, error: profileError } = await readProfile('role, approval_status, frozen_at');
    // Database without migration 20 yet (no frozen_at column): read it the old way.
    if (profileError) ({ profile } = await readProfile('role, approval_status'));
    if (!profile || profile.role === 'visitor' || (profile.role === 'member' && (profile.approval_status ?? 'approved') !== 'approved')) {
      return fail(403, 'NOT_ALLOWED', 'The health assistant opens once the gym approves your registration.');
    }
    if (profile.role === 'member' && profile.frozen_at) {
      return fail(403, 'ACCOUNT_FROZEN', 'Your account is frozen by the gym. Please contact the gym.');
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(400, 'VALIDATION_ERROR', 'Invalid request.');
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return fail(400, 'VALIDATION_ERROR', parsed.error.errors[0].message);

    if (!allowRequest(auth.user.id)) {
      return fail(429, 'RATE_LIMITED', "You've asked a lot of questions in a short time. Please wait a few minutes.");
    }

    const reply = await askGrok(parsed.data.messages, fetch, parsed.data.language ?? 'en');
    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    if (err instanceof AssistantError) return fail(err.status, 'ASSISTANT_ERROR', err.message);
    console.error('Health assistant error', err);
    return fail(500, 'SERVER_ERROR', 'Something went wrong. Please try again.');
  }
}
