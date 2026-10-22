import React, { useEffect, useRef, useState } from 'react';
import { Bot, RotateCcw, Send } from 'lucide-react';
import { ASSISTANT_MAX_CHARS, AssistantTurn, askHealthAssistant } from '../../services/healthAssistant';

const STORAGE_KEY = 'rv_health_assistant';
const SUGGESTIONS = [
  'How much protein should I eat daily?',
  'Give me a beginner 3-day workout plan',
  'Veg diet for fat loss',
  'How much water should I drink?',
];
const WELCOME =
  "Hi! I'm the RV Fitness health assistant. Ask me about workouts, diet, water, sleep or recovery. I'm not a doctor, so for injuries or medical problems please see a doctor and your trainer.";

function loadTurns(): AssistantTurn[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** Grok-powered assistant that only answers health and fitness questions (rules live on the server). */
export const HealthAssistant: React.FC = () => {
  const [turns, setTurns] = useState<AssistantTurn[]>(loadTurns);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-30)));
    } catch {
      // storage unavailable: the chat still works for this visit
    }
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [turns, thinking]);

  const ask = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;
    const next = [...turns, { role: 'user' as const, content: question }];
    setTurns(next);
    setDraft('');
    setError('');
    setThinking(true);
    try {
      const reply = await askHealthAssistant(next);
      setTurns((t) => [...t, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'The health assistant could not answer right now.');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0" aria-label="Health assistant">
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-black/30" role="log" aria-live="polite">
        <Bubble from="assistant">{WELCOME}</Bubble>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void ask(s)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-gym-primary/50 text-gym-primary hover:bg-gym-primary/10"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <Bubble key={i} from={t.role}>
            {t.content}
          </Bubble>
        ))}
        {thinking && (
          <Bubble from="assistant">
            <span className="text-gym-muted">Thinking…</span>
          </Bubble>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p role="alert" className="px-3 pt-2 text-xs text-gym-danger">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(draft);
        }}
        className="border-t border-gym-border p-2.5 flex items-end gap-2"
      >
        {turns.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setTurns([]);
              setError('');
            }}
            className="w-9 h-11 flex items-center justify-center text-gym-muted hover:text-white shrink-0"
            aria-label="Start a new conversation"
            title="New conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <label className="flex-1">
          <span className="sr-only">Ask the health assistant</span>
          <textarea
            rows={1}
            value={draft}
            maxLength={ASSISTANT_MAX_CHARS}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void ask(draft);
              }
            }}
            placeholder="Ask a health question"
            className="w-full resize-none max-h-28 bg-black text-white border border-gym-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gym-primary"
          />
        </label>
        <button
          type="submit"
          disabled={thinking || !draft.trim()}
          aria-label="Ask"
          className="w-11 h-11 rounded-xl bg-gold-gradient text-black flex items-center justify-center disabled:opacity-50 shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
};

const Bubble: React.FC<{ from: 'user' | 'assistant'; children: React.ReactNode }> = ({ from, children }) => (
  <div className={`flex gap-2 ${from === 'user' ? 'justify-end' : 'justify-start'}`}>
    {from === 'assistant' && (
      <span className="w-7 h-7 rounded-full bg-gym-primary/20 text-gym-primary flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4" />
      </span>
    )}
    <div
      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
        from === 'user' ? 'bg-gold-gradient text-black rounded-br-sm' : 'bg-gym-surface border border-gym-border text-white rounded-bl-sm'
      }`}
    >
      {children}
    </div>
  </div>
);
