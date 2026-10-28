import React, { useEffect, useRef, useState } from 'react';
import { Bot, RotateCcw, Send } from 'lucide-react';
import { ASSISTANT_MAX_CHARS, AssistantTurn, TrainerLanguage, askHealthAssistant } from '../../services/healthAssistant';

const STORAGE_KEY = 'rv_health_assistant';
const LANGUAGE_KEY = 'rv_trainer_language';

/** Everything the trainer chat says, in English, Hindi and Marathi. */
const COPY: Record<TrainerLanguage, { label: string; welcome: string; suggestions: string[]; placeholder: string; thinking: string }> = {
  en: {
    label: 'English',
    welcome:
      "Hi! I'm Coach RV, your RV Fitness AI trainer 💪 Ask me about workouts, diet, water, sleep or recovery. I'm not a doctor, so for injuries or medical problems please see a doctor and your gym trainer.",
    suggestions: ['Beginner 3-day workout plan', 'How much protein do I need daily?', 'Veg diet for fat loss', 'How much water should I drink?'],
    placeholder: 'Ask a health question',
    thinking: 'Coach is typing…',
  },
  hi: {
    label: 'हिंदी',
    welcome:
      'नमस्ते! मैं कोच RV हूँ, आपका RV Fitness AI ट्रेनर 💪 वर्कआउट, डाइट, पानी, नींद या रिकवरी के बारे में पूछिए। मैं डॉक्टर नहीं हूँ, इसलिए चोट या बीमारी के लिए डॉक्टर और अपने जिम ट्रेनर से मिलें।',
    suggestions: ['शुरुआती 3 दिन का वर्कआउट प्लान', 'रोज़ कितना प्रोटीन चाहिए?', 'वज़न घटाने के लिए शाकाहारी डाइट', 'दिन में कितना पानी पीना चाहिए?'],
    placeholder: 'अपने ट्रेनर से पूछिए',
    thinking: 'कोच लिख रहे हैं…',
  },
  mr: {
    label: 'मराठी',
    welcome:
      'नमस्कार! मी कोच RV, तुमचा RV Fitness AI ट्रेनर 💪 वर्कआउट, डाएट, पाणी, झोप किंवा रिकव्हरीबद्दल विचारा. मी डॉक्टर नाही, त्यामुळे दुखापत किंवा आजारासाठी डॉक्टर आणि तुमच्या जिम ट्रेनरला भेटा.',
    suggestions: ['नवशिक्यांसाठी ३ दिवसांचा वर्कआउट प्लॅन', 'रोज किती प्रोटीन हवे?', 'वजन कमी करण्यासाठी शाकाहारी डाएट', 'दिवसाला किती पाणी प्यावे?'],
    placeholder: 'तुमच्या ट्रेनरला विचारा',
    thinking: 'कोच लिहित आहेत…',
  },
};

function loadLanguage(): TrainerLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return saved === 'hi' || saved === 'mr' ? saved : 'en';
  } catch {
    return 'en';
  }
}

function loadTurns(): AssistantTurn[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

/** "Coach RV": AI trainer that only answers fitness questions, in English, Hindi or Marathi (rules live on the server). */
export const HealthAssistant: React.FC = () => {
  const [turns, setTurns] = useState<AssistantTurn[]>(loadTurns);
  const [language, setLanguage] = useState<TrainerLanguage>(loadLanguage);
  const copy = COPY[language];
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
      const reply = await askHealthAssistant(next, language);
      setTurns((t) => [...t, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'The AI trainer could not answer right now.');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0" aria-label="AI trainer">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gym-border" role="radiogroup" aria-label="Trainer language">
        <span className="text-[11px] text-gym-muted font-heading uppercase">Coach RV · AI trainer</span>
        <div className="flex gap-1">
          {(['en', 'hi', 'mr'] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={language === l}
              onClick={() => {
                setLanguage(l);
                try {
                  localStorage.setItem(LANGUAGE_KEY, l);
                } catch {
                  // storage unavailable: the choice lasts for this visit
                }
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-heading border ${language === l ? 'bg-gold-gradient text-black border-transparent' : 'border-gym-border text-gym-muted hover:text-white'}`}
            >
              {COPY[l].label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 bg-black/30" role="log" aria-live="polite">
        <Bubble from="assistant">{copy.welcome}</Bubble>
        {turns.length === 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {copy.suggestions.map((s) => (
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
            <span className="text-gym-muted">{copy.thinking}</span>
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
          <span className="sr-only">Ask the AI trainer</span>
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
            placeholder={copy.placeholder}
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
