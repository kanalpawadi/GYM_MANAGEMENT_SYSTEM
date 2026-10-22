import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { AssistantError, allowRequest, askGrok, requestSchema } from '@/lib/healthAssistant';

const fail = (status: number, code: string, message: string) => NextResponse.json({ error: { code, message } }, { status });

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
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

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, approval_status')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (!profile || profile.role === 'visitor' || (profile.role === 'member' && (profile.approval_status ?? 'approved') !== 'approved')) {
      return fail(403, 'NOT_ALLOWED', 'The health assistant opens once the gym approves your registration.');
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

    const reply = await askGrok(parsed.data.messages);
    return NextResponse.json({ success: true, reply });
  } catch (err: any) {
    if (err instanceof AssistantError) return fail(err.status, 'ASSISTANT_ERROR', err.message);
    console.error('Health assistant error', err);
    return fail(500, 'SERVER_ERROR', 'Something went wrong. Please try again.');
  }
}
