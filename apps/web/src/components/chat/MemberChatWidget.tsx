import React, { useEffect, useState } from 'react';
import { Bot, MessageCircle, X } from 'lucide-react';
import { ChatPanel } from './ChatPanel';
import { HealthAssistant } from './HealthAssistant';
import { useUnreadMessages } from './useUnreadMessages';

const OPEN_EVENT = 'rv:open-chat';
type Tab = 'assistant' | 'messages';

/** Opens the member chat popup from anywhere (e.g. "Chat in app" on the My Trainer card). */
export function openMemberChat(withId?: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { with: withId ?? null } }));
}

/** Floating chat button for the member portal: health assistant + one-to-one messages in a popup. */
export const MemberChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('messages');
  const [openWith, setOpenWith] = useState<string | null>(null);
  const unread = useUnreadMessages();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ with: string | null }>).detail?.with ?? null;
      setTab('messages');
      setOpenWith(id);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Chat"
          className="fixed z-50 bottom-[8.5rem] md:bottom-24 right-3 left-3 sm:left-auto sm:right-4 sm:w-[390px] h-[min(600px,calc(100dvh-12rem))] md:h-[min(600px,calc(100vh-8rem))] bg-gym-surface border border-gym-primary/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-1 p-2 border-b border-gym-border" role="tablist">
            {(
              [
                ['messages', 'Messages', <MessageCircle key="m" className="w-4 h-4" />],
                ['assistant', 'AI Trainer', <Bot key="b" className="w-4 h-4" />],
              ] as const
            ).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-heading ${
                  tab === key ? 'bg-gold-gradient text-black' : 'text-gym-muted hover:text-white'
                }`}
              >
                {icon} {label}
                {key === 'messages' && unread > 0 && tab !== 'messages' && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-gym-primary text-black text-[10px] font-bold flex items-center justify-center">{unread}</span>
                )}
              </button>
            ))}
            <button type="button" onClick={() => setOpen(false)} className="p-2 text-gym-muted hover:text-white" aria-label="Close chat">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">{tab === 'messages' ? <ChatPanel compact initialWith={openWith} /> : <HealthAssistant />}</div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close chat' : unread ? `Open chat, ${unread} unread` : 'Open chat'}
        aria-expanded={open}
        className="fixed z-40 bottom-[4.75rem] md:bottom-5 right-4 w-14 h-14 rounded-full bg-gold-gradient text-black shadow-yellow-glow flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-gym-danger text-white text-[11px] font-bold flex items-center justify-center border-2 border-gym-bg">
            {unread}
          </span>
        )}
      </button>
    </>
  );
};
