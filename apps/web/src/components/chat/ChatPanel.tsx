import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCheck, MessageCircle, Search, Send } from 'lucide-react';
import { Avatar } from '../account/Avatar';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../config/roles';
import {
  ChatContact,
  ChatMessage,
  MAX_MESSAGE,
  getChatThread,
  listChatContacts,
  markChatRead,
  sendChatMessage,
  subscribeToMyMessages,
} from '../../services/chat';

const THREAD_REFRESH_MS = 5_000;
const CONTACTS_REFRESH_MS = 15_000;

const timeLabel = (iso: string) => {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

interface ChatPanelProps {
  /** Popup mode: one pane at a time, fills its container, keeps the open chat out of the URL. */
  compact?: boolean;
  /** Popup mode: person to open first. */
  initialWith?: string | null;
}

/** WhatsApp-style one-to-one chat. Open a person directly with `?with=<profile id>`. */
export const ChatPanel: React.FC<ChatPanelProps> = ({ compact = false, initialWith = null }) => {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const [popupWith, setPopupWith] = useState<string | null>(initialWith);
  useEffect(() => setPopupWith(initialWith), [initialWith]);
  const activeId = compact ? popupWith : params.get('with');
  const active = contacts.find((c) => c.id === activeId) ?? null;
  const me = profile?.id;

  const loadContacts = useCallback(async () => {
    try {
      setContacts(await listChatContacts());
    } catch (err: any) {
      setError(err.message || 'Could not load chats');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadThread = useCallback(async (otherId: string) => {
    try {
      const rows = await getChatThread(otherId);
      setMessages(rows);
      if (rows.some((m) => m.sender_id === otherId && !m.read_at)) {
        await markChatRead(otherId);
        setContacts((list) => list.map((c) => (c.id === otherId ? { ...c, unread: 0 } : c)));
      }
    } catch (err: any) {
      setError(err.message || 'Could not load messages');
    }
  }, []);

  useEffect(() => {
    void loadContacts();
    const timer = window.setInterval(() => void loadContacts(), CONTACTS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [loadContacts]);

  useEffect(() => {
    setMessages([]);
    if (!activeId) return;
    void loadThread(activeId);
    const timer = window.setInterval(() => void loadThread(activeId), THREAD_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [activeId, loadThread]);

  // Live updates when the database pushes a new message.
  useEffect(() => {
    if (!me) return;
    return subscribeToMyMessages(me, () => {
      void loadContacts();
      if (activeId) void loadThread(activeId);
    });
  }, [me, activeId, loadContacts, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length, activeId]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? contacts.filter((c) => `${c.full_name} ${c.member_code ?? ''} ${ROLE_LABELS[c.role] ?? ''}`.toLowerCase().includes(q)) : contacts;
  }, [contacts, search]);

  const open = (id: string | null) => {
    setError('');
    setDraft('');
    if (compact) setPopupWith(id);
    else setParams(id ? { with: id } : {}, { replace: true });
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!me || !activeId || !draft.trim()) return;
    setSending(true);
    setError('');
    try {
      const sent = await sendChatMessage(me, activeId, draft);
      setMessages((list) => [...list, sent]);
      setDraft('');
      setContacts((list) =>
        list
          .map((c) => (c.id === activeId ? { ...c, last_body: sent.body, last_at: sent.created_at, last_from_me: true } : c))
          .sort((a, b) => (b.last_at ?? '').localeCompare(a.last_at ?? '')),
      );
    } catch (err: any) {
      setError(err.message || 'Message not sent');
    } finally {
      setSending(false);
    }
  };

  const lastMineId = [...messages].reverse().find((m) => m.sender_id === me)?.id;

  return (
    <div
      className={
        compact
          ? 'bg-gym-surface overflow-hidden flex h-full min-h-0'
          : 'bg-gym-surface border border-gym-border rounded-2xl overflow-hidden flex h-[calc(100vh-220px)] min-h-[460px]'
      }
    >
      {/* Contacts */}
      <aside
        className={`${active ? (compact ? 'hidden' : 'hidden md:flex') : 'flex'} w-full ${compact ? '' : 'md:w-80 border-r border-gym-border'} shrink-0 flex-col`}
        aria-label="Chats"
      >
        <div className="p-3 border-b border-gym-border">
          <label className="relative block">
            <span className="sr-only">Search people</span>
            <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="w-full bg-black text-white border border-gym-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-gym-primary"
            />
          </label>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {loading && <li className="p-4 text-sm text-gym-muted">Loading chats...</li>}
          {!loading && contacts.length === 0 && error && (
            <li role="alert" className="p-4 text-sm text-gym-danger">{error}</li>
          )}
          {!loading && shown.length === 0 && !(contacts.length === 0 && error) && <li className="p-4 text-sm text-gym-muted">No one to chat with yet.</li>}
          {shown.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => open(c.id)}
                aria-current={c.id === activeId ? 'true' : undefined}
                aria-label={`Chat with ${c.full_name}${c.unread ? `, ${c.unread} unread` : ''}`}
                className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gym-border/60 hover:bg-gym-surfaceHover ${c.id === activeId ? 'bg-gym-primary/10' : ''}`}
              >
                <Avatar src={c.avatar_url} name={c.full_name} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-heading text-sm text-white truncate">{c.full_name}</span>
                    {c.last_at && <span className="text-[10px] text-gym-muted shrink-0">{timeLabel(c.last_at)}</span>}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gym-muted truncate">
                      {c.last_body ? `${c.last_from_me ? 'You: ' : ''}${c.last_body}` : ROLE_LABELS[c.role] ?? c.role}
                    </span>
                    {c.unread > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-gym-primary text-black text-[11px] font-bold flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Conversation */}
      <section className={`${active ? 'flex' : compact ? 'hidden' : 'hidden md:flex'} flex-1 min-w-0 flex-col`} aria-label={active ? `Conversation with ${active.full_name}` : 'Conversation'}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-6 text-gym-muted">
            <MessageCircle className="w-10 h-10 text-gym-primary" />
            <p className="text-sm">Pick a person to start chatting.</p>
            {error && <p role="alert" className="text-xs text-gym-danger">{error}</p>}
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 px-3 py-2.5 border-b border-gym-border">
              <button type="button" onClick={() => open(null)} className={`${compact ? '' : 'md:hidden'} p-1.5 text-gym-muted hover:text-white`} aria-label="Back to chats">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <Avatar src={active.avatar_url} name={active.full_name} size="sm" zoomable />
              <div className="min-w-0">
                <p className="font-heading text-white text-sm truncate">{active.full_name}</p>
                <p className="text-[11px] text-gym-primary">
                  {ROLE_LABELS[active.role] ?? active.role}
                  {active.member_code ? ` · ${active.member_code}` : ''}
                </p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-2 bg-black/30" role="log" aria-live="polite">
              {messages.length === 0 && <p className="text-center text-xs text-gym-muted my-auto">No messages yet. Say hello 👋</p>}
              {messages.map((m) => {
                const mine = m.sender_id === me;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
                        mine ? 'bg-gold-gradient text-black rounded-br-sm' : 'bg-gym-surface border border-gym-border text-white rounded-bl-sm'
                      }`}
                    >
                      {m.body}
                      <span className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${mine ? 'text-black/60' : 'text-gym-muted'}`}>
                        {timeLabel(m.created_at)}
                        {mine && m.id === lastMineId && m.read_at && (
                          <>
                            <CheckCheck className="w-3 h-3" /> Seen
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="border-t border-gym-border p-2.5 flex items-end gap-2">
              <label className="flex-1">
                <span className="sr-only">Message {active.full_name}</span>
                <textarea
                  rows={1}
                  value={draft}
                  maxLength={MAX_MESSAGE}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Type a message"
                  className="w-full resize-none max-h-32 bg-black text-white border border-gym-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gym-primary"
                />
              </label>
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="w-11 h-11 rounded-xl bg-gold-gradient text-black flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            {error && <p role="alert" className="px-3 pb-2 text-xs text-gym-danger">{error}</p>}
          </>
        )}
      </section>
    </div>
  );
};
