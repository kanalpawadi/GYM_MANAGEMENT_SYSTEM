// One-to-one chat and the notice board (supabase/migrations/10_chat_and_notices.sql).
import { supabase } from '../lib/supabase';
import { friendlyError } from './portal';
import type { UserRole } from '../types';

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

// ---- Chat --------------------------------------------------------------------------------

export interface ChatContact {
  id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  member_code: string | null;
  last_body: string | null;
  last_at: string | null;
  last_from_me: boolean | null;
  unread: number;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export const MAX_MESSAGE = 2000;

export async function listChatContacts(): Promise<ChatContact[]> {
  return (unwrap(await supabase.rpc('chat_contacts')) ?? []) as ChatContact[];
}

export async function getChatThread(otherId: string): Promise<ChatMessage[]> {
  return (unwrap(await supabase.rpc('chat_thread', { p_other: otherId, p_limit: 200 })) ?? []) as ChatMessage[];
}

export async function sendChatMessage(fromId: string, toId: string, body: string): Promise<ChatMessage> {
  const text = body.trim();
  if (!text) throw new Error('Type a message first.');
  if (text.length > MAX_MESSAGE) throw new Error(`Messages can be up to ${MAX_MESSAGE} characters.`);
  return unwrap(
    await supabase.from('messages').insert({ sender_id: fromId, recipient_id: toId, body: text }).select().single(),
  ) as ChatMessage;
}

export async function markChatRead(otherId: string): Promise<void> {
  unwrap(await supabase.rpc('mark_chat_read', { p_other: otherId }));
}

export async function countUnreadMessages(): Promise<number> {
  const { data, error } = await supabase.rpc('my_unread_messages');
  return error ? 0 : Number(data ?? 0);
}

/**
 * Calls `onMessage` when someone sends the user a message (Supabase Realtime).
 * Returns a cleanup function. Screens also refresh on a timer, so this is only a speed-up.
 */
export function subscribeToMyMessages(userId: string, onMessage: () => void): () => void {
  const client = supabase as any;
  if (typeof client.channel !== 'function') return () => {};
  const channel = client
    .channel(`messages-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${userId}` }, onMessage)
    .subscribe();
  return () => {
    void client.removeChannel?.(channel);
  };
}

// ---- Notice board ------------------------------------------------------------------------

export interface Notice {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  expires_on: string | null;
  created_by: string | null;
  created_at: string;
  author?: { full_name: string; role: UserRole } | null;
}

export interface NoticeInput {
  title: string;
  body: string;
  pinned?: boolean;
  expires_on?: string | null;
}

/** Pinned notices first, then newest first. */
export const sortNotices = (rows: Notice[]) =>
  [...rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at));

export async function listNotices(limit = 50): Promise<Notice[]> {
  return sortNotices((unwrap(
    await supabase
      .from('notices')
      .select('*, author:profiles!notices_created_by_fkey(full_name, role)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit),
  ) ?? []) as Notice[]);
}

export async function createNotice(authorId: string, input: NoticeInput): Promise<void> {
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error('Please add a title.');
  if (!body) throw new Error('Please write the notice.');
  unwrap(
    await supabase
      .from('notices')
      .insert({ title, body, pinned: !!input.pinned, expires_on: input.expires_on || null, created_by: authorId })
      .select('id'),
  );
}

export async function setNoticePinned(id: string, pinned: boolean): Promise<void> {
  const rows = unwrap(await supabase.from('notices').update({ pinned }).eq('id', id).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new Error('You can only change notices you posted.');
}

export async function deleteNotice(id: string): Promise<void> {
  const rows = unwrap(await supabase.from('notices').delete().eq('id', id).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new Error('You can only delete notices you posted.');
}

/** Today's date in India (YYYY-MM-DD): notices expire at the end of their expiry day. */
export const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

export const isNoticeActive = (n: Pick<Notice, 'expires_on'>, today = todayIST()) => !n.expires_on || n.expires_on >= today;
