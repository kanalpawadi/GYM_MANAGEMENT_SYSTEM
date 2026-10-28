// AI trainer chat (Grok / Groq, through our API so the key stays on the server).
import { supabase } from '../lib/supabase';
import { API_BASE } from './api';

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const ASSISTANT_MAX_CHARS = 1000;

/** Reply language: English, Hindi or Marathi. */
export type TrainerLanguage = 'en' | 'hi' | 'mr';

export async function askHealthAssistant(turns: AssistantTurn[], language: TrainerLanguage = 'en'): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please sign in to use the health assistant.');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/health-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: turns.slice(-12), language }),
    });
  } catch {
    throw new Error('Could not reach the health assistant. Check your internet and try again.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.reply) throw new Error(body?.error?.message || 'The health assistant could not answer right now.');
  return body.reply as string;
}
