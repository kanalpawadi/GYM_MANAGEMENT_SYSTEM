import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeToMyMessages } from './chat';
import { supabaseMock } from '../test/supabaseMock';

// Behaves like supabase-js: channels are cached by name and .on() after subscribe() throws.
function fakeRealtime() {
  const channels = new Map<string, any>();
  const handlers: (() => void)[] = [];
  supabaseMock.channel = vi.fn((name: string) => {
    if (channels.has(name)) return channels.get(name);
    let subscribed = false;
    const ch: any = {
      on: vi.fn((_type: string, _filter: unknown, cb: () => void) => {
        if (subscribed) throw new Error(`cannot add postgres_changes callbacks for realtime:${name} after subscribe()`);
        handlers.push(cb);
        return ch;
      }),
      subscribe: vi.fn(() => {
        subscribed = true;
        return ch;
      }),
    };
    channels.set(name, ch);
    return ch;
  });
  supabaseMock.removeChannel = vi.fn(async (ch: any) => {
    for (const [k, v] of channels) if (v === ch) channels.delete(k);
  });
  return { push: () => handlers.forEach((h) => h()) };
}

afterEach(() => {
  delete supabaseMock.channel;
  delete supabaseMock.removeChannel;
});

describe('live chat updates', () => {
  it('several screens can listen at once (menu badge + chat window) without crashing', () => {
    const rt = fakeRealtime();
    const badge = vi.fn();
    const chat = vi.fn();
    const stopBadge = subscribeToMyMessages('asha', badge);
    const stopChat = subscribeToMyMessages('asha', chat);

    expect(supabaseMock.channel).toHaveBeenCalledTimes(1);
    rt.push();
    expect(badge).toHaveBeenCalledTimes(1);
    expect(chat).toHaveBeenCalledTimes(1);

    stopChat();
    expect(supabaseMock.removeChannel).not.toHaveBeenCalled();
    rt.push();
    expect(badge).toHaveBeenCalledTimes(2);
    expect(chat).toHaveBeenCalledTimes(1);

    stopBadge();
    expect(supabaseMock.removeChannel).toHaveBeenCalledTimes(1);
  });

  it('re-subscribing straight after leaving (React strict mode) works', () => {
    fakeRealtime();
    const stop = subscribeToMyMessages('asha', vi.fn());
    stop();
    expect(() => subscribeToMyMessages('asha', vi.fn())()).not.toThrow();
  });
});
